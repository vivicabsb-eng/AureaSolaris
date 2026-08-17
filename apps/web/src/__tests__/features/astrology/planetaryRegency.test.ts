import { describe, expect, it } from 'vitest';
import { getPlanetaryDayRegent, getPlanetaryHour, getPlanetRegency } from '../../../features/astrology/planetaryRegency';

describe('planetaryRegency', () => {
  it('preserves the existing day-regent aliases and Chaldean hour behavior', () => {
    const sunday = new Date(2026, 7, 16, 0, 5);
    expect(getPlanetaryDayRegent(sunday)).toEqual({ icon: '☉', name: 'Sol' });
    expect(getPlanetRegency(sunday)).toEqual(getPlanetaryDayRegent(sunday));
    expect(getPlanetaryHour(sunday)).toMatchObject({ icon: '☉', name: 'Sol' });
  });
});
