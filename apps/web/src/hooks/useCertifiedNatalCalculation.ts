import { useState, useEffect, useCallback } from 'react';
import { safeInvoke } from '../utils/tauri';
import { readCertifiedCalculation } from '../utils/certifiedCalculation';
import { buildNatalPayload, decodeAstrologyResponse, postNatalCalculation } from '../services/astrologyApi';
import type { AstrologyCalculationRequest, CertifiedAstrologyResult } from '../types/astrology';

const ASPECT_MAP: Record<string, string> = {
  Conjunction: 'Conjunção',
  Opposition: 'Oposição',
  Trine: 'Trígono',
  Square: 'Quadratura',
  Sextile: 'Sextil',
  Quincunx: 'Quincúncio',
  Quintile: 'Quintil',
  BiQuintile: 'Bi-Quintil',
  SemiSextile: 'Semi-Sextil',
  SemiSquare: 'Semi-Quadratura',
  SesquiQuadrature: 'Sesqui-Quadratura',
};

function hasDisplayableNatalShape(value: CertifiedAstrologyResult): boolean {
  const requiredPoints = ['Sun', 'Moon', 'ASC', 'MC'];
  const hasDegree = (point: unknown) => {
    const degree = (point as { degree?: unknown } | null)?.degree;
    return typeof degree === 'number' && Number.isFinite(degree) && degree >= 0 && degree < 360;
  };

  return requiredPoints.every((name) => hasDegree(value?.planets?.[name])) &&
    Array.isArray(value?.houses) && value.houses.length === 12 &&
    value.houses.every((house: unknown) => hasDegree(house));
}

export const useCertifiedNatalCalculation = (birthData?: AstrologyCalculationRequest, enabled = true) => {
  const [data, setData] = useState<CertifiedAstrologyResult | null>(null);
  const [loading, setLoading] = useState(enabled);
  const [error, setError] = useState<string | null>(null);

  const birthDataKey = JSON.stringify(birthData ?? null);

  const calculate = useCallback(async () => {
    const request = birthDataKey === 'null'
      ? undefined
      : JSON.parse(birthDataKey) as AstrologyCalculationRequest;
    setLoading(true);
    setError(null);
    setData(null);
    try {
      const payloadStr = buildNatalPayload(request as Record<string, unknown> | undefined);

      let result: string | null = await postNatalCalculation(payloadStr);

      if (!result) {
        result = await safeInvoke<string | null>('run_astro_engine', { payload: payloadStr });
      }

      if (result === null) {
        setError('Motor astrológico indisponível. O mapa não será estimado. Verifique o serviço local e tente novamente.');
        return;
      }
      const parsed = decodeAstrologyResponse(result) as CertifiedAstrologyResult;
      if (parsed.aspects) {
        parsed.aspects = parsed.aspects.map((asp) => ({
          ...asp,
          type: ASPECT_MAP[asp.type] || asp.type,
        }));
      }
      if (parsed.error) {
        setError(parsed.error);
      } else if (!readCertifiedCalculation(parsed, 'natal')) {
        setData(null);
        setError('O motor respondeu sem recibo auditável. Nenhuma mandala será exibida.');
      } else if (!hasDisplayableNatalShape(parsed)) {
        setData(null);
        setError('O recibo natal não contém os pontos e casas necessários para desenhar uma mandala confiável.');
      } else {
        setData(parsed);
      }
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }, [birthDataKey]);

  useEffect(() => {
    if (!enabled) {
      setData(null);
      setError(null);
      setLoading(false);
      return;
    }
    calculate();
  }, [birthDataKey, enabled, calculate]);

  return { data, loading, error, recalculate: calculate };
};
