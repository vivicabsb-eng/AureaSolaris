import { useState, useEffect, useRef } from 'react';
import { safeInvoke } from '../utils/tauri';
import { getAspectOrbs, AspectOrb } from '../utils/astro-settings';
import { astroLogger } from '../utils/logger';
import { readCertifiedCalculation } from '../utils/certifiedCalculation';
import { buildTransitPayload, decodeAstrologyResponse, postTransitPositions } from '../services/astrologyApi';
import type { LiveAstroData, AstroAspect, PlanetaryPosition } from '../types/astrology';

export type { PlanetaryPosition, AstroAspect, LiveAstroData };

const SIGN_MAP: Record<string, string> = {
  Ari: 'Áries', Tau: 'Touro', Gem: 'Gêmeos', Can: 'Câncer',
  Leo: 'Leão', Vir: 'Virgem', Lib: 'Libra', Sco: 'Escorpião',
  Sag: 'Sagitário', Cap: 'Capricórnio', Aqu: 'Aquário', Pis: 'Peixes',
};

const ASPECT_MAP: Record<string, string> = {
  Conjunction: 'Conjunção', Trine: 'Trígono', Square: 'Quadratura',
  Sextile: 'Sextil', Opposition: 'Oposição', Quincunx: 'Inconjunto',
  Quintile: 'Quintil', BiQuintile: 'Bi-Quintil', SemiSextile: 'Semi-Sextil',
  SemiSquare: 'Semi-Quadratura', SesquiQuadrature: 'Sesqui-Quadratura',
};

const REGENT_MAP: Record<string, string> = {
  Sun: 'Sol', Moon: 'Lua', Mercury: 'Mercúrio', Venus: 'Vênus',
  Mars: 'Marte', Jupiter: 'Júpiter', Saturn: 'Saturno',
};

function normalizeAstroData(data: unknown): LiveAstroData | null {
  if (!data || typeof data !== 'object') return null;
  const normalized = { ...(data as Record<string, unknown>) } as unknown as LiveAstroData;

  const normalizePositions = (positions: unknown) => {
    if (!positions || typeof positions !== 'object') return positions;
    return Object.fromEntries(
      Object.entries(positions as Record<string, PlanetaryPosition>).map(([name, value]) => [
        name,
        {
          ...value,
          sign: SIGN_MAP[value.sign] || value.sign,
          element: value.element === 'Fire' ? 'Fogo' : value.element === 'Earth' ? 'Terra' : value.element === 'Air' ? 'Ar' : value.element === 'Water' ? 'Água' : value.element,
        },
      ]),
    );
  };

  normalized.planets = normalizePositions(normalized.planets) as Record<string, PlanetaryPosition>;
  normalized.secondary = normalizePositions(normalized.secondary) as Record<string, PlanetaryPosition> | undefined;
  if (Array.isArray(normalized.aspects)) {
    normalized.aspects = normalized.aspects.map((aspect: AstroAspect) => ({ ...aspect, type: ASPECT_MAP[aspect.type] || aspect.type }));
  }
  if (normalized.regence) {
    normalized.regence = {
      day_regent: REGENT_MAP[normalized.regence.day_regent] || normalized.regence.day_regent,
      hour_regent: REGENT_MAP[normalized.regence.hour_regent] || normalized.regence.hour_regent,
    };
  }

  return normalized as LiveAstroData;
}

type NatalPositions = {
  Sun: number;
  Moon: number;
  ASC: number;
  Mercury?: number;
  Venus?: number;
  Mars?: number;
};

export const useLiveTransitData = (natalData?: NatalPositions) => {
  const [liveData, setLiveData] = useState<LiveAstroData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const natalRef = useRef<NatalPositions | undefined>(natalData);
  const sunVal = natalData?.Sun;
  const moonVal = natalData?.Moon;
  const ascVal = natalData?.ASC;

  useEffect(() => {
    natalRef.current = natalData;
  }, [natalData]);

  const fetchAstro = async () => {
    const stopTimer = astroLogger.startTimer();
    setLoading(true);
    setError(null);

    try {
      const payload = buildTransitPayload();
      let response: string | null = await postTransitPositions(payload);

      if (!response) {
        response = await safeInvoke<string>('get_transit_positions', { payload });
      }
      if (!response) throw new Error('O motor não retornou dados verificáveis.');

      const parsed = decodeAstrologyResponse(response);
      const record = parsed as { error?: string; planets?: unknown };
      if (record?.error || !record?.planets) throw new Error(record?.error || 'Resposta do motor incompleta.');
      if (!readCertifiedCalculation(parsed, 'transit')) {
        throw new Error('O motor respondeu sem recibo auditável. Nenhum trânsito será exibido.');
      }

      const normalized = normalizeAstroData(parsed);
      if (!normalized) throw new Error('A resposta do motor não pôde ser normalizada.');

      setLiveData(previous => JSON.stringify(previous) === JSON.stringify(normalized) ? previous : normalized);
    } catch (cause) {
      console.error('Erro ao buscar dados astronômicos:', cause);
      setLiveData(null);
      setError('Cálculo astronômico indisponível. Nenhum valor aproximado será exibido.');
    } finally {
      setLoading(false);
      stopTimer();
    }
  };

  useEffect(() => {
    fetchAstro();
    const interval = setInterval(fetchAstro, 60_000);
    return () => clearInterval(interval);
  }, [sunVal, moonVal, ascVal]);

  const getAspect = (degreeA: number, degreeB: number) => {
    const difference = Math.abs(degreeA - degreeB) % 360;
    const distance = difference > 180 ? 360 - difference : difference;
    const orb = Math.round(distance * 100) / 100;
    const aspects = Object.values(getAspectOrbs()) as AspectOrb[];

    for (const aspect of aspects) {
      if (Math.abs(distance - aspect.angle) < aspect.orb) {
        return { type: aspect.type, icon: aspect.symbol, desc: `${aspect.type} (orbe: ${orb}°)`, orb };
      }
    }
    return null;
  };

  const getTransits = () => {
    const natal = natalRef.current;
    if (!liveData?.planets || !natal) return [];

    const planets = liveData.planets;
    const pairs = [
      { p: 'Sun', n: 'Sun', d1: planets.Sun?.degree, d2: natal.Sun },
      { p: 'Moon', n: 'Moon', d1: planets.Moon?.degree, d2: natal.Moon },
      { p: 'Mercury', n: 'Mercury', d1: planets.Mercury?.degree, d2: natal.Mercury },
      { p: 'Venus', n: 'Venus', d1: planets.Venus?.degree, d2: natal.Venus },
      { p: 'Mars', n: 'Mars', d1: planets.Mars?.degree, d2: natal.Mars },
      { p: 'Jupiter', n: 'Sun', d1: planets.Jupiter?.degree, d2: natal.Sun },
      { p: 'Jupiter', n: 'Moon', d1: planets.Jupiter?.degree, d2: natal.Moon },
      { p: 'Saturn', n: 'Sun', d1: planets.Saturn?.degree, d2: natal.Sun },
      { p: 'Saturn', n: 'Moon', d1: planets.Saturn?.degree, d2: natal.Moon },
      { p: 'Saturn', n: 'ASC', d1: planets.Saturn?.degree, d2: natal.ASC },
      { p: 'Uranus', n: 'Sun', d1: planets.Uranus?.degree, d2: natal.Sun },
      { p: 'Uranus', n: 'Moon', d1: planets.Uranus?.degree, d2: natal.Moon },
      { p: 'Neptune', n: 'Sun', d1: planets.Neptune?.degree, d2: natal.Sun },
      { p: 'Pluto', n: 'Sun', d1: planets.Pluto?.degree, d2: natal.Sun },
    ];

    return pairs
      .filter((pair): pair is typeof pair & { d1: number; d2: number } => Number.isFinite(pair.d1) && Number.isFinite(pair.d2))
      .map(pair => ({ p: pair.p, n: pair.n, ...getAspect(pair.d1, pair.d2) }))
      .filter(transit => transit.type);
  };

  const getPlanetaryHour = () => {
    const hourRegent = liveData?.regence?.hour_regent;
    const icons: Record<string, string> = {
      Sol: '☉', Lua: '☽', Mercúrio: '☿', Vênus: '♀', Marte: '♂', Júpiter: '♃', Saturno: '♄',
    };
    if (!hourRegent) return { icon: '—', name: 'cálculo indisponível', time: '—' };
    return {
      icon: icons[hourRegent] || '—',
      name: hourRegent,
      time: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
    };
  };

  const getSchedulingSuggestion = () => {
    const regent = getPlanetaryHour().name;
    const suggestions: Record<string, string> = {
      Sol: 'Ótimo para visibilidade, liderança e começar projetos criativos.',
      Vênus: 'Excelente para conexões sociais, prazer, beleza e parcerias.',
      Mercúrio: 'Priorize comunicação, escrita, estudos e resoluções lógicas.',
      Lua: 'Momento para introspecção, nutrição e assuntos domésticos.',
      Saturno: 'Foque em disciplina, organização, limites e tarefas pesadas.',
      Júpiter: 'Ideal para expansão, aprendizado espiritual e abundância.',
      Marte: 'Ação direta, exercício físico, coragem e competitividade.',
    };
    return suggestions[regent] || 'Indisponível até que o motor confirme a regência.';
  };

  return {
    liveData,
    loading,
    error,
    transits: getTransits(),
    forecast: [],
    fetchAstro,
    NATAL: natalData,
    getPlanetaryHour,
    getSchedulingSuggestion,
  };
};
