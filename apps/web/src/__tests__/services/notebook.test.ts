import { beforeEach, describe, expect, it, vi } from 'vitest';
import { deleteBoard, listBoards, loadBoard, saveBoard } from '../../services/notebook';
import type { CadernoNode } from '../../types/caderno';

const { safeInvokeMock } = vi.hoisted(() => ({
  safeInvokeMock: vi.fn(),
}));

vi.mock('../../utils/tauri', () => ({ safeInvoke: safeInvokeMock }));

describe('notebook service', () => {
  beforeEach(() => {
    safeInvokeMock.mockReset();
  });

  it('lists boards through the typed command and maps DTO fields', async () => {
    safeInvokeMock.mockResolvedValueOnce([
      { id: 'board-1', name: 'Estudo', updated_at: 123, owner_id: 'owner-1' },
    ]);

    await expect(listBoards()).resolves.toEqual([
      { id: 'board-1', name: 'Estudo', updatedAt: 123, ownerId: 'owner-1' },
    ]);
    expect(safeInvokeMock).toHaveBeenCalledWith('list_boards');
  });

  it('loads a board with the existing request and response contract', async () => {
    const nodes: CadernoNode[] = [{ id: 1, type: 'sticky', x: 0, y: 0, w: 100, h: 100 }];
    safeInvokeMock.mockResolvedValueOnce({
      nodes,
      edges: [],
      name: 'Estudo',
      updated_at: 123,
      owner_id: 'owner-1',
    });

    await expect(loadBoard('board-1')).resolves.toEqual({
      nodes,
      edges: [],
      name: 'Estudo',
      updatedAt: 123,
      ownerId: 'owner-1',
    });
    expect(safeInvokeMock).toHaveBeenCalledWith('load_board', { boardId: 'board-1' });
  });

  it('saves typed nodes and edges and returns the timestamp', async () => {
    const nodes: CadernoNode[] = [{ id: 1, type: 'sticky', x: 0, y: 0, w: 100, h: 100 }];
    safeInvokeMock.mockResolvedValueOnce(456);

    await expect(saveBoard({ id: 'board-1', name: 'Estudo', nodes, edges: [] })).resolves.toBe(456);
    expect(safeInvokeMock).toHaveBeenCalledWith('save_board', {
      boardId: 'board-1',
      name: 'Estudo',
      nodes,
      edges: [],
    });
  });

  it('preserves safeInvoke null failures and delete responses', async () => {
    safeInvokeMock.mockResolvedValueOnce(null);
    await expect(deleteBoard('board-1')).resolves.toBeNull();
    expect(safeInvokeMock).toHaveBeenCalledWith('delete_board', { boardId: 'board-1' });

    safeInvokeMock.mockResolvedValueOnce(true);
    await expect(deleteBoard('board-1')).resolves.toBeUndefined();
  });
});
