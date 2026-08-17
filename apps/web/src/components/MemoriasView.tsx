import React, { useCallback, useEffect, useState } from 'react';
import { useIdentity } from '../features/identity/IdentityContext';
import {
  listHermesMemories,
  reviewHermesMemory,
  HermesMemory,
} from '../services/chat';
import { KnowledgeLibraryPanel } from './KnowledgeLibraryPanel';

export const MemoriasView: React.FC = () => {
  const { activeProfile } = useIdentity();
  const [memories, setMemories] = useState<HermesMemory[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadMemories = useCallback(async () => {
    if (!activeProfile) {
      setMemories([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const response = await listHermesMemories({ ownerId: activeProfile.id, limit: 50 });
      setMemories(response.memories);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Falha ao carregar memorias.');
    } finally {
      setLoading(false);
    }
  }, [activeProfile]);

  useEffect(() => {
    void loadMemories();
  }, [loadMemories]);

  const handleReview = async (memoryId: string, decision: 'approve' | 'revoke' | 'forget') => {
    if (!activeProfile) return;
    try {
      await reviewHermesMemory({ ownerId: activeProfile.id, memoryId, decision });
      void loadMemories();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Falha ao revisar a memoria.');
    }
  };

  const handleMemoryStudy = (memory: HermesMemory) => {
    window.dispatchEvent(new CustomEvent('open-caderno-vivo', {
      detail: {
        type: 'create-study',
        topic: memory.memory_type || 'Estudo Hermes',
        seedNote: `Memória Hermes aprovada\n\n${memory.content}${memory.evidence_note ? `\n\nEvidência: ${memory.evidence_note}` : ''}`,
      },
    }));
  };

  if (!activeProfile) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="text-center">
          <h2 className="text-lg font-bold mb-2">Memória do Hermes</h2>
          <p className="text-sm opacity-50">Selecione um perfil para ver a memória Hermes privada.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full min-h-0 flex-col gap-4 p-6 overflow-y-auto no-scrollbar">
      <div className="rounded-3xl border border-white/10 bg-[var(--aurea-surface)] p-6 shadow-sm">
        <h2 className="text-xl font-bold">Memória do Hermes</h2>
        <p className="mt-2 text-sm text-[var(--aurea-text-muted)]">
          Estes itens são os registros privados de estudo do Hermes para o perfil atual.
        </p>
      </div>

      <KnowledgeLibraryPanel
        title="Consulta rápida à biblioteca"
        description="A memória privada do Hermes vive aqui. A biblioteca editorial completa também ganhou uma área própria no menu do sistema."
        compact
      />

      {error && (
        <div className="rounded-3xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {error}
        </div>
      )}

      {loading ? (
        <div className="rounded-3xl border border-white/10 bg-[var(--aurea-surface)] p-6 text-sm text-[var(--aurea-text-muted)]">Carregando memórias...</div>
      ) : memories.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-white/20 bg-[var(--aurea-surface)] p-6 text-sm text-[var(--aurea-text-muted)]">
          Nenhuma memória Hermes foi registrada ainda.
        </div>
      ) : (
        <div className="grid gap-4">
          {memories.map(memory => (
            <div key={memory.id} className="rounded-3xl border border-white/10 bg-[var(--aurea-surface)] p-5 shadow-sm">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <span className="text-[11px] uppercase tracking-[0.2em] text-[var(--aurea-gold)]">{memory.memory_type}</span>
                  <p className="mt-2 text-base font-semibold text-[var(--aurea-text)]">{memory.content}</p>
                </div>
                <div className="text-right text-[11px] text-[var(--aurea-text-muted)]">
                  <div>Status: {memory.status}</div>
                  <div>Confiança: {memory.confidence}</div>
                </div>
              </div>
              {memory.evidence_note && (
                <div className="mt-3 rounded-2xl bg-[var(--aurea-navy)]/10 p-3 text-sm text-[var(--aurea-text)]">
                  <strong className="block text-[0.75rem] uppercase tracking-[0.18em] text-[var(--aurea-gold)]">Evidência</strong>
                  <p className="mt-1 whitespace-pre-line">{memory.evidence_note}</p>
                </div>
              )}
              <div className="mt-4 flex flex-wrap gap-2">
                {memory.status === 'approved' && (
                  <button
                    className="rounded-xl bg-sky-600 px-3 py-2 text-sm font-bold text-white hover:bg-sky-500"
                    onClick={() => handleMemoryStudy(memory)}
                  >
                    Estudar no Caderno
                  </button>
                )}
                <button
                  className="rounded-xl bg-emerald-600 px-3 py-2 text-sm font-bold text-white hover:bg-emerald-500"
                  onClick={() => void handleReview(memory.id, 'approve')}
                >
                  Aprovar
                </button>
                <button
                  className="rounded-xl bg-amber-500 px-3 py-2 text-sm font-bold text-white hover:bg-amber-400"
                  onClick={() => void handleReview(memory.id, 'revoke')}
                >
                  Revogar
                </button>
                <button
                  className="rounded-xl bg-stone-700 px-3 py-2 text-sm font-bold text-white hover:bg-stone-600"
                  onClick={() => void handleReview(memory.id, 'forget')}
                >
                  Esquecer
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
