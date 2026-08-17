import { StrictMode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import App from '../App';
import { AppProviders } from '../app/AppProviders';

const { openInitialAccess, safeInvoke } = vi.hoisted(() => ({
  openInitialAccess: vi.fn(),
  safeInvoke: vi.fn(),
}));

vi.mock('../utils/tauri', () => ({
  openInitialAccess,
  safeInvoke,
}));

vi.mock('../hooks/useLiveTransitData', () => ({
  useLiveTransitData: () => ({
    liveData: null,
    loading: false,
    error: null,
    transits: [],
    getPlanetaryHour: () => ({ icon: '☉', name: 'Sol', time: '12:00' }),
    getSchedulingSuggestion: () => '',
    fetchAstro: vi.fn(),
    NATAL: undefined,
  }),
}));

vi.mock('../components/LoginView', () => ({
  LoginView: ({
    onLogin,
    onSignUp,
  }: {
    onLogin: (id: string, password: string, remember: boolean) => Promise<{ ok: boolean }>;
    onSignUp: (name: string, password: string, remember: boolean) => Promise<{ ok: boolean }>;
  }) => (
    <div>
      <button
        type="button"
        onClick={() => {
          void onLogin('profile-1', 'secret', false);
        }}
      >
        ENTRAR
      </button>
      <button
        type="button"
        onClick={() => {
          void onSignUp('Nova Pessoa', 'secret-password', false);
        }}
      >
        INSCREVER-SE
      </button>
    </div>
  ),
}));

vi.mock('../components/AstrologiaBoard', () => ({
  AstrologiaPage: () => <div>Astrologia landmark</div>,
}));
vi.mock('../components/SaudeView', () => ({
  SaudeView: () => <div>Saúde landmark</div>,
}));
vi.mock('../components/agenda/AgendaView', () => ({
  AgendaView: () => <div>Agenda landmark</div>,
}));
vi.mock('../components/MesaCriacao', () => ({
  MesaCriacao: () => <div>Caderno Vivo landmark</div>,
}));
vi.mock('../components/MemoriasView', () => ({
  MemoriasView: () => <div>Memórias landmark</div>,
}));
vi.mock('../components/DiarioView', () => ({
  DiarioView: () => <div>Histórico landmark</div>,
}));
vi.mock('../components/HermesChat', () => ({
  HermesChat: () => null,
}));

const renderApp = (strict = false) => {
  const tree = (
    <AppProviders>
      <App />
    </AppProviders>
  );
  return render(strict ? <StrictMode>{tree}</StrictMode> : tree);
};

describe('App navigation', () => {
  beforeEach(() => {
    localStorage.clear();
    localStorage.setItem('aurea_profiles', JSON.stringify([
      { id: 'profile-1', name: 'Teste', active: true, connections: [] },
    ]));
    vi.clearAllMocks();
    openInitialAccess.mockResolvedValue({ kind: 'login-required' });
    safeInvoke.mockImplementation(async (command: string, args?: { ownerId?: string }) => {
      if (command === 'remembered_owner_clear') return null;
      if (command === 'private_session_open') return 'profile-1';
      if (command === 'private_session_close') return null;
      if (command === 'private_account_register') return args?.ownerId ?? null;
      return null;
    });
  });

  it('keeps Astrologia as the authenticated default and loads each primary screen landmark', async () => {
    renderApp();
    fireEvent.click(await screen.findByRole('button', { name: 'ENTRAR' }));
    await screen.findByTitle('Astrologia', {}, { timeout: 10000 });
    expect(await screen.findByText('Astrologia landmark')).toBeTruthy();

    const pages: Array<{ label: string; landmark: string }> = [
      { label: 'Astrologia', landmark: 'Astrologia landmark' },
      { label: 'Saúde & Vitalidade', landmark: 'Saúde landmark' },
      { label: 'Agenda Preditiva', landmark: 'Agenda landmark' },
      { label: 'Caderno Vivo', landmark: 'Caderno Vivo landmark' },
      { label: 'Memórias', landmark: 'Memórias landmark' },
      { label: 'Histórico & Notas', landmark: 'Histórico landmark' },
    ];

    for (const page of pages) {
      fireEvent.click(screen.getByTitle(page.label));
      await waitFor(() => {
        expect(screen.getByText(page.landmark)).toBeTruthy();
      });
    }
  }, 15000);
});

describe('App access states', () => {
  beforeEach(() => {
    localStorage.clear();
    localStorage.setItem('aurea_profiles', JSON.stringify([
      { id: 'profile-1', name: 'Teste', active: true, connections: [] },
    ]));
    vi.clearAllMocks();
    safeInvoke.mockImplementation(async (command: string, args?: { ownerId?: string }) => {
      if (command === 'remembered_owner_clear') return null;
      if (command === 'private_session_open') return 'profile-1';
      if (command === 'private_session_close') return null;
      if (command === 'private_account_register') return args?.ownerId ?? null;
      return null;
    });
  });

  it('shows the Astrologia shell for local-owner without clicking Entrar', async () => {
    openInitialAccess.mockResolvedValue({
      kind: 'local-owner',
      ownerId: 'owner-1',
      displayName: 'Aurea Local',
    });

    renderApp();

    await screen.findByTitle('Astrologia');
    expect(screen.queryByRole('button', { name: 'ENTRAR' })).toBeNull();
  });

  it('does not duplicate the UI profile when StrictMode boots local-owner twice', async () => {
    openInitialAccess.mockResolvedValue({
      kind: 'local-owner',
      ownerId: 'owner-1',
      displayName: 'Aurea Local',
    });

    renderApp(true);

    await screen.findByTitle('Astrologia');
    const profiles = JSON.parse(localStorage.getItem('aurea_profiles') || '[]') as Array<{ id: string }>;
    expect(profiles.filter((profile) => profile.id === 'owner-1')).toHaveLength(1);
    expect(openInitialAccess.mock.calls.length).toBeGreaterThanOrEqual(1);
  });

  it('applies the test-user UI seed when health reports test_user', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ test_user: true }),
    });
    vi.stubGlobal('fetch', fetchMock);

    openInitialAccess.mockResolvedValue({
      kind: 'local-owner',
      ownerId: 'aurea-test',
      displayName: 'Pessoa Teste',
    });

    renderApp();

    await screen.findByTitle('Astrologia');
    const profiles = JSON.parse(localStorage.getItem('aurea_profiles') || '[]') as Array<{
      id: string;
      connections?: Array<{ id: string }>;
    }>;
    const profile = profiles.find((item) => item.id === 'aurea-test');
    expect(profile?.connections?.some((connection) => connection.id === 'aurea-reference-natal')).toBe(true);
    expect(localStorage.getItem('aurea_active_subject:aurea-test')).toBe('aurea-reference-natal');

    vi.unstubAllGlobals();
  });

  it('does not apply the test-user UI seed when the owner is not aurea-test', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ test_user: true }),
    });
    vi.stubGlobal('fetch', fetchMock);

    openInitialAccess.mockResolvedValue({
      kind: 'local-owner',
      ownerId: 'owner-1',
      displayName: 'Aurea Local',
    });

    renderApp();

    await screen.findByTitle('Astrologia');
    expect(localStorage.getItem('aurea_test_user_seed_version')).toBeNull();
    expect(localStorage.getItem('aurea_active_subject:owner-1')).not.toBe('aurea-reference-natal');
    const profiles = JSON.parse(localStorage.getItem('aurea_profiles') || '[]') as Array<{
      id: string;
      connections?: Array<{ id: string }>;
    }>;
    const profile = profiles.find((item) => item.id === 'owner-1');
    expect(profile?.connections?.some((connection) => connection.id === 'aurea-reference-natal')).toBeFalsy();
    const tasks = JSON.parse(localStorage.getItem('aurea_tasks') || '[]') as Array<{ id: string }>;
    expect(tasks.some((task) => task.id === 'task-teste-1')).toBe(false);

    vi.unstubAllGlobals();
  });

  it('shows LoginView for login-required and still supports login', async () => {
    openInitialAccess.mockResolvedValue({ kind: 'login-required' });

    renderApp();

    fireEvent.click(await screen.findByRole('button', { name: 'ENTRAR' }));
    await screen.findByTitle('Astrologia');
  });

  it('shows LoginView for login-required and still supports register', async () => {
    openInitialAccess.mockResolvedValue({ kind: 'login-required' });

    renderApp();

    fireEvent.click(await screen.findByRole('button', { name: 'INSCREVER-SE' }));
    await screen.findByTitle('Astrologia');
  });

  it('shows a blocking setup message and hides LoginView and the main shell', async () => {
    openInitialAccess.mockResolvedValue({
      kind: 'setup-required',
      reason: 'disabled-owner',
      message: 'The only private account is disabled.',
    });

    renderApp();

    expect(await screen.findByText('The only private account is disabled.')).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'ENTRAR' })).toBeNull();
    expect(screen.queryByTitle('Astrologia')).toBeNull();
  });

  it('shows a retryable startup error and does not fall back to LoginView', async () => {
    openInitialAccess.mockResolvedValue({
      kind: 'runtime-failure',
      message: 'Initial access failed.',
    });

    renderApp();

    expect(await screen.findByText('Initial access failed.')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Tentar novamente' })).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'ENTRAR' })).toBeNull();
    expect(screen.queryByTitle('Astrologia')).toBeNull();
  });

  it('hides Sair in the local-owner profile editor', async () => {
    openInitialAccess.mockResolvedValue({
      kind: 'local-owner',
      ownerId: 'owner-1',
      displayName: 'Aurea Local',
    });

    renderApp();

    await screen.findByTitle('Astrologia');
    fireEvent.click(screen.getByRole('button', { name: /aurea local/i }));
    expect(screen.queryByRole('button', { name: 'Sair' })).toBeNull();
  });

  it('keeps Sair in the require-login profile editor and calls the current logout handler', async () => {
    openInitialAccess.mockResolvedValue({ kind: 'login-required' });

    renderApp();

    fireEvent.click(await screen.findByRole('button', { name: 'ENTRAR' }));
    await screen.findByTitle('Astrologia');
    fireEvent.click(screen.getByRole('button', { name: /teste/i }));
    fireEvent.click(screen.getByRole('button', { name: 'Sair' }));

    await waitFor(() => {
      expect(safeInvoke).toHaveBeenCalledWith('private_session_close');
      expect(safeInvoke).toHaveBeenCalledWith('remembered_owner_clear');
    });
    expect(await screen.findByRole('button', { name: 'ENTRAR' })).toBeTruthy();
  });
});
