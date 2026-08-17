import { useCallback, useEffect, useRef, useState } from 'react';
import type { PointerEvent as ReactPointerEvent } from 'react';
import { AlertCircle, Check } from 'lucide-react';
import type { AureaTask } from '../../context/AgendaContext';
import type { CadernoBoard, CadernoEdge, CadernoNode } from '../../types/caderno';
import { AssetPicker } from './AssetPicker';
import { nextBoardZoom, screenPointToBoard, snapBoardCoordinate } from './boardGeometry';
import { MesaBoardStage } from './MesaBoardStage';
import { MesaImageModal } from './MesaImageModal';
import { MesaToolbar } from './MesaToolbar';
import { STICKY_COLORS } from './NodeCard';
import { useBoardAutosave } from './useBoardAutosave';
import { useBoardHistory } from './useBoardHistory';
import { useBoardKeyboard, type BoardTool } from './useBoardKeyboard';
import { useMesaToast } from './useMesaToast';

const timestampId = () => Date.now();

export const MesaCanvas = ({
  board,
  initialStudyNodeId,
  onBack,
}: {
  board: CadernoBoard;
  initialStudyNodeId: number | null;
  onBack: (board: CadernoBoard) => void;
}) => {
  const [nodes, setNodes] = useState<CadernoNode[]>(board.nodes);
  const [edges, setEdges] = useState<CadernoEdge[]>(board.edges);
  const [boardName, setBoardName] = useState(board.name);
  const [editingName, setEditingName] = useState(false);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [tool, setTool] = useState<BoardTool>('select');
  const [selected, setSelected] = useState<number | null>(initialStudyNodeId);
  const [studyPanelOpen, setStudyPanelOpen] = useState(true);
  const [stickyColor, setStickyColor] = useState(STICKY_COLORS[0]);
  const [dragNode, setDragNode] = useState<{ id: number; prev: { x: number; y: number } } | null>(null);
  const [resizeNode, setResizeNode] = useState<{ id: number; prev: { w: number; h: number } } | null>(null);
  const [connectSourceId, setConnectSourceId] = useState<number | null>(null);
  const [selectedEdgeId, setSelectedEdgeId] = useState<number | null>(null);
  const [showAssetPicker, setShowAssetPicker] = useState(false);
  const [showImageModal, setShowImageModal] = useState(false);
  const [imageUrlInput, setImageUrlInput] = useState('');
  const [focusNodeId, setFocusNodeId] = useState<number | null>(null);

  const { toast, showToast } = useMesaToast();
  const nodesRef = useRef<CadernoNode[]>([]);
  const edgesRef = useRef<CadernoEdge[]>([]);
  const nodeRefs = useRef<Map<number, HTMLDivElement>>(new Map());
  const edgeRefs = useRef<Map<number, SVGLineElement>>(new Map());
  const nameInputRef = useRef<HTMLInputElement>(null);
  const canvasRef = useRef<HTMLDivElement>(null);
  const isPanning = useRef(false);

  const { undoStack, redoStack, pushHistory, undo, redo } = useBoardHistory(setNodes, setEdges);
  const saveState = useBoardAutosave(board.id, boardName, nodes, edges);

  useEffect(() => { nodesRef.current = nodes; }, [nodes]);
  useEffect(() => { edgesRef.current = edges; }, [edges]);
  useEffect(() => {
    if (editingName) setTimeout(() => nameInputRef.current?.focus(), 30);
  }, [editingName]);
  useEffect(() => {
    const timer = setTimeout(() => {
      if (initialStudyNodeId !== null && nodes.some(node => node.id === initialStudyNodeId)) {
        setSelected(initialStudyNodeId);
        setStudyPanelOpen(true);
      }
    }, 0);
    return () => clearTimeout(timer);
  }, [initialStudyNodeId, nodes]);

  const deleteNode = useCallback((id: number) => {
    const node = nodesRef.current.find(candidate => candidate.id === id);
    if (!node) return;
    const affectedEdges = edgesRef.current.filter(edge => edge.from === id || edge.to === id);
    pushHistory({ type: 'deleteNode', payload: { node, edges: affectedEdges } });
    setNodes(items => items.filter(candidate => candidate.id !== id));
    setEdges(items => items.filter(edge => edge.from !== id && edge.to !== id));
  }, [pushHistory]);

  const { spaceHeld } = useBoardKeyboard({
    undo,
    redo,
    selected,
    selectedEdgeId,
    setSelected,
    setSelectedEdgeId,
    setTool,
    setConnectSourceId,
    setFocusNodeId,
    pushHistory,
    deleteNode,
    setEdges,
    edgesRef,
  });

  const centerPos = () => {
    const canvas = canvasRef.current;
    const rect = canvas
      ? canvas.getBoundingClientRect()
      : { x: 0, y: 0, width: window.innerWidth, height: window.innerHeight };
    return screenPointToBoard(
      { x: rect.x + rect.width / 2, y: rect.y + rect.height / 2 },
      { pan, zoom },
    );
  };

  const addNode = (partial: Partial<CadernoNode>) => {
    const { x, y } = centerPos();
    const node: CadernoNode = {
      id: Date.now(),
      type: 'sticky',
      x,
      y,
      w: 200,
      h: 160,
      text: '',
      color: stickyColor,
      ...partial,
    };
    setNodes(items => [...items, node]);
    pushHistory({ type: 'addNode', payload: { node } });
    setSelected(node.id);
    setFocusNodeId(node.id);
    setTool('select');
  };

  const updateNode = (id: number, patch: Partial<CadernoNode>) => {
    const previous = nodesRef.current.find(node => node.id === id);
    if (!previous) return;
    setNodes(items => items.map(node => node.id === id ? { ...node, ...patch } : node));
  };

  useEffect(() => {
    const canvas = document.getElementById('aurea-board-canvas');
    if (!canvas) return;
    const handler = (event: WheelEvent) => {
      const target = event.target as HTMLElement;
      if (target.closest('input, textarea, select')) return;
      const ctrl = event.ctrlKey || event.metaKey;
      const modeFactor = event.deltaMode === 1 ? 40 : event.deltaMode === 2 ? window.innerWidth / 0.75 : 1;
      const dx = event.deltaX * modeFactor;
      const dy = event.deltaY * modeFactor;
      if (ctrl) {
        event.preventDefault();
        setZoom(current => nextBoardZoom(current, event.deltaY));
        return;
      }
      event.preventDefault();
      setPan(current => ({ x: current.x - dx, y: current.y - dy }));
    };
    canvas.addEventListener('wheel', handler, { passive: false });
    return () => canvas.removeEventListener('wheel', handler);
  }, []);

  const onPointerMove = (event: ReactPointerEvent) => {
    if (dragNode !== null) {
      const node = nodesRef.current.find(candidate => candidate.id === dragNode.id);
      if (node) {
        node.x += event.movementX / zoom;
        node.y += event.movementY / zoom;
        const element = nodeRefs.current.get(dragNode.id);
        if (element) {
          element.style.transform = `translate(${snapBoardCoordinate(node.x)}px, ${snapBoardCoordinate(node.y)}px)`;
        }
        edgesRef.current.forEach(edge => {
          if (edge.from !== dragNode.id && edge.to !== dragNode.id) return;
          const first = nodesRef.current.find(candidate => candidate.id === edge.from);
          const second = nodesRef.current.find(candidate => candidate.id === edge.to);
          const line = edgeRefs.current.get(edge.id);
          if (first && second && line) {
            line.setAttribute('x1', String(first.x + first.w / 2));
            line.setAttribute('y1', String(first.y + first.h / 2));
            line.setAttribute('x2', String(second.x + second.w / 2));
            line.setAttribute('y2', String(second.y + second.h / 2));
          }
        });
      }
    }

    if (resizeNode !== null) {
      const node = nodesRef.current.find(candidate => candidate.id === resizeNode.id);
      if (node) {
        node.w = Math.max(120, node.w + event.movementX / zoom);
        node.h = Math.max(80, node.h + event.movementY / zoom);
        const element = nodeRefs.current.get(resizeNode.id);
        if (element) {
          element.style.width = `${node.w}px`;
          element.style.height = `${node.h}px`;
        }
      }
    }

    if (isPanning.current && event.buttons === 1 && dragNode === null && resizeNode === null) {
      setPan(current => ({ x: current.x + event.movementX, y: current.y + event.movementY }));
    }
  };

  const onPointerUp = () => {
    if (dragNode !== null) {
      const node = nodesRef.current.find(candidate => candidate.id === dragNode.id);
      if (node) {
        node.x = snapBoardCoordinate(node.x);
        node.y = snapBoardCoordinate(node.y);
        if (node.x !== dragNode.prev.x || node.y !== dragNode.prev.y) {
          pushHistory({
            type: 'moveNode',
            payload: { id: node.id, prev: dragNode.prev, next: { x: node.x, y: node.y } },
          });
        }
        setNodes([...nodesRef.current]);
      }
    }

    if (resizeNode !== null) {
      const node = nodesRef.current.find(candidate => candidate.id === resizeNode.id);
      if (node) {
        if (node.w !== resizeNode.prev.w || node.h !== resizeNode.prev.h) {
          pushHistory({
            type: 'resizeNode',
            payload: { id: node.id, prev: resizeNode.prev, next: { w: node.w, h: node.h } },
          });
        }
        setNodes([...nodesRef.current]);
      }
    }

    setDragNode(null);
    setResizeNode(null);
    isPanning.current = false;
  };

  const onCanvasPointerDown = () => {
    if (tool === 'select' || spaceHeld) {
      isPanning.current = true;
      setSelected(null);
      setFocusNodeId(null);
    }
  };

  const onCanvasClick = () => {
    if (tool === 'sticky') { addNode({ type: 'sticky', color: stickyColor }); return; }
    if (tool === 'text') { addNode({ type: 'text', w: 200, h: 50, color: 'transparent', text: '' }); return; }
    if (tool === 'checklist') {
      addNode({ type: 'checklist', w: 240, h: 180, items: [{ text: '', done: false }], color: '#ffffff' });
      return;
    }
    if (tool === 'shape') { addNode({ type: 'shape', w: 180, h: 100, color: '#EDE9FE', text: '' }); return; }
    if (tool === 'image') setShowImageModal(true);
  };

  const connectNode = (id: number, event: ReactPointerEvent) => {
    event.preventDefault();
    event.stopPropagation();
    if (connectSourceId === null) {
      setConnectSourceId(id);
      setSelected(id);
      setSelectedEdgeId(null);
      showToast('Agora clique no cartão que deseja conectar.');
      return;
    }
    if (connectSourceId === id) {
      setConnectSourceId(null);
      showToast('Conexão cancelada.');
      return;
    }
    const alreadyConnected = edgesRef.current.some(edge =>
      (edge.from === connectSourceId && edge.to === id) || (edge.from === id && edge.to === connectSourceId),
    );
    if (alreadyConnected) {
      setConnectSourceId(null);
      showToast('Esses cartões já estão conectados.', false);
      return;
    }
    const edge: CadernoEdge = { id: timestampId(), from: connectSourceId, to: id };
    setEdges(items => [...items, edge]);
    pushHistory({ type: 'addEdge', payload: { edge } });
    setConnectSourceId(null);
    setSelectedEdgeId(edge.id);
    showToast('Conexão criada. Use Delete para removê-la.');
  };

  const deleteEdge = (id: number) => {
    const edge = edgesRef.current.find(candidate => candidate.id === id);
    if (!edge) return;
    pushHistory({ type: 'deleteEdge', payload: { edge } });
    setEdges(items => items.filter(candidate => candidate.id !== id));
    setSelectedEdgeId(null);
    showToast('Conexão removida.');
  };

  const exportJSON = () => {
    const blob = new Blob([JSON.stringify({ boardName, nodes, edges }, null, 2)], { type: 'application/json' });
    const anchor = document.createElement('a');
    anchor.href = URL.createObjectURL(blob);
    anchor.download = `${boardName.replace(/\s+/g, '_')}_${Date.now()}.json`;
    anchor.click();
    showToast('Board exportado como JSON');
  };

  const closeImageModal = () => {
    setShowImageModal(false);
    setImageUrlInput('');
  };

  const canvasCursor = spaceHeld ? 'grab' : tool === 'select' ? (dragNode ? 'grabbing' : 'default') : 'crosshair';

  return (
    <div
      className="absolute inset-0 flex flex-col overflow-hidden"
      style={{ background: '#F8F8F7', fontFamily: 'Inter, system-ui, sans-serif', userSelect: 'none' }}
    >
      <MesaToolbar
        boardName={boardName}
        editingName={editingName}
        nameInputRef={nameInputRef}
        studyPanelOpen={studyPanelOpen}
        tool={tool}
        stickyColor={stickyColor}
        zoom={zoom}
        canUndo={undoStack.length > 0}
        canRedo={redoStack.length > 0}
        onBack={() => onBack({ ...board, name: boardName, nodes, edges, updatedAt: Date.now() })}
        onBoardNameChange={setBoardName}
        onEditingNameChange={setEditingName}
        onToggleStudyPanel={() => setStudyPanelOpen(open => !open)}
        onUndo={undo}
        onRedo={redo}
        onToolChange={nextTool => {
          setTool(nextTool);
          setConnectSourceId(null);
          setSelectedEdgeId(null);
        }}
        onStickyColorChange={setStickyColor}
        onImport={() => setShowAssetPicker(true)}
        onExport={exportJSON}
        onZoomChange={setZoom}
        onResetViewport={() => {
          setZoom(1);
          setPan({ x: 0, y: 0 });
        }}
      />

      <MesaBoardStage
        canvasRef={canvasRef}
        nodeRefs={nodeRefs}
        edgeRefs={edgeRefs}
        pan={pan}
        zoom={zoom}
        canvasCursor={canvasCursor}
        nodes={nodes}
        edges={edges}
        selectedNodeId={selected}
        selectedEdgeId={selectedEdgeId}
        focusNodeId={focusNodeId}
        connectSourceId={connectSourceId}
        tool={tool}
        studyPanelOpen={studyPanelOpen}
        boardName={boardName}
        saveState={saveState}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onCanvasPointerDown={onCanvasPointerDown}
        onCanvasClick={onCanvasClick}
        onSelectNode={id => {
          setSelected(id);
          setFocusNodeId(null);
        }}
        onOpenStudy={id => {
          setSelected(id);
          setStudyPanelOpen(true);
        }}
        onDragStart={(node, event) => {
          if (tool !== 'select') return;
          event.stopPropagation();
          isPanning.current = false;
          setDragNode({ id: node.id, prev: { x: node.x, y: node.y } });
          setSelected(node.id);
          setSelectedEdgeId(null);
        }}
        onResizeStart={(node, event) => {
          event.stopPropagation();
          isPanning.current = false;
          setResizeNode({ id: node.id, prev: { w: node.w, h: node.h } });
        }}
        onDeleteNode={id => {
          deleteNode(id);
          setSelected(null);
        }}
        onUpdateNode={updateNode}
        onConnectNode={connectNode}
        onFocusHandled={() => setFocusNodeId(null)}
        onSelectEdge={id => {
          setSelectedEdgeId(id);
          setSelected(null);
        }}
        onDeleteEdge={deleteEdge}
        onUpdateStudy={patch => {
          if (selected !== null) updateNode(selected, patch);
        }}
        onExpandBoard={() => setStudyPanelOpen(false)}
      />

      <MesaImageModal
        open={showImageModal}
        value={imageUrlInput}
        onChange={setImageUrlInput}
        onClose={closeImageModal}
        onInsert={url => {
          addNode({ type: 'image', url, w: 260, h: 180, color: '#fff', text: url });
          closeImageModal();
        }}
      />

      {showAssetPicker && (
        <AssetPicker
          onClose={() => setShowAssetPicker(false)}
          onImport={item => {
            addNode({
              type: item.type === 'task' ? 'checklist' : 'sticky',
              w: 240,
              h: 160,
              text: item.type !== 'task' ? `${item.title}\n\n${item.preview}` : undefined,
              items: item.type === 'task'
                ? [{ text: item.title, done: Boolean((item.data as AureaTask).completed || (item.data as AureaTask).is_completed) }]
                : undefined,
              color: item.type === 'astro' ? '#FFFDE7' : item.type === 'calendar' ? '#E3F2FD' : STICKY_COLORS[0],
            });
            setShowAssetPicker(false);
            showToast(`Importado: ${item.title}`);
          }}
        />
      )}

      {toast && (
        <div
          className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[300] flex items-center gap-2 px-4 py-2.5 rounded-xl shadow-xl text-xs font-semibold animate-in slide-in-from-bottom-3 fade-in"
          style={{ background: toast.ok ? '#1A1A1A' : '#EF4444', color: '#fff' }}
        >
          {toast.ok ? <Check size={12} /> : <AlertCircle size={12} />}
          {toast.msg}
        </div>
      )}
    </div>
  );
};
