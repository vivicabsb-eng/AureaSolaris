import React, { useMemo, useState } from 'react';
import { DiarioProvider, useDiario } from '../context/DiarioContext';
import { DiarioSidebar } from './diario/DiarioSidebar';
import DiarioEditor from './diario/DiarioEditor';
import { StudyArchive } from './diario/StudyArchive';
import { History, PenLine, Plus } from 'lucide-react';
import { useIdentity } from '../features/identity/IdentityContext';

type DiarioViewProps = {
  onOpenStudy?: (boardId: string, nodeId: number) => void;
};

const DiarioViewInner: React.FC<DiarioViewProps> = ({ onOpenStudy = () => undefined }) => {
  const { activeEntry, createEntry, isLoading } = useDiario();
  const { profiles, mapSubjects, activeProfileId, activeSubjectId, setActiveSubjectId } = useIdentity();
  const [mode, setMode] = useState<'history' | 'notes'>('history');

  const availableMaps = useMemo(() => {
    const subjects = mapSubjects?.filter((map) => map.ownerProfileId === activeProfileId) || [];
    return subjects.length
      ? subjects
      : profiles
          .filter((profile) => profile.id === activeProfileId)
          .map((profile) => ({ id: profile.id, name: profile.name, kind: 'profile' as const, ownerProfileId: profile.id, source: profile }));
  }, [activeProfileId, mapSubjects, profiles]);

  const focusedMap = availableMaps.find((map) => map.id === activeSubjectId) || availableMaps[0];
  const focusedSubjectId = focusedMap?.id || '';

  const createPersonalNote = async () => {
    setMode('notes');
    await createEntry();
  };

  if (isLoading) {
    return (
      <div className="flex h-full items-center justify-center" style={{ background: 'var(--aurea-surface)' }}>
        <div className="flex items-center gap-3" style={{ color: 'var(--aurea-text-muted)' }}>
          <div className="h-5 w-5 animate-spin rounded-full border-2" style={{ borderColor: 'var(--aurea-gold-deep)', borderTopColor: 'transparent' }} />
          <span className="text-xs font-medium uppercase tracking-wider">Carregando registros locais…</span>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden font-sans" style={{ background: 'var(--aurea-surface)', color: 'var(--aurea-text)' }}>
      <header className="flex shrink-0 flex-wrap items-center justify-between gap-3 border-b px-5 py-3" style={{ borderColor: 'var(--aurea-line)', background: 'var(--aurea-surface-warm)' }}>
        <div>
          <h1 className="text-xs font-bold uppercase tracking-[0.22em] text-[var(--aurea-text)]">Histórico & registros</h1>
          <p className="mt-1 text-[11px] text-[#596a76]">Notas pessoais e estudos dos Cadernos Vivos</p>
        </div>

        <div className="flex items-center gap-3">
          <label className="aurea-input flex min-w-[220px] flex-col gap-1 rounded-xl px-3 py-2">
            <span className="text-[10px] font-bold uppercase tracking-wider" style={{ color: 'var(--aurea-text-muted)' }}>Mapa em foco</span>
            <select
              value={focusedSubjectId}
              onChange={(event) => setActiveSubjectId(event.target.value)}
              className="bg-transparent text-[11px] font-bold outline-none"
              aria-label="Mapa em foco no Histórico"
            >
              {availableMaps.map((map) => <option key={map.id} value={map.id}>{map.name}</option>)}
            </select>
          </label>

          <div className="flex rounded-lg p-1" aria-label="Modo do histórico">
            <button
              type="button"
              onClick={() => setMode('history')}
              aria-pressed={mode === 'history'}
              className={`flex items-center gap-2 rounded-md px-3 py-1.5 text-[11px] font-semibold transition ${mode === 'history' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-800'}`}
            >
              <History size={13} aria-hidden="true" />
              Histórico
            </button>
            <button
              type="button"
              onClick={() => setMode('notes')}
              aria-pressed={mode === 'notes'}
              className={`flex items-center gap-2 rounded-md px-3 py-1.5 text-[11px] font-semibold transition ${mode === 'notes' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-800'}`}
            >
              <PenLine size={13} aria-hidden="true" />
              Notas pessoais
            </button>
          </div>
          <button
            type="button"
            onClick={createPersonalNote}
            className="flex items-center gap-1.5 rounded-lg px-3 py-2 text-[11px] font-semibold transition"
            style={{ background: 'var(--aurea-gold)', color: '#fff' }}
          >
            <Plus size={13} aria-hidden="true" />
            Nova nota
          </button>
        </div>
      </header>

      <div className="min-h-0 flex-1">
        {mode === 'history' ? (
          <StudyArchive onOpenStudy={onOpenStudy} />
        ) : (
          <div className="flex h-full min-h-0 overflow-hidden">
            <DiarioSidebar />
            <div className="min-w-0 flex-1 p-4 lg:p-6" style={{ background: 'var(--aurea-bg)' }}>
              {activeEntry ? (
                <div className="mx-auto flex h-full w-full max-w-5xl flex-col">
                  <DiarioEditor key={activeEntry.id} entry={activeEntry} />
                </div>
              ) : (
                <EmptyState onCreate={createPersonalNote} />
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

const EmptyState = ({ onCreate }: { onCreate: () => Promise<void> }) => (
  <div className="flex h-full w-full flex-col items-center justify-center px-4 text-center">
    <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl border" style={{ borderColor: 'var(--aurea-line)', background: 'var(--aurea-surface-warm)', boxShadow: '0 1px 2px rgba(24,42,58,0.12)' }}>
      <PenLine size={22} className="text-gray-300" aria-hidden="true" />
    </div>
    <p className="text-sm font-semibold text-[var(--aurea-text)]">Selecione uma nota pessoal</p>
    <p className="mb-4 mt-1 max-w-sm text-xs leading-5 text-[#596a76]">
      As notas pessoais ficam no Diário; os estudos ligados a cards permanecem no Caderno Vivo e aparecem no histórico.
    </p>
    <button
      type="button"
      onClick={() => void onCreate()}
      className="rounded-lg border px-4 py-2 text-[11px] font-bold uppercase tracking-wider transition"
      style={{ borderColor: 'var(--aurea-line)', background: 'var(--aurea-surface)', color: 'var(--aurea-text)', boxShadow: '0 1px 2px rgba(24,42,58,0.12)' }}
    >
      Escrever nota pessoal
    </button>
  </div>
);

export const DiarioView: React.FC<DiarioViewProps> = (props) => (
  <DiarioProvider>
    <DiarioViewInner {...props} />
  </DiarioProvider>
);
