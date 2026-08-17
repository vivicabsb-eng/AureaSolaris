import { useEffect, useMemo, useState } from 'react';
import { BookOpen, CalendarDays, FileText, LayoutGrid, Search } from 'lucide-react';
import { listBoards, loadBoard } from '../../services/notebook';
import type { CadernoNode } from '../../types/caderno';
import { listDiaryEntries } from '../../services/diary';
import type { DiaryEntry } from '../../types/diario';

type ArchiveSource = 'study' | 'diary';

type ArchiveItem = {
  id: string;
  source: ArchiveSource;
  title: string;
  summary: string;
  content: string;
  updatedAt: number;
  groupName: string;
  boardId?: string;
  nodeId?: number;
};

type StudyArchiveProps = {
  onOpenStudy: (boardId: string, nodeId: number) => void;
};

const normalizeTimestamp = (value: unknown) => {
  if (typeof value === 'number') {
    return value > 0 && value < 1_000_000_000_000 ? value * 1000 : value;
  }
  if (typeof value === 'string') {
    const parsed = Date.parse(value);
    return Number.isNaN(parsed) ? 0 : parsed;
  }
  return 0;
};

const nodeTitle = (node: CadernoNode) => {
  const firstLine = node.text?.split('\n').find(line => line.trim())?.trim();
  if (firstLine) return firstLine;
  if (node.type === 'checklist') return 'Lista de estudo';
  if (node.type === 'image') return 'Imagem de referência';
  return 'Card sem título';
};

const nodeQuickContent = (node: CadernoNode) => {
  if (node.type === 'checklist') {
    return (node.items || [])
      .filter(item => item.text.trim())
      .map(item => `- [${item.done ? 'x' : ' '}] ${item.text}`)
      .join('\n');
  }
  if (node.type === 'image') return '';
  return node.text?.trim() || '';
};

const formatDate = (timestamp: number) => {
  if (!timestamp) return 'Data não registrada';
  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(timestamp));
};

const filterArchiveItems = (
  items: ArchiveItem[],
  filter: 'all' | ArchiveSource,
  search: string,
) => {
  const query = search.trim().toLocaleLowerCase('pt-BR');
  return items.filter(item => {
    if (filter !== 'all' && item.source !== filter) return false;
    if (!query) return true;
    return `${item.title} ${item.groupName} ${item.summary} ${item.content}`
      .toLocaleLowerCase('pt-BR')
      .includes(query);
  });
};

export function StudyArchive({ onOpenStudy }: StudyArchiveProps) {
  const [items, setItems] = useState<ArchiveItem[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [filter, setFilter] = useState<'all' | ArchiveSource>('all');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [unavailable, setUnavailable] = useState(false);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      setLoading(true);
      const [boardList, diaryList] = await Promise.all([
        listBoards(),
        listDiaryEntries(),
      ]);

      if (cancelled) return;
      if (boardList === null && diaryList === null) {
        setUnavailable(true);
        setLoading(false);
        return;
      }

      const studies = await Promise.all((boardList || []).map(async board => {
        const data = await loadBoard(board.id);
        return (data?.nodes || []).flatMap(node => {
          const studyContent = node.studyContent?.trim() || '';
          const quickContent = nodeQuickContent(node);
          const content = studyContent || quickContent;
          if (!content) return [];

          return [{
            id: `study:${board.id}:${node.id}`,
            source: 'study' as const,
            title: nodeTitle(node),
            summary: quickContent && quickContent !== content ? quickContent : '',
            content,
            updatedAt: normalizeTimestamp(node.studyUpdatedAt || board.updatedAt),
            groupName: board.name,
            boardId: board.id,
            nodeId: node.id,
          }];
        });
      }));

      const diaryItems: ArchiveItem[] = (diaryList || []).map((entry: DiaryEntry) => ({
        id: `diary:${entry.id}`,
        source: 'diary',
        title: entry.title?.trim() || 'Nota sem título',
        summary: '',
        content: entry.content || '',
        updatedAt: normalizeTimestamp(entry.updatedAt || entry.createdAt),
        groupName: entry.folderName || 'Diário pessoal',
      }));

      const nextItems = [...studies.flat(), ...diaryItems]
        .sort((a, b) => b.updatedAt - a.updatedAt);
      if (!cancelled) {
        setItems(nextItems);
        setSelectedId(current => current && nextItems.some(item => item.id === current) ? current : nextItems[0]?.id || null);
        setLoading(false);
      }
    };

    void load();
    return () => { cancelled = true; };
  }, []);

  const filtered = useMemo(() => filterArchiveItems(items, filter, search), [filter, items, search]);

  const updateSelectionFor = (nextItems: ArchiveItem[]) => {
    setSelectedId(current => nextItems.some(item => item.id === current)
      ? current
      : nextItems[0]?.id || null);
  };

  const handleSearchChange = (nextSearch: string) => {
    setSearch(nextSearch);
    updateSelectionFor(filterArchiveItems(items, filter, nextSearch));
  };

  const handleFilterChange = (nextFilter: 'all' | ArchiveSource) => {
    setFilter(nextFilter);
    updateSelectionFor(filterArchiveItems(items, nextFilter, search));
  };

  const selected = filtered.find(item => item.id === selectedId) || null;

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center text-sm text-gray-500">
        Reunindo seus registros locais…
      </div>
    );
  }

  return (
    <div className="flex h-full min-h-0 flex-col bg-[#F8F8F7] md:flex-row">
      <section className="flex w-full shrink-0 flex-col border-b border-gray-200 bg-[#F8F8F7] md:w-[360px] md:border-b-0 md:border-r" aria-label="Histórico de notas e estudos">
        <div className="border-b border-gray-200 p-4">
          <label htmlFor="archive-search" className="mb-2 flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.16em] text-gray-500">
            <Search size={12} aria-hidden="true" />
            Buscar no histórico
          </label>
          <input
            id="archive-search"
            value={search}
            onChange={event => handleSearchChange(event.target.value)}
            className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-800 outline-none transition focus:border-gray-400"
          />
          <div className="mt-3 grid grid-cols-3 gap-1 rounded-lg bg-gray-200/60 p-1" aria-label="Filtrar histórico">
            {([
              ['all', 'Tudo'],
              ['study', 'Cadernos'],
              ['diary', 'Diário'],
            ] as const).map(([value, label]) => (
              <button
                key={value}
                type="button"
                onClick={() => handleFilterChange(value)}
                aria-pressed={filter === value}
                className={`rounded-md px-2 py-1.5 text-[11px] font-semibold transition ${filter === value ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-800'}`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto p-3">
          {filtered.length === 0 ? (
            <div className="px-5 py-12 text-center">
              <FileText className="mx-auto mb-3 text-gray-300" size={24} aria-hidden="true" />
              <p className="text-sm font-semibold text-gray-600">Nenhum registro encontrado</p>
              <p className="mt-1 text-xs leading-5 text-gray-400">
                {unavailable ? 'O histórico local está disponível no aplicativo desktop.' : 'Os estudos escritos nos cards e as notas pessoais aparecerão aqui.'}
              </p>
            </div>
          ) : (
            <div className="space-y-1">
              {filtered.map(item => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setSelectedId(item.id)}
                  className={`w-full rounded-xl border p-3 text-left transition ${selectedId === item.id ? 'border-gray-200 bg-white shadow-sm' : 'border-transparent hover:bg-white/70'}`}
                >
                  <div className="flex items-start gap-3">
                    <div className={`mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg ${item.source === 'study' ? 'bg-amber-50 text-amber-700' : 'bg-blue-50 text-blue-700'}`}>
                      {item.source === 'study' ? <LayoutGrid size={13} aria-hidden="true" /> : <FileText size={13} aria-hidden="true" />}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-xs font-semibold text-gray-800">{item.title}</p>
                      <p className="mt-1 truncate text-[10px] font-medium text-gray-400">{item.groupName}</p>
                      <p className="mt-1 text-[10px] text-gray-400">{formatDate(item.updatedAt)}</p>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </section>

      <section className="min-h-0 flex-1 overflow-y-auto bg-white" aria-label="Registro selecionado">
        {selected ? (
          <article className="mx-auto max-w-4xl px-7 py-8 lg:px-12 lg:py-10">
            <div className="flex flex-wrap items-start justify-between gap-4 border-b border-gray-100 pb-6">
              <div className="min-w-0">
                <p className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.18em] text-gray-400">
                  {selected.source === 'study' ? <LayoutGrid size={12} aria-hidden="true" /> : <CalendarDays size={12} aria-hidden="true" />}
                  {selected.source === 'study' ? 'Estudo do Caderno' : 'Nota do Diário'}
                </p>
                <h2 className="mt-3 text-2xl font-semibold leading-tight text-gray-900">{selected.title}</h2>
                <p className="mt-2 text-xs text-gray-400">{selected.groupName} · {formatDate(selected.updatedAt)}</p>
              </div>
              {selected.source === 'study' && selected.boardId && selected.nodeId !== undefined && (
                <button
                  type="button"
                  onClick={() => onOpenStudy(selected.boardId!, selected.nodeId!)}
                  className="flex items-center gap-2 rounded-lg bg-gray-900 px-4 py-2.5 text-xs font-semibold text-white transition hover:bg-gray-700"
                >
                  <BookOpen size={14} aria-hidden="true" />
                  Abrir no Caderno
                </button>
              )}
            </div>

            {selected.summary && (
              <div className="mt-7 rounded-xl border border-amber-100 bg-amber-50/60 p-4">
                <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-amber-700">Síntese no mapa mental</p>
                <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-gray-700">{selected.summary}</p>
              </div>
            )}

            <div className="mt-8">
              <p className="mb-3 text-[10px] font-bold uppercase tracking-[0.16em] text-gray-400">Conteúdo registrado</p>
              {selected.content ? (
                <div className="whitespace-pre-wrap text-[15px] leading-8 text-gray-700">{selected.content}</div>
              ) : (
                <p className="text-sm text-gray-400">Esta nota ainda não possui conteúdo.</p>
              )}
            </div>
          </article>
        ) : (
          <div className="flex h-full items-center justify-center p-8 text-center text-sm text-gray-400">
            Selecione um registro para consultar o conteúdo.
          </div>
        )}
      </section>
    </div>
  );
}
