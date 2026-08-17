import { useMemo } from 'react';
import {
  ELEMENT_COLORS as ELEMENT_BAR_COLORS,
  ELEMENT_EMOJIS,
  ELEMENT_LABELS,
  PLANET_NAMES_PT,
  PLANET_SYMBOLS as DIGNITY_PLANET_SYMBOLS,
  QUALITY_COLORS,
  QUALITY_LABELS,
  RETROGRADE_ALLOWED,
  SIGN_SYMBOLS as DIGNITY_SIGN_SYMBOLS,
  calcAlcocoden,
  calcAstroSignature,
  calcDominance,
  calcElements,
  calcHyleg,
  calcMidpoints,
  calcQualities,
  calcRegentAsc,
  calcSenhorGenitura,
  formatDeg as dignityFormatDeg,
  getDignityState,
} from '../../utils/astro-dignity';
import { getPlanetSignKeyword } from '../../utils/astro-dictionary';
import { SIGN_SYMBOLS } from '../../utils/astro-reference-data';
import { normalizeDegree } from '../../utils/mandala-geometry';
import { ASPECT_COLORS, PLANET_COLORS, SIGN_NAMES } from './constants';
import { formatMandalaDegree } from './model';
import type { Aspect, MandalaPlanetPosition, Planet } from './types';

interface MandalaPanelsProps {
  planets: Planet[];
  filteredPlanets: Planet[];
  aspects: Aspect[];
  planetsMap: Record<string, MandalaPlanetPosition>;
}

export function MandalaPanels({ planets, filteredPlanets, aspects, planetsMap }: MandalaPanelsProps) {
  const planetTable = useMemo(() => filteredPlanets
    .filter(planet => !['ASC', 'DSC', 'IC'].includes(planet.name))
    .sort((a, b) => normalizeDegree(a.degree) - normalizeDegree(b.degree))
    .map(planet => {
      const signIndex = Math.floor(normalizeDegree(planet.degree) / 30);
      const isRetroAllowed = RETROGRADE_ALLOWED.includes(planet.name);
      const motion = planet.stationary && isRetroAllowed ? 'Est'
        : planet.retrograde && isRetroAllowed ? 'Rx'
          : '';
      return {
        ...planet,
        signSymbol: SIGN_SYMBOLS[signIndex],
        signName: SIGN_NAMES[signIndex],
        signDeg: formatMandalaDegree(normalizeDegree(planet.degree)),
        absDeg: normalizeDegree(planet.degree).toFixed(2),
        color: planet.color || PLANET_COLORS[planet.name] || '#888',
        motion,
        dignity: getDignityState(planet.name, planet.degree),
        namePt: PLANET_NAMES_PT[planet.name] || planet.name,
        house: planet.house ?? null,
      };
    }), [filteredPlanets]);

  const elementResult = useMemo(() => calcElements(planetsMap), [planetsMap]);
  const qualityResult = useMemo(() => calcQualities(planetsMap), [planetsMap]);
  const midpoints = useMemo(() => calcMidpoints(planetsMap, 10), [planetsMap]);
  const dominance = useMemo(() => calcDominance(planetsMap), [planetsMap]);
  const regentAsc = useMemo(() => {
    let asc = planetsMap.ASC;
    if (!asc) {
      const fallbackAsc = planets.find(planet => planet.name.toUpperCase().startsWith('ASC'));
      if (fallbackAsc) asc = { degree: fallbackAsc.degree, house: 1 };
    }
    return asc ? calcRegentAsc(asc.degree) : null;
  }, [planetsMap, planets]);
  const senhor = useMemo(() => calcSenhorGenitura(dominance), [dominance]);
  const alcocoden = useMemo(() => calcAlcocoden(planetsMap), [planetsMap]);
  const signature = useMemo(() => calcAstroSignature(elementResult, qualityResult), [elementResult, qualityResult]);
  const hyleg = useMemo(() => calcHyleg(planetsMap), [planetsMap]);
  const maxDominance = useMemo(
    () => Math.max(1, ...dominance.map(item => Math.max(Math.abs(item.scoreTrad), Math.abs(item.scoreModern)))),
    [dominance],
  );

  return (
    <>
      <div className="w-full flex flex-col gap-4 transition-all">
        <div className="bg-white/60 backdrop-blur-sm border border-[#c5a059]/10 rounded-xl p-4">
          <h3 className="text-[9px] font-black uppercase tracking-[0.25em] text-[#c5a059] mb-3">Planetas</h3>
          <div className="space-y-1.5">
            {planetTable.map((planet, index) => {
              const keyword = getPlanetSignKeyword(planet.name, planet.signName);
              return (
                <div key={index} className="flex flex-col py-1 border-b border-gray-50 last:border-0">
                  <div className="flex items-center justify-between text-[10px]">
                    <div className="flex items-center gap-2">
                      <span className="font-bold w-5" style={{ color: planet.color }}>{planet.symbol}</span>
                      <span className="font-semibold text-gray-700 w-24 truncate">{planet.namePt} em {planet.signName}</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span
                        className="text-[10px] text-gray-400 font-semibold w-6 text-center"
                        title={planet.house == null ? 'Casa indisponível' : `Casa ${planet.house}`}
                      >
                        {planet.house == null ? 'C—' : `C${planet.house}`}
                      </span>
                      {planet.dignity.state !== 'peregrine' && (
                        <span className={`text-[7px] font-bold px-1 py-0.5 rounded ${planet.dignity.bg}`}>
                          {planet.dignity.label}
                        </span>
                      )}
                      <span className="text-gray-400">{planet.signSymbol}</span>
                      <span className="text-gray-600 font-medium tabular-nums w-14 text-right">{planet.signDeg}</span>
                      {planet.motion && (
                        <span className={`text-[8px] font-bold px-1 rounded ${
                          planet.motion === 'Rx' ? 'bg-red-50 text-red-500'
                            : planet.motion === 'Est' ? 'bg-amber-50 text-amber-600'
                              : 'text-gray-400'
                        }`}>{planet.motion}</span>
                      )}
                    </div>
                  </div>
                  <span className="text-[8.5px] text-gray-400 italic ml-7 font-medium">({keyword})</span>
                </div>
              );
            })}
          </div>
        </div>

        <div className="bg-white/60 backdrop-blur-sm border border-[#c5a059]/10 rounded-xl p-4">
          <h3 className="text-[9px] font-black uppercase tracking-[0.25em] text-[#c5a059] mb-3">Aspectos</h3>
          <div className="space-y-1.5 max-h-[300px] overflow-y-auto pr-1 custom-scrollbar">
            {aspects.length > 0 ? aspects.map((aspect, index) => {
              const color = ASPECT_COLORS[aspect.type] || '#999';
              return (
                <div key={index} className="flex items-center justify-between text-[10px] py-1 border-b border-gray-50 last:border-0">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: color, opacity: 0.7 }} />
                    <span className="font-semibold text-gray-700 w-20">{aspect.type}</span>
                  </div>
                  <span className="text-gray-500 flex-1 text-center">{aspect.p1} – {aspect.p2}</span>
                  <span className="text-gray-400 tabular-nums text-right w-10">{aspect.orb.toFixed(1)}°</span>
                </div>
              );
            }) : (
              <p className="text-center py-6 text-gray-300 text-[10px] italic">Nenhum aspecto calculado</p>
            )}
          </div>
        </div>
      </div>

      {Object.keys(planetsMap).length > 0 && (
        <div className="w-full flex flex-col gap-4">
          <div className="flex flex-col gap-4">
            <div className="bg-white/60 backdrop-blur-sm border border-[#c5a059]/10 rounded-xl p-4">
              <h3 className="text-[9px] font-black uppercase tracking-[0.25em] text-[#c5a059] mb-3">Elementos</h3>
              <div className="space-y-2">
                {(['fire', 'earth', 'air', 'water'] as const).map(element => {
                  const count = elementResult[element];
                  const percentage = elementResult.pct[element];
                  const color = ELEMENT_BAR_COLORS[element];
                  return (
                    <div key={element}>
                      <div className="flex items-center justify-between mb-0.5">
                        <span className="text-[10px] font-semibold text-gray-600">
                          {ELEMENT_EMOJIS[element]} {ELEMENT_LABELS[element]}
                        </span>
                        <span className="text-[9px] font-bold tabular-nums" style={{ color }}>
                          {count} · {percentage}%
                        </span>
                      </div>
                      <div className="w-full h-1.5 bg-gray-100 rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all duration-700"
                          style={{ width: `${percentage}%`, backgroundColor: color }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="bg-white/60 backdrop-blur-sm border border-[#c5a059]/10 rounded-xl p-4">
              <h3 className="text-[9px] font-black uppercase tracking-[0.25em] text-[#c5a059] mb-3">Qualidades</h3>
              <div className="space-y-2">
                {(['cardinal', 'fixed', 'mutable'] as const).map(quality => {
                  const count = qualityResult[quality];
                  const percentage = qualityResult.pct[quality];
                  const color = QUALITY_COLORS[quality];
                  return (
                    <div key={quality}>
                      <div className="flex items-center justify-between mb-0.5">
                        <span className="text-[10px] font-semibold text-gray-600">{QUALITY_LABELS[quality]}</span>
                        <span className="text-[9px] font-bold tabular-nums" style={{ color }}>
                          {count} · {percentage}%
                        </span>
                      </div>
                      <div className="w-full h-1.5 bg-gray-100 rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all duration-700"
                          style={{ width: `${percentage}%`, backgroundColor: color }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-4">
            <div className="bg-white/60 backdrop-blur-sm border border-[#c5a059]/10 rounded-xl p-4">
              <h3 className="text-[9px] font-black uppercase tracking-[0.25em] text-[#c5a059] mb-3">Pontos Médios</h3>
              <div className="space-y-1.5">
                {midpoints.map((midpoint, index) => (
                  <div key={index} className="flex items-center justify-between text-[10px] py-0.5 border-b border-gray-50 last:border-0">
                    <span className="font-semibold text-gray-600 w-20 truncate">{midpoint.p1}/{midpoint.p2}</span>
                    <span className="flex items-center gap-1 text-gray-500">
                      <span className="text-[12px]">{DIGNITY_SIGN_SYMBOLS[midpoint.signIdx]}</span>
                      <span className="tabular-nums font-medium">{dignityFormatDeg(midpoint.degree)}</span>
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-white/60 backdrop-blur-sm border border-[#c5a059]/10 rounded-xl p-4">
              <h3 className="text-[9px] font-black uppercase tracking-[0.25em] text-[#c5a059] mb-1">Dominância</h3>
              <div className="flex gap-2 mb-2">
                <span className="text-[7px] font-bold text-gray-400 uppercase tracking-wider">Trad</span>
                <span className="text-[7px] font-bold text-indigo-400 uppercase tracking-wider">Mod</span>
              </div>
              <div className="space-y-1.5">
                {dominance.map(item => {
                  const traditionalWidth = Math.max(0, (item.scoreTrad / maxDominance) * 100);
                  const modernWidth = Math.max(0, (item.scoreModern / maxDominance) * 100);
                  const traditionalNegative = item.scoreTrad < 0;
                  const modernNegative = item.scoreModern < 0;
                  return (
                    <div key={item.name} className="flex items-center gap-1.5">
                      <span className="text-[11px] w-5 text-center" style={{ color: item.dignity.color }}>{item.symbol}</span>
                      <span className="text-[8px] text-gray-500 w-12 truncate">{item.namePt}</span>
                      <div className="flex-1 flex flex-col gap-0.5">
                        <div className="flex items-center gap-1">
                          <div className="flex-1 h-1 bg-gray-100 rounded-full overflow-hidden">
                            <div
                              className={`h-full rounded-full transition-all ${traditionalNegative ? 'bg-red-400' : 'bg-amber-400'}`}
                              style={{ width: `${traditionalWidth}%` }}
                            />
                          </div>
                          <span className={`text-[7px] tabular-nums w-5 text-right font-bold ${traditionalNegative ? 'text-red-400' : 'text-amber-600'}`}>
                            {item.scoreTrad > 0 ? '+' : ''}{item.scoreTrad}
                          </span>
                        </div>
                        <div className="flex items-center gap-1">
                          <div className="flex-1 h-1 bg-gray-100 rounded-full overflow-hidden">
                            <div
                              className={`h-full rounded-full transition-all ${modernNegative ? 'bg-red-300' : 'bg-indigo-400'}`}
                              style={{ width: `${modernWidth}%` }}
                            />
                          </div>
                          <span className={`text-[7px] tabular-nums w-5 text-right font-bold ${modernNegative ? 'text-red-300' : 'text-indigo-500'}`}>
                            {item.scoreModern > 0 ? '+' : ''}{item.scoreModern}
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-5 gap-2">
            <div className="bg-white/60 backdrop-blur-sm border border-[#c5a059]/10 rounded-xl p-3 flex flex-col items-center text-center gap-1">
              <span className="text-[7px] font-black uppercase tracking-wider text-[#c5a059]">Hyleg</span>
              <span className="text-[20px]">{DIGNITY_PLANET_SYMBOLS[hyleg.planet] ?? '☉'}</span>
              <span className="text-[9px] font-bold text-gray-700">{hyleg.planetPt}</span>
              <span className="text-[8px] text-gray-400">{hyleg.signSymbol} {hyleg.posInSign}</span>
              <span className={`text-[6px] font-bold px-1 py-0.5 rounded mt-0.5 ${hyleg.aphetical ? 'bg-green-50 text-green-700' : 'bg-gray-50 text-gray-400'}`}>
                {hyleg.aphetical ? 'Afético' : 'Fallback'} · {hyleg.method}
              </span>
            </div>

            <div className="bg-white/60 backdrop-blur-sm border border-[#c5a059]/10 rounded-xl p-3 flex flex-col items-center text-center gap-1">
              <span className="text-[7px] font-black uppercase tracking-wider text-[#c5a059]">Regente ASC</span>
              {regentAsc ? (
                <>
                  <span className="text-[20px]">{DIGNITY_PLANET_SYMBOLS[regentAsc.planet] ?? '?'}</span>
                  <span className="text-[9px] font-bold text-gray-700">{regentAsc.planetPt}</span>
                  <span className="text-[8px] text-gray-400">{regentAsc.signSymbol} {regentAsc.signPt}</span>
                  {regentAsc.modernCo && (
                    <span className="text-[6px] text-indigo-400 font-semibold">co: {regentAsc.modernCoPt}</span>
                  )}
                </>
              ) : <span className="text-gray-300 text-[8px]">—</span>}
            </div>

            <div className="bg-white/60 backdrop-blur-sm border border-[#c5a059]/10 rounded-xl p-3 flex flex-col items-center text-center gap-1">
              <span className="text-[7px] font-black uppercase tracking-wider text-[#c5a059]">Alcocoden</span>
              <span className="text-[20px]">{DIGNITY_PLANET_SYMBOLS[alcocoden.planet] ?? '?'}</span>
              <span className="text-[9px] font-bold text-gray-700">{alcocoden.planetPt}</span>
              <span className="text-[8px] text-gray-400">Hyleg: {PLANET_NAMES_PT[alcocoden.hyleg] ?? alcocoden.hyleg}</span>
              <span className="text-[6px] text-gray-400 font-medium mt-0.5">{alcocoden.method}</span>
            </div>

            <div className="bg-white/60 backdrop-blur-sm border border-[#c5a059]/10 rounded-xl p-3 flex flex-col items-center text-center gap-1">
              <span className="text-[7px] font-black uppercase tracking-wider text-[#c5a059]">Sr. Genitura</span>
              <span className="text-[20px]">{DIGNITY_PLANET_SYMBOLS[senhor.planet] ?? '?'}</span>
              <span className="text-[9px] font-bold text-gray-700">{senhor.planetPt}</span>
              <span className="text-[6px] font-bold text-amber-600 mt-0.5">
                Trad: {senhor.scoreTrad > 0 ? '+' : ''}{senhor.scoreTrad}
              </span>
              <span className="text-[6px] font-bold text-indigo-500">
                Mod: {senhor.scoreModern > 0 ? '+' : ''}{senhor.scoreModern}
              </span>
            </div>

            <div
              className="bg-white/60 backdrop-blur-sm border border-[#c5a059]/10 rounded-xl p-3 flex flex-col items-center text-center gap-1"
              style={{ borderColor: `${signature.color}25` }}
            >
              <span className="text-[7px] font-black uppercase tracking-wider text-[#c5a059]">Assinatura</span>
              <span className="text-[20px]">{ELEMENT_EMOJIS[signature.element]}</span>
              <span className="text-[9px] font-bold" style={{ color: signature.color }}>{signature.label}</span>
              <span className="text-[7px] text-gray-400 leading-tight text-center">{signature.desc}</span>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
