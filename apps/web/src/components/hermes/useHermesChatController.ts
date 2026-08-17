import { useCallback, useEffect, useRef, useState } from 'react';
import {
  appendHermesMessage,
  getHermesThreadContext,
  openHermesThread,
  proposeHermesMemory,
  sendChatMessage,
  sendChatMessageStream,
} from '../../services/chat';
import { readCertifiedCalculation } from '../../utils/certifiedCalculation';
import { buildSystemPrompt } from './prompt';
import type { HermesActiveScope, HermesPromptContext } from './scope';
import { storedMessageToChat, type HermesChatMessage } from './threadModel';

export type HermesProvider = 'openai' | 'hermes_gateway';

interface UseHermesChatControllerOptions {
  isOpen: boolean;
  ctx: HermesPromptContext;
  scope: HermesActiveScope;
}

export function useHermesChatController({ isOpen, ctx, scope }: UseHermesChatControllerOptions) {
  const [messages, setMessages] = useState<HermesChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [initialized, setInitialized] = useState(false);
  const [showProvenance, setShowProvenance] = useState(false);
  const [threadId, setThreadId] = useState<string | null>(null);
  const [memoryStatus, setMemoryStatus] = useState('Memoria local: aguardando perfil.');
  const [lastLatencyMs, setLastLatencyMs] = useState<number | null>(null);
  const [streamingEnabled, setStreamingEnabled] = useState(true);
  const [provider, setProvider] = useState<HermesProvider>('openai');
  const [externalConsent, setExternalConsent] = useState(false);
  const [useFullPrompt, setUseFullPrompt] = useState(false);

  const assistantIndexRef = useRef<number | null>(null);
  const sendMessageRef = useRef<(overrideText?: string) => Promise<void>>(async () => {});
  const ctxRef = useRef(ctx);
  ctxRef.current = ctx;
  const scopeOwnerId = scope.owner?.id;

  const stateRef = useRef({ messages, loading });
  useEffect(() => {
    stateRef.current = { messages, loading };
  }, [messages, loading]);

  useEffect(() => {
    const handleExternal = (event: Event) => {
      const detail = (event as CustomEvent<{ prompt?: string }>).detail;
      if (detail?.prompt) {
        setInitialized(true);
        void sendMessageRef.current(detail.prompt);
      }
    };
    window.addEventListener('send-hermes-msg', handleExternal);
    return () => window.removeEventListener('send-hermes-msg', handleExternal);
  }, []);

  useEffect(() => {
    if (!isOpen) return;

    let cancelled = false;
    setThreadId(null);
    setInitialized(false);

    if (!scopeOwnerId) {
      setMemoryStatus('Memoria local indisponivel: entre em um perfil.');
      return () => {
        cancelled = true;
      };
    }

    const topicKey = scope.topicKey ?? `hermes:owner:${scopeOwnerId}:subject:${scopeOwnerId}`;
    const title = `Hermes — ${scope.name}`;

    const openPersistentThread = async () => {
      setMemoryStatus('Abrindo memoria local...');
      const opened = await openHermesThread({
        ownerId: scopeOwnerId,
        topicKey,
        title,
      });
      const context = await getHermesThreadContext({
        ownerId: scopeOwnerId,
        threadId: opened.thread.id,
        limit: 50,
      });

      if (cancelled) return;
      const restoredMessages = context.messages
        .map(storedMessageToChat)
        .filter((message): message is HermesChatMessage => Boolean(message));
      setThreadId(opened.thread.id);
      setMemoryStatus(
        restoredMessages.length
          ? `Memoria local ativa: ${restoredMessages.length} mensagens recuperadas.`
          : 'Memoria local ativa: novo fio de estudo.',
      );
      setMessages(restoredMessages);
      setInitialized(true);
    };

    openPersistentThread().catch(error => {
      if (cancelled) return;
      const message = error instanceof Error ? error.message : 'falha desconhecida';
      setMemoryStatus(`Memoria local indisponivel: ${message}`);
    });

    return () => {
      cancelled = true;
    };
  }, [isOpen, scopeOwnerId, scope.topicKey, scope.name]);

  useEffect(() => {
    if (!initialized && isOpen) {
      const profile = scope.owner;
      const hasCertifiedNatal = Boolean(readCertifiedCalculation(
        scope.source?.certifiedNatalCalculation,
        'natal',
      ));
      const hasCertifiedTransit = Boolean(readCertifiedCalculation(ctxRef.current.astro.liveData, 'transit'));

      const welcome = profile
        ? `Olá! O estudo em foco é **${scope.name}**.\n\n`
          + `📊 **Mapa natal:** ${hasCertifiedNatal ? 'cálculo certificado com recibo disponível.' : 'indisponível até receber um cálculo certificado com recibo.'}\n`
          + `🔭 **Céu atual:** ${hasCertifiedTransit ? 'cálculo certificado com recibo disponível.' : 'indisponível até o motor fornecer recibo auditável.'}\n`
          + '✨ **Trânsitos pessoais:** indisponíveis até a conexão entre cálculos certificados estar disponível.\n'
          + '📚 **Fonte editorial:** ainda não selecionada para esta conversa.\n\n'
          + 'Posso explicar um cálculo recebido ou ajudar a estruturar uma investigação. Sempre vou separar cálculo, fonte, regra e inferência.'
        : 'Olá! Eu sou o Hermes. Antes de interpretar um mapa, configure data, hora, local, coordenadas e fuso de nascimento. 🌙';

      setMessages([{ role: 'assistant', content: welcome }]);
      setInitialized(true);
    }
  }, [isOpen, initialized, scope.owner, scope.name, scope.source]);

  const sendMessage = useCallback(async (overrideText?: string) => {
    const text = overrideText || input;
    const { messages: currentMessages, loading: currentLoading } = stateRef.current;
    if (!text.trim() || currentLoading) return;

    const userMessage: HermesChatMessage = { role: 'user', content: text };
    const nextMessages = [...currentMessages, userMessage];
    setMessages(nextMessages);
    if (!overrideText) setInput('');
    setLoading(true);

    const ownerId = scopeOwnerId;
    const currentThreadId = threadId;

    try {
      if (ownerId && currentThreadId) {
        appendHermesMessage({
          ownerId,
          threadId: currentThreadId,
          role: 'user',
          content: text,
          provenanceKind: 'personal_statement',
        }).catch(() => {
          setMemoryStatus('Memoria local indisponivel: a sua mensagem nao foi gravada.');
        });
      }

      const promptToUse = buildSystemPrompt(ctxRef.current);
      if (useFullPrompt) setUseFullPrompt(false);
      const contextMessages = nextMessages.slice(-6).map(message => ({
        role: message.role,
        content: message.content,
      }));

      if (streamingEnabled) {
        const withPlaceholder = [...nextMessages, { role: 'assistant', content: '' } as HermesChatMessage];
        assistantIndexRef.current = withPlaceholder.length - 1;
        setMessages(withPlaceholder);
        const startedAt = Date.now();
        let finalText = '';

        await new Promise<void>((resolve, reject) => {
          sendChatMessageStream(
            contextMessages,
            promptToUse,
            chunk => {
              finalText += chunk;
              setMessages(previous => {
                const copy = previous.slice();
                const index = assistantIndexRef.current ?? (copy.length - 1);
                if (index >= 0 && index < copy.length) {
                  copy[index] = { ...copy[index], content: finalText };
                }
                return copy;
              });
            },
            () => {
              const latency = Date.now() - startedAt;
              setLastLatencyMs(latency);
              setMemoryStatus(`Memoria local ativa: ultima troca gravada. (resposta em ${Math.round(latency)} ms)`);
              if (ownerId && currentThreadId) {
                appendHermesMessage({
                  ownerId,
                  threadId: currentThreadId,
                  role: 'hermes',
                  content: finalText,
                  provenanceKind: 'hermes_inference',
                })
                  .then(() => setMemoryStatus('Memoria local ativa: ultima troca gravada.'))
                  .catch(() => setMemoryStatus('Memoria local indisponivel: a resposta nao foi gravada.'));
              }
              resolve();
            },
            error => reject(error),
            externalConsent,
            provider,
          );
        });
      } else {
        const startedAt = Date.now();
        const reply = await sendChatMessage(
          contextMessages,
          undefined,
          promptToUse,
          externalConsent,
          provider,
        );
        const latency = Date.now() - startedAt;
        setLastLatencyMs(latency);
        setMemoryStatus(`Memoria local ativa: ultima troca gravada. (resposta em ${Math.round(latency)} ms)`);

        if (ownerId && currentThreadId) {
          appendHermesMessage({
            ownerId,
            threadId: currentThreadId,
            role: 'hermes',
            content: reply,
            provenanceKind: 'hermes_inference',
          })
            .then(() => setMemoryStatus('Memoria local ativa: ultima troca gravada.'))
            .catch(() => setMemoryStatus('Memoria local indisponivel: a resposta nao foi gravada.'));
        }
        setMessages([...nextMessages, { role: 'assistant', content: reply }]);
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Não foi possível contatar o serviço local do Hermes.';
      if (ownerId && currentThreadId) {
        await appendHermesMessage({
          ownerId,
          threadId: currentThreadId,
          role: 'system',
          content: message,
          provenanceKind: 'system_notice',
        }).catch(() => {
          setMemoryStatus('Memoria local indisponivel: nao foi possivel gravar o aviso.');
        });
      }
      setMessages([...nextMessages, { role: 'assistant', content: `⚠️ ${message}` }]);
    } finally {
      setLoading(false);
    }
  }, [
    externalConsent,
    input,
    provider,
    scopeOwnerId,
    streamingEnabled,
    threadId,
    useFullPrompt,
  ]);

  useEffect(() => {
    sendMessageRef.current = sendMessage;
  }, [sendMessage]);

  const proposeMemoryFromMessage = useCallback(async (message: HermesChatMessage) => {
    const ownerId = scopeOwnerId;
    const currentThreadId = threadId;
    if (!ownerId || !currentThreadId || message.role !== 'assistant') return;

    setMemoryStatus('Propondo memória Hermes...');
    try {
      await proposeHermesMemory({
        ownerId,
        content: message.content,
        memoryType: 'study_note',
        evidenceNote: `Memória proposta a partir da conversa Hermes no tópico ${currentThreadId}.`,
        topicKey: scope.topicKey ?? `hermes:owner:${ownerId}:subject:${ownerId}`,
        sourceThreadId: currentThreadId,
        confidence: 'inferred',
      });
      setMemoryStatus('Memória Hermes proposta com sucesso.');
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'falha ao propor memoria';
      setMemoryStatus(`Memória local indisponível: ${errorMessage}`);
    }
  }, [scopeOwnerId, scope.topicKey, threadId]);

  return {
    messages,
    input,
    loading,
    showProvenance,
    threadId,
    memoryStatus,
    lastLatencyMs,
    streamingEnabled,
    provider,
    externalConsent,
    setInput,
    setShowProvenance,
    setStreamingEnabled,
    setProvider,
    setExternalConsent,
    requestFullPrompt: () => setUseFullPrompt(true),
    sendMessage,
    proposeMemoryFromMessage,
  };
}
