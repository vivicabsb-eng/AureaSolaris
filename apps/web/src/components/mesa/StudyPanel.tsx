import { useEffect, useRef } from 'react';
import {
  Bold,
  BookOpen,
  CheckSquare,
  Heading2,
  Italic,
  List,
  Maximize2,
  Quote,
} from 'lucide-react';
import type { CadernoNode } from '../../types/caderno';

type StudyPanelProps = {
  node: CadernoNode | null;
  boardName: string;
  saveState: 'idle' | 'saving' | 'saved' | 'error';
  onUpdate: (patch: Partial<CadernoNode>) => void;
  onExpandBoard: () => void;
};

const nodeTypeLabel: Record<CadernoNode['type'], string> = {
  sticky: 'Nota do mapa mental',
  text: 'Texto do mapa mental',
  checklist: 'Lista do mapa mental',
  image: 'Imagem do mapa mental',
  shape: 'Tópico do mapa mental',
};

export function StudyPanel({ node, boardName, saveState, onUpdate, onExpandBoard }: StudyPanelProps) {
  const contentRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (node) contentRef.current?.focus();
  }, [node]);

  const updateStudy = (studyContent: string) => {
    const now = Date.now();
    onUpdate({
      studyContent,
      studyCreatedAt: node?.studyCreatedAt || now,
      studyUpdatedAt: now,
    });
  };

  const insertMarkdown = (prefix: string, suffix = '') => {
    if (!node) return;
    const textarea = contentRef.current;
    const content = node.studyContent || '';
    if (!textarea) {
      updateStudy(`${content}${prefix}${suffix}`);
      return;
    }

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selectedText = content.slice(start, end);
    const next = `${content.slice(0, start)}${prefix}${selectedText}${suffix}${content.slice(end)}`;
    updateStudy(next);

    requestAnimationFrame(() => {
      textarea.focus();
      textarea.setSelectionRange(start + prefix.length, start + prefix.length + selectedText.length);
    });
  };

  const wordCount = node?.studyContent?.trim()
    ? node.studyContent.trim().split(/\s+/).length
    : 0;

  return (
    <aside
      className="absolute inset-0 z-40 flex min-w-0 flex-col border-l shadow-[-8px_0_24px_rgba(24,42,58,0.08)] lg:relative lg:inset-auto lg:z-auto lg:w-[46%] lg:min-w-[380px] lg:max-w-[720px] lg:shadow-none"
      style={{ borderColor: 'var(--aurea-line)', background: 'var(--aurea-surface-warm)' }}
      aria-label={"\u00C1rea de estudo do card selecionado"}
    >
      <header className="flex shrink-0 items-center justify-between border-b bg-white px-5 py-3" style={{ borderColor: 'var(--aurea-line)' }}>
        <div className="min-w-0">
          <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.18em] text-amber-700">
            <BookOpen size={13} aria-hidden="true" />
            Estudo do caderno
          </div>
          <p className="mt-1 truncate text-xs text-gray-400">{boardName}</p>
        </div>
        <button
          type="button"
          onClick={onExpandBoard}
          className="flex items-center gap-2 rounded-lg border bg-white px-3 py-2 text-[11px] font-semibold text-gray-600 transition hover:bg-[#FAF6EE]"
          style={{ borderColor: 'var(--aurea-line)' }}
          title="Ocultar a área de escrita e ampliar o Board"
        >
          <Maximize2 size={13} aria-hidden="true" />
          Expandir Board
        </button>
      </header>

      {!node ? (
        <div className="flex flex-1 items-center justify-center p-8 text-center">
          <div className="max-w-sm">
            <BookOpen className="mx-auto mb-4 text-amber-700/40" size={30} aria-hidden="true" />
            <h2 className="text-base font-semibold text-gray-800">Selecione um card para estudar</h2>
            <p className="mt-2 text-sm leading-6 text-gray-500">
              O card continua no mapa mental e o texto desenvolvido fica ligado a ele neste mesmo caderno.
            </p>
          </div>
        </div>
      ) : (
        <div className="flex min-h-0 flex-1 flex-col">
          <div className="shrink-0 border-b bg-white px-6 pb-4 pt-5" style={{ borderColor: 'var(--aurea-line)' }}>
            <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-gray-400">
              {nodeTypeLabel[node.type]}
            </p>
            <label className="mt-3 block text-[11px] font-semibold text-gray-500" htmlFor={`study-title-${node.id}`}>
              Título ou síntese do card
            </label>
            <textarea
              id={`study-title-${node.id}`}
              value={node.text || ''}
              onChange={event => onUpdate({ text: event.target.value, studyUpdatedAt: Date.now() })}
              rows={2}
              className="mt-1 w-full resize-none border-0 bg-transparent p-0 text-xl font-semibold leading-snug text-gray-900 outline-none"
            />
          </div>

          <div className="flex shrink-0 items-center gap-1 border-b bg-[#FAF6EE] px-5 py-2" aria-label="Formatação do estudo">
            <button type="button" onClick={() => insertMarkdown('**', '**')} className="rounded-md p-2 text-gray-500 hover:bg-white hover:text-gray-900" title="Negrito">
              <Bold size={14} aria-hidden="true" />
            </button>
            <button type="button" onClick={() => insertMarkdown('*', '*')} className="rounded-md p-2 text-gray-500 hover:bg-white hover:text-gray-900" title="Itálico">
              <Italic size={14} aria-hidden="true" />
            </button>
            <button type="button" onClick={() => insertMarkdown('## ', '\n')} className="rounded-md p-2 text-gray-500 hover:bg-white hover:text-gray-900" title="Título de seção">
              <Heading2 size={14} aria-hidden="true" />
            </button>
            <button type="button" onClick={() => insertMarkdown('> ', '\n')} className="rounded-md p-2 text-gray-500 hover:bg-white hover:text-gray-900" title="Citação">
              <Quote size={14} aria-hidden="true" />
            </button>
            <button type="button" onClick={() => insertMarkdown('- ', '\n')} className="rounded-md p-2 text-gray-500 hover:bg-white hover:text-gray-900" title="Lista">
              <List size={14} aria-hidden="true" />
            </button>
            <button type="button" onClick={() => insertMarkdown('- [ ] ', '\n')} className="rounded-md p-2 text-gray-500 hover:bg-white hover:text-gray-900" title="Item de estudo">
              <CheckSquare size={14} aria-hidden="true" />
            </button>
          </div>

          <div className="flex min-h-0 flex-1 flex-col px-6 py-5">
            <label className="mb-2 text-[11px] font-semibold text-gray-500" htmlFor={`study-content-${node.id}`}>
              Desenvolvimento do estudo
            </label>
            <textarea
              ref={contentRef}
              id={`study-content-${node.id}`}
              value={node.studyContent || ''}
              onChange={event => updateStudy(event.target.value)}
              className="min-h-0 flex-1 resize-none border-0 bg-transparent text-[15px] leading-7 text-gray-700 outline-none"
              spellCheck
            />
          </div>

          <footer className="flex shrink-0 items-center justify-between border-t bg-white px-6 py-3 text-[10px] font-semibold uppercase tracking-[0.12em] text-gray-400" style={{ borderColor: 'var(--aurea-line)' }}>
            <span>{wordCount} {wordCount === 1 ? 'palavra' : 'palavras'}</span>
            <span aria-live="polite" className={saveState === 'error' ? 'text-red-600' : saveState === 'saved' ? 'text-emerald-600' : ''}>
              {saveState === 'saving' && 'Salvando localmente…'}
              {saveState === 'saved' && 'Salvo no Caderno'}
              {saveState === 'error' && 'Não foi possível salvar'}
              {saveState === 'idle' && 'Salvamento local automático'}
            </span>
          </footer>
        </div>
      )}
    </aside>
  );
}
