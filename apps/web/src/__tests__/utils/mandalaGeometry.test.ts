import { describe, expect, it } from 'vitest';

import {
  createMandalaOrientation,
  getHouseMidpointDegree,
  getSignIndex,
  normalizeDegree,
  resolveAscDegree,
} from '../../utils/mandala-geometry';
import { SIGN_NAMES_PT, SIGN_SYMBOLS } from '../../utils/astro-reference-data';

describe('mandala geometry', () => {
  it('normalizes degrees and keeps sign boundaries stable', () => {
    expect(normalizeDegree(-10)).toBe(350);
    expect(normalizeDegree(370)).toBe(10);
    expect(normalizeDegree(720)).toBe(0);
    expect(getSignIndex(-0.01)).toBe(11);
    expect(getSignIndex(30)).toBe(1);
  });

  it('uses house 1 as the ASC and falls back to an ASC point', () => {
    expect(resolveAscDegree(
      [{ house: 1, degree: -10 }],
      [{ name: 'ASC', degree: 42 }],
    )).toBe(350);
    expect(resolveAscDegree(
      [],
      [{ name: 'ascendant', degree: 370 }],
    )).toBe(10);
    expect(resolveAscDegree([], [])).toBe(0);
  });

  it('places cardinal degrees with ASC at the left and preserves direction', () => {
    const orientation = createMandalaOrientation(0);

    expect(orientation.pointAt(0, 0, 10, 0).x).toBeCloseTo(-10);
    expect(orientation.pointAt(0, 0, 10, 0).y).toBeCloseTo(0);
    expect(orientation.pointAt(0, 0, 10, 90).x).toBeCloseTo(0);
    expect(orientation.pointAt(0, 0, 10, 90).y).toBeCloseTo(10);
    expect(orientation.pointAt(0, 0, 10, 180).x).toBeCloseTo(10);
    expect(orientation.pointAt(0, 0, 10, 180).y).toBeCloseTo(0);
    expect(orientation.pointAt(0, 0, 10, 270).x).toBeCloseTo(0);
    expect(orientation.pointAt(0, 0, 10, 270).y).toBeCloseTo(-10);
    expect(orientation.toSvgRadians(0)).toBeCloseTo(Math.PI);
    expect(orientation.toArcRadians(0)).toBeCloseTo(Math.PI / 2);
    expect(orientation.rotateDegree(90)).toBe(90);
  });

  it('wraps the rotation and house midpoint at 360 degrees', () => {
    const orientation = createMandalaOrientation(350);

    expect(orientation.rotationOffset).toBe(10);
    expect(orientation.rotateDegree(350)).toBe(0);
    expect(orientation.rotateDegree(-10)).toBe(0);
    expect(orientation.rotateDegree(0)).toBe(10);
    expect(getHouseMidpointDegree(350, 10)).toBe(0);
    expect(getHouseMidpointDegree(10, 350)).toBe(0);
  });

  it('aligns sign indices with centralized reference data', () => {
    expect(SIGN_NAMES_PT).toHaveLength(12);
    expect(SIGN_SYMBOLS).toHaveLength(12);
    expect(getSignIndex(0)).toBe(0);
    expect(getSignIndex(359.99)).toBe(11);
    expect(SIGN_NAMES_PT[getSignIndex(45)]).toBe('Touro');
  });

  it('preserves angular separation under rotation', () => {
    const orientation = createMandalaOrientation(287.5);

    const pairs = [
      [0, 90],
      [350, 10],
      [45.25, 215.75],
    ];

    for (const [start, end] of pairs) {
      const before = normalizeDegree(end - start);
      const after = normalizeDegree(
        orientation.rotateDegree(end) -
        orientation.rotateDegree(start),
      );

      expect(after).toBeCloseTo(before);
    }
  });

  it('places non-cardinal degrees at deterministic polar coordinates', () => {
    const orientation = createMandalaOrientation(0);
    const point = orientation.pointAt(100, 200, 50, 45);

    // ASC at 9h; 45° sits on the 135° SVG ray (bisector of left and down).
    expect(point.x).toBeCloseTo(100 - 25 * Math.SQRT2);
    expect(point.y).toBeCloseTo(200 + 25 * Math.SQRT2);
  });
});
