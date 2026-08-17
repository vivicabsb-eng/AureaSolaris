import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { StudyArchive } from '../../components/diario/StudyArchive';
import { listBoards, loadBoard } from '../../services/notebook';
import { listDiaryEntries } from '../../services/diary';

vi.mock('../../services/notebook', () => ({
  listBoards: vi.fn(),
  loadBoard: vi.fn(),
}));

vi.mock('../../services/diary', () => ({
  listDiaryEntries: vi.fn(),
}));

describe('StudyArchive', () => {
  beforeEach(() => {
    vi.mocked(listBoards).mockResolvedValue([
      { id: 'board-a', name: 'Caderno A', updatedAt: 1 },
      { id: 'board-b', name: 'Caderno B', updatedAt: 2 },
    ]);
    vi.mocked(loadBoard).mockImplementation(async (boardId) => ({
      nodes: [{
        id: 1,
        type: 'sticky',
        x: 0,
        y: 0,
        w: 200,
        h: 140,
        text: boardId === 'board-a' ? 'Estudo A' : 'Estudo B',
        studyContent: boardId === 'board-a' ? 'Conteúdo A' : 'Conteúdo B',
      }],
      edges: [],
    }));
    vi.mocked(listDiaryEntries).mockResolvedValue([]);
  });

  it('keeps the first visible item selected after hiding and restoring the previous item', async () => {
    render(<StudyArchive onOpenStudy={vi.fn()} />);

    expect(await screen.findByRole('heading', { name: 'Estudo B' })).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: /Estudo A/ }));

    const search = screen.getByLabelText('Buscar no histórico');
    fireEvent.change(search, { target: { value: 'Estudo B' } });
    expect(await screen.findByRole('heading', { name: 'Estudo B' })).toBeTruthy();

    fireEvent.change(search, { target: { value: '' } });
    expect(await screen.findByRole('heading', { name: 'Estudo B' })).toBeTruthy();
  });
});
