import { invoke } from '@tauri-apps/api/core';
import type { InvokeArgs } from '@tauri-apps/api/core';

// Check if running in Tauri or browser
export const isTauriRuntime = () => {
  // @ts-expect-error - Tauri internal API not typed
  return !!(window.__TAURI_INTERNALS__);
};

import { ipcLogger } from './logger';
import { LOCAL_API_URL } from './api';

let browserSessionToken: string | null = null;

export type InitialAccess =
  | { kind: 'local-owner'; ownerId: string; displayName: string }
  | { kind: 'login-required' }
  | {
      kind: 'setup-required';
      reason: 'disabled-owner' | 'multiple-owners' | 'orphan-workspace' | 'owner-conflict';
      message: string;
    }
  | { kind: 'runtime-failure'; message: string };

type SetupRequiredReason = 'disabled-owner' | 'multiple-owners' | 'orphan-workspace' | 'owner-conflict';

const SETUP_REQUIRED_REASONS: ReadonlySet<SetupRequiredReason> = new Set([
  'disabled-owner',
  'multiple-owners',
  'orphan-workspace',
  'owner-conflict',
]);

const RUNTIME_FAILURE_MESSAGE = 'Initial access failed.';

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function parseInitialAccessDetail(payload: unknown): Record<string, unknown> | null {
  if (!isRecord(payload) || !isRecord(payload.detail)) {
    return null;
  }
  return payload.detail;
}

export async function openInitialAccess(): Promise<InitialAccess> {
  if (isTauriRuntime()) {
    return { kind: 'login-required' };
  }

  try {
    const response = await fetch(`${LOCAL_API_URL}/browser/command`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ command: 'private_initial_access', args: {} }),
    });

    const payload = await response.json().catch(() => null);

    if (response.status === 403) {
      const detail = parseInitialAccessDetail(payload);
      if (detail?.code === 'login-required') {
        return { kind: 'login-required' };
      }
      return { kind: 'runtime-failure', message: RUNTIME_FAILURE_MESSAGE };
    }

    if (response.status === 409) {
      const detail = parseInitialAccessDetail(payload);
      const reason = detail?.reason;
      const message = detail?.message;
      if (
        detail?.code === 'setup-required' &&
        typeof reason === 'string' &&
        SETUP_REQUIRED_REASONS.has(reason as SetupRequiredReason) &&
        typeof message === 'string'
      ) {
        return {
          kind: 'setup-required',
          reason: reason as SetupRequiredReason,
          message,
        };
      }
      return { kind: 'runtime-failure', message: RUNTIME_FAILURE_MESSAGE };
    }

    if (response.ok) {
      const result = isRecord(payload) ? payload.result : null;
      const token = isRecord(payload) ? payload.browser_session_token : null;
      if (
        isRecord(result) &&
        result.kind === 'local-owner' &&
        typeof result.ownerId === 'string' &&
        result.ownerId.length > 0 &&
        typeof result.displayName === 'string' &&
        typeof token === 'string' &&
        token.length > 0
      ) {
        browserSessionToken = token;
        return {
          kind: 'local-owner',
          ownerId: result.ownerId,
          displayName: result.displayName,
        };
      }
      return { kind: 'runtime-failure', message: RUNTIME_FAILURE_MESSAGE };
    }

    return { kind: 'runtime-failure', message: RUNTIME_FAILURE_MESSAGE };
  } catch {
    return { kind: 'runtime-failure', message: RUNTIME_FAILURE_MESSAGE };
  }
}

export function getBrowserSessionHeaders(): Record<string, string> {
  return browserSessionToken
    ? { 'X-Aurea-Browser-Session': browserSessionToken }
    : {};
}

export async function safeInvoke<T>(cmd: string, args?: object): Promise<T | null> {
  const stopTimer = ipcLogger.startTimer();
  try {
    let result: T;
    if (isTauriRuntime()) {
      result = await invoke<T>(cmd, args as InvokeArgs);
      ipcLogger.metricIPC(cmd, stopTimer(), true);
      return result;
    } else {
      const response = await fetch(`${LOCAL_API_URL}/browser/command`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(browserSessionToken ? { 'X-Aurea-Browser-Session': browserSessionToken } : {}),
        },
        body: JSON.stringify({ command: cmd, args: args || {} }),
      });
      const payload = await response.json().catch(() => null) as {
        result?: T;
        browser_session_token?: string;
        detail?: unknown;
      } | null;
      if (!response.ok) {
        throw new Error(typeof payload?.detail === 'string' ? payload.detail : `Browser command failed: ${response.status}`);
      }
      if (payload?.browser_session_token) browserSessionToken = payload.browser_session_token;
      if (cmd === 'private_session_close') browserSessionToken = null;
      ipcLogger.metricIPC(cmd, stopTimer(), true);
      return payload?.result ?? null;
    }
  } catch (err: unknown) {
    ipcLogger.metricIPC(cmd, stopTimer(), false);
    ipcLogger.error(`Command ${cmd} failed:`, err);
    return null;
  }
}
