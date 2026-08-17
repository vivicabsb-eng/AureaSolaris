import { useCallback, useState } from 'react';
import type { CadernoEdge, CadernoNode } from '../../types/caderno';

export const MAX_HISTORY = 50;

export type NodeGeometry = Pick<CadernoNode, 'x' | 'y'>;
export type NodeSize = Pick<CadernoNode, 'w' | 'h'>;

export type HistoryAction =
  | { type: 'addNode'; payload: { node: CadernoNode } }
  | { type: 'deleteNode'; payload: { node: CadernoNode; edges?: CadernoEdge[] } }
  | { type: 'moveNode'; payload: { id: number; prev: NodeGeometry; next: NodeGeometry } }
  | { type: 'resizeNode'; payload: { id: number; prev: NodeSize; next: NodeSize } }
  | { type: 'updateNode'; payload: { id: number; prev: Partial<CadernoNode>; next: Partial<CadernoNode> } }
  | { type: 'addEdge'; payload: { edge: CadernoEdge } }
  | { type: 'deleteEdge'; payload: { edge: CadernoEdge } };

type SetNodes = React.Dispatch<React.SetStateAction<CadernoNode[]>>;
type SetEdges = React.Dispatch<React.SetStateAction<CadernoEdge[]>>;

export function useBoardHistory(setNodes: SetNodes, setEdges: SetEdges) {
  const [undoStack, setUndoStack] = useState<HistoryAction[]>([]);
  const [redoStack, setRedoStack] = useState<HistoryAction[]>([]);

  const pushHistory = useCallback((action: HistoryAction) => {
    setUndoStack(prev => {
      const s = [...prev, action];
      return s.length > MAX_HISTORY ? s.slice(-MAX_HISTORY) : s;
    });
    setRedoStack([]);
  }, []);

  const applyAction = useCallback((action: HistoryAction, direction: 'undo' | 'redo') => {
    const isUndo = direction === 'undo';
    switch (action.type) {
      case 'addNode':
        if (isUndo) {
          setNodes(n => n.filter(x => x.id !== action.payload.node.id));
        } else {
          setNodes(n => [...n, action.payload.node]);
        }
        break;
      case 'deleteNode':
        if (isUndo) {
          setNodes(n => [...n, action.payload.node]);
          setEdges(e => [...e, ...(action.payload.edges || [])]);
        } else {
          setNodes(n => n.filter(x => x.id !== action.payload.node.id));
          setEdges(e => e.filter(x => x.from !== action.payload.node.id && x.to !== action.payload.node.id));
        }
        break;
      case 'addEdge':
        if (isUndo) {
          setEdges(e => e.filter(x => x.id !== action.payload.edge.id));
        } else {
          setEdges(e => [...e, action.payload.edge]);
        }
        break;
      case 'deleteEdge':
        if (isUndo) {
          setEdges(e => [...e, action.payload.edge]);
        } else {
          setEdges(e => e.filter(x => x.id !== action.payload.edge.id));
        }
        break;
      case 'moveNode':
      case 'resizeNode':
      case 'updateNode': {
        const state = isUndo ? action.payload.prev : action.payload.next;
        setNodes(n => n.map(x => x.id === action.payload.id ? { ...x, ...state } : x));
        break;
      }
    }
  }, [setNodes, setEdges]);

  const undo = useCallback(() => {
    setUndoStack(prev => {
      if (!prev.length) return prev;
      const action = prev[prev.length - 1];
      applyAction(action, 'undo');
      setRedoStack(r => [...r, action]);
      return prev.slice(0, -1);
    });
  }, [applyAction]);

  const redo = useCallback(() => {
    setRedoStack(prev => {
      if (!prev.length) return prev;
      const action = prev[prev.length - 1];
      applyAction(action, 'redo');
      setUndoStack(u => [...u, action]);
      return prev.slice(0, -1);
    });
  }, [applyAction]);

  return { undoStack, redoStack, pushHistory, undo, redo };
}
