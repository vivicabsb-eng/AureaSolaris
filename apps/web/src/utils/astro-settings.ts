/**
 * astro-settings.ts
 * Utility to manage astrological settings like aspect orbs, 
 * persisting them to localStorage.
 */

export interface AspectOrb {
  type: string;
  angle: number;
  orb: number;
  symbol: string;
}

export const DEFAULT_ASPECT_ORBS: Record<string, AspectOrb> = {
   'Conjunção': { type: 'Conjunção', angle: 0, orb: 8.0, symbol: '☌' },
   'Oposição':  { type: 'Oposição', angle: 180, orb: 8.0, symbol: '☍' },
   'Trígono':   { type: 'Trígono', angle: 120, orb: 8.0, symbol: '△' },
   'Quadratura': { type: 'Quadratura', angle: 90, orb: 6.0, symbol: '□' },
   'Sextil':    { type: 'Sextil', angle: 60, orb: 4.0, symbol: '＊' },
   'Quincúncio': { type: 'Quincúncio', angle: 150, orb: 3.0, symbol: '⚻' },
   'Quintil':   { type: 'Quintil', angle: 72, orb: 3.0, symbol: 'ℍ' },
   'Bi-Quintil': { type: 'Bi-Quintil', angle: 144, orb: 3.0, symbol: 'ℎ' },
   'Semi-Sextil': { type: 'Semi-Sextil', angle: 30, orb: 2.0, symbol: '⚹' },
   'Semi-Quadratura': { type: 'Semi-Quadratura', angle: 45, orb: 2.0, symbol: '∠' },
   'Sesqui-Quadratura': { type: 'Sesqui-Quadratura', angle: 135, orb: 2.0, symbol: '⚼' },
};

const STORAGE_KEY = 'aurea_aspect_orbs';

/**
 * Get the current aspect orbs from localStorage or defaults.
 */
export function getAspectOrbs(): Record<string, AspectOrb> {
  const saved = localStorage.getItem(STORAGE_KEY);
  if (!saved) return DEFAULT_ASPECT_ORBS;
  try {
    const parsed = JSON.parse(saved);
    // Merge with defaults to ensure all keys exist
    return { ...DEFAULT_ASPECT_ORBS, ...parsed };
  } catch (e) {
    console.error("Failed to parse aspect orbs from localStorage", e);
    return DEFAULT_ASPECT_ORBS;
  }
}

/**
 * Save aspect orbs to localStorage.
 */
export function saveAspectOrbs(orbs: Record<string, AspectOrb>): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(orbs));
}
