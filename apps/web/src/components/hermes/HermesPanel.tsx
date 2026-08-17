import { useEffect, useRef } from 'react';
import { Send, Sparkles, X } from 'lucide-react';
import type { HermesChatMessage } from './threadModel';
import type { HermesProvider } from './useHermesChatController';

interface HermesPanelProps {
  subjectName: string;
  hasOwner: boolean;
  hasCertifiedNatal: boolean;
  hasCertifiedTransit: boolean;
  messages: HermesChatMessage[];
  input: string;
  loading: boolean;
  showProvenance: boolean;
  memoryStatus: string;
  lastLatencyMs: number | null;
  streamingEnabled: boolean;
  provider: HermesProvider;
  externalConsent: boolean;
  canProposeMemory: boolean;
  onClose: () => void;
  onToggleStreaming: () => void;
  onRequestFullPrompt: () => void;
  onToggleProvenance: () => void;
  onProviderChange: (provider: HermesProvider) => void;
  onExternalConsentChange: (consent: boolean) => void;
  onInputChange: (value: string) => void;
  onSend: () => void;
  onProposeMemory: (message: HermesChatMessage) => void;
}

export function HermesPanel({
  subjectName,
  hasOwner,
  hasCertifiedNatal,
  hasCertifiedTransit,
  messages,
  input,
  loading,
  showProvenance,
  memoryStatus,
  lastLatencyMs,
  streamingEnabled,
  provider,
  externalConsent,
  canProposeMemory,
  onClose,
  onToggleStreaming,
  onRequestFullPrompt,
  onToggleProvenance,
  onProviderChange,
  onExternalConsentChange,
  onInputChange,
  onSend,
  onProposeMemory,
}: HermesPanelProps) {
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  return (
    <aside
      className="hermes-panel fixed inset-x-3 bottom-3 z-50 flex h-[min(620px,calc(100dvh-24px))] flex-col overflow-hidden rounded-2xl aurea-modal animate-in slide-in-from-bottom-10 fade-in sm:inset-x-auto sm:bottom-6 sm:right-6"
      aria-label={`Hermes — estudo de ${subjectName}`}
    >
      <div className="aurea-shell-dark px-4 py-3 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-gold/20 flex items-center justify-center">
            <Sparkles size={16} className="text-[var(--aurea-gold)]" />
          </div>
          <div>
            <p className="text-[11px] font-bold text-white uppercase tracking-wider">Hermes</p>
            <p className="text-[8px] text-[var(--aurea-gold)]/70 uppercase tracking-widest">
              {hasOwner ? `Mapa em foco · ${subjectName}` : 'Assistente de estudo'}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onToggleStreaming}
            className={`rounded px-2 py-1 text-sm font-medium transition ${streamingEnabled ? 'bg-emerald-600 text-white' : 'bg-stone-200 text-stone-800'}`}
            title={streamingEnabled ? 'Streaming: ligado' : 'Streaming: desligado'}
          >
            {streamingEnabled ? 'Streaming' : 'No Stream'}
          </button>
          <button
            type="button"
            onClick={onRequestFullPrompt}
            className="rounded px-2 py-1 text-sm font-medium bg-yellow-400 text-stone-900 hover:bg-yellow-500 transition"
            title="Enviar prompt completo na próxima mensagem"
          >
            Modo Completo
          </button>
          <button
            onClick={onClose}
            className="rounded p-2 text-white/80 transition-colors hover:bg-white/10 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold"
            aria-label="Fechar Hermes"
            title="Fechar Hermes"
          >
            <X size={16} />
          </button>
        </div>
      </div>

      <div className="aurea-shell-dark px-3 py-2 border-t border-white/10 flex flex-wrap items-center gap-x-3 gap-y-1 text-[10px] text-[var(--aurea-text-on-dark)] shrink-0">
        <span>Céu: {hasCertifiedTransit ? 'certificado' : 'indisponível'}</span>
        <span>|</span>
        <span>Mapa natal: {hasCertifiedNatal ? 'certificado' : 'indisponível'}</span>
        <span>|</span>
        <span>Trânsitos pessoais: conexão pendente</span>
        <span>|</span>
        {lastLatencyMs !== null && (
          <span title={`Última resposta em ${Math.round(lastLatencyMs)} ms`} className="font-mono">
            Última resposta: {(lastLatencyMs / 1000).toFixed(2)}s
          </span>
        )}
        <span>|</span>
        <span>{memoryStatus}</span>
      </div>

      <div className="border-b border-gray-100 bg-[var(--aurea-surface)] px-3 py-2">
        <button
          type="button"
          onClick={onToggleProvenance}
          className="text-[10px] font-bold uppercase tracking-wide text-[#596a76] transition hover:text-[var(--aurea-gold-deep)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--aurea-gold)] focus-visible:ring-offset-2"
          aria-expanded={showProvenance}
        >
          {showProvenance ? 'Ocultar contexto e proveniência' : 'Ver contexto e proveniência'}
        </button>
        {showProvenance && (
          <div className="mt-2 flex flex-wrap gap-1.5 text-[10px] font-bold uppercase tracking-wide">
            <span
              className={hasCertifiedTransit ? 'rounded bg-emerald-100 px-1.5 py-1 text-emerald-800' : 'rounded bg-amber-100 px-1.5 py-1 text-amber-800'}
              title={hasCertifiedTransit ? 'Valores recebidos do motor' : 'Nenhum valor verificável foi recebido do motor'}
            >
              Cálculo {hasCertifiedTransit ? 'recebido' : 'indisponível'}
            </span>
            <span className="rounded bg-amber-100 px-1.5 py-1 text-amber-800" title="Uma regra só é usada quando a escola estiver declarada">Regra: não selecionada</span>
            <span className="rounded bg-sky-100 px-1.5 py-1 text-sky-800" title="Nenhuma fonte editorial foi carregada nesta conversa">Fonte: não selecionada</span>
            <span className="rounded bg-violet-100 px-1.5 py-1 text-violet-800" title="As hipóteses devem vir marcadas na resposta">Inferência Hermes</span>
            <span className="rounded bg-stone-200 px-1.5 py-1 text-stone-700" title="Apenas conteúdo fornecido pela pessoa entra como contexto">Anotação pessoal</span>
          </div>
        )}
      </div>

      <div className="messages-area flex-1 overflow-y-auto p-4 space-y-3 bg-[rgb(15,23,42)]">
        {messages.length === 0 && !loading && (
          <div className="rounded-3xl border border-white/10 bg-white/5 p-4 text-[0.95rem] leading-relaxed text-[#f8fafc]">
            Hermes está pronto para conversar. Envie uma pergunta para iniciar a investigação.
          </div>
        )}
        {messages.map((message, index) => (
          <div key={index} className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`message-bubble ${message.role === 'user' ? 'user-bubble text-right' : 'assistant-bubble text-left'}`}>
              <div>{message.content}</div>
              {message.role === 'assistant' && canProposeMemory && (
                <div className="message-action flex justify-end">
                  <button
                    type="button"
                    onClick={() => onProposeMemory(message)}
                    className="rounded-full border border-[var(--aurea-gold)] bg-[var(--aurea-gold)/10] px-3 py-1.5 text-[11px] font-bold uppercase tracking-[0.18em] text-[var(--aurea-gold)] transition hover:bg-[var(--aurea-gold)/20]"
                  >
                    Propor memória
                  </button>
                </div>
              )}
            </div>
          </div>
        ))}
        {loading && (
          <div className="flex justify-start">
            <div className="message-bubble assistant-bubble px-3 py-2 rounded-3xl">
              <div className="flex items-center gap-2 text-[0.8rem] text-[#e7e7ea]">
                <span className="inline-flex h-2.5 w-2.5 animate-pulse rounded-full bg-[var(--aurea-gold)]" />
                Hermes está pensando...
              </div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      <div className="p-3 border-t border-[var(--aurea-line)] bg-[var(--aurea-surface)] shrink-0">
        <div className="mb-2 flex flex-wrap items-center gap-x-3 gap-y-2 text-[10px] text-[var(--aurea-text-muted)]">
          <label className="flex items-center gap-1.5">
            <span className="font-bold uppercase tracking-wide">Provedor</span>
            <select
              value={provider}
              onChange={event => onProviderChange(event.target.value as HermesProvider)}
              className="rounded border border-[var(--aurea-line)] bg-[var(--aurea-surface)] px-2 py-1 text-[10px] font-semibold text-[var(--aurea-text)]"
              aria-label="Provedor do Hermes"
            >
              <option value="openai">ChatGPT / OpenAI</option>
              <option value="hermes_gateway">Hermes Gateway</option>
            </select>
          </label>
          <label className="flex items-center gap-1.5">
            <input
              type="checkbox"
              checked={externalConsent}
              onChange={event => onExternalConsentChange(event.target.checked)}
            />
            <span>Permito enviar esta conversa ao provedor selecionado</span>
          </label>
        </div>
        <div className="flex gap-2">
          <input
            className="aurea-input flex-1 rounded-xl px-3 py-2 text-[13px] outline-none transition-colors focus-visible:ring-2 focus-visible:ring-[var(--aurea-gold)]"
            placeholder="Pergunte ao Hermes..."
            aria-label="Pergunte ao Hermes"
            value={input}
            onChange={event => onInputChange(event.target.value)}
            onKeyDown={event => {
              if (event.key === 'Enter' && !event.shiftKey && externalConsent) onSend();
            }}
          />
          <button
            onClick={onSend}
            disabled={loading || !input.trim() || !externalConsent}
            className="aurea-button-primary flex h-[42px] w-[42px] items-center justify-center rounded-xl transition-all hover:bg-[var(--aurea-gold)] hover:text-[var(--aurea-navy)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--aurea-gold)] focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-30"
            aria-label="Enviar mensagem ao Hermes"
            title="Enviar"
          >
            <Send size={14} />
          </button>
        </div>
      </div>
    </aside>
  );
}
