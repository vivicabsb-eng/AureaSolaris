import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useCertifiedNatalCalculation } from '../../hooks/useCertifiedNatalCalculation';

vi.mock('../../utils/tauri', () => ({
  safeInvoke: vi.fn(),
}));

vi.mock('../../services/astrologyApi', async () => {
  const actual = await vi.importActual<typeof import('../../services/astrologyApi')>('../../services/astrologyApi');
  return {
    ...actual,
    postNatalCalculation: vi.fn(),
  };
});

import { safeInvoke } from '../../utils/tauri';
import { postNatalCalculation } from '../../services/astrologyApi';

const birthData = {
  year: 2000,
  month: 1,
  day: 1,
  hour: 23.5,
  lat: -23.5505,
  lon: -46.6333,
  timezone_name: 'America/Sao_Paulo',
  utc_offset_minutes: -120,
  house_system: 'Regiomontanus',
};

const expectedNatalPayload = {
  year: 2000,
  month: 1,
  day: 1,
  hour: 23.5,
  lat: -23.5505,
  lon: -46.6333,
  utc_offset_minutes: -120,
  house_system: 'Regiomontanus',
  timezone: 'America/Sao_Paulo',
};

const makeCertifiedNatalResponse = () => ({
  planets: {
    Sun: { degree: 281.15, sign: 'Cap' },
    Moon: { degree: 224.01, sign: 'Sco' },
    ASC: { degree: 111.67, sign: 'Can' },
    MC: { degree: 24.85, sign: 'Ari' },
  },
  houses: Array.from({ length: 12 }, (_, index) => ({ degree: index * 30 })),
  aspects: [],
  meta: {
    receipt: {
      schema_version: 'calculation-receipt.v1',
      kind: 'natal',
      input_hash: 'natal-input-hash',
      engine: { name: 'aurea-solaris-astro-engine', version: '2026.08.audit-1' },
      resolved_time: {
        utc: '2000-01-02T01:30:00Z',
        iana_timezone: 'America/Sao_Paulo',
        utc_offset_minutes: -120,
      },
      ephemeris: { library: 'pyswisseph', library_version: '2.10.03', mode: 'swiss' },
    },
  },
});

describe('useCertifiedNatalCalculation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(safeInvoke).mockResolvedValue(null);
  });

  it('preserves the normalized birth payload and accepts certified natal data', async () => {
    const certified = makeCertifiedNatalResponse();
    vi.mocked(postNatalCalculation).mockResolvedValue(JSON.stringify(certified));

    const { result } = renderHook(() => useCertifiedNatalCalculation(birthData));

    expect(result.current.loading).toBe(true);

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(postNatalCalculation).toHaveBeenCalledTimes(1);
    const [payload] = vi.mocked(postNatalCalculation).mock.calls[0];
    expect(JSON.parse(payload)).toEqual(expectedNatalPayload);
    expect(result.current.data).toEqual(certified);
    expect(result.current.data?.meta.receipt).toMatchObject({
      kind: 'natal',
      input_hash: 'natal-input-hash',
      engine: { name: 'aurea-solaris-astro-engine', version: '2026.08.audit-1' },
      resolved_time: {
        utc: '2000-01-02T01:30:00Z',
        iana_timezone: 'America/Sao_Paulo',
      },
    });
    expect(result.current.error).toBeNull();
    expect(safeInvoke).not.toHaveBeenCalled();
  });

  it('falls back to Tauri only after HTTP transport returns null', async () => {
    const certified = makeCertifiedNatalResponse();
    vi.mocked(postNatalCalculation).mockResolvedValue(null);
    vi.mocked(safeInvoke).mockResolvedValue(JSON.stringify(certified));

    const { result } = renderHook(() => useCertifiedNatalCalculation(birthData));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    const [payload] = vi.mocked(postNatalCalculation).mock.calls[0];
    expect(JSON.parse(payload)).toEqual(expectedNatalPayload);
    expect(safeInvoke).toHaveBeenCalledWith('run_astro_engine', { payload });
    expect(result.current.data).toEqual(certified);
  });

  it('surfaces engine unavailability without estimating a chart', async () => {
    vi.mocked(postNatalCalculation).mockResolvedValue(null);

    const { result } = renderHook(() => useCertifiedNatalCalculation(birthData));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.data).toBeNull();
    expect(result.current.error).toContain('Motor astrológico indisponível');
  });

  it('rejects responses without an audit receipt instead of silently displaying them', async () => {
    const uncertified = { planets: makeCertifiedNatalResponse().planets, houses: makeCertifiedNatalResponse().houses };
    vi.mocked(postNatalCalculation).mockResolvedValue(JSON.stringify(uncertified));

    const { result } = renderHook(() => useCertifiedNatalCalculation(birthData));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.data).toBeNull();
    expect(result.current.error).toContain('recibo auditável');
  });

  it('rejects a certified receipt for the wrong calculation kind', async () => {
    const wrongKind = makeCertifiedNatalResponse();
    wrongKind.meta.receipt.kind = 'transit';
    vi.mocked(postNatalCalculation).mockResolvedValue(JSON.stringify(wrongKind));

    const { result } = renderHook(() => useCertifiedNatalCalculation(birthData));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.data).toBeNull();
    expect(result.current.error).toContain('recibo auditável');
  });

  it('does not recalculate when birth data is a new object with the same contents', async () => {
    const certified = makeCertifiedNatalResponse();
    vi.mocked(postNatalCalculation).mockResolvedValue(JSON.stringify(certified));

    const { rerender } = renderHook(
      ({ request }) => useCertifiedNatalCalculation(request),
      { initialProps: { request: { ...birthData } } },
    );

    await waitFor(() => {
      expect(postNatalCalculation).toHaveBeenCalledTimes(1);
    });

    rerender({ request: { ...birthData } });

    await act(async () => {
      await Promise.resolve();
    });

    expect(postNatalCalculation).toHaveBeenCalledTimes(1);
  });

  it('skips calculation when disabled and clears prior state', async () => {
    const { result } = renderHook(() => useCertifiedNatalCalculation(birthData, false));

    await act(async () => {
      await Promise.resolve();
    });

    expect(postNatalCalculation).not.toHaveBeenCalled();
    expect(result.current.loading).toBe(false);
    expect(result.current.data).toBeNull();
    expect(result.current.error).toBeNull();
  });

  it('does not recalculate when birthData object identity changes but values stay the same', async () => {
    const certified = makeCertifiedNatalResponse();
    vi.mocked(postNatalCalculation).mockResolvedValue(JSON.stringify(certified));

    const { result, rerender } = renderHook(
      ({ data }) => useCertifiedNatalCalculation(data),
      { initialProps: { data: birthData } },
    );

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(postNatalCalculation).toHaveBeenCalledTimes(1);

    rerender({ data: { ...birthData } });

    await act(async () => {
      await Promise.resolve();
    });

    expect(postNatalCalculation).toHaveBeenCalledTimes(1);
  });
});
