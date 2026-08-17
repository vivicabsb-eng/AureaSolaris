import { useState, useRef, useEffect } from 'react';
import {
  Check, Image as ImageIcon, Plus, X, MoreHorizontal, BookOpen,
} from 'lucide-react';
import type { CadernoNode } from '../../types/caderno';
import type { BoardTool } from './useBoardKeyboard';

export const STICKY_COLORS = ['#FFFDE7', '#E3F2FD', '#F3E5F5', '#E8F5E9', '#FCE4EC', '#FFF3E0', '#E0F7FA', '#EDE9FE'];

interface NodeCardProps {
  node: CadernoNode;
  selected: boolean;
  tool: BoardTool;
  autoFocus: boolean;
  onFocused: () => void;
  onSelect: () => void;
  onOpenStudy: () => void;
  onDragStart: (e: React.PointerEvent) => void;
  onResizeStart: (e: React.PointerEvent) => void;
  onDelete: () => void;
  onUpdate: (patch: Partial<CadernoNode>) => void;
  onConnect: (e: React.PointerEvent) => void;
  nodeRef: (el: HTMLDivElement | null) => void;
}

export const NodeCard: React.FC<NodeCardProps> = ({
  node, selected, tool, autoFocus, onFocused, onSelect,
  onDragStart, onResizeStart, onDelete, onUpdate, onOpenStudy,
  onConnect, nodeRef,
}) => {
  const isText      = node.type === 'text';
  const isChecklist = node.type === 'checklist';
  const isImage     = node.type === 'image';
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [imgError, setImgError] = useState(false);
  const [showColorPicker, setShowColorPicker] = useState(false);

  // Auto-focus textarea when a new node is created
  useEffect(() => {
    if (autoFocus && textareaRef.current) {
      textareaRef.current.focus();
      textareaRef.current.setSelectionRange(0, textareaRef.current.value.length);
      onFocused();
    }
  }, [autoFocus, onFocused]);

  const bg    = isText ? 'transparent' : (node.color || '#FFFDE7');
  const isTransparent = isText;

  const cardStyle: React.CSSProperties = {
    position: 'absolute',
    transform: `translate(${node.x}px, ${node.y}px)`,
    width: node.w,
    height: node.h,
    background: bg,
    borderRadius: isText ? 6 : 12,
    border: isTransparent
      ? 'none'
      : selected
        ? '1.5px solid #4A9EFF'
        : '1px solid rgba(0,0,0,0.08)',
    boxShadow: isTransparent ? 'none' : selected
      ? '0 0 0 3px rgba(74,158,255,0.15), 0 4px 16px rgba(0,0,0,0.10)'
      : '0 1px 4px rgba(0,0,0,0.06), 0 2px 8px rgba(0,0,0,0.04)',
    cursor: tool === 'connect' ? 'crosshair' : 'default',
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden',
    transition: 'box-shadow 0.12s, border-color 0.12s',
  };

  return (
    <div
      ref={nodeRef}
      style={cardStyle}
      className="group"
      onPointerDown={e => {
        if (tool === 'connect') { onConnect(e); return; }
        onSelect();
      }}
      onDoubleClick={event => {
        event.stopPropagation();
        onOpenStudy();
      }}
    >
      {/* ── Header (drag zone + controls) ── */}
      {!isText && (
        <div
          className="shrink-0 flex items-center justify-between px-2 py-1.5 transition-opacity"
          style={{
            background: 'rgba(0,0,0,0.025)',
            borderBottom: '1px solid rgba(0,0,0,0.04)',
            cursor: 'grab',
            opacity: selected ? 1 : 0,
          }}
          onPointerDown={onDragStart}
        >
          {/* Color dot */}
          <div className="relative" onClick={e => e.stopPropagation()}>
            <button
              className="w-3 h-3 rounded-full border border-white/80 box-shadow: 0 1px 2px rgba(0,0,0,0.25) hover:scale-125 transition-all"
              style={{ background: node.color === 'transparent' ? '#E0E0E0' : (node.color || '#FFFDE7') }}
              onClick={() => setShowColorPicker(p => !p)}
            />
            {showColorPicker && (
              <div
                className="absolute top-6 left-0 z-50 background: var(--aurea-surface) rounded-xl shadow-xl border flex gap-1.5 p-2"
                style={{ border: '1px solid #EBEBEB' }}
              >
                {[...STICKY_COLORS, '#ffffff', '#F1F5F9'].map(c => (
                  <button
                    key={c}
                    onClick={() => { onUpdate({ color: c }); setShowColorPicker(false); }}
                    className="w-5 h-5 rounded-full hover:scale-110 transition-all"
                    style={{ background: c, border: node.color === c ? '2px solid #333' : '1.5px solid #D0D0D0' }}
                  />
                ))}
              </div>
            )}
          </div>

          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={event => { event.stopPropagation(); onOpenStudy(); }}
              className="flex h-5 w-5 items-center justify-center rounded color: var(--aurea-text-muted) transition-all hover:background: var(--aurea-surface) hover:text-amber-700"
              title="Abrir estudo deste card"
              aria-label="Abrir estudo deste card"
            >
              <BookOpen size={10} aria-hidden="true" />
            </button>
            <button
              type="button"
              onClick={event => { event.stopPropagation(); onDelete(); }}
              className="flex h-5 w-5 items-center justify-center rounded text-gray-300 transition-all hover:background: rgba(239,68,68,0.08) hover:text-red-400"
              title="Excluir card"
              aria-label="Excluir card"
            >
              <X size={10} aria-hidden="true" />
            </button>
          </div>
        </div>
      )}

      {/* ── Content ── */}
      <div className="flex-1 flex flex-col min-h-0">
        {isImage ? (
          <div className="flex-1 flex items-center justify-center overflow-hidden">
            {imgError ? (
              <div className="flex flex-col items-center gap-2 p-4 text-center">
                <ImageIcon size={24} style={{ color: '#D0D0D0' }} />
                <p className="text-[10px] text-gray-300 font-medium">Imagem não carregou</p>
                <input
                  className="text-[10px] text-blue-400 underline bg-transparent outline-none w-full text-center"
                  value={node.url || ''}
                  onChange={e => { onUpdate({ url: e.target.value }); setImgError(false); }}
                  onPointerDown={e => e.stopPropagation()}
                  onClick={e => e.stopPropagation()}
                  placeholder="Editar URL..."
                />
              </div>
            ) : (
              <img
                src={node.url}
                alt=""
                className="w-full h-full object-contain pointer-events-none"
                onError={() => setImgError(true)}
              />
            )}
          </div>
        ) : isChecklist ? (
          <div className="flex-1 px-3 pb-3 pt-2 overflow-y-auto space-y-1.5 no-scrollbar">
            {(node.items || []).map((item, idx) => (
              <div key={idx} className="flex items-center gap-2 group/item">
                <button
                  onClick={e => {
                    e.stopPropagation();
                    const items = [...(node.items || [])];
                    items[idx].done = !items[idx].done;
                    onUpdate({ items });
                  }}
                  className="w-4 h-4 rounded border-2 flex items-center justify-center shrink-0 transition-all"
                  style={{ borderColor: item.done ? '#4A9EFF' : '#D0D0D0', background: item.done ? '#4A9EFF' : 'transparent' }}
                >
                  {item.done && <Check size={9} color="#fff" strokeWidth={3} />}
                </button>
                <input
                  className={`flex-1 text-[12px] bg-transparent outline-none transition-colors ${item.done ? 'line-through text-gray-300' : 'color: var(--aurea-text)'}`}
                  style={{ fontFamily: 'inherit' }}
                  value={item.text}
                  onChange={e => {
                    const items = [...(node.items || [])];
                    items[idx].text = e.target.value;
                    onUpdate({ items });
                  }}
                  onClick={e => e.stopPropagation()}
                  onPointerDown={e => e.stopPropagation()}
                  placeholder="Item..."
                  onKeyDown={e => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      const items = [...(node.items || [])];
                      items.splice(idx + 1, 0, { text: '', done: false });
                      onUpdate({ items });
                    }
                    if (e.key === 'Backspace' && !item.text && (node.items || []).length > 1) {
                      e.preventDefault();
                      const items = (node.items || []).filter((_, i) => i !== idx);
                      onUpdate({ items });
                    }
                  }}
                />
                <button
                  className="w-4 h-4 flex items-center justify-center opacity-0 group-hover/item:opacity-100 text-gray-200 hover:text-red-400 transition-all"
                  onClick={e => {
                    e.stopPropagation();
                    const items = (node.items || []).filter((_, i) => i !== idx);
                    onUpdate({ items: items.length ? items : [{ text: '', done: false }] });
                  }}
                >
                  <X size={9} />
                </button>
              </div>
            ))}
            <button
              className="flex items-center gap-1 text-[11px] font-medium text-gray-300 hover:color: var(--aurea-text-muted) transition-all mt-1"
              onClick={e => {
                e.stopPropagation();
                const items = [...(node.items || []), { text: '', done: false }];
                onUpdate({ items });
              }}
            >
              <Plus size={11} /> Adicionar
            </button>
          </div>
        ) : isText ? (
          /* Plain text: no header, full area */
          <div className="relative flex-1">
            <textarea
              ref={textareaRef}
              className="w-full h-full bg-transparent resize-none outline-none text-[13px] font-medium text-gray-800 leading-relaxed"
              style={{ padding: '6px 8px', fontFamily: 'inherit', cursor: 'text' }}
              value={node.text || ''}
              onChange={e => onUpdate({ text: e.target.value })}
              onClick={e => e.stopPropagation()}
              onPointerDown={e => e.stopPropagation()}
              placeholder="Clique para escrever..."
            />
            {/* Drag handle for text nodes */}
            <div
              className="absolute top-1 right-1 w-5 h-5 rounded flex items-center justify-center cursor-grab opacity-0 group-hover:opacity-100 transition-all"
              style={{ background: 'rgba(0,0,0,0.05)' }}
              onPointerDown={onDragStart}
            >
              <MoreHorizontal size={10} className="color: var(--aurea-text-muted)" />
            </div>
            {/* Text delete */}
            {selected && (
              <button
                className="absolute top-0.5 left-0.5 w-5 h-5 rounded flex items-center justify-center text-gray-200 hover:text-red-400 hover:background: rgba(239,68,68,0.08) transition-all"
                onClick={e => { e.stopPropagation(); onDelete(); }}
              >
                <X size={10} />
              </button>
            )}
          </div>
        ) : (
          /* sticky / shape */
          <textarea
            ref={textareaRef}
            className="flex-1 bg-transparent resize-none outline-none text-[13px] text-gray-800 leading-relaxed"
            style={{ padding: '10px 14px', fontFamily: 'inherit', cursor: 'text' }}
            value={node.text || ''}
            onChange={e => onUpdate({ text: e.target.value })}
            onClick={e => e.stopPropagation()}
            onPointerDown={e => e.stopPropagation()}
            placeholder="Escreva aqui..."
          />
        )}
      </div>

      {/* ── Connection dots — visible on hover or in connect mode ── */}
      {(tool === 'connect' || selected) && !isText && (
        <>
          {[
            { style: { top: -5, left: '50%', transform: 'translateX(-50%)' } },
            { style: { bottom: -5, left: '50%', transform: 'translateX(-50%)' } },
            { style: { left: -5, top: '50%', transform: 'translateY(-50%)' } },
            { style: { right: -5, top: '50%', transform: 'translateY(-50%)' } },
          ].map((pos, i) => (
            <div
              key={i}
              onPointerDown={e => {
                e.stopPropagation();
                onConnect(e);
              }}
              style={{
                position: 'absolute',
                ...pos.style,
                width: 10, height: 10,
                borderRadius: '50%',
                background: '#fff',
                border: '1.5px solid #4A9EFF',
                cursor: 'crosshair',
                zIndex: 20,
              }}
            />
          ))}
        </>
      )}

      {/* ── Resize handle ── */}
      {selected && !isText && (
        <div
          style={{ position: 'absolute', bottom: -4, right: -4, width: 10, height: 10, borderRadius: 2, background: '#4A9EFF', cursor: 'se-resize', zIndex: 20 }}
          onPointerDown={e => { e.stopPropagation(); onResizeStart(e); }}
        />
      )}
    </div>
  );
};
