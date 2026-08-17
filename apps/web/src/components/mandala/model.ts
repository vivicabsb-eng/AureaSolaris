import { normalizeDegree } from '../../utils/mandala-geometry';
import type { MandalaLayout, MandalaPlanetPosition, Planet } from './types';

const DEFAULT_HIDDEN_SECONDARY_BODIES = new Set(['SouthNode', 'Lilith', 'Vertex']);

export function buildMandalaLayout(size: number): MandalaLayout {
  const radius = size / 2 - 30;
  return {
    size,
    cx: size / 2,
    cy: size / 2,
    radius,
    degreeRadius: radius,
    signRadius: radius * 0.90,
    decanateRadius: radius * 0.86,
    termRadius: radius * 0.81,
    houseRadius: radius * 0.76,
    planetRadius: radius * 0.70,
    aspectRadius: radius * 0.18,
    transitRadius: radius * 0.95,
  };
}

export function filterMandalaPlanets(planets: Planet[], showSecondaryBodies: boolean): Planet[] {
  if (showSecondaryBodies) return planets;
  return planets.filter(planet => !DEFAULT_HIDDEN_SECONDARY_BODIES.has(planet.name));
}

export function buildPlanetPositionMap(planets: Planet[]): Record<string, MandalaPlanetPosition> {
  return planets.reduce<Record<string, MandalaPlanetPosition>>((map, planet) => {
    const key = planet.name === 'Asc' ? 'ASC' : planet.name;
    map[key] = { degree: planet.degree, house: planet.house };
    return map;
  }, {});
}

export function formatMandalaDegree(absoluteDegree: number): string {
  const degreeInSign = normalizeDegree(absoluteDegree) % 30;
  const degree = Math.floor(degreeInSign);
  const minute = Math.floor((degreeInSign - degree) * 60);
  return `${degree}°${String(minute).padStart(2, '0')}'`;
}
