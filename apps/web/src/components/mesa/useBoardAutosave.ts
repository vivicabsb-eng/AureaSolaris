import { useEffect, useRef, useState } from 'react';
import { saveBoard } from '../../services/notebook';
import type { CadernoEdge, CadernoNode } from '../../types/caderno';

export type BoardSaveState = 'idle' | 'saving' | 'saved' | 'error';

export function useBoardAutosave(
  boardId: string,
  boardName: string,
  nodes: CadernoNode[],
  edges: CadernoEdge[],
): BoardSaveState {
  const [saveState, setSaveState] = useState<BoardSaveState>('idle');
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const saveVersion = useRef(0);

  useEffect(() => {
    if (saveTimer.current) clearTimeout(saveTimer.current);
    const version = ++saveVersion.current;
    const stateTimer = setTimeout(() => setSaveState('saving'), 0);
    saveTimer.current = setTimeout(() => {
      void saveBoard({ id: boardId, name: boardName, nodes, edges }).then(savedAt => {
        if (version !== saveVersion.current) return;
        setSaveState(typeof savedAt === 'number' ? 'saved' : 'error');
      });
    }, 800);

    return () => {
      clearTimeout(stateTimer);
      if (saveTimer.current) clearTimeout(saveTimer.current);
    };
  }, [boardId, boardName, nodes, edges]);

  return saveState;
}
