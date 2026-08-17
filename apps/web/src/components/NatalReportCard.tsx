import React, { useMemo } from 'react';
import { Copy, Check } from 'lucide-react';
import type { CertifiedAstrologyResult, PlanetaryPosition } from '../types/astrology';

type PlanetRow = {
  name: string;
  sign: string;
  degree: number;
  minutes: number;
  retrograde?: boolean;
  house?: number;
};

type HouseRow = {
  house: number;
  sign: string;
  degree: number;
  minutes: number;
};

function toDms(deg: number) {
  const normalized = ((deg % 360) + 360) % 360;
  const d = Math.floor(normalized);
  const m = Math.round((normalized - d) * 60);
  return { d, m: m >= 60 ? 0 : m };
}

function formatDegree(deg: number) {
  const { d, m } = toDms(deg);
  return `${d}°${m > 0 ? `${String(m).padStart(2, '0')}'` : ''}`;
}

function formatPlanetRow(p: PlanetRow): string {
  const retro = p.retrograde ? ', Retrograde' : '';
  const house = typeof p.house === 'number' ? `, in ${p.house}${p.house === 1 ? 'st' : p.house === 2 ? 'nd' : p.house === 3 ? 'rd' : 'th'} House` : '';
  return `${p.name} in ${p.sign} ${formatDegree(p.degree)}${retro}${house}`;
}

function formatHouseRow(h: HouseRow): string {
  const suffix = h.house === 1 ? 'st' : h.house === 2 ? 'nd' : h.house === 3 ? 'rd' : 'th';
  return `${h.house}${suffix} House in ${h.sign} ${formatDegree(h.degree)}`;
}

type HouseCusp = { degree?: number; sign?: string };

export const NatalReportCard: React.FC<{
  data: CertifiedAstrologyResult | null;
  loading: boolean;
}> = ({ data, loading }) => {
  const [copied, setCopied] = React.useState<string | null>(null);

  const planets = useMemo<PlanetRow[]>(() => {
    if (!data?.planets) return [];
    const rows: PlanetRow[] = [];
    const skip = new Set(['ASC', 'MC', 'DSC', 'IC', 'Chiron']);
    for (const [name, info] of Object.entries(data.planets)) {
      if (skip.has(name)) continue;
      const position = info as PlanetaryPosition;
      rows.push({
        name,
        sign: position.sign || '',
        degree: position.degree || 0,
        minutes: Math.round(((position.degree || 0) % 1) * 60),
        retrograde: position.retrograde === true,
        house: typeof position.house === 'number' ? position.house : undefined,
      });
    }
    if (data.secondary) {
      for (const [name, info] of Object.entries(data.secondary)) {
        const position = info as PlanetaryPosition;
        rows.push({
          name,
          sign: position.sign || '',
          degree: position.degree || 0,
          minutes: Math.round(((position.degree || 0) % 1) * 60),
          retrograde: position.retrograde === true,
          house: typeof position.house === 'number' ? position.house : undefined,
        });
      }
    }
    return rows.sort((a, b) => a.name.localeCompare(b.name));
  }, [data]);

  const houses = useMemo<HouseRow[]>(() => {
    if (!data?.houses) return [];
    return (data.houses as HouseCusp[]).map((house, i) => {
      const deg = typeof house.degree === 'number' ? house.degree : 0;
      const { d, m } = toDms(deg);
      return { house: i + 1, sign: house.sign || '', degree: d, minutes: m };
    });
  }, [data]);

  const copyBlock = async (block: 'planets' | 'houses') => {
    const text =
      block === 'planets'
        ? `Planet positions:\n\n${planets.map(formatPlanetRow).join('\n')}`
        : `House positions:\n\n${houses.map(formatHouseRow).join('\n')}`;
    await navigator.clipboard.writeText(text);
    setCopied(block);
    setTimeout(() => setCopied(null), 1500);
  };

  if (loading && !data) return null;

  return (
    <div className="mt-6 w-full max-w-3xl space-y-6">
      <div className="rounded-3xl border border-white/10 bg-[var(--aurea-surface)] p-6 shadow-sm">
        <h2 className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-500">
          Você pode copiar estes dados e colar em uma IA para interpretações complementares.
        </h2>
      </div>

      <div className="rounded-3xl border border-white/10 bg-[var(--aurea-surface)] shadow-sm overflow-hidden">
        <div className="flex items-center justify-between border-b border-gray-100 px-6 py-3">
          <h3 className="text-[11px] font-black uppercase tracking-widest text-gray-700">Planet positions</h3>
          <button
            type="button"
            onClick={() => copyBlock('planets')}
            className="inline-flex items-center gap-2 rounded-lg bg-[#1f2937] px-3 py-1.5 text-[11px] font-bold text-white hover:bg-black"
          >
            {copied === 'planets' ? <Check size={14} /> : <Copy size={14} />}
            {copied === 'planets' ? 'Copiado' : 'Copy'}
          </button>
        </div>
        <div className="p-6 font-mono text-[13px] leading-7 text-gray-900">
          {planets.length === 0 ? (
            <p className="text-gray-500">Sem dados planetários.</p>
          ) : (
            planets.map((p) => (
              <div key={p.name} className="flex flex-wrap items-baseline gap-x-2">
                <span className="font-semibold">{p.name}</span>
                <span className="text-gray-600">in</span>
                <span className="text-gray-900">{p.sign}</span>
                <span className="text-gray-900">{formatDegree(p.degree)}</span>
                {p.retrograde && <span className="text-gray-500">, Retrograde</span>}
                {typeof p.house === 'number' && (
                  <span className="text-gray-500">, in {p.house}th House</span>
                )}
              </div>
            ))
          )}
        </div>
      </div>

      <div className="rounded-3xl border border-white/10 bg-[var(--aurea-surface)] shadow-sm overflow-hidden">
        <div className="flex items-center justify-between border-b border-gray-100 px-6 py-3">
          <h3 className="text-[11px] font-black uppercase tracking-widest text-gray-700">House positions</h3>
          <button
            type="button"
            onClick={() => copyBlock('houses')}
            className="inline-flex items-center gap-2 rounded-lg bg-[#1f2937] px-3 py-1.5 text-[11px] font-bold text-white hover:bg-black"
          >
            {copied === 'houses' ? <Check size={14} /> : <Copy size={14} />}
            {copied === 'houses' ? 'Copiado' : 'Copy'}
          </button>
        </div>
        <div className="p-6 font-mono text-[13px] leading-7 text-gray-900">
          {houses.length === 0 ? (
            <p className="text-gray-500">Sem dados de casas.</p>
          ) : (
            houses.map((h) => {
              const suffix = h.house === 1 ? 'st' : h.house === 2 ? 'nd' : h.house === 3 ? 'rd' : 'th';
              return (
                <div key={h.house} className="flex flex-wrap items-baseline gap-x-2">
                  <span className="font-semibold">{h.house}{suffix}</span>
                  <span className="text-gray-600">in</span>
                  <span className="text-gray-900">{h.sign}</span>
                  <span className="text-gray-900">{formatDegree(h.degree)}</span>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};
