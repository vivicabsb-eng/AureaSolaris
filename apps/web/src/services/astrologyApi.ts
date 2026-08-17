import { LOCAL_API_URL } from '../utils/api';

const NATAL_STARTUP_RETRY_DELAYS_MS = [0, 250, 750, 1500, 2500];

const wait = (milliseconds: number) => new Promise<void>((resolve) => window.setTimeout(resolve, milliseconds));

export class AstrologyApiError extends Error {
  readonly status?: number;

  constructor(message: string, status?: number) {
    super(message);
    this.name = 'AstrologyApiError';
    this.status = status;
  }
}

export function buildNatalPayload(birthData?: Record<string, unknown>): string {
  if (!birthData) {
    return JSON.stringify({
      year: new Date().getFullYear(),
      month: new Date().getMonth() + 1,
      day: new Date().getDate(),
      hour: new Date().getHours() + (new Date().getMinutes() / 60),
      house_system: localStorage.getItem('aurea_house_system') || 'Regiomontanus',
    });
  }

  const timezone = [birthData.timezone, birthData.timezone_name]
    .find((value): value is string => typeof value === 'string' && value.trim().length > 0);
  const payload: Record<string, unknown> = { ...birthData };
  delete payload.timezone_name;
  if (timezone) payload.timezone = timezone;
  return JSON.stringify(payload);
}

export function buildTransitPayload(now: Date = new Date()): string {
  // Resolve one UTC instant in the client so the direct HTTP request and the
  // browser/Tauri fallback always calculate the same valid transit request.
  return JSON.stringify({
    year: now.getUTCFullYear(),
    month: now.getUTCMonth() + 1,
    day: now.getUTCDate(),
    hour: now.getUTCHours()
      + (now.getUTCMinutes() / 60)
      + (now.getUTCSeconds() / 3600)
      + (now.getUTCMilliseconds() / 3_600_000),
    timezone: 'UTC',
    utc_offset_minutes: 0,
  });
}

export function decodeAstrologyResponse(raw: string): unknown {
  try {
    return JSON.parse(raw);
  } catch (cause) {
    throw new AstrologyApiError(cause instanceof Error ? cause.message : 'Resposta do motor inválida.');
  }
}

/**
 * POST /natal with startup retries. Returns raw response text or null when HTTP is unavailable.
 * Tauri IPC fallback is owned by the natal hook, not this transport layer.
 */
export async function postNatalCalculation(payload: string): Promise<string | null> {
  for (const delay of NATAL_STARTUP_RETRY_DELAYS_MS) {
    if (delay) await wait(delay);
    try {
      const response = await fetch(`${LOCAL_API_URL}/natal`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: payload,
      });
      if (response.ok) return await response.text();
    } catch {
      // Network error — caller may fall back to Tauri IPC.
    }
  }
  return null;
}

/**
 * POST /transit. Returns raw response text or null when HTTP is unavailable.
 * Tauri IPC fallback is owned by the transit hook, not this transport layer.
 */
export async function postTransitPositions(payload: string): Promise<string | null> {
  try {
    const response = await fetch(`${LOCAL_API_URL}/transit`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: payload,
    });
    if (response.ok) return await response.text();
  } catch {
    // Network error — caller may fall back to Tauri IPC.
  }
  return null;
}
