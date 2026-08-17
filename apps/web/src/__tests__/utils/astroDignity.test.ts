import { describe, expect, it } from 'vitest';
import { FERAL_RULE, getDecanateRuler, getTermRuler, isFeral } from '../../utils/astro-dignity';
import { DECANATE_RULERS, EGYPTIAN_TERMS } from '../../utils/astro-reference-data';

describe('traditional feral rule', () => {
  it('never marks the Sun as feral when Sun is not in eligibleBodies by default', () => {
    expect(isFeral('Sun', {
      Sun: { degree: 10 },
      Moon: { degree: 200 },
      Mercury: { degree: 110 },
    })).toBe(false);
  });

  it('marks an eligible planet feral only when no eligible major aspect is present', () => {
    expect(isFeral('Mercury', {
      Mercury: { degree: 10 },
      Moon: { degree: 201 },
      Venus: { degree: 111 },
      Mars: { degree: 147 },
      Jupiter: { degree: 232 },
      Saturn: { degree: 270 },
      ASC: { degree: 90 },
      MC: { degree: 270.5 },
    })).toBe(true);
  });

  it('does not mark an eligible planet feral when it has a major aspect within the declared orb', () => {
    expect(isFeral('Mercury', {
      Mercury: { degree: 10 },
      Venus: { degree: 70 },
      Moon: { degree: 200 },
      ASC: { degree: 90 },
      MC: { degree: 270.5 },
    })).toBe(false);
  });

  it('respects per-aspect orbs: conjunction orb differs from opposition orb', () => {
    const planets = {
      Mercury: { degree: 10 },
      Venus: { degree: 16.5 },
      Moon: { degree: 200 },
      ASC: { degree: 90 },
      MC: { degree: 270.5 },
    };
    // Separation 6.5°; conjunction orb is 8, so this should still be conjunct -> not feral
    expect(isFeral('Mercury', planets)).toBe(false);
  });

  it('uses eligibleBodiesOverride when provided', () => {
    const planets = {
      Uranus: { degree: 10 },
      Neptune: { degree: 70 },
      Moon: { degree: 200 },
      ASC: { degree: 90 },
      MC: { degree: 270.5 },
    };
    // By default Uranus not eligible, so returns false (not eligible)
    expect(isFeral('Uranus', planets)).toBe(false);
    // With override including Uranus, should be eligible and still conjunct Neptune by 60° exact -> not feral
    expect(isFeral('Uranus', planets, ['Uranus', 'Neptune'], { 0: 8, 60: 5, 90: 6, 120: 7, 180: 8 })).toBe(false);
  });

  it('exposes rule metadata for audit', () => {
    expect(FERAL_RULE).toMatchObject({
      school: 'Tradicional',
      layer: 'regra interpretativa',
      aspects: [0, 60, 90, 120, 180],
      orbs: {
        0: 8.0,
        60: 5.0,
        90: 6.0,
        120: 7.0,
        180: 8.0,
      },
      eligibleBodies: expect.arrayContaining(['Sun', 'Moon', 'Mercury', 'Venus', 'Mars', 'Jupiter', 'Saturn', 'ASC', 'MC']),
    });
  });
});

describe('essential dignity reference lookups', () => {
  it('resolves Egyptian term rulers from centralized reference data', () => {
    expect(getTermRuler(0)).toBe(EGYPTIAN_TERMS[0][0].planet);
    expect(getTermRuler(5.9)).toBe(EGYPTIAN_TERMS[0][0].planet);
    expect(getTermRuler(6)).toBe(EGYPTIAN_TERMS[0][1].planet);
    expect(getTermRuler(30)).toBe(EGYPTIAN_TERMS[1][0].planet);
  });

  it('resolves Chaldean decanate rulers from centralized reference data', () => {
    expect(getDecanateRuler(0)).toBe(DECANATE_RULERS[0]);
    expect(getDecanateRuler(9.9)).toBe(DECANATE_RULERS[0]);
    expect(getDecanateRuler(10)).toBe(DECANATE_RULERS[1]);
    expect(getDecanateRuler(30)).toBe(DECANATE_RULERS[3]);
  });
});
