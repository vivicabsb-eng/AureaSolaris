import { describe, it, expect, vi, beforeEach } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { DiarioView } from '../../components/DiarioView';
import { IdentityProvider } from '../../features/identity/IdentityContext';

// Mock safeInvoke at module level
vi.mock('../../utils/tauri', () => ({
  safeInvoke: vi.fn(async (cmd: string) => {
    if (cmd === 'list_boards') {
      return [{ id: 'board-1', name: 'Estudo de Saturno', updated_at: 1723300000000 }];
    }
    if (cmd === 'load_board') {
      return {
        nodes: [{
          id: 7,
          type: 'sticky',
          x: 0,
          y: 0,
          w: 200,
          h: 140,
          text: 'Saturno na casa 4',
          studyContent: 'Registro real ligado ao card.',
          studyUpdatedAt: 1723300000000,
        }],
      };
    }
    if (cmd === 'diary_list_folders') {
      return [{ id: 'general', name: 'Geral', icon: '📁', order: 0, createdAt: '' }];
    }
    if (cmd === 'diary_list_entries') return [];
    if (cmd === 'diary_get_entry') {
      return { id: '1', title: 'Teste', content: '', folderId: 'general', createdAt: '', updatedAt: '', wordCount: 0 };
    }
    if (cmd === 'diary_create_entry') {
      return { id: 'new-1', title: 'Nova Nota', content: '', folderId: 'general', createdAt: '', updatedAt: '', wordCount: 0 };
    }
    return null;
  }),
}));

const renderWithIdentity = (ui: React.ReactElement) => render(<IdentityProvider>{ui}</IdentityProvider>);

describe('DiarioView', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  it('renders without crashing', async () => {
    const { container } = renderWithIdentity(<DiarioView />);
    await waitFor(() => {
      expect(container.textContent).toContain('Histórico');
    });
  });

  it('compiles a board study and returns to its source card', async () => {
    const onOpenStudy = vi.fn();
    renderWithIdentity(<DiarioView onOpenStudy={onOpenStudy} />);

    expect((await screen.findAllByText('Saturno na casa 4')).length).toBeGreaterThan(0);
    expect(screen.getByText('Registro real ligado ao card.')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Abrir no Caderno' }));
    expect(onOpenStudy).toHaveBeenCalledWith('board-1', 7);
  });
});