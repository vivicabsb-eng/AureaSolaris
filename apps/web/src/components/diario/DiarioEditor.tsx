import { useCallback, useEffect, useRef, useState } from 'react';
import { Bold, CheckSquare, Heading2, Italic, List, Quote, Trash2 } from 'lucide-react';
import { useDiario } from '../../context/DiarioContext';

interface DiarioEditorProps {
  entry: {
    id: string;
    title: string;
    content: string;
    createdAt?: string;
    created_at?: string;
  };
}

const entryDate = (entry: DiarioEditorProps['entry']) => {
  const value = entry.createdAt || entry.created_at;
  if (!value) return 'Data não registrada';
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return 'Data não registrada';
  return parsed.toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' });
};

const DiarioEditor = ({ entry }: DiarioEditorProps) => {
  const { updateEntry, deleteEntry } = useDiario();
  const [title, setTitle] = useState(entry.title || 'Nota sem título');
  const [content, setContent] = useState(entry.content || '');
  const [saveStatus, setSaveStatus] = useState<'saved' | 'saving' | 'unsaved' | 'error'>('saved');
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const titleInputRef = useRef<HTMLInputElement>(null);
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const saveRequestRef = useRef(0);
  const titleRef = useRef(title);
  const contentRef = useRef(content);
  const lastSavedRef = useRef({ title, content });

  useEffect(() => { titleRef.current = title; }, [title]);
  useEffect(() => { contentRef.current = content; }, [content]);

  useEffect(() => {
    if (entry.title === 'Nova Nota' && !entry.content) titleInputRef.current?.focus();
  }, [entry.content, entry.id, entry.title]);

  const persist = useCallback(async (nextTitle: string, nextContent: string) => {
    const request = ++saveRequestRef.current;
    setSaveStatus('saving');
    const saved = await updateEntry(entry.id, { title: nextTitle, content: nextContent });
    if (request !== saveRequestRef.current) return;
    if (saved) {
      lastSavedRef.current = { title: nextTitle, content: nextContent };
      setSaveStatus('saved');
    } else {
      setSaveStatus('error');
    }
  }, [entry.id, updateEntry]);

  const scheduleSave = useCallback((nextTitle: string, nextContent: string) => {
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    setSaveStatus('unsaved');
    saveTimerRef.current = setTimeout(() => void persist(nextTitle, nextContent), 600);
  }, [persist]);

  useEffect(() => () => {
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    if (titleRef.current !== lastSavedRef.current.title || contentRef.current !== lastSavedRef.current.content) {
      void updateEntry(entry.id, { title: titleRef.current, content: contentRef.current });
    }
  }, [entry.id, updateEntry]);

  const updateTitle = (value: string) => {
    setTitle(value);
    scheduleSave(value, content);
  };

  const updateContent = (value: string) => {
    setContent(value);
    scheduleSave(title, value);
  };

  const insertMarkdown = (prefix: string, suffix = '') => {
    const textarea = textareaRef.current;
    if (!textarea) return;
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selected = content.slice(start, end);
    const next = `${content.slice(0, start)}${prefix}${selected}${suffix}${content.slice(end)}`;
    updateContent(next);
    requestAnimationFrame(() => {
      textarea.focus();
      textarea.setSelectionRange(start + prefix.length, start + prefix.length + selected.length);
    });
  };

  const wordCount = content.trim() ? content.trim().split(/\s+/).length : 0;

  return (
    <div className="flex h-full min-h-0 w-full flex-col overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
      <div className="shrink-0 px-6 pb-3 pt-5">
        <label htmlFor={`diary-title-${entry.id}`} className="text-[10px] font-bold uppercase tracking-[0.16em] text-gray-400">
          Título da nota pessoal
        </label>
        <input
          ref={titleInputRef}
          id={`diary-title-${entry.id}`}
          value={title}
          onChange={event => updateTitle(event.target.value)}
          className="mt-2 w-full border-0 bg-transparent text-2xl font-bold text-gray-900 outline-none"
        />
        <p className="mt-2 text-[11px] text-gray-400">{entryDate(entry)}</p>
      </div>

      <div className="flex shrink-0 items-center gap-1 border-y border-gray-100 bg-gray-50/70 px-6 py-2.5" aria-label="Formatação da nota">
        <button type="button" onClick={() => insertMarkdown('**', '**')} className="rounded-lg p-1.5 text-gray-500 hover:bg-white hover:text-gray-900" title="Negrito">
          <Bold size={14} aria-hidden="true" />
        </button>
        <button type="button" onClick={() => insertMarkdown('*', '*')} className="rounded-lg p-1.5 text-gray-500 hover:bg-white hover:text-gray-900" title="Itálico">
          <Italic size={14} aria-hidden="true" />
        </button>
        <button type="button" onClick={() => insertMarkdown('## ', '\n')} className="rounded-lg p-1.5 text-gray-500 hover:bg-white hover:text-gray-900" title="Título de seção">
          <Heading2 size={14} aria-hidden="true" />
        </button>
        <button type="button" onClick={() => insertMarkdown('> ', '\n')} className="rounded-lg p-1.5 text-gray-500 hover:bg-white hover:text-gray-900" title="Citação">
          <Quote size={14} aria-hidden="true" />
        </button>
        <button type="button" onClick={() => insertMarkdown('- ', '\n')} className="rounded-lg p-1.5 text-gray-500 hover:bg-white hover:text-gray-900" title="Lista">
          <List size={14} aria-hidden="true" />
        </button>
        <button type="button" onClick={() => insertMarkdown('- [ ] ', '\n')} className="rounded-lg p-1.5 text-gray-500 hover:bg-white hover:text-gray-900" title="Tarefa">
          <CheckSquare size={14} aria-hidden="true" />
        </button>
      </div>

      <div className="flex min-h-0 flex-1 flex-col px-6 py-5">
        <label htmlFor={`diary-content-${entry.id}`} className="mb-2 text-[11px] font-semibold text-gray-500">
          Texto da nota
        </label>
        <textarea
          ref={textareaRef}
          id={`diary-content-${entry.id}`}
          value={content}
          onChange={event => updateContent(event.target.value)}
          className="min-h-0 flex-1 resize-none border-0 bg-transparent text-[15px] leading-7 text-gray-700 outline-none"
          spellCheck
        />
      </div>

      <footer className="flex shrink-0 items-center justify-between border-t border-gray-100 bg-gray-50/70 px-6 py-3 text-[10px] font-semibold uppercase tracking-[0.12em] text-gray-400">
        <div className="flex items-center gap-3">
          <span>{wordCount} {wordCount === 1 ? 'palavra' : 'palavras'}</span>
          <span>{content.length} caracteres</span>
        </div>
        <div className="flex items-center gap-4">
          <span aria-live="polite" className={saveStatus === 'error' ? 'text-red-600' : saveStatus === 'saved' ? 'text-emerald-600' : ''}>
            {saveStatus === 'saving' && 'Salvando localmente…'}
            {saveStatus === 'saved' && 'Salvo no Diário'}
            {saveStatus === 'unsaved' && 'Alterações pendentes'}
            {saveStatus === 'error' && 'Falha ao salvar'}
          </span>
          <button
            type="button"
            onClick={() => {
              if (window.confirm('Excluir esta nota pessoal permanentemente?')) void deleteEntry(entry.id);
            }}
            className="rounded-md p-1 text-red-400 transition hover:bg-red-50 hover:text-red-600"
            title="Excluir nota pessoal"
            aria-label="Excluir nota pessoal"
          >
            <Trash2 size={13} aria-hidden="true" />
          </button>
        </div>
      </footer>
    </div>
  );
};

export default DiarioEditor;
