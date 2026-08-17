import { useEffect, useState } from 'react';
import type { CadernoEdge } from '../../types/caderno';
import type { HistoryAction } from './useBoardHistory';

export type BoardTool = 'select' | 'sticky' | 'text' | 'checklist' | 'image' | 'connect' | 'shape';

type UseBoardKeyboardOptions = {
  undo: () => void;
  redo: () => void;
  selected: number | null;
  selectedEdgeId: number | null;
  setSelected: (id: number | null) => void;
  setSelectedEdgeId: (id: number | null) => void;
  setTool: (tool: BoardTool) => void;
  setConnectSourceId: (id: number | null) => void;
  setFocusNodeId: (id: number | null) => void;
  pushHistory: (action: HistoryAction) => void;
  deleteNode: (id: number) => void;
  setEdges: React.Dispatch<React.SetStateAction<CadernoEdge[]>>;
  edgesRef: React.RefObject<CadernoEdge[]>;
};

export function useBoardKeyboard({
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
}: UseBoardKeyboardOptions) {
  const [spaceHeld, setSpaceHeld] = useState(false);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const typing = document.activeElement instanceof HTMLInputElement || document.activeElement instanceof HTMLTextAreaElement;
      if (!typing && (e.ctrlKey || e.metaKey) && !e.shiftKey && e.key === 'z') { e.preventDefault(); undo(); }
      if (!typing && (e.ctrlKey || e.metaKey) && (e.shiftKey && e.key === 'z' || e.key === 'y')) { e.preventDefault(); redo(); }
      if (!typing) {
        if (e.key === 'Delete' || e.key === 'Backspace') {
          if (selectedEdgeId !== null) {
            const edge = edgesRef.current.find(item => item.id === selectedEdgeId);
            if (edge) {
              pushHistory({ type: 'deleteEdge', payload: { edge } });
              setEdges(items => items.filter(item => item.id !== edge.id));
            }
            setSelectedEdgeId(null);
          } else if (selected !== null) {
            deleteNode(selected);
            setSelected(null);
          }
        }
        if (e.key === 'v') setTool('select');
        if (e.key === 'n') { setTool('sticky'); }
        if (e.key === 't') setTool('text');
        if (e.key === 'c') setTool('checklist');
        if (e.key === ' ') {
          e.preventDefault();
          setSpaceHeld(true);
        }
        if (e.key === 'Escape') {
          setSelected(null);
          setSelectedEdgeId(null);
          setConnectSourceId(null);
          setTool('select');
          setFocusNodeId(null);
          setSpaceHeld(false);
        }
      }
    };
    const up = (e: KeyboardEvent) => { if (e.key === ' ') setSpaceHeld(false); };
    window.addEventListener('keydown', handler);
    window.addEventListener('keyup', up);
    return () => {
      window.removeEventListener('keydown', handler);
      window.removeEventListener('keyup', up);
    };
  }, [undo, redo, selected, selectedEdgeId, pushHistory, deleteNode, setSelected, setSelectedEdgeId, setTool, setConnectSourceId, setFocusNodeId, setEdges, edgesRef]);

  return { spaceHeld, setSpaceHeld };
}
