import { useEffect, useMemo, useRef, useState } from 'react';
import { createMandalaOrientation, resolveAscDegree } from '../utils/mandala-geometry';
import { buildMandalaLayout, buildPlanetPositionMap, filterMandalaPlanets } from './mandala/model';
import { MandalaPanels } from './mandala/MandalaPanels';
import { MandalaLayerSettings, MandalaTooltipOverlays } from './mandala/MandalaWheelChrome';
import { renderMandalaWheel } from './mandala/renderMandalaWheel';
import type {
  AspectTooltipModel,
  MandalaChartProps,
  PlanetTooltipModel,
} from './mandala/types';

export type { Aspect, Planet } from './mandala/types';

export const MandalaChart = ({
  size = 620,
  planets,
  houses,
  aspects,
  transitPlanets,
  transitAspects,
  showPanel = true,
  calculationCertified = false,
}: MandalaChartProps) => {
  const svgRef = useRef<SVGSVGElement>(null);
  const [showDecanates, setShowDecanates] = useState(false);
  const [showTerms, setShowTerms] = useState(false);
  const [showSecondaryBodies, setShowSecondaryBodies] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [planetTooltip, setPlanetTooltip] = useState<PlanetTooltipModel | null>(null);
  const [aspectTooltip, setAspectTooltip] = useState<AspectTooltipModel | null>(null);

  const layout = useMemo(() => buildMandalaLayout(size), [size]);
  const ascDegree = useMemo(() => resolveAscDegree(houses, planets), [houses, planets]);
  const orientation = useMemo(() => createMandalaOrientation(ascDegree), [ascDegree]);
  const filteredPlanets = useMemo(
    () => filterMandalaPlanets(planets, showSecondaryBodies),
    [planets, showSecondaryBodies],
  );
  const planetsMap = useMemo(() => buildPlanetPositionMap(planets), [planets]);

  useEffect(() => {
    if (!svgRef.current) return;
    renderMandalaWheel({
      svgElement: svgRef.current,
      layout,
      orientation,
      ascDegree,
      planets,
      filteredPlanets,
      houses,
      aspects,
      transitPlanets,
      transitAspects,
      planetsMap,
      showDecanates,
      showTerms,
      calculationCertified,
      onPlanetTooltip: setPlanetTooltip,
      onAspectTooltip: setAspectTooltip,
    });
  }, [
    layout,
    orientation,
    ascDegree,
    planets,
    filteredPlanets,
    houses,
    aspects,
    transitPlanets,
    transitAspects,
    planetsMap,
    showDecanates,
    showTerms,
    calculationCertified,
  ]);

  return (
    <div className="flex flex-col items-center gap-6">
      <div className="relative">
        <MandalaLayerSettings
          open={showSettings}
          showSecondaryBodies={showSecondaryBodies}
          showDecanates={showDecanates}
          showTerms={showTerms}
          onToggleOpen={() => setShowSettings(value => !value)}
          onClose={() => setShowSettings(false)}
          onToggleSecondaryBodies={() => setShowSecondaryBodies(value => !value)}
          onToggleDecanates={() => setShowDecanates(value => !value)}
          onToggleTerms={() => setShowTerms(value => !value)}
        />

        <svg
          ref={svgRef}
          width={size}
          height={size}
          viewBox={`0 0 ${size} ${size}`}
          className="drop-shadow-sm"
        />

        <MandalaTooltipOverlays
          size={size}
          planetTooltip={planetTooltip}
          aspectTooltip={aspectTooltip}
        />
      </div>

      {showPanel && (
        <MandalaPanels
          planets={planets}
          filteredPlanets={filteredPlanets}
          aspects={aspects}
          planetsMap={planetsMap}
        />
      )}
    </div>
  );
};
