/**
 * Chat Service — Comunicação com Hermes via Sidecar API (porta 9876)
 * O sidecar procura para o Hermes Gateway (porta 20128).
 */

import { safeInvoke } from '../utils/tauri';
import { LOCAL_API_URL } from '../utils/api';

const SIDECAR_URL = LOCAL_API_URL;

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface ChatRequest {
  messages: ChatMessage[];
  context?: string;
  provider?: 'openai' | 'hermes_gateway';
  allowExternal?: boolean;
}

export interface ChatResponse {
  reply: string;
}

export type HermesStoredRole = 'user' | 'hermes' | 'system';

export type HermesProvenanceKind =
  | 'personal_statement'
  | 'personal_note'
  | 'calculated_fact'
  | 'source_excerpt'
  | 'hermes_inference'
  | 'system_notice';

export interface HermesThread {
  id: string;
  owner_id: string;
  title: string;
  topic_key: string;
  status: string;
  created_at: string;
  updated_at: string;
}

export interface HermesStoredMessage {
  id: string;
  owner_id: string;
  thread_id: string;
  role: HermesStoredRole;
  content: string;
  provenance_kind: HermesProvenanceKind;
  calculation_receipt_hash: string | null;
  source_refs: string[];
  created_at: string;
}

export interface HermesMemory {
  id: string;
  owner_id: string;
  memory_type: string;
  content: string;
  evidence_note: string | null;
  status: string;
  topic_key: string | null;
  subject_kind: string | null;
  subject_ref: string | null;
  source_thread_id: string | null;
  source_message_id: string | null;
  confidence: string;
  created_at: string;
  updated_at: string;
  approved_at: string | null;
  revoked_at: string | null;
  deleted_at: string | null;
}

async function readJsonOrThrow<T>(res: Response, fallback: string): Promise<T> {
  const data = await res.json().catch(() => null);
  if (!res.ok) {
    const detail = typeof data?.detail === 'object' ? data.detail?.error : data?.detail;
    throw new Error(detail || data?.error || fallback);
  }
  return data as T;
}

async function privateSidecarRequest<T>(
  method: 'GET' | 'POST',
  path: string,
  options: { query?: Record<string, string | number>; body?: Record<string, unknown> } = {},
): Promise<T> {
  const result = await safeInvoke<T>('private_sidecar_request', {
    method,
    path,
    query: options.query,
    body: options.body,
  });
  if (result === null) throw new Error('A sessão privada não está disponível neste computador.');
  return result;
}

/**
 * Envia mensagem para Hermes via /chat (resposta única)
 */
export async function sendChatMessage(
  messages: ChatMessage[],
  context?: string,
  systemPromptOverride?: string,
  allowExternal: boolean = false,
  provider?: 'openai' | 'hermes_gateway',
): Promise<string> {
  const res = await fetch(`${SIDECAR_URL}/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      messages,
      context,
      system_prompt_override: systemPromptOverride,
      allow_external: allowExternal,
      provider,
    }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(err.error || `Chat falhou: ${res.status}`);
  }

  const data: ChatResponse = await res.json();
  return data.reply;
}

export async function openHermesThread(params: {
  ownerId: string;
  topicKey: string;
  title: string;
}): Promise<{ created: boolean; thread: HermesThread }> {
  return privateSidecarRequest('POST', '/hermes/threads/open', {
    body: {
      owner_id: params.ownerId,
      topic_key: params.topicKey,
      title: params.title,
    },
  });
}

export async function getHermesThreadContext(params: {
  ownerId: string;
  threadId: string;
  limit?: number;
}): Promise<{ thread: HermesThread; messages: HermesStoredMessage[] }> {
  return privateSidecarRequest('GET', `/hermes/threads/${params.threadId}/context`, {
    query: {
      owner_id: params.ownerId,
      limit: params.limit ?? 50,
    },
  });
}

export async function appendHermesMessage(params: {
  ownerId: string;
  threadId: string;
  role: HermesStoredRole;
  content: string;
  provenanceKind: HermesProvenanceKind;
  calculationReceiptHash?: string | null;
  sourceRefs?: string[];
}): Promise<HermesStoredMessage> {
  return privateSidecarRequest('POST', `/hermes/threads/${params.threadId}/messages`, {
    body: {
      owner_id: params.ownerId,
      role: params.role,
      content: params.content,
      provenance_kind: params.provenanceKind,
      calculation_receipt_hash: params.calculationReceiptHash || null,
      source_refs: params.sourceRefs || [],
    },
  });
}

export async function proposeHermesMemory(params: {
  ownerId: string;
  content: string;
  memoryType: string;
  evidenceNote?: string;
  topicKey?: string;
  subjectKind?: string;
  subjectRef?: string;
  sourceThreadId?: string;
  sourceMessageId?: string;
  confidence?: string;
}): Promise<HermesMemory> {
  return privateSidecarRequest('POST', '/hermes/memories/propose', {
    body: {
      owner_id: params.ownerId,
      content: params.content,
      memory_type: params.memoryType,
      evidence_note: params.evidenceNote || null,
      topic_key: params.topicKey || null,
      subject_kind: params.subjectKind || null,
      subject_ref: params.subjectRef || null,
      source_thread_id: params.sourceThreadId || null,
      source_message_id: params.sourceMessageId || null,
      confidence: params.confidence || 'inferred',
    },
  });
}

export async function listHermesMemories(params: {
  ownerId: string;
  status?: string;
  limit?: number;
}): Promise<{ memories: HermesMemory[] }> {
  const query: Record<string, string | number> = {
    owner_id: params.ownerId,
    limit: params.limit ?? 50,
  };
  if (params.status) query.status = params.status;
  return privateSidecarRequest('GET', '/hermes/memories', { query });
}

export async function reviewHermesMemory(params: {
  ownerId: string;
  memoryId: string;
  decision: 'approve' | 'revoke' | 'forget';
}): Promise<HermesMemory> {
  return privateSidecarRequest('POST', `/hermes/memories/${params.memoryId}/review`, {
    body: { owner_id: params.ownerId, decision: params.decision },
  });
}

export interface KnowledgeSourceResult {
  id: string;
  title: string;
  author: string | null;
  publisher: string | null;
  published_year: number | null;
  source_kind: string;
  tradition: string | null;
  language: string | null;
  canonical_url: string | null;
}

export interface KnowledgeConceptResult {
  id: string;
  label: string;
  concept_type: string;
  description: string | null;
  status: string;
  created_at: string;
}

export interface KnowledgeClaimResult {
  id: string;
  concept_id: string;
  source_id: string;
  statement: string;
  tradition: string | null;
  interpretation_scope: string | null;
  evidence_grade: string;
  editorial_status: string;
  source_locator: string | null;
  source_title: string;
  source_author: string | null;
}

export interface KnowledgeSearchResponse {
  concepts: KnowledgeConceptResult[];
  claims: KnowledgeClaimResult[];
  sources: KnowledgeSourceResult[];
}

export interface StorageDatabaseDiagnostic {
  name: string;
  integrity: string;
  migration_versions: string[];
}

export interface StorageDiagnosticResponse {
  private_database: StorageDatabaseDiagnostic;
  knowledge_database: StorageDatabaseDiagnostic;
  legacy_import_status: string;
}

export async function searchKnowledge(params: {
  query: string;
  limit?: number;
  types?: Array<'concept' | 'claim' | 'source'>;
}): Promise<KnowledgeSearchResponse> {
  const search = new URLSearchParams({
    query: params.query,
    limit: String(params.limit ?? 20),
  });
  if (params.types?.length) {
    search.set('types', params.types.join(','));
  }

  const res = await fetch(`${SIDECAR_URL}/knowledge/search?${search.toString()}`);
  return readJsonOrThrow(res, 'Nao foi possivel buscar na enciclopedia.');
}

export async function getStorageDiagnostic(): Promise<StorageDiagnosticResponse> {
  return privateSidecarRequest('GET', '/storage/diagnostic');
}

/**
 * Envia mensagem para Hermes via /chat/stream (SSE streaming)
 * Chama onChunk para cada pedaço recebido, onComplete quando termina.
 */
export async function sendChatMessageStream(
  messages: ChatMessage[],
  context: string | undefined,
  onChunk: (text: string) => void,
  onComplete: () => void,
  onError: (err: Error) => void,
  allowExternal: boolean = false,
  provider?: 'openai' | 'hermes_gateway',
): Promise<void> {
  try {
    const res = await fetch(`${SIDECAR_URL}/chat/stream`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ messages, context, allow_external: allowExternal, provider }),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: res.statusText }));
      throw new Error(err.error || `Chat stream falhou: ${res.status}`);
    }

    const reader = res.body?.getReader();
    if (!reader) throw new Error('ReadableStream não disponível');

    const decoder = new TextDecoder();
    let buffer = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        if (line.startsWith('data: ')) {
          const data = line.slice(6).trim();
          if (data === '[DONE]') {
            onComplete();
            return;
          }
          try {
            const parsed = JSON.parse(data);
            if (parsed.error) throw new Error(parsed.error);
            if (parsed.content) onChunk(parsed.content);
          } catch {
            // Skip malformed chunks
          }
        }
      }
    }

    onComplete();
  } catch (err) {
    onError(err instanceof Error ? err : new Error(String(err)));
  }
}

/**
 * Verifica se o sidecar está vivo
 */
export async function checkChatHealth(): Promise<boolean> {
  try {
    const res = await fetch(`${SIDECAR_URL}/health`);
    return res.ok;
  } catch {
    return false;
  }
}
