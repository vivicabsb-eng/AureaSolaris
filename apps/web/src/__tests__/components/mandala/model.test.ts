import { describe, expect, it } from 'vitest';
import {
  buildMandalaLayout,
  buildPlanetPositionMap,
  filterMandalaPlanets,
  formatMandalaDegree,
} from '../../../components/mandala/model';
import type { Planet } from '../../../components/mandala/types';

describe('Mandala feature model', () => {
  it('derives deterministic radii from the requested chart size', () => {
    const layout = buildMandalaLayout(620);

    expect(layout.cx).toBe(310);
    expect(layout.cy).toBe(310);
    expect(layout.radius).toBe(280);
    expect(layout.degreeRadius).toBe(280);
    expect(layout.signRadius).toBe(252);
    expect(layout.houseRadius).toBeCloseTo(212.8);
    expect(layout.planetRadius).toBe(196);
    expect(layout.aspectRadius).toBeCloseTo(50.4);
    expect(layout.transitRadius).toBe(266);
  });

  it('keeps the current default secondary-body visibility contract', () => {
    const planets: Planet[] = [
      { name: 'Sun', degree: 10 },
      { name: 'NorthNode', degree: 20 },
      { name: 'Chiron', degree: 30 },
      { name: 'PartOfFortune', degree: 40 },
      { name: 'SouthNode', degree: 50 },
      { name: 'Lilith', degree: 60 },
      { name: 'Vertex', degree: 70 },
    ];

    expect(filterMandalaPlanets(planets, false).map(planet => planet.name)).toEqual([
      'Sun',
      'NorthNode',
      'Chiron',
      'PartOfFortune',
    ]);
    expect(filterMandalaPlanets(planets, true)).toEqual(planets);
  });

  it('normalizes Asc to the canonical ASC position-map key', () => {
    const map = buildPlanetPositionMap([
      { name: 'Asc', degree: 123.4, house: 1 },
      { name: 'Sun', degree: 10.5, house: 9 },
    ]);

    expect(map.ASC).toEqual({ degree: 123.4, house: 1 });
    expect(map.Sun).toEqual({ degree: 10.5, house: 9 });
  });

  it('formats a longitude as degree and minute inside its sign', () => {
    expect(formatMandalaDegree(42.5)).toBe("12°30'");
  });
});
