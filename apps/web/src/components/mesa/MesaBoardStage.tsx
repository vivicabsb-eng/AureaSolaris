import type { MutableRefObject, PointerEvent as ReactPointerEvent, RefObject } from 'react';
import { Move, Sparkles } from 'lucide-react';
import type { CadernoEdge, CadernoNode } from '../../types/caderno';
import { BOARD_GRID_SIZE } from './boardGeometry';
import { NodeCard } from './NodeCard';
import { StudyPanel } from './StudyPanel';
import type { BoardSaveState } from './useBoardAutosave';
import type { BoardTool } from './useBoardKeyboard';

interface MesaBoardStageProps {
  canvasRef: RefObject<HTMLDivElement | null>;
  nodeRefs: MutableRefObject<Map<number, HTMLDivElement>>;
  edgeRefs: MutableRefObject<Map<number, SVGLineElement>>;
  pan: { x: number; y: number };
  zoom: number;
  canvasCursor: string;
  nodes: CadernoNode[];
  edges: CadernoEdge[];
  selectedNodeId: number | null;
  selectedEdgeId: number | null;
  focusNodeId: number | null;
  connectSourceId: number | null;
  tool: BoardTool;
  studyPanelOpen: boolean;
  boardName: string;
  saveState: BoardSaveState;
  onPointerMove: (event: ReactPointerEvent) => void;
  onPointerUp: () => void;
  onCanvasPointerDown: () => void;
  onCanvasClick: () => void;
  onSelectNode: (id: number) => void;
  onOpenStudy: (id: number) => void;
  onDragStart: (node: CadernoNode, event: ReactPointerEvent) => void;
  onResizeStart: (node: CadernoNode, event: ReactPointerEvent) => void;
  onDeleteNode: (id: number) => void;
  onUpdateNode: (id: number, patch: Partial<CadernoNode>) => void;
  onConnectNode: (id: number, event: ReactPointerEvent) => void;
  onFocusHandled: () => void;
  onSelectEdge: (id: number) => void;
  onDeleteEdge: (id: number) => void;
  onUpdateStudy: (patch: Partial<CadernoNode>) => void;
  onExpandBoard: () => void;
}

export function MesaBoardStage({
  canvasRef,
  nodeRefs,
  edgeRefs,
  pan,
  zoom,
  canvasCursor,
  nodes,
  edges,
  selectedNodeId,
  selectedEdgeId,
  focusNodeId,
  connectSourceId,
  tool,
  studyPanelOpen,
  boardName,
  saveState,
  onPointerMove,
  onPointerUp,
  onCanvasPointerDown,
  onCanvasClick,
  onSelectNode,
  onOpenStudy,
  onDragStart,
  onResizeStart,
  onDeleteNode,
  onUpdateNode,
  onConnectNode,
  onFocusHandled,
  onSelectEdge,
  onDeleteEdge,
  onUpdateStudy,
  onExpandBoard,
}: MesaBoardStageProps) {
  return (
    <div className="relative flex min-h-0 flex-1">
      <div
        id="aurea-board-canvas"
        ref={canvasRef}
        className="relative min-w-0 flex-1 overflow-hidden"
        style={{ cursor: canvasCursor }}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerDown={onCanvasPointerDown}
        onClick={onCanvasClick}
      >
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            backgroundImage: 'radial-gradient(circle, #C8C8C8 1px, transparent 1px)',
            backgroundSize: `${BOARD_GRID_SIZE * zoom}px ${BOARD_GRID_SIZE * zoom}px`,
            backgroundPosition: `${pan.x}px ${pan.y}px`,
            opacity: 0.5,
          }}
        />

        <svg className="absolute inset-0 w-full h-full overflow-visible pointer-events-none">
          <g transform={`translate(${pan.x} ${pan.y}) scale(${zoom})`}>
            {edges.map(edge => {
              const first = nodes.find(node => node.id === edge.from);
              const second = nodes.find(node => node.id === edge.to);
              if (!first || !second) return null;
              return (
                <g key={edge.id} className="pointer-events-auto">
                  <line
                    ref={element => { if (element) edgeRefs.current.set(edge.id, element); }}
                    x1={first.x + first.w / 2}
                    y1={first.y + first.h / 2}
                    x2={second.x + second.w / 2}
                    y2={second.y + second.h / 2}
                    stroke={selectedEdgeId === edge.id ? '#4A9EFF' : '#9CA3AF'}
                    strokeWidth={selectedEdgeId === edge.id ? 2.5 : 1.5}
                    strokeDasharray={selectedEdgeId === edge.id ? 'none' : '5 4'}
                  />
                  <line
                    x1={first.x + first.w / 2}
                    y1={first.y + first.h / 2}
                    x2={second.x + second.w / 2}
                    y2={second.y + second.h / 2}
                    stroke="transparent"
                    strokeWidth={14}
                    style={{ cursor: 'pointer' }}
                    onClick={event => {
                      event.stopPropagation();
                      onSelectEdge(edge.id);
                    }}
                  />
                </g>
              );
            })}
          </g>
        </svg>

        <div
          style={{
            transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
            transformOrigin: '0 0',
            position: 'absolute',
            top: 0,
            left: 0,
          }}
        >
          {nodes.map(node => (
            <NodeCard
              key={node.id}
              node={node}
              selected={selectedNodeId === node.id}
              tool={tool}
              autoFocus={focusNodeId === node.id}
              onFocused={onFocusHandled}
              onSelect={() => onSelectNode(node.id)}
              onOpenStudy={() => onOpenStudy(node.id)}
              onDragStart={event => onDragStart(node, event)}
              onResizeStart={event => onResizeStart(node, event)}
              onDelete={() => onDeleteNode(node.id)}
              onUpdate={patch => onUpdateNode(node.id, patch)}
              onConnect={event => onConnectNode(node.id, event)}
              nodeRef={element => { if (element) nodeRefs.current.set(node.id, element); }}
            />
          ))}
        </div>

        {nodes.length === 0 && (
          <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
            <Sparkles size={24} style={{ color: '#D0D0D0' }} className="mb-3" />
            <p className="text-sm font-medium" style={{ color: '#C0C0C0' }}>Board vazio</p>
            <p className="text-xs mt-1" style={{ color: '#D0D0D0' }}>Escolha uma ferramenta ou pressione N</p>
          </div>
        )}

        {tool === 'connect' && (
          <div
            className="absolute left-1/2 top-4 z-30 -translate-x-1/2 rounded-full border border-blue-200 bg-white/95 px-4 py-2 text-[11px] font-semibold text-blue-700 shadow-sm"
            aria-live="polite"
          >
            {connectSourceId === null ? 'Conectar: clique no primeiro cartão.' : 'Agora clique no cartão de destino — Esc cancela.'}
          </div>
        )}

        {selectedEdgeId !== null && (
          <div className="absolute bottom-4 right-4 z-30 flex items-center gap-2 rounded-xl border border-blue-200 bg-white px-3 py-2 text-[11px] font-semibold text-gray-800 shadow-sm">
            Conexão selecionada
            <button
              type="button"
              onClick={() => onDeleteEdge(selectedEdgeId)}
              className="rounded-md px-2 py-1 text-red-600 transition hover:bg-red-50"
            >
              Remover
            </button>
          </div>
        )}

        {nodes.length > 0 && (
          <div
            className="absolute bottom-4 left-4 flex items-center gap-2 px-3 py-1.5 rounded-full text-[10px] font-medium pointer-events-none"
            style={{
              background: 'rgba(255,255,255,0.85)',
              border: '1px solid #EBEBEB',
              color: '#AAAAAA',
              backdropFilter: 'blur(4px)',
            }}
          >
            <Move size={10} />
            {nodes.length} card{nodes.length !== 1 ? 's' : ''} · Scroll para navegar · Ctrl+Scroll para zoom
          </div>
        )}
      </div>

      {studyPanelOpen && (
        <StudyPanel
          node={nodes.find(node => node.id === selectedNodeId) || null}
          boardName={boardName}
          saveState={saveState}
          onUpdate={onUpdateStudy}
          onExpandBoard={onExpandBoard}
        />
      )}
    </div>
  );
}
