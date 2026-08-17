import { act, renderHook } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { useBoardKeyboard } from '../../../components/mesa/useBoardKeyboard';
import type { CadernoEdge } from '../../../types/caderno';

describe('useBoardKeyboard', () => {
  it('deletes the selected node on Delete when not typing', () => {
    const deleteNode = vi.fn();
    const edgesRef = { current: [] as CadernoEdge[] };

    renderHook(() => useBoardKeyboard({
      undo: vi.fn(),
      redo: vi.fn(),
      selected: 1,
      selectedEdgeId: null,
      setSelected: vi.fn(),
      setSelectedEdgeId: vi.fn(),
      setTool: vi.fn(),
      setConnectSourceId: vi.fn(),
      setFocusNodeId: vi.fn(),
      pushHistory: vi.fn(),
      deleteNode,
      setEdges: vi.fn(),
      edgesRef,
    }));

    act(() => {
      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Delete', bubbles: true }));
    });

    expect(deleteNode).toHaveBeenCalledWith(1);
  });

  it('ignores Delete while a textarea is focused', () => {
    const deleteNode = vi.fn();
    const edgesRef = { current: [] as CadernoEdge[] };
    const textarea = document.createElement('textarea');
    document.body.appendChild(textarea);
    textarea.focus();

    renderHook(() => useBoardKeyboard({
      undo: vi.fn(),
      redo: vi.fn(),
      selected: 1,
      selectedEdgeId: null,
      setSelected: vi.fn(),
      setSelectedEdgeId: vi.fn(),
      setTool: vi.fn(),
      setConnectSourceId: vi.fn(),
      setFocusNodeId: vi.fn(),
      pushHistory: vi.fn(),
      deleteNode,
      setEdges: vi.fn(),
      edgesRef,
    }));

    act(() => {
      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Delete', bubbles: true }));
    });

    expect(deleteNode).not.toHaveBeenCalled();
    textarea.remove();
  });
});
