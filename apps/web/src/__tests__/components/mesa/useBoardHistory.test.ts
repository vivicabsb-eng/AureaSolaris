import { act, renderHook } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { MAX_HISTORY, useBoardHistory } from '../../../components/mesa/useBoardHistory';
import type { CadernoEdge, CadernoNode } from '../../../types/caderno';

const makeNode = (id: number): CadernoNode => ({
  id,
  type: 'sticky',
  x: 0,
  y: 0,
  w: 200,
  h: 160,
  text: `node-${id}`,
  color: '#FFFDE7',
});

describe('useBoardHistory', () => {
  it('caps undo stack at MAX_HISTORY and drops only the oldest entry', () => {
    let nodes: CadernoNode[] = [];
    let edges: CadernoEdge[] = [];
    const setNodes = (updater: React.SetStateAction<CadernoNode[]>) => {
      nodes = typeof updater === 'function' ? updater(nodes) : updater;
    };
    const setEdges = (updater: React.SetStateAction<CadernoEdge[]>) => {
      edges = typeof updater === 'function' ? updater(edges) : updater;
    };

    const { result } = renderHook(() => useBoardHistory(setNodes, setEdges));

    act(() => {
      for (let i = 1; i <= MAX_HISTORY + 1; i += 1) {
        result.current.pushHistory({ type: 'addNode', payload: { node: makeNode(i) } });
      }
    });

    expect(result.current.undoStack).toHaveLength(MAX_HISTORY);
    expect(result.current.undoStack[0].type).toBe('addNode');
    expect((result.current.undoStack[0] as { payload: { node: CadernoNode } }).payload.node.id).toBe(2);
    expect(
      (result.current.undoStack[MAX_HISTORY - 1] as { payload: { node: CadernoNode } }).payload.node.id,
    ).toBe(MAX_HISTORY + 1);
  });

  it('undoes and redoes addNode in LIFO order', () => {
    let nodes: CadernoNode[] = [];
    let edges: CadernoEdge[] = [];
    const setNodes = (updater: React.SetStateAction<CadernoNode[]>) => {
      nodes = typeof updater === 'function' ? updater(nodes) : updater;
    };
    const setEdges = (updater: React.SetStateAction<CadernoEdge[]>) => {
      edges = typeof updater === 'function' ? updater(edges) : updater;
    };

    const { result } = renderHook(() => useBoardHistory(setNodes, setEdges));
    const first = makeNode(1);
    const second = makeNode(2);

    act(() => {
      result.current.pushHistory({ type: 'addNode', payload: { node: first } });
      nodes = [first];
      result.current.pushHistory({ type: 'addNode', payload: { node: second } });
      nodes = [first, second];
    });

    act(() => {
      result.current.undo();
    });
    expect(nodes.map(node => node.id)).toEqual([1]);
    expect(result.current.redoStack).toHaveLength(1);

    act(() => {
      result.current.undo();
    });
    expect(nodes).toEqual([]);
    expect(result.current.redoStack).toHaveLength(2);

    act(() => {
      result.current.redo();
    });
    expect(nodes.map(node => node.id)).toEqual([1]);

    act(() => {
      result.current.redo();
    });
    expect(nodes.map(node => node.id)).toEqual([1, 2]);
  });

  it('clears redo stack when a new action is pushed', () => {
    let nodes: CadernoNode[] = [];
    let edges: CadernoEdge[] = [];
    const setNodes = (updater: React.SetStateAction<CadernoNode[]>) => {
      nodes = typeof updater === 'function' ? updater(nodes) : updater;
    };
    const setEdges = (updater: React.SetStateAction<CadernoEdge[]>) => {
      edges = typeof updater === 'function' ? updater(edges) : updater;
    };

    const { result } = renderHook(() => useBoardHistory(setNodes, setEdges));
    const node = makeNode(1);

    act(() => {
      result.current.pushHistory({ type: 'addNode', payload: { node } });
      nodes = [node];
    });

    act(() => {
      result.current.undo();
    });

    act(() => {
      result.current.pushHistory({ type: 'addNode', payload: { node: makeNode(2) } });
    });

    expect(result.current.redoStack).toEqual([]);
  });
});
