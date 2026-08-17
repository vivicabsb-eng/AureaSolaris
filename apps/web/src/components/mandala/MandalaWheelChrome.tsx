import { Settings, X } from 'lucide-react';
import { RETROGRADE_ALLOWED } from '../../utils/astro-dignity';
import { PLANET_SYMBOLS } from '../../utils/astro-reference-data';
import type { AspectTooltipModel, PlanetTooltipModel } from './types';

interface MandalaLayerSettingsProps {
  open: boolean;
  showSecondaryBodies: boolean;
  showDecanates: boolean;
  showTerms: boolean;
  onToggleOpen: () => void;
  onClose: () => void;
  onToggleSecondaryBodies: () => void;
  onToggleDecanates: () => void;
  onToggleTerms: () => void;
}

export function MandalaLayerSettings({
  open,
  showSecondaryBodies,
  showDecanates,
  showTerms,
  onToggleOpen,
  onClose,
  onToggleSecondaryBodies,
  onToggleDecanates,
  onToggleTerms,
}: MandalaLayerSettingsProps) {
  const layers = [
    { label: 'Corpos Secundários', state: showSecondaryBodies, toggle: onToggleSecondaryBodies },
    { label: 'Decanatos', state: showDecanates, toggle: onToggleDecanates },
    { label: 'Termos (Egípcios)', state: showTerms, toggle: onToggleTerms },
  ];

  return (
    <>
      <button
        onClick={onToggleOpen}
        className="absolute top-2 right-2 z-20 p-2 bg-white/90 border border-gray-100 rounded-lg shadow-sm text-gray-400 hover:text-[#c5a059] transition-all"
        title="Configurações"
      >
        <Settings size={15} />
      </button>

      {open && (
        <div className="absolute top-10 right-2 z-30 bg-white border border-gray-100 rounded-xl shadow-xl p-4 w-56 space-y-3 animate-in fade-in">
          <div className="flex justify-between items-center mb-1">
            <span className="text-[9px] font-black uppercase tracking-widest text-gray-500">Camadas</span>
            <X size={12} className="text-gray-300 cursor-pointer hover:text-red-400" onClick={onClose} />
          </div>
          {layers.map(item => (
            <label key={item.label} className="flex items-center gap-3 cursor-pointer group">
              <input
                type="checkbox"
                checked={item.state}
                onChange={item.toggle}
                className="w-3.5 h-3.5 accent-[#c5a059]"
              />
              <span className="text-[11px] font-medium text-gray-600 group-hover:text-[#c5a059] transition-colors">
                {item.label}
              </span>
            </label>
          ))}
        </div>
      )}
    </>
  );
}

interface MandalaTooltipOverlaysProps {
  size: number;
  planetTooltip: PlanetTooltipModel | null;
  aspectTooltip: AspectTooltipModel | null;
}

export function MandalaTooltipOverlays({ size, planetTooltip, aspectTooltip }: MandalaTooltipOverlaysProps) {
  return (
    <>
      {planetTooltip && (
        <div
          className="absolute z-50 bg-white border border-[#c5a059]/30 rounded-xl shadow-xl px-4 py-3 pointer-events-none min-w-[180px]"
          style={{
            left: planetTooltip.x + 16,
            top: planetTooltip.y - 20,
            transform: planetTooltip.x > size * 0.7 ? 'translateX(-110%)' : 'none',
          }}
        >
          <div className="flex items-center gap-2 mb-1">
            <span className="text-lg font-bold" style={{ color: planetTooltip.color }}>
              {PLANET_SYMBOLS[planetTooltip.name] || '●'}
            </span>
            <span className="text-[11px] font-black uppercase tracking-wider" style={{ color: planetTooltip.color }}>
              {planetTooltip.name}
            </span>
          </div>
          <p className="text-[11px] text-gray-700 font-bold mb-1">{planetTooltip.sign}</p>

          <div className="space-y-0.5 mb-2">
            <p className="text-[9px] text-gray-500 font-medium">
              <span className="text-gray-400">Decanato:</span> {planetTooltip.decanate} / <span className="text-gray-400">Termo:</span> {planetTooltip.term}
            </p>
            <p className="text-[9px] text-gray-500 font-medium">
              <span className="text-gray-400">Dignidade:</span> {planetTooltip.dignity}
            </p>
            <p className="text-[9px] text-gray-500 font-medium capitalize">{planetTooltip.visibility}</p>
            {planetTooltip.mansion && (
              <p className="text-[9px] text-[#c5a059] font-bold">{planetTooltip.mansion}</p>
            )}
            {planetTooltip.star && (
              <p className="text-[9px] text-amber-600 font-black animate-pulse">★ {planetTooltip.star}</p>
            )}
          </div>

          <div className="flex gap-2 mt-1.5 flex-wrap">
            {planetTooltip.retrograde && RETROGRADE_ALLOWED.includes(planetTooltip.name) && (
              <span className="text-[9px] font-bold px-1.5 py-0.5 bg-red-50 text-red-500 rounded">℞ Retrógrado</span>
            )}
            {planetTooltip.stationary && RETROGRADE_ALLOWED.includes(planetTooltip.name) && (
              <span className="text-[9px] font-bold px-1.5 py-0.5 bg-amber-50 text-amber-600 rounded">Estacionário</span>
            )}
            {(!planetTooltip.retrograde || !RETROGRADE_ALLOWED.includes(planetTooltip.name))
              && planetTooltip.motion !== 'Indisponível'
              && (!planetTooltip.stationary || !RETROGRADE_ALLOWED.includes(planetTooltip.name)) && (
                <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${
                  planetTooltip.motion === 'Rápido' ? 'bg-green-50 text-green-600'
                    : planetTooltip.motion === 'Lento' ? 'bg-orange-50 text-orange-600'
                      : 'bg-gray-50 text-gray-500'
                }`}>
                  {planetTooltip.motion}
                </span>
              )}
            {planetTooltip.special && (
              <span className="text-[9px] font-bold px-1.5 py-0.5 bg-purple-50 text-purple-600 rounded uppercase">
                {planetTooltip.special}
              </span>
            )}
          </div>
          {planetTooltip.specialRule && (
            <p className="mt-1 text-[8px] leading-relaxed text-purple-700/80">
              {`${planetTooltip.specialRule.school} · ${planetTooltip.specialRule.criterion} · aspectos ${planetTooltip.specialRule.aspects.join('°/')}° · orbes: ${planetTooltip.specialRule.aspects.map(aspect => `${aspect}°=${planetTooltip.specialRule?.orbs[aspect]}°`).join(', ')}.`}
            </p>
          )}
        </div>
      )}

      {aspectTooltip && (
        <div
          className="absolute z-50 bg-[#171c31] border border-[#c5a059]/30 rounded-xl shadow-xl px-4 py-3 pointer-events-none max-w-[240px] text-white animate-in fade-in duration-200"
          style={{
            left: aspectTooltip.x + 16,
            top: aspectTooltip.y - 20,
            transform: aspectTooltip.x > size * 0.7 ? 'translateX(-110%)' : 'none',
          }}
        >
          <div className="flex items-center gap-2 mb-1.5 border-b border-white/10 pb-1">
            <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: aspectTooltip.color }} />
            <span className="text-[10px] font-black uppercase tracking-wider">
              {aspectTooltip.type} ({aspectTooltip.orb.toFixed(1)}°)
            </span>
          </div>
          <p className="text-[11px] font-bold text-[#c5a059] mb-1">
            {aspectTooltip.p1} e {aspectTooltip.p2}
          </p>
          <div className="space-y-1">
            <p className="text-[9.5px] text-white/80 leading-relaxed">
              <span className="text-[#c5a059] font-bold">Geral:</span> {aspectTooltip.general}
            </p>
            <p className="text-[9.5px] text-white/80 leading-relaxed">
              <span className="text-[#c5a059] font-bold">Específico:</span> {aspectTooltip.specific}
            </p>
          </div>
        </div>
      )}
    </>
  );
}
