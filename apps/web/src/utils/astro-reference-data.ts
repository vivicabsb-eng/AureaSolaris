/**
 * astro-reference-data.ts
 * Single immutable source for Mandala reference data shared by
 * astro-dignity.ts (calculations) and MandalaChart.tsx (rendering).
 *
 * Egyptian terms — Sistema Egípcio (docs/astrology-rules.md §1, Termos +2).
 * Decanate rulers — Sistema Caldeu (docs/astrology-rules.md §1, Decanatos +1).
 */

export interface EgyptianTermBound {
  readonly planet: string;
  readonly start: number;
  readonly end: number;
}

export const SIGN_NAMES_PT = [
  'Áries', 'Touro', 'Gêmeos', 'Câncer', 'Leão', 'Virgem',
  'Libra', 'Escorpião', 'Sagitário', 'Capricórnio', 'Aquário', 'Peixes',
] as const;

export const SIGN_SYMBOLS = ['♈', '♉', '♊', '♋', '♌', '♍', '♎', '♏', '♐', '♑', '♒', '♓'] as const;

export const ELEMENTS = [
  'fire', 'earth', 'air', 'water',
  'fire', 'earth', 'air', 'water',
  'fire', 'earth', 'air', 'water',
] as const;

export type ElementKey = 'fire' | 'earth' | 'air' | 'water';

export const ELEMENT_LABELS: Record<string, string> = {
  fire: 'Fogo', earth: 'Terra', air: 'Ar', water: 'Água',
};

export const ELEMENT_COLORS: Record<string, string> = {
  fire: '#D94F3D', earth: '#5B8C5A', air: '#C4A84D', water: '#3D6FA0',
};

export const ELEMENT_EMOJIS: Record<string, string> = {
  fire: '🔥', earth: '🌿', air: '🌬️', water: '💧',
};

export const PLANET_SYMBOLS: Record<string, string> = {
  Sun: '☉', Moon: '☽', Mercury: '☿', Venus: '♀', Mars: '♂',
  Jupiter: '♃', Saturn: '♄', Uranus: '♅', Neptune: '♆', Pluto: '♇',
  Chiron: '⚷', NorthNode: '☊', SouthNode: '☋', Lilith: '⚸',
  PartOfFortune: '⊗', Vertex: 'Vx',
  ASC: 'Asc', MC: 'MC', DSC: 'Dsc', IC: 'IC',
};

/** Egyptian terms for dignity calculations (English canonical planet names). */
export const EGYPTIAN_TERMS: readonly (readonly EgyptianTermBound[])[] = [
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

/** Egyptian terms for Mandala ring labels (verbatim Portuguese labels from MandalaChart). */
export const EGYPTIAN_TERMS_PT: readonly (readonly EgyptianTermBound[])[] = [
  [{ planet: 'Jupiter', start: 0, end: 6 }, { planet: 'Venus', start: 6, end: 12 }, { planet: 'Mercúrio', start: 12, end: 20 }, { planet: 'Marte', start: 20, end: 25 }, { planet: 'Saturno', start: 25, end: 30 }],
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

/** Chaldean decanate rulers for dignity calculations (English canonical planet names). */
export const DECANATE_RULERS = [
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

/** Decanate ring labels for Mandala display (verbatim Portuguese labels from MandalaChart). */
export const DECANATE_RULERS_PT = [
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
