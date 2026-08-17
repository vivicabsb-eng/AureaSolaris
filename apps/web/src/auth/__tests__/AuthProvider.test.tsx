import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { useState } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { AuthProvider } from '../AuthProvider';
import type { AuthClient, AuthClientError, AuthSession } from '../client';
import { useAuth } from '../useAuth';

type AuthEvent = Parameters<Parameters<AuthClient['auth']['onAuthStateChange']>[0]>[0];

type FakeAuthOptions = {
  initialSession?: AuthSession | null;
  getSessionError?: AuthClientError | null;
  signInSession?: AuthSession | null;
  signInError?: AuthClientError | null;
  signOutError?: AuthClientError | null;
};

function sessionFor(userId: string): AuthSession {
  return { user: { id: userId } } as AuthSession;
}

function createFakeAuthClient(options: FakeAuthOptions = {}) {
  let listener: Parameters<AuthClient['auth']['onAuthStateChange']>[0] | undefined;
  const unsubscribe = vi.fn();
  const getSession = vi.fn(async () => ({
    data: { session: options.initialSession ?? null },
    error: options.getSessionError ?? null,
  }));
  const signInWithPassword = vi.fn(async () => ({
    data: { session: options.signInSession ?? null },
    error: options.signInError ?? null,
  }));
  const signOut = vi.fn(async (signOutOptions?: { scope?: 'global' | 'local' | 'others' }) => {
    if (signOutOptions?.scope !== 'others') {
      void listener?.('SIGNED_OUT', null);
    }
    return { error: options.signOutError ?? null };
  });

  const client: AuthClient = {
    auth: {
      getSession,
      onAuthStateChange(callback) {
        listener = callback;
        return { data: { subscription: { unsubscribe } } };
      },
      signInWithPassword,
      signOut,
    },
  };

  return {
    client,
    getSession,
    signInWithPassword,
    signOut,
    unsubscribe,
    emit(event: AuthEvent, session: AuthSession | null) {
      void listener?.(event, session);
    },
  };
}

function Probe() {
  const auth = useAuth();
  const [result, setResult] = useState('');

  return (
    <div>
      <output data-testid="status">{auth.status}</output>
      <output data-testid="user">{auth.session?.user.id ?? ''}</output>
      <output data-testid="result">{result}</output>
      <button
        type="button"
        onClick={() => {
          void auth.signIn('person@example.test', '  unchanged password  ').then((value) => {
            setResult(value.ok ? 'ok' : value.error);
          });
        }}
      >
        sign-in
      </button>
      <button
        type="button"
        onClick={() => {
          void auth.signOut().then((value) => {
            setResult(value.ok ? 'ok' : value.error);
          });
        }}
      >
        sign-out
      </button>
    </div>
  );
}

describe('AuthProvider', () => {
  it('restores an authenticated session from the browser client', async () => {
    const session = sessionFor('user-a');
    const auth = createFakeAuthClient({ initialSession: session });

    render(<AuthProvider client={auth.client}><Probe /></AuthProvider>);

    expect(screen.getByTestId('status').textContent).toBe('loading');
    await waitFor(() => expect(screen.getByTestId('status').textContent).toBe('authenticated'));
    expect(screen.getByTestId('user').textContent).toBe('user-a');
    expect(auth.getSession).toHaveBeenCalledTimes(1);
  });

  it('restores an anonymous state when no session exists', async () => {
    const auth = createFakeAuthClient();

    render(<AuthProvider client={auth.client}><Probe /></AuthProvider>);

    await waitFor(() => expect(screen.getByTestId('status').textContent).toBe('anonymous'));
  });

  it('reacts to auth changes and unsubscribes on cleanup', async () => {
    const auth = createFakeAuthClient();
    const { unmount } = render(<AuthProvider client={auth.client}><Probe /></AuthProvider>);
    await waitFor(() => expect(screen.getByTestId('status').textContent).toBe('anonymous'));

    act(() => auth.emit('SIGNED_IN', sessionFor('user-b')));
    await waitFor(() => expect(screen.getByTestId('status').textContent).toBe('authenticated'));
    expect(screen.getByTestId('user').textContent).toBe('user-b');

    act(() => auth.emit('SIGNED_OUT', null));
    await waitFor(() => expect(screen.getByTestId('status').textContent).toBe('anonymous'));

    unmount();
    expect(auth.unsubscribe).toHaveBeenCalledTimes(1);
  });

  it('signs in with the supplied email and untouched password', async () => {
    const auth = createFakeAuthClient({ signInSession: sessionFor('user-c') });

    render(<AuthProvider client={auth.client}><Probe /></AuthProvider>);
    await waitFor(() => expect(screen.getByTestId('status').textContent).toBe('anonymous'));
    fireEvent.click(screen.getByRole('button', { name: 'sign-in' }));

    await waitFor(() => expect(screen.getByTestId('result').textContent).toBe('ok'));
    expect(auth.signInWithPassword).toHaveBeenCalledWith({
      email: 'person@example.test',
      password: '  unchanged password  ',
    });
    expect(screen.getByTestId('status').textContent).toBe('authenticated');
    expect(screen.getByTestId('user').textContent).toBe('user-c');
  });

  it('maps provider login failures to a safe error code without exposing provider text', async () => {
    const auth = createFakeAuthClient({
      signInError: {
        status: 400,
        code: 'invalid_credentials',
        message: 'provider detail containing sensitive text',
      },
    });

    render(<AuthProvider client={auth.client}><Probe /></AuthProvider>);
    await waitFor(() => expect(screen.getByTestId('status').textContent).toBe('anonymous'));
    fireEvent.click(screen.getByRole('button', { name: 'sign-in' }));

    await waitFor(() => expect(screen.getByTestId('result').textContent).toBe('invalid_credentials'));
    expect(document.body.textContent).not.toContain('provider detail containing sensitive text');
    expect(screen.getByTestId('status').textContent).toBe('anonymous');
  });

  it('preserves email-not-confirmed as a bounded safe login error', async () => {
    const auth = createFakeAuthClient({
      signInError: {
        status: 400,
        code: 'email_not_confirmed',
        message: 'provider email confirmation detail',
      },
    });

    render(<AuthProvider client={auth.client}><Probe /></AuthProvider>);
    await waitFor(() => expect(screen.getByTestId('status').textContent).toBe('anonymous'));
    fireEvent.click(screen.getByRole('button', { name: 'sign-in' }));

    await waitFor(() => expect(screen.getByTestId('result').textContent).toBe('email_not_confirmed'));
    expect(document.body.textContent).not.toContain('provider email confirmation detail');
    expect(screen.getByTestId('status').textContent).toBe('anonymous');
  });

  it('maps throttling and unavailable provider errors without returning raw messages', async () => {
    const rateLimited = createFakeAuthClient({
      signInError: { status: 429, message: 'raw rate-limit details' },
    });
    const first = render(<AuthProvider client={rateLimited.client}><Probe /></AuthProvider>);
    await waitFor(() => expect(screen.getByTestId('status').textContent).toBe('anonymous'));
    fireEvent.click(screen.getByRole('button', { name: 'sign-in' }));
    await waitFor(() => expect(screen.getByTestId('result').textContent).toBe('rate_limited'));
    first.unmount();

    const unavailable = createFakeAuthClient({
      signInError: { status: 503, message: 'raw upstream details' },
    });
    render(<AuthProvider client={unavailable.client}><Probe /></AuthProvider>);
    await waitFor(() => expect(screen.getByTestId('status').textContent).toBe('anonymous'));
    fireEvent.click(screen.getByRole('button', { name: 'sign-in' }));
    await waitFor(() => expect(screen.getByTestId('result').textContent).toBe('unavailable'));

    expect(document.body.textContent).not.toContain('raw upstream details');
  });

  it('logs out the current browser session with local scope', async () => {
    const auth = createFakeAuthClient({ initialSession: sessionFor('user-d') });

    render(<AuthProvider client={auth.client}><Probe /></AuthProvider>);
    await waitFor(() => expect(screen.getByTestId('status').textContent).toBe('authenticated'));
    fireEvent.click(screen.getByRole('button', { name: 'sign-out' }));

    await waitFor(() => expect(screen.getByTestId('result').textContent).toBe('ok'));
    expect(auth.signOut).toHaveBeenCalledWith({ scope: 'local' });
    expect(screen.getByTestId('status').textContent).toBe('anonymous');
    expect(screen.getByTestId('user').textContent).toBe('');
  });

  it('becomes anonymous when Supabase clears the local session even if remote logout fails', async () => {
    const auth = createFakeAuthClient({
      initialSession: sessionFor('user-e'),
      signOutError: { status: 503, message: 'provider logout detail' },
    });

    render(<AuthProvider client={auth.client}><Probe /></AuthProvider>);
    await waitFor(() => expect(screen.getByTestId('status').textContent).toBe('authenticated'));
    fireEvent.click(screen.getByRole('button', { name: 'sign-out' }));

    await waitFor(() => expect(screen.getByTestId('result').textContent).toBe('unavailable'));
    expect(auth.signOut).toHaveBeenCalledWith({ scope: 'local' });
    expect(screen.getByTestId('status').textContent).toBe('anonymous');
    expect(screen.getByTestId('user').textContent).toBe('');
    expect(document.body.textContent).not.toContain('provider logout detail');
  });
});
