import {
  createContext,
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import {
  getBrowserAuthClient,
  type AuthClient,
  type AuthClientError,
  type AuthSession,
} from './client';

export type AuthActionError =
  | 'invalid_credentials'
  | 'email_not_confirmed'
  | 'rate_limited'
  | 'unavailable';

export type AuthActionResult =
  | { ok: true }
  | { ok: false; error: AuthActionError };

export type AuthState =
  | { status: 'loading'; session: null }
  | { status: 'anonymous'; session: null }
  | { status: 'authenticated'; session: AuthSession };

export type AuthContextValue = AuthState & {
  signIn(email: string, password: string): Promise<AuthActionResult>;
  signOut(): Promise<AuthActionResult>;
};

export const AuthContext = createContext<AuthContextValue | null>(null);

function stateFromSession(session: AuthSession | null): AuthState {
  return session
    ? { status: 'authenticated', session }
    : { status: 'anonymous', session: null };
}

function safeAuthError(error: AuthClientError): AuthActionError {
  if (error.code === 'invalid_credentials') {
    return 'invalid_credentials';
  }
  if (error.code === 'email_not_confirmed') {
    return 'email_not_confirmed';
  }
  if (error.status === 429) {
    return 'rate_limited';
  }
  return 'unavailable';
}

function resolveClient(client?: AuthClient) {
  return client ?? getBrowserAuthClient();
}

export function AuthProvider({
  children,
  client,
}: {
  children: ReactNode;
  client?: AuthClient;
}) {
  const [state, setState] = useState<AuthState>({ status: 'loading', session: null });

  useEffect(() => {
    let active = true;
    let authEventSeen = false;
    let unsubscribe: (() => void) | undefined;

    try {
      const authClient = resolveClient(client);
      const { data } = authClient.auth.onAuthStateChange((_event, session) => {
        authEventSeen = true;
        if (active) {
          setState(stateFromSession(session));
        }
      });
      unsubscribe = () => data.subscription.unsubscribe();

      void authClient.auth.getSession()
        .then(({ data: sessionData, error }) => {
          if (!active || authEventSeen) {
            return;
          }
          setState(error ? { status: 'anonymous', session: null } : stateFromSession(sessionData.session));
        })
        .catch(() => {
          if (active && !authEventSeen) {
            setState({ status: 'anonymous', session: null });
          }
        });
    } catch {
      queueMicrotask(() => {
        if (active) {
          setState({ status: 'anonymous', session: null });
        }
      });
    }

    return () => {
      active = false;
      unsubscribe?.();
    };
  }, [client]);

  const signIn = useCallback(async (email: string, password: string): Promise<AuthActionResult> => {
    try {
      const authClient = resolveClient(client);
      const { data, error } = await authClient.auth.signInWithPassword({ email, password });
      if (error) {
        return { ok: false, error: safeAuthError(error) };
      }
      if (!data.session) {
        return { ok: false, error: 'unavailable' };
      }

      setState(stateFromSession(data.session));
      return { ok: true };
    } catch {
      return { ok: false, error: 'unavailable' };
    }
  }, [client]);

  const signOut = useCallback(async (): Promise<AuthActionResult> => {
    try {
      const authClient = resolveClient(client);
      const { error } = await authClient.auth.signOut({ scope: 'local' });
      if (error) {
        return { ok: false, error: safeAuthError(error) };
      }

      setState({ status: 'anonymous', session: null });
      return { ok: true };
    } catch {
      return { ok: false, error: 'unavailable' };
    }
  }, [client]);

  const value = useMemo<AuthContextValue>(() => ({
    ...state,
    signIn,
    signOut,
  }), [signIn, signOut, state]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
