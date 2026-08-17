import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  buildNatalPayload,
  buildTransitPayload,
  decodeAstrologyResponse,
  postNatalCalculation,
  postTransitPositions,
  AstrologyApiError,
} from '../../services/astrologyApi';
import { LOCAL_API_URL } from '../../utils/api';

describe('astrologyApi transport', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  it('builds natal payloads from birth data', () => {
    const birthData = { year: 1990, month: 5, day: 15, hour: 14.5, lat: -23.55, lon: -46.63 };
    expect(JSON.parse(buildNatalPayload(birthData))).toEqual(birthData);
  });

  it('sends the IANA zone as timezone, never timezone_name', () => {
    const payload = JSON.parse(buildNatalPayload({
      year: 2000,
      month: 1,
      day: 1,
      hour: 12,
      lat: -23.55,
      lon: -46.63,
      timezone_name: 'America/Sao_Paulo',
    }));

    expect(payload.timezone).toBe('America/Sao_Paulo');
    expect(payload).not.toHaveProperty('timezone_name');
  });

  it('keeps an explicit timezone field when both keys are present', () => {
    const payload = JSON.parse(buildNatalPayload({
      year: 2000,
      month: 1,
      day: 1,
      hour: 12,
      timezone: 'America/Recife',
      timezone_name: 'America/Sao_Paulo',
    }));

    expect(payload.timezone).toBe('America/Recife');
    expect(payload).not.toHaveProperty('timezone_name');
  });

  it('builds an explicit UTC transit payload from a fixed instant', () => {
    const now = new Date('2026-08-14T21:30:00.000Z');

    expect(JSON.parse(buildTransitPayload(now))).toEqual({
      year: 2026,
      month: 8,
      day: 14,
      hour: 21.5,
      timezone: 'UTC',
      utc_offset_minutes: 0,
    });
  });

  it('decodes JSON responses and converts parse failures', () => {
    expect(decodeAstrologyResponse('{"planets":{}}')).toEqual({ planets: {} });
    expect(() => decodeAstrologyResponse('not-json')).toThrow(AstrologyApiError);
  });

  it('posts to /natal and returns the raw response text', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      text: async () => '{"planets":{}}',
    });
    vi.stubGlobal('fetch', fetchMock);

    const payload = buildNatalPayload({ year: 2000, month: 1, day: 2, hour: 12 });
    const response = await postNatalCalculation(payload);

    expect(fetchMock).toHaveBeenCalledWith(`${LOCAL_API_URL}/natal`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: payload,
    });
    expect(response).toBe('{"planets":{}}');
  });

  it('posts to /transit and returns the raw response text', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      text: async () => '{"planets":{"Sun":{}}}',
    });
    vi.stubGlobal('fetch', fetchMock);

    const payload = buildTransitPayload();
    const response = await postTransitPositions(payload);

    expect(fetchMock).toHaveBeenCalledWith(`${LOCAL_API_URL}/transit`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: payload,
    });
    expect(response).toBe('{"planets":{"Sun":{}}}');
  });

  it('returns null from HTTP transport when the sidecar is unavailable', async () => {
    vi.useFakeTimers();
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false }));

    const pending = postNatalCalculation('{}');
    await vi.runAllTimersAsync();
    await expect(pending).resolves.toBeNull();

    vi.useRealTimers();
  });
});
