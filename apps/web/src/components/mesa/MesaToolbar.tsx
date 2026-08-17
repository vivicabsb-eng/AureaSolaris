import type { RefObject } from 'react';
import {
  CheckSquare,
  ChevronLeft,
  Download,
  FolderOpen,
  Image as ImageIcon,
  Link2,
  MousePointer2,
  Pencil,
  Redo2,
  Square,
  StickyNote,
  Type,
  Undo2,
  ZoomIn,
  ZoomOut,
  BookOpen,
} from 'lucide-react';
import { STICKY_COLORS } from './NodeCard';
import type { BoardTool } from './useBoardKeyboard';

interface MesaToolbarProps {
  boardName: string;
  editingName: boolean;
  nameInputRef: RefObject<HTMLInputElement | null>;
  studyPanelOpen: boolean;
  tool: BoardTool;
  stickyColor: string;
  zoom: number;
  canUndo: boolean;
  canRedo: boolean;
  onBack: () => void;
  onBoardNameChange: (name: string) => void;
  onEditingNameChange: (editing: boolean) => void;
  onToggleStudyPanel: () => void;
  onUndo: () => void;
  onRedo: () => void;
  onToolChange: (tool: BoardTool) => void;
  onStickyColorChange: (color: string) => void;
  onImport: () => void;
  onExport: () => void;
  onZoomChange: (zoom: number) => void;
  onResetViewport: () => void;
}

const tools: { id: BoardTool; icon: React.ReactNode; label: string; key?: string }[] = [
  { id: 'select', icon: <MousePointer2 size={16} />, label: 'Cursor', key: 'V' },
  { id: 'sticky', icon: <StickyNote size={16} />, label: 'Post-it', key: 'N' },
  { id: 'text', icon: <Type size={16} />, label: 'Texto', key: 'T' },
  { id: 'checklist', icon: <CheckSquare size={16} />, label: 'Lista', key: 'C' },
  { id: 'shape', icon: <Square size={16} />, label: 'Forma', key: '' },
  { id: 'connect', icon: <Link2 size={16} />, label: 'Conectar', key: '' },
  { id: 'image', icon: <ImageIcon size={16} />, label: 'Imagem', key: '' },
];

export function MesaToolbar({
  boardName,
  editingName,
  nameInputRef,
  studyPanelOpen,
  tool,
  stickyColor,
  zoom,
  canUndo,
  canRedo,
  onBack,
  onBoardNameChange,
  onEditingNameChange,
  onToggleStudyPanel,
  onUndo,
  onRedo,
  onToolChange,
  onStickyColorChange,
  onImport,
  onExport,
  onZoomChange,
  onResetViewport,
}: MesaToolbarProps) {
  return (
    <div
      className="relative z-50 shrink-0 flex min-w-max items-center gap-3 overflow-x-auto px-3 py-2 no-scrollbar"
      style={{ background: '#ffffff', borderBottom: '1px solid #EBEBEB', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}
    >
      <button
        onClick={onBack}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-gray-500 hover:text-gray-800 hover:bg-gray-100 transition-all"
      >
        <ChevronLeft size={14} /> Boards
      </button>

      <div className="w-px h-5" style={{ background: '#EBEBEB' }} />

      {editingName ? (
        <input
          ref={nameInputRef}
          value={boardName}
          onChange={event => onBoardNameChange(event.target.value)}
          onBlur={() => onEditingNameChange(false)}
          onKeyDown={event => {
            if (event.key === 'Enter' || event.key === 'Escape') onEditingNameChange(false);
          }}
          className="text-sm font-semibold text-gray-800 outline-none border-b-2 bg-transparent px-1"
          style={{ borderColor: '#1A1A1A', minWidth: 120 }}
        />
      ) : (
        <button
          onClick={() => onEditingNameChange(true)}
          className="flex items-center gap-1.5 text-sm font-semibold text-gray-800 hover:text-gray-600 transition-all group"
        >
          {boardName}
          <Pencil size={11} className="text-gray-300 group-hover:text-gray-500 transition-all" />
        </button>
      )}

      <div className="w-px h-5" style={{ background: '#EBEBEB' }} />

      <button
        type="button"
        onClick={onToggleStudyPanel}
        aria-pressed={studyPanelOpen}
        className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold text-gray-600 transition-all hover:bg-gray-100 hover:text-gray-800"
        title={studyPanelOpen ? 'Ocultar a área de escrita' : 'Mostrar Board e estudo lado a lado'}
      >
        <BookOpen size={14} aria-hidden="true" />
        {studyPanelOpen ? 'Board + estudo' : 'Abrir estudo'}
      </button>

      <div className="w-px h-5" style={{ background: '#EBEBEB' }} />

      <button
        onClick={onUndo}
        disabled={!canUndo}
        title="Desfazer (Ctrl+Z)"
        className="p-1.5 rounded-lg transition-all hover:bg-gray-100 disabled:opacity-25 disabled:cursor-not-allowed"
      >
        <Undo2 size={14} className="text-gray-600" />
      </button>
      <button
        onClick={onRedo}
        disabled={!canRedo}
        title="Refazer (Ctrl+Y)"
        className="p-1.5 rounded-lg transition-all hover:bg-gray-100 disabled:opacity-25 disabled:cursor-not-allowed"
      >
        <Redo2 size={14} className="text-gray-600" />
      </button>

      <div className="w-px h-5" style={{ background: '#EBEBEB' }} />

      <div className="flex items-center gap-0.5 px-1.5 py-1 rounded-xl" style={{ background: '#F4F4F2', border: '1px solid #E8E8E8' }}>
        {tools.map(item => (
          <button
            key={item.id}
            onClick={() => onToolChange(item.id)}
            title={item.label + (item.key ? ` (${item.key})` : '')}
            aria-label={item.label}
            aria-pressed={tool === item.id}
            className="relative flex flex-col items-center gap-0.5 px-2.5 py-1.5 rounded-lg transition-all"
            style={{
              background: tool === item.id ? '#ffffff' : 'transparent',
              color: tool === item.id ? '#111' : '#888',
              boxShadow: tool === item.id ? '0 1px 3px rgba(0,0,0,0.10)' : 'none',
            }}
          >
            {item.icon}
            <span className="text-[8px] font-medium leading-none tracking-tight">{item.label}</span>
          </button>
        ))}
      </div>

      {(tool === 'sticky' || tool === 'shape') && (
        <>
          <div className="w-px h-5" style={{ background: '#EBEBEB' }} />
          <div className="flex items-center gap-1">
            {STICKY_COLORS.map(color => (
              <button
                key={color}
                onClick={() => onStickyColorChange(color)}
                aria-label={`Selecionar cor ${color}`}
                aria-pressed={stickyColor === color}
                className="w-5 h-5 rounded-full transition-all hover:scale-110"
                style={{ background: color, border: stickyColor === color ? '2px solid #333' : '1.5px solid #D8D8D8' }}
              />
            ))}
          </div>
        </>
      )}

      <div className="flex-1" />

      <button onClick={onImport} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-gray-500 hover:bg-gray-100 transition-all">
        <FolderOpen size={13} /> Importar
      </button>
      <button onClick={onExport} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-gray-500 hover:bg-gray-100 transition-all">
        <Download size={13} /> Exportar
      </button>

      <div className="w-px h-5" style={{ background: '#EBEBEB' }} />

      <div className="flex items-center gap-0.5 px-1.5 py-1 rounded-lg" style={{ background: '#F4F4F2', border: '1px solid #E8E8E8' }}>
        <button onClick={() => onZoomChange(Math.max(0.15, zoom - 0.1))} className="p-1 rounded hover:bg-white transition-all" title="Diminuir (-)">
          <ZoomOut size={13} className="text-gray-500" />
        </button>
        <button
          onClick={onResetViewport}
          className="text-[11px] font-bold text-gray-600 hover:text-gray-800 transition-all w-10 text-center"
          title="Resetar zoom"
        >
          {Math.round(zoom * 100)}%
        </button>
        <button onClick={() => onZoomChange(Math.min(3, zoom + 0.1))} className="p-1 rounded hover:bg-white transition-all" title="Aumentar (+)">
          <ZoomIn size={13} className="text-gray-500" />
        </button>
        <div className="w-px h-3 mx-1" style={{ background: '#E8E8E8' }} />
        <button onClick={() => onZoomChange(Math.min(3, zoom + 0.1))} className="px-1.5 py-0.5 rounded text-[10px] font-bold text-gray-500 hover:bg-white transition-all" title="Aumentar zoom">
          +
        </button>
        <button onClick={() => onZoomChange(Math.max(0.15, zoom - 0.1))} className="px-1.5 py-0.5 rounded text-[10px] font-bold text-gray-500 hover:bg-white transition-all" title="Diminuir zoom">
          -
        </button>
      </div>
    </div>
  );
}
