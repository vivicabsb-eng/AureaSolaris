import {
  createClient,
  type AuthChangeEvent,
  type Session,
} from '@supabase/supabase-js';

export type AuthSession = Session;

export type AuthClientError = {
  status?: number;
  code?: string;
  message?: string;
};

export type AuthSignOutOptions = {
  scope?: 'global' | 'local' | 'others';
};

export type AuthClient = {
  auth: {
    getSession(): Promise<{
      data: { session: AuthSession | null };
      error: AuthClientError | null;
    }>;
    onAuthStateChange(
      callback: (event: AuthChangeEvent, session: AuthSession | null) => void | Promise<void>,
    ): { data: { subscription: { unsubscribe(): void } } };
    signInWithPassword(credentials: { email: string; password: string }): Promise<{
      data: { session: AuthSession | null };
      error: AuthClientError | null;
    }>;
    signOut(options?: AuthSignOutOptions): Promise<{ error: AuthClientError | null }>;
  };
};

let browserAuthClient: AuthClient | null = null;

function readBrowserAuthConfig() {
  const url = import.meta.env.VITE_SUPABASE_URL?.trim();
  const anonymousKey = import.meta.env.VITE_SUPABASE_ANON_KEY?.trim();

  if (!url || !anonymousKey) {
    throw new Error('Supabase browser authentication is not configured.');
  }

  return { url, anonymousKey };
}

export function getBrowserAuthClient(): AuthClient {
  if (browserAuthClient) {
    return browserAuthClient;
  }

  const { url, anonymousKey } = readBrowserAuthConfig();
  browserAuthClient = createClient(url, anonymousKey, {
    auth: {
      persistSession: true,
      storage: window.sessionStorage,
    },
  });
  return browserAuthClient;
}
