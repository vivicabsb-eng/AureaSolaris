import { act, renderHook, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useLiveTransitData } from '../../hooks/useLiveTransitData';

vi.mock('../../utils/tauri', () => ({
  safeInvoke: vi.fn(),
}));

vi.mock('../../services/astrologyApi', async () => {
  const actual = await vi.importActual<typeof import('../../services/astrologyApi')>('../../services/astrologyApi');
  return {
    ...actual,
    postTransitPositions: vi.fn(),
  };
});

import { safeInvoke } from '../../utils/tauri';
import { buildTransitPayload, postTransitPositions } from '../../services/astrologyApi';

const makeCertifiedTransitResponse = () => ({
  planets: {
    Sun: { sign: 'Ari', degree: 10, pos_in_sign: 10, element: 'Fire' },
    Moon: { sign: 'Tau', degree: 45, pos_in_sign: 15, element: 'Earth' },
  },
  secondary: {
    NorthNode: { sign: 'Gem', degree: 75, pos_in_sign: 15 },
  },
  moon_phase: { phase: 'Crescente', icon: '🌒', illumination: 22.5 },
  meta: {
    timestamp: '2026-08-10T12:30:00+00:00',
    timestamp_utc: '2026-08-10T12:30:00Z',
    timezone: 'UTC',
    location: null,
    ephemeris: 'swiss',
    receipt: {
      schema_version: 'calculation-receipt.v1',
      kind: 'transit',
      input_hash: 'transit-input-hash',
      engine: { name: 'aurea-solaris-astro-engine', version: '2026.08.audit-1' },
      resolved_time: { utc: '2026-08-10T12:30:00Z', iana_timezone: 'UTC' },
      ephemeris: { library: 'pyswisseph', library_version: '2.10.03', mode: 'swiss' },
    },
  },
});

describe('useLiveTransitData', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(safeInvoke).mockResolvedValue(null);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('builds the transport payload from a fixed UTC instant', () => {
    expect(JSON.parse(buildTransitPayload(new Date('2026-08-10T12:30:00.000Z')))).toEqual({
      year: 2026,
      month: 8,
      day: 10,
      hour: 12.5,
      timezone: 'UTC',
      utc_offset_minutes: 0,
    });
  });

  it('requests transit transport with UTC provenance and preserves the certified lightweight envelope', async () => {
    const certified = makeCertifiedTransitResponse();
    vi.mocked(postTransitPositions).mockResolvedValue(JSON.stringify(certified));

    const { result } = renderHook(() => useLiveTransitData());

    expect(result.current.loading).toBe(true);

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(postTransitPositions).toHaveBeenCalledTimes(1);
    const [payload] = vi.mocked(postTransitPositions).mock.calls[0];
    expect(JSON.parse(payload)).toMatchObject({
      timezone: 'UTC',
      utc_offset_minutes: 0,
    });
    expect(result.current.liveData).toMatchObject({
      planets: {
        Sun: { sign: 'Áries', degree: 10, element: 'Fogo' },
        Moon: { sign: 'Touro', degree: 45, element: 'Terra' },
      },
      secondary: {
        NorthNode: { sign: 'Gêmeos', degree: 75 },
      },
      moon_phase: { phase: 'Crescente', icon: '🌒', illumination: 22.5 },
      meta: {
        timestamp_utc: '2026-08-10T12:30:00Z',
        receipt: {
          kind: 'transit',
          input_hash: 'transit-input-hash',
          engine: { name: 'aurea-solaris-astro-engine', version: '2026.08.audit-1' },
          resolved_time: { utc: '2026-08-10T12:30:00Z', iana_timezone: 'UTC' },
        },
      },
    });
    expect(result.current.error).toBeNull();
    expect(safeInvoke).not.toHaveBeenCalled();
  });

  it('falls back to Tauri only after HTTP transport returns null', async () => {
    const certified = makeCertifiedTransitResponse();
    vi.mocked(postTransitPositions).mockResolvedValue(null);
    vi.mocked(safeInvoke).mockResolvedValue(JSON.stringify(certified));

    const { result } = renderHook(() => useLiveTransitData());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    const [payload] = vi.mocked(postTransitPositions).mock.calls[0];
    expect(safeInvoke).toHaveBeenCalledWith('get_transit_positions', { payload });
    expect(result.current.liveData?.planets.Sun.sign).toBe('Áries');
  });

  it('surfaces engine unavailability without approximating positions', async () => {
    vi.mocked(postTransitPositions).mockResolvedValue(null);

    const { result } = renderHook(() => useLiveTransitData());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.liveData).toBeNull();
    expect(result.current.error).toContain('Nenhum valor aproximado será exibido');
  });

  it('rejects responses without an audit receipt instead of silently displaying them', async () => {
    const uncertified = { planets: makeCertifiedTransitResponse().planets };
    vi.mocked(postTransitPositions).mockResolvedValue(JSON.stringify(uncertified));

    const { result } = renderHook(() => useLiveTransitData());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.liveData).toBeNull();
    expect(result.current.error).toContain('Nenhum valor aproximado será exibido');
  });

  it('rejects a certified receipt for the wrong calculation kind', async () => {
    const wrongKind = makeCertifiedTransitResponse();
    wrongKind.meta.receipt.kind = 'natal';
    vi.mocked(postTransitPositions).mockResolvedValue(JSON.stringify(wrongKind));

    const { result } = renderHook(() => useLiveTransitData());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.liveData).toBeNull();
    expect(result.current.error).toContain('Nenhum valor aproximado será exibido');
  });

  it('refreshes transit data every 60 seconds', async () => {
    vi.useFakeTimers();
    const certified = makeCertifiedTransitResponse();
    vi.mocked(postTransitPositions).mockResolvedValue(JSON.stringify(certified));

    renderHook(() => useLiveTransitData());

    await act(async () => {
      await Promise.resolve();
    });

    expect(postTransitPositions).toHaveBeenCalledTimes(1);

    await act(async () => {
      await vi.advanceTimersByTimeAsync(60_000);
    });

    expect(postTransitPositions).toHaveBeenCalledTimes(2);
  });
});
