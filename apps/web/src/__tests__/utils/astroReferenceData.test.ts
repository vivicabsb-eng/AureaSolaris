import { describe, expect, it } from 'vitest';

import {
  DECANATE_RULERS,
  DECANATE_RULERS_PT,
  EGYPTIAN_TERMS,
  EGYPTIAN_TERMS_PT,
  ELEMENT_COLORS,
  ELEMENT_EMOJIS,
  ELEMENT_LABELS,
  ELEMENTS,
  PLANET_SYMBOLS,
  SIGN_NAMES_PT,
  SIGN_SYMBOLS,
} from '../../utils/astro-reference-data';

/** astro-dignity.ts canonical copy (English planet names, Chaldean decanates). */
const DIGNITY_SIGN_NAMES = [
  'Áries', 'Touro', 'Gêmeos', 'Câncer', 'Leão', 'Virgem',
  'Libra', 'Escorpião', 'Sagitário', 'Capricórnio', 'Aquário', 'Peixes',
] as const;

const DIGNITY_SIGN_SYMBOLS = ['♈', '♉', '♊', '♋', '♌', '♍', '♎', '♏', '♐', '♑', '♒', '♓'] as const;

const DIGNITY_ELEMENTS = [
  'fire', 'earth', 'air', 'water',
  'fire', 'earth', 'air', 'water',
  'fire', 'earth', 'air', 'water',
] as const;

const DIGNITY_ELEMENT_LABELS = {
  fire: 'Fogo', earth: 'Terra', air: 'Ar', water: 'Água',
} as const;

const DIGNITY_ELEMENT_COLORS = {
  fire: '#D94F3D', earth: '#5B8C5A', air: '#C4A84D', water: '#3D6FA0',
} as const;

const DIGNITY_ELEMENT_EMOJIS = {
  fire: '🔥', earth: '🌿', air: '🌬️', water: '💧',
} as const;

const DIGNITY_PLANET_SYMBOLS = {
  Sun: '☉', Moon: '☽', Mercury: '☿', Venus: '♀', Mars: '♂',
  Jupiter: '♃', Saturn: '♄', Uranus: '♅', Neptune: '♆', Pluto: '♇',
  Chiron: '⚷', ASC: 'Asc', MC: 'MC',
} as const;

const DIGNITY_EGYPTIAN_TERMS = [
  [{ planet: 'Jupiter', start: 0, end: 6 }, { planet: 'Venus', start: 6, end: 12 }, { planet: 'Mercury', start: 12, end: 20 }, { planet: 'Mars', start: 20, end: 25 }, { planet: 'Saturn', start: 25, end: 30 }],
  [{ planet: 'Venus', start: 0, end: 8 }, { planet: 'Mercury', start: 8, end: 14 }, { planet: 'Jupiter', start: 14, end: 22 }, { planet: 'Saturn', start: 22, end: 27 }, { planet: 'Mars', start: 27, end: 30 }],
  [{ planet: 'Mercury', start: 0, end: 6 }, { planet: 'Jupiter', start: 6, end: 12 }, { planet: 'Venus', start: 12, end: 17 }, { planet: 'Mars', start: 17, end: 24 }, { planet: 'Saturn', start: 24, end: 30 }],
  [{ planet: 'Mars', start: 0, end: 7 }, { planet: 'Venus', start: 7, end: 13 }, { planet: 'Mercury', start: 13, end: 19 }, { planet: 'Jupiter', start: 19, end: 26 }, { planet: 'Saturn', start: 26, end: 30 }],
  [{ planet: 'Jupiter', start: 0, end: 6 }, { planet: 'Venus', start: 6, end: 11 }, { planet: 'Saturn', start: 11, end: 18 }, { planet: 'Mercury', start: 18, end: 24 }, { planet: 'Mars', start: 24, end: 30 }],
  [{ planet: 'Mercury', start: 0, end: 7 }, { planet: 'Venus', start: 7, end: 17 }, { planet: 'Jupiter', start: 17, end: 21 }, { planet: 'Mars', start: 21, end: 28 }, { planet: 'Saturn', start: 28, end: 30 }],
  [{ planet: 'Saturn', start: 0, end: 6 }, { planet: 'Mercury', start: 6, end: 14 }, { planet: 'Jupiter', start: 14, end: 21 }, { planet: 'Venus', start: 21, end: 28 }, { planet: 'Mars', start: 28, end: 30 }],
  [{ planet: 'Mars', start: 0, end: 7 }, { planet: 'Venus', start: 7, end: 11 }, { planet: 'Jupiter', start: 11, end: 19 }, { planet: 'Mercury', start: 19, end: 24 }, { planet: 'Saturn', start: 24, end: 30 }],
  [{ planet: 'Jupiter', start: 0, end: 12 }, { planet: 'Venus', start: 12, end: 17 }, { planet: 'Mercury', start: 17, end: 21 }, { planet: 'Saturn', start: 21, end: 26 }, { planet: 'Mars', start: 26, end: 30 }],
  [{ planet: 'Venus', start: 0, end: 6 }, { planet: 'Mercury', start: 6, end: 12 }, { planet: 'Jupiter', start: 12, end: 19 }, { planet: 'Saturn', start: 19, end: 25 }, { planet: 'Mars', start: 25, end: 30 }],
  [{ planet: 'Mercury', start: 0, end: 7 }, { planet: 'Venus', start: 7, end: 13 }, { planet: 'Jupiter', start: 13, end: 20 }, { planet: 'Mars', start: 20, end: 25 }, { planet: 'Saturn', start: 25, end: 30 }],
  [{ planet: 'Venus', start: 0, end: 12 }, { planet: 'Jupiter', start: 12, end: 16 }, { planet: 'Mercury', start: 16, end: 19 }, { planet: 'Mars', start: 19, end: 28 }, { planet: 'Saturn', start: 28, end: 30 }],
] as const;

const DIGNITY_DECANATE_RULERS = [
  'Mars', 'Sun', 'Venus',
  'Mercury', 'Moon', 'Saturn',
  'Jupiter', 'Mars', 'Sun',
  'Venus', 'Mercury', 'Moon',
  'Saturn', 'Jupiter', 'Mars',
  'Sun', 'Venus', 'Mercury',
  'Moon', 'Saturn', 'Jupiter',
  'Mars', 'Sun', 'Venus',
  'Mercury', 'Moon', 'Saturn',
  'Jupiter', 'Mars', 'Sun',
  'Venus', 'Mercury', 'Moon',
  'Saturn', 'Jupiter', 'Mars',
] as const;

/** MandalaChart.tsx canonical copy (Portuguese planet names for ring labels). */
const MANDALA_SIGN_NAMES = [
  'Áries', 'Touro', 'Gêmeos', 'Câncer', 'Leão', 'Virgem', 'Libra', 'Escorpião', 'Sagitário', 'Capricórnio', 'Aquário', 'Peixes',
] as const;

const MANDALA_SIGN_SYMBOLS = ['♈', '♉', '♊', '♋', '♌', '♍', '♎', '♏', '♐', '♑', '♒', '♓'] as const;

const MANDALA_ELEMENTS = [
  'fire', 'earth', 'air', 'water', 'fire', 'earth', 'air', 'water', 'fire', 'earth', 'air', 'water',
] as const;

const MANDALA_ELEMENT_COLORS = {
  fire: '#D94F3D', earth: '#5B8C5A', air: '#C4A84D', water: '#3D6FA0',
} as const;

const MANDALA_PLANET_SYMBOLS = {
  Sun: '☉', Moon: '☽', Mercury: '☿', Venus: '♀', Mars: '♂',
  Jupiter: '♃', Saturn: '♄', Uranus: '♅', Neptune: '♆', Pluto: '♇',
  Chiron: '⚷', NorthNode: '☊', SouthNode: '☋', Lilith: '⚸',
  PartOfFortune: '⊗', Vertex: 'Vx',
  ASC: 'Asc', MC: 'MC', DSC: 'Dsc', IC: 'IC',
} as const;

const MANDALA_EGYPTIAN_TERMS_PT = [
  [{ planet: 'Jupiter', start: 0, end: 6 }, { planet: 'Venus', start: 6, end: 12 }, { planet: 'Mercúrio', start: 12, end: 20 }, { planet: 'Marte', start: 20, end: 25 }, { planet: 'Saturno', start: 25, end: 30 }] as const,
  [{ planet: 'Vênus', start: 0, end: 8 }, { planet: 'Mercúrio', start: 8, end: 14 }, { planet: 'Júpiter', start: 14, end: 22 }, { planet: 'Saturno', start: 22, end: 27 }, { planet: 'Marte', start: 27, end: 30 }],
  [{ planet: 'Mercúrio', start: 0, end: 6 }, { planet: 'Júpiter', start: 6, end: 12 }, { planet: 'Vênus', start: 12, end: 17 }, { planet: 'Marte', start: 17, end: 24 }, { planet: 'Saturno', start: 24, end: 30 }],
  [{ planet: 'Marte', start: 0, end: 7 }, { planet: 'Vênus', start: 7, end: 13 }, { planet: 'Mercúrio', start: 13, end: 19 }, { planet: 'Júpiter', start: 19, end: 26 }, { planet: 'Saturno', start: 26, end: 30 }],
  [{ planet: 'Júpiter', start: 0, end: 6 }, { planet: 'Vênus', start: 6, end: 11 }, { planet: 'Saturno', start: 11, end: 18 }, { planet: 'Mercúrio', start: 18, end: 24 }, { planet: 'Marte', start: 24, end: 30 }],
  [{ planet: 'Mercúrio', start: 0, end: 7 }, { planet: 'Vênus', start: 7, end: 17 }, { planet: 'Júpiter', start: 17, end: 21 }, { planet: 'Marte', start: 21, end: 28 }, { planet: 'Saturno', start: 28, end: 30 }],
  [{ planet: 'Saturno', start: 0, end: 6 }, { planet: 'Mercúrio', start: 6, end: 14 }, { planet: 'Júpiter', start: 14, end: 21 }, { planet: 'Vênus', start: 21, end: 28 }, { planet: 'Marte', start: 28, end: 30 }],
  [{ planet: 'Marte', start: 0, end: 7 }, { planet: 'Vênus', start: 7, end: 11 }, { planet: 'Júpiter', start: 11, end: 19 }, { planet: 'Mercúrio', start: 19, end: 24 }, { planet: 'Saturno', start: 24, end: 30 }],
  [{ planet: 'Júpiter', start: 0, end: 12 }, { planet: 'Vênus', start: 12, end: 17 }, { planet: 'Mercúrio', start: 17, end: 21 }, { planet: 'Saturno', start: 21, end: 26 }, { planet: 'Marte', start: 26, end: 30 }],
  [{ planet: 'Vênus', start: 0, end: 6 }, { planet: 'Mercúrio', start: 6, end: 12 }, { planet: 'Júpiter', start: 12, end: 19 }, { planet: 'Saturno', start: 19, end: 25 }, { planet: 'Marte', start: 25, end: 30 }],
  [{ planet: 'Mercúrio', start: 0, end: 7 }, { planet: 'Vênus', start: 7, end: 13 }, { planet: 'Júpiter', start: 13, end: 20 }, { planet: 'Marte', start: 20, end: 25 }, { planet: 'Saturno', start: 25, end: 30 }],
  [{ planet: 'Vênus', start: 0, end: 12 }, { planet: 'Júpiter', start: 12, end: 16 }, { planet: 'Mercúrio', start: 16, end: 19 }, { planet: 'Marte', start: 19, end: 28 }, { planet: 'Saturno', start: 28, end: 30 }],
] as const;

const MANDALA_DECANATE_RULERS_PT = [
  'Marte', 'Sol', 'Vênus',
  'Sol', 'Vênus', 'Mercúrio',
  'Vênus', 'Mercúrio', 'Lua',
  'Mercúrio', 'Lua', 'Saturno',
  'Lua', 'Saturno', 'Júpiter',
  'Saturno', 'Júpiter', 'Marte',
  'Júpiter', 'Marte', 'Sol',
  'Marte', 'Sol', 'Vênus',
  'Sol', 'Vênus', 'Mercúrio',
  'Vênus', 'Mercúrio', 'Lua',
  'Mercúrio', 'Lua', 'Saturno',
  'Lua', 'Saturno', 'Júpiter',
] as const;

describe('astro reference data (astro-dignity canonical copy)', () => {
  it('preserves all 12 sign names in order', () => {
    expect([...SIGN_NAMES_PT]).toEqual([...DIGNITY_SIGN_NAMES]);
    expect([...SIGN_NAMES_PT]).toEqual([...MANDALA_SIGN_NAMES]);
  });

  it('preserves all 12 sign symbols in order', () => {
    expect([...SIGN_SYMBOLS]).toEqual([...DIGNITY_SIGN_SYMBOLS]);
    expect([...SIGN_SYMBOLS]).toEqual([...MANDALA_SIGN_SYMBOLS]);
  });

  it('preserves element assignment for all 12 signs', () => {
    expect([...ELEMENTS]).toEqual([...DIGNITY_ELEMENTS]);
    expect([...ELEMENTS]).toEqual([...MANDALA_ELEMENTS]);
  });

  it('preserves element presentation labels, colors, and emojis', () => {
    expect({ ...ELEMENT_LABELS }).toEqual({ ...DIGNITY_ELEMENT_LABELS });
    expect({ ...ELEMENT_COLORS }).toEqual({ ...DIGNITY_ELEMENT_COLORS });
    expect({ ...ELEMENT_COLORS }).toEqual({ ...MANDALA_ELEMENT_COLORS });
    expect({ ...ELEMENT_EMOJIS }).toEqual({ ...DIGNITY_ELEMENT_EMOJIS });
  });

  it('preserves dignity-layer planet symbols', () => {
    for (const [key, symbol] of Object.entries(DIGNITY_PLANET_SYMBOLS)) {
      expect(PLANET_SYMBOLS[key as keyof typeof DIGNITY_PLANET_SYMBOLS]).toBe(symbol);
    }
  });

  it('preserves Mandala-layer planet symbols', () => {
    for (const [key, symbol] of Object.entries(MANDALA_PLANET_SYMBOLS)) {
      expect(PLANET_SYMBOLS[key as keyof typeof MANDALA_PLANET_SYMBOLS]).toBe(symbol);
    }
  });

  it('preserves all Egyptian term boundaries (English, calculation layer)', () => {
    expect(EGYPTIAN_TERMS).toHaveLength(12);
    EGYPTIAN_TERMS.forEach((signTerms, signIdx) => {
      expect(signTerms).toHaveLength(5);
      signTerms.forEach((term, termIdx) => {
        const expected = DIGNITY_EGYPTIAN_TERMS[signIdx][termIdx];
        expect(term.planet).toBe(expected.planet);
        expect(term.start).toBe(expected.start);
        expect(term.end).toBe(expected.end);
      });
    });
  });

  it('preserves all Egyptian term boundaries (Portuguese, Mandala display layer)', () => {
    expect(EGYPTIAN_TERMS_PT).toHaveLength(12);
    EGYPTIAN_TERMS_PT.forEach((signTerms, signIdx) => {
      expect(signTerms).toHaveLength(5);
      signTerms.forEach((term, termIdx) => {
        const expected = MANDALA_EGYPTIAN_TERMS_PT[signIdx][termIdx];
        expect(term.planet).toBe(expected.planet);
        expect(term.start).toBe(expected.start);
        expect(term.end).toBe(expected.end);
      });
    });
  });

  it('preserves all 36 Chaldean decanate rulers (English, calculation layer)', () => {
    expect([...DECANATE_RULERS]).toEqual([...DIGNITY_DECANATE_RULERS]);
  });

  it('preserves all 36 decanate ring labels (Portuguese, Mandala display layer)', () => {
    expect([...DECANATE_RULERS_PT]).toEqual([...MANDALA_DECANATE_RULERS_PT]);
  });
});
