import { describe, it, expect, vi, beforeEach } from 'vitest';
import { safeInvoke } from '../../utils/tauri';
import { invoke } from '@tauri-apps/api/core';

// Mock @tauri-apps/api/core to simulate non-Tauri environment
vi.mock('@tauri-apps/api/core', () => ({
  invoke: vi.fn(),
}));

const BOOT_URL = 'http://127.0.0.1:9876/browser/command';
const SESSION_TOKEN = 'test-browser-session-token';

describe('openInitialAccess', () => {
  beforeEach(() => {
    vi.resetModules();
    // @ts-expect-error - clearing Tauri internals
    delete window.__TAURI_INTERNALS__;
    vi.stubGlobal('fetch', vi.fn());
    vi.mocked(invoke).mockReset();
  });

  it('maps HTTP 200 valid payload to local-owner and captures token for safeInvoke', async () => {
    const mockFetch = vi.fn()
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({
          result: { kind: 'local-owner', ownerId: 'local-owner', displayName: 'Aurea' },
          browser_session_token: SESSION_TOKEN,
        }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ result: null }),
      });
    vi.stubGlobal('fetch', mockFetch);

    const { openInitialAccess, safeInvoke } = await import('../../utils/tauri');
    const result = await openInitialAccess();

    expect(result).toEqual({
      kind: 'local-owner',
      ownerId: 'local-owner',
      displayName: 'Aurea',
    });
    expect(mockFetch).toHaveBeenCalledTimes(1);
    expect(mockFetch).toHaveBeenCalledWith(
      BOOT_URL,
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({ command: 'private_initial_access', args: {} }),
      }),
    );

    await safeInvoke('load_board', { boardId: 'board-1' });
    expect(mockFetch).toHaveBeenCalledTimes(2);
    const followUpHeaders = mockFetch.mock.calls[1][1]?.headers as Record<string, string>;
    expect(followUpHeaders['X-Aurea-Browser-Session']).toBe(SESSION_TOKEN);
  });

  it('maps HTTP 403 login-required to login-required', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: false,
      status: 403,
      json: async () => ({
        detail: { code: 'login-required', message: 'Password login is required.' },
      }),
    }));

    const { openInitialAccess } = await import('../../utils/tauri');
    const result = await openInitialAccess();

    expect(result).toEqual({ kind: 'login-required' });
  });

  it('maps HTTP 409 setup-required with exact reason', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: false,
      status: 409,
      json: async () => ({
        detail: {
          code: 'setup-required',
          reason: 'disabled-owner',
          message: 'The only private account is disabled.',
        },
      }),
    }));

    const { openInitialAccess } = await import('../../utils/tauri');
    const result = await openInitialAccess();

    expect(result).toEqual({
      kind: 'setup-required',
      reason: 'disabled-owner',
      message: 'The only private account is disabled.',
    });
  });

  it('maps HTTP 500 to runtime-failure with a safe message', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: false,
      status: 500,
      json: async () => ({ detail: 'internal explosion', token: SESSION_TOKEN }),
    }));

    const { openInitialAccess } = await import('../../utils/tauri');
    const result = await openInitialAccess();

    expect(result.kind).toBe('runtime-failure');
    if (result.kind === 'runtime-failure') {
      expect(result.message).not.toContain('internal explosion');
      expect(result.message).not.toContain(SESSION_TOKEN);
    }
  });

  it('maps network rejection to runtime-failure with a safe message', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error(`network down ${SESSION_TOKEN}`)));

    const { openInitialAccess } = await import('../../utils/tauri');
    const result = await openInitialAccess();

    expect(result.kind).toBe('runtime-failure');
    if (result.kind === 'runtime-failure') {
      expect(result.message).not.toContain(SESSION_TOKEN);
      expect(result.message).not.toContain('network down');
    }
  });

  it('maps malformed HTTP 200 payload to runtime-failure without storing token', async () => {
    const mockFetch = vi.fn()
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({
          result: { kind: 'local-owner', ownerId: 'local-owner' },
          browser_session_token: SESSION_TOKEN,
        }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ result: null }),
      });
    vi.stubGlobal('fetch', mockFetch);

    const { openInitialAccess, safeInvoke } = await import('../../utils/tauri');
    const result = await openInitialAccess();

    expect(result.kind).toBe('runtime-failure');
    await safeInvoke('load_board', { boardId: 'board-1' });
    const followUpHeaders = mockFetch.mock.calls[1][1]?.headers as Record<string, string> | undefined;
    expect(followUpHeaders?.['X-Aurea-Browser-Session']).toBeUndefined();
  });

  it('returns login-required in Tauri runtime without fetch or invoke', async () => {
  // @ts-expect-error - simulating Tauri internals
    window.__TAURI_INTERNALS__ = {};
    const mockFetch = vi.fn();
    vi.stubGlobal('fetch', mockFetch);

    const { openInitialAccess } = await import('../../utils/tauri');
    const result = await openInitialAccess();

    expect(result).toEqual({ kind: 'login-required' });
    expect(mockFetch).not.toHaveBeenCalled();
    expect(invoke).not.toHaveBeenCalled();
  });
});

describe('safeInvoke (browser mode — no Tauri bridge)', () => {
  beforeEach(() => {
    // Ensure we're not in Tauri mode
    // @ts-expect-error - clearing Tauri internals
    delete window.__TAURI_INTERNALS__;
    // The browser bridge is an HTTP boundary. Keep this unit test independent
    // from a locally running Aurea server and assert its null-result contract.
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ result: null }),
    }));
  });

  it('returns null for run_astro_engine to trigger real JS fallback', async () => {
    const result = await safeInvoke<string>('run_astro_engine', {});
    expect(result).toBeNull();
  });

  it('returns null for any command outside Tauri (callers handle real fallback)', async () => {
    const result = await safeInvoke('nonexistent_tauri_command', {});
    expect(result).toBeNull();
  });

  it('returns null for unknown commands', async () => {
    const result = await safeInvoke('nonexistent_command', {});
    expect(result).toBeNull();
  });
});
