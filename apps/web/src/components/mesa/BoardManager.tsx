import { useEffect, useRef, useState } from 'react';
import { AlertCircle, Clock, LayoutGrid, Plus, Sparkles, Trash2 } from 'lucide-react';
import { deleteBoard, listBoards, saveBoard } from '../../services/notebook';
import type { BoardSummary } from '../../services/notebook';

type BoardManagerProps = {
  onOpen: (meta: BoardSummary) => void;
  intentError: string | null;
};

const uid = () => `board_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;

export const BoardManager = ({ onOpen, intentError }: BoardManagerProps) => {
  const [boards, setBoards] = useState<BoardSummary[]>([]);
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState('');
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [currentTime, setCurrentTime] = useState(() => Date.now());
  const inputRef = useRef<HTMLInputElement>(null);

  const loadBoards = async () => {
    try {
      const list = await listBoards();
      // sort by updated_at descending
      const sorted = (list || []).sort((a, b) => b.updatedAt - a.updatedAt);
      setBoards(sorted);
    } catch (e) {
      console.error('Failed to list boards', e);
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => { void loadBoards(); }, 0);
    return () => clearTimeout(timer);
  }, []);
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(Date.now()), 60000);
    return () => clearInterval(timer);
  }, []);
  useEffect(() => { if (creating) setTimeout(() => inputRef.current?.focus(), 50); }, [creating]);

  const create = async () => {
    const name = newName.trim() || `Caderno ${boards.length + 1}`;
    const newId = uid();
    await saveBoard({ id: newId, name, nodes: [], edges: [] });
    setCreating(false);
    setNewName('');
    onOpen({ id: newId, name, updatedAt: Date.now() });
  };

  const remove = async (id: string) => {
    await deleteBoard(id);
    setConfirmDelete(null);
    loadBoards();
  };

  const fmt = (ts: number) => {
    const normalizedTs = ts > 0 && ts < 1_000_000_000_000 ? ts * 1000 : ts;
    const d = new Date(normalizedTs);
    const diff = currentTime - normalizedTs;
    if (diff < 60000) return 'agora mesmo';
    if (diff < 3600000) return `${Math.floor(diff / 60000)}min atrás`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}h atrás`;
    return d.toLocaleDateString('pt-BR');
  };

  return (
    <div className="absolute inset-0 overflow-y-auto" style={{ background: 'var(--aurea-bg)', fontFamily: 'var(--font-body)' }}>
      <div className="max-w-5xl mx-auto px-5 py-8 sm:px-8 sm:py-12">
        {/* Header */}
        <div className="mb-10 flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <LayoutGrid size={18} style={{ color: 'var(--color-gold)' }} />
              <span className="text-xs font-bold uppercase tracking-[0.2em]" style={{ color: 'var(--color-gold)' }}>Caderno Vivo</span>
            </div>
            <h1 className="aurea-page-title text-2xl">Seus cadernos</h1>
            <p className="text-sm color: var(--aurea-text-muted) mt-1">Cada caderno é um espaço vivo de estudo e criação</p>
          </div>
          <button
            onClick={() => setCreating(true)}
            className="aurea-button-primary flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold transition-all hover:opacity-90 active:scale-95"
          >
            <Plus size={16} /> Novo caderno
          </button>
        </div>

        {intentError && (
          <div role="alert" className="mb-6 flex items-start gap-3 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">
            <AlertCircle size={18} className="mt-0.5 shrink-0" aria-hidden="true" />
            <p>{intentError}</p>
          </div>
        )}

        {/* Create modal inline */}
        {creating && (
          <div className="mb-6 p-5 rounded-2xl border-2 border-dashed" style={{ borderColor: 'var(--aurea-line)', background: 'var(--aurea-surface)' }}>
            <p className="text-xs font-semibold color: var(--aurea-text-muted) mb-3 uppercase tracking-wider">Nome do novo caderno</p>
            <div className="flex flex-col gap-3 sm:flex-row">
              <input
                ref={inputRef}
                value={newName}
                onChange={e => setNewName(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') create(); if (e.key === 'Escape') setCreating(false); }}
                placeholder="Ex: Estudo de Mercúrio, Planejamento semanal..."
            className="flex-1 px-4 py-2.5 text-sm outline-none transition-all"
              />
              <button onClick={create} className="aurea-button-primary px-5 py-2.5 rounded-xl text-sm font-semibold">Criar</button>
              <button onClick={() => { setCreating(false); setNewName(''); }} className="px-4 py-2.5 rounded-xl text-sm color: var(--aurea-text-muted) hover:color: var(--aurea-text) transition-all">Cancelar</button>
            </div>
          </div>
        )}

        {/* Board grid */}
        {boards.length === 0 && !creating ? (
          <div className="flex flex-col items-center justify-center py-32 text-center">
            <div className="w-16 h-16 rounded-2xl flex items-center justify-center mb-4" style={{ background: '#F3F3F1' }}>
              <LayoutGrid size={24} style={{ color: '#BDBDBD' }} />
            </div>
            <p className="text-sm font-semibold color: var(--aurea-text-muted)">Nenhum caderno ainda</p>
            <p className="text-xs text-gray-300 mt-1 mb-6">Crie seu primeiro espaço de estudo e criação</p>
            <button onClick={() => setCreating(true)} className="aurea-button-primary flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold">
              <Plus size={15} /> Criar primeiro caderno
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {boards.map(board => (
              <div
                key={board.id}
                role="button"
                tabIndex={0}
                aria-label={`Abrir caderno ${board.name}`}
                className="group relative rounded-2xl overflow-hidden cursor-pointer transition-all hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold focus-visible:ring-offset-2"
                style={{ background: 'var(--aurea-surface)', border: '1px solid var(--aurea-line)', boxShadow: '0 8px 24px rgba(24,42,58,0.07)' }}
                onClick={() => onOpen(board)}
                onKeyDown={event => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); onOpen(board); } }}
              >
                {/* Preview area */}
                <div className="h-36 relative overflow-hidden" style={{ background: 'var(--aurea-surface-warm)' }}>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <Sparkles size={20} style={{ color: '#DCDCDC' }} />
                  </div>
                  {/* Delete button */}
                  <button
                    type="button"
                    aria-label={`Apagar caderno ${board.name}`}
                    title="Apagar caderno"
                    className="absolute top-2 right-2 w-7 h-7 rounded-lg flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all hover:background: rgba(239,68,68,0.08)"
                    style={{ background: 'rgba(255,255,255,0.9)', border: '1px solid #EBEBEB' }}
                    onClick={e => { e.stopPropagation(); setConfirmDelete(board.id); }}
                  >
                    <Trash2 size={12} style={{ color: '#E57373' }} />
                  </button>
                </div>
                {/* Info */}
                <div className="px-4 py-3">
                  <p className="text-sm font-semibold text-[var(--aurea-text)] truncate">{board.name}</p>
                  <div className="flex items-center gap-1 mt-1">
                    <Clock size={10} style={{ color: '#BDBDBD' }} />
                    <span className="text-xs color: var(--aurea-text-muted)">{fmt(board.updatedAt || 0)}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Confirm delete dialog */}
      {confirmDelete && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm" onClick={() => setConfirmDelete(null)}>
           <div role="dialog" aria-modal="true" aria-labelledby="delete-caderno-title" className="aurea-modal rounded-2xl p-6 w-80 shadow-2xl" onClick={e => e.stopPropagation()}>
             <h3 id="delete-caderno-title" className="text-sm font-bold color: var(--aurea-text) mb-2">Apagar caderno?</h3>
            <p className="text-xs color: var(--aurea-text-muted) mb-5">Esta ação não pode ser desfeita. Todos os cards serão removidos.</p>
            <div className="flex justify-end gap-2">
              <button onClick={() => setConfirmDelete(null)} className="px-4 py-2 text-sm color: var(--aurea-text-muted) hover:color: var(--aurea-text) transition-all">Cancelar</button>
              <button onClick={() => remove(confirmDelete)} className="px-5 py-2 rounded-xl text-sm font-semibold text-white" style={{ background: '#EF4444' }}>Apagar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
