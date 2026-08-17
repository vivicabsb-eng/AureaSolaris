/**
 * astro-dignity.ts
 * Pure TypeScript utility for classical (Ptolemaic/Hellenistic) and modern
 * astrological dignity calculations.
 *
 * No React, no side-effects — all functions are pure and deterministic.
 */

import {
  DECANATE_RULERS,
  EGYPTIAN_TERMS,
  ELEMENT_COLORS,
  ELEMENT_EMOJIS,
  ELEMENT_LABELS,
  ELEMENTS,
  PLANET_SYMBOLS,
  SIGN_NAMES_PT,
  SIGN_SYMBOLS,
} from './astro-reference-data';

export {
  SIGN_NAMES_PT,
  SIGN_SYMBOLS,
  ELEMENTS,
  ELEMENT_LABELS,
  ELEMENT_COLORS,
  ELEMENT_EMOJIS,
  PLANET_SYMBOLS,
};

// ─── Sign Index Helpers ──────────────────────────────────────────────────────

export const QUALITIES: ('cardinal' | 'fixed' | 'mutable')[] = [
  'cardinal','fixed','mutable',
  'cardinal','fixed','mutable',
  'cardinal','fixed','mutable',
  'cardinal','fixed','mutable',
];

export const QUALITY_LABELS: Record<string, string> = {
  cardinal: 'Cardinal', fixed: 'Fixo', mutable: 'Mutável',
};

export const QUALITY_COLORS: Record<string, string> = {
  cardinal: '#8B5CF6', fixed: '#EC4899', mutable: '#14B8A6',
};

export const normDeg = (d: number) => ((d % 360) + 360) % 360;
export const getSignIdx = (deg: number) => Math.floor(normDeg(deg) / 30);

export const formatDeg = (absDeg: number) => {
  const sd = normDeg(absDeg) % 30;
  const d = Math.floor(sd);
  const m = Math.floor((sd - d) * 60);
  return `${d}°${String(m).padStart(2, '0')}'`;
};

// ─── Domicile Tables ─────────────────────────────────────────────────────────

/** Traditional (7 classical planets) domicile rulers per sign index */
export const TRAD_DOMICILE: Record<number, string> = {
  0: 'Mars',    // Aries
  1: 'Venus',   // Taurus
  2: 'Mercury', // Gemini
  3: 'Moon',    // Cancer
  4: 'Sun',     // Leo
  5: 'Mercury', // Virgo
  6: 'Venus',   // Libra
  7: 'Mars',    // Scorpio
  8: 'Jupiter', // Sagittarius
  9: 'Saturn',  // Capricorn
  10: 'Saturn', // Aquarius
  11: 'Jupiter',// Pisces
};

/** Modern co-rulers added on top of traditional */
export const MODERN_DOMICILE: Record<number, string> = {
  7: 'Pluto',   // Scorpio
  10: 'Uranus', // Aquarius
  11: 'Neptune',// Pisces
};

/** Detriment = opposite sign of domicile */
export const TRAD_DETRIMENT: Record<number, string> = {
  6: 'Mars',    // Libra (Mars rules Aries)
  7: 'Venus',   // Scorpio (Venus rules Taurus)
  8: 'Mercury', // Sagittarius (Merc rules Gemini)
  9: 'Moon',    // Capricorn (Moon rules Cancer)
  10: 'Sun',    // Aquarius (Sun rules Leo)
  11: 'Mercury',// Pisces (Merc rules Virgo)
  0: 'Venus',   // Aries (Venus rules Libra)
  1: 'Mars',    // Taurus (Mars rules Scorpio)
  2: 'Jupiter', // Gemini (Jup rules Sag)
  3: 'Saturn',  // Cancer (Sat rules Cap)
  4: 'Saturn',  // Leo (Sat rules Aqua)
  5: 'Jupiter', // Virgo (Jup rules Pisces)
};

export const MODERN_DETRIMENT: Record<number, string> = {
  1: 'Pluto',   // Taurus (Pluto rules Scorpio)
  4: 'Uranus',  // Leo (Uranus rules Aquarius)
  5: 'Neptune', // Virgo (Neptune rules Pisces)
};

// ─── Exaltation / Fall ──────────────────────────────────────────────────────

/** Exaltation: planet → sign index where it's exalted */
export const EXALTATION_SIGN: Record<string, number> = {
  Sun: 0,     // Aries
  Moon: 1,    // Taurus
  Mercury: 5, // Virgo
  Venus: 11,  // Pisces
  Mars: 9,    // Capricorn
  Jupiter: 3, // Cancer
  Saturn: 6,  // Libra
};

// Modern: Neptune in Pisces feels most at home, but exaltation debates exist.
// Using Pisces for Neptune exaltation (most modern consensus)
export const MODERN_EXALTATION_SIGN: Record<string, number> = {
  Uranus: 10,  // Aquarius
  Neptune: 11, // Pisces
  Pluto: 0,    // Aries
};

/** Fall = opposite sign of exaltation */
export const FALL_SIGN: Record<string, number> = {
  Sun: 6,     // Libra
  Moon: 7,    // Scorpio
  Mercury: 11,// Pisces
  Venus: 5,   // Virgo
  Mars: 3,    // Cancer
  Jupiter: 9, // Capricorn
  Saturn: 0,  // Aries
};

// ─── Triplicity Rulers (Dorothean System) ───────────────────────────────────
// Each element has Day ruler, Night ruler, and Cooperating (Participating) ruler

interface TriplicityRulers {
  day: string;
  night: string;
  cooperating: string;
}

export const TRIPLICITY: Record<string, TriplicityRulers> = {
  fire:  { day: 'Sun',    night: 'Jupiter', cooperating: 'Saturn' },
  earth: { day: 'Venus',  night: 'Moon',    cooperating: 'Mars'   },
  air:   { day: 'Saturn', night: 'Mercury', cooperating: 'Jupiter'},
  water: { day: 'Venus',  night: 'Mars',    cooperating: 'Moon'   },
};

// ─── Egyptian Terms ──────────────────────────────────────────────────────────

/** Get the Egyptian Term ruler for a planet at a given absolute degree */
export function getTermRuler(deg: number): string {
  const si = getSignIdx(deg);
  const pos = normDeg(deg) % 30;
  const terms = EGYPTIAN_TERMS[si];
  const term = terms.find(t => pos >= t.start && pos < t.end);
  return term?.planet ?? '';
}

// ─── Decanates ───────────────────────────────────────────────────────────────

export function getDecanateRuler(deg: number): string {
  const si = getSignIdx(deg);
  const pos = normDeg(deg) % 30;
  const decIdx = Math.floor(pos / 10);
  return DECANATE_RULERS[si * 3 + decIdx] ?? '';
}

// ─── Fixed Stars (2026 approximate positions) ──────────────────────────────
export const FIXED_STARS = [
  { name: 'Alpheratz', deg: 14.31 }, // 14° Aries 18'
  { name: 'Hamal', deg: 37.53 },     // 7° Taurus 32'
  { name: 'Alcyone', deg: 60.16 },   // 0° Gemini 10'
  { name: 'Aldebaran', deg: 70.12 }, // 10° Gemini 07'
  { name: 'Rigel', deg: 77.17 },     // 17° Gemini 10'
  { name: 'Sirius', deg: 104.42 },   // 14° Cancer 25'
  { name: 'Castor', deg: 110.57 },   // 20° Cancer 34'
  { name: 'Pollux', deg: 113.55 },   // 23° Cancer 33'
  { name: 'Regulus', deg: 150.17 },  // 0° Virgo 10'
  { name: 'Spica', deg: 204.17 },    // 24° Libra 10'
  { name: 'Arcturus', deg: 204.57 }, // 24° Libra 34'
  { name: 'Antares', deg: 250.10 },  // 10° Sagittarius 06'
  { name: 'Vega', deg: 285.65 },     // 15° Capricorn 39'
  { name: 'Fomalhaut', deg: 334.18 },// 4° Pisces 11'
];

export function getFixedStar(deg: number): string | null {
  for (const star of FIXED_STARS) {
    const diff = Math.abs(normDeg(deg) - star.deg);
    const orb = diff > 180 ? 360 - diff : diff;
    if (orb <= 1.0) return star.name;
  }
  return null;
}

// ─── Solar/Lunar Mansions (28 Manazil) ───────────────────────────────────────
export const MANSIONS = [
  'Al-Sharatain','Al-Butain','Al-Thurayya','Al-Dabaran','Al-Haqa','Al-Hana','Al-Dhira',
  'Al-Nathra','Al-Tarf','Al-Jabha','Al-Zubra','Al-Sarra','Al-Awwa','Al-Simak',
  'Al-Ghafr','Al-Zubana','Al-Iklil','Al-Qalb','Al-Shaula','Al-Naam','Al-Balda',
  'Saad al-Dhabih','Saad al-Bula','Saad al-Suud','Saad al-Akhbiya','Al-Fargh al-Awwal','Al-Fargh al-Thani','Al-Risha'
];

export function getMansion(deg: number): { name: string, deg: number, min: number } {
  const step = 360 / 28; // 12.857...
  const pos = normDeg(deg);
  const idx = Math.floor(pos / step);
  const mansionDeg = pos % step;
  const d = Math.floor(mansionDeg);
  const m = Math.floor((mansionDeg - d) * 60);
  return { name: MANSIONS[idx] || 'Desconhecida', deg: d, min: m };
}

// ─── Motion Status (Fast/Slow) ───────────────────────────────────────────────
export const RETROGRADE_ALLOWED = [
  'Mercury', 'Venus', 'Mars', 'Jupiter', 'Saturn',
  'Uranus', 'Neptune', 'Pluto',
  'Chiron', 'NorthNode', 'SouthNode', 'Lilith'
];

export const LENTO_ALLOWED = [
  'Mercury', 'Venus', 'Mars', 'Jupiter', 'Saturn',
  'Uranus', 'Neptune', 'Pluto',
  'Chiron', 'NorthNode', 'SouthNode', 'Lilith'
];

export const COMBUST_ALLOWED = ['Moon', 'Mercury', 'Venus', 'Mars', 'Jupiter', 'Saturn'];

const MEAN_SPEEDS: Record<string, number> = {
  Sun: 0.98, Moon: 13.17, Mercury: 1.38, Venus: 1.2, Mars: 0.52,
  Jupiter: 0.08, Saturn: 0.03, Uranus: 0.01, Neptune: 0.006, Pluto: 0.004
};

export function getMotionStatus(planet: string, speed: number): string {
  if (!LENTO_ALLOWED.includes(planet)) return 'Direto';

  const mSpeed = MEAN_SPEEDS[planet];
  if (!mSpeed) return 'Direto';

  const ratio = Math.abs(speed) / mSpeed;
  if (ratio > 1.1) return 'Rápido';
  if (ratio < 0.9) return 'Lento';
  return 'Direto';
}

// ─── Oriental / Occidental ──────────────────────────────────────────────────
export function getVisibilityState(planet: string, deg: number, sunDeg: number): string {
  if (planet === 'Sun') return '—';
  // Simplified: Oriental rises before Sun (lower degree), Occidental after (higher degree)
  // We use the 180 degree arc.
  const diff = normDeg(deg - sunDeg);
  return (diff > 180) ? 'Oriental' : 'Ocidental';
}

// ─── Cazimi / Combust ────────────────────────────────────────────────────────
export function getProximityToSun(planet: string, deg: number, sunDeg: number): string | null {
  if (!COMBUST_ALLOWED.includes(planet)) return null;

  const diff = Math.abs(normDeg(deg) - sunDeg);
  const orb = diff > 180 ? 360 - diff : diff;
  if (orb <= 0.28) return 'Cazimi'; // 17 minutes ~ 0.28 degrees
  if (orb <= 8.5) return 'Combusto';
  return null;
}

/**
 * A declared, non-astronomical reading rule for the traditional ``feral``
 * designation.  It belongs to the interpretation layer, never to an engine
 * receipt.  The current rule is intentionally narrow until the encyclopedia
 * can attach a selected author/source to each school variant.
 */
export const FERAL_RULE = {
  id: 'traditional-feral-major-aspects-v1',
  label: 'Feral',
  layer: 'regra interpretativa',
  school: 'Tradicional',
  criterion: 'planeta elegível sem aspecto maior com outro planeta elegível',
  aspects: [0, 60, 90, 120, 180],
  // Per-aspect orbs (professional astrological standard):
  // Conjunction: 8°, Opposition: 8°, Trine: 7°, Square: 6°, Sextile: 5°
  orbs: {
    0: 8.0,
    60: 5.0,
    90: 6.0,
    120: 7.0,
    180: 8.0,
  },
  // Bodies traditionally considered eligible for feral status.
  // The caller must pass all relevant bodies; the engine does not filter.
  eligibleBodies: [
    'Sun', 'Moon', 'Mercury', 'Venus', 'Mars', 'Jupiter', 'Saturn',
    'ASC', 'MC',
  ],
} as const;

export interface FeralPlanetMapEntry {
  degree: number;
  house?: number;
  isAngle?: boolean;
}

/**
 * Evaluates the feral condition on a certified calculation.
 *
 * This is NOT an astronomical output — it is an interpretive rule that must
 * be shown separately from motor data.  The caller must ensure positions
 * originated in a certified calculation receipt.
 *
 * @param planet - canonical planet/body name (e.g., 'Jupiter')
 * @param planets - map of ALL bodies present in the chart, including angles
 *                  and any modern bodies the user includes.
 * @param eligibleBodiesOverride - optional override for the eligibility list.
 *                  When omitted, uses FERAL_RULE.eligibleBodies.
 * @param orbsOverride - optional override for aspect orbs.
 * @returns true only when the planet has no major aspect within orbs.
 */
export function isFeral(
  planet: string,
  planets: Record<string, FeralPlanetMapEntry>,
  eligibleBodiesOverride?: readonly string[],
  orbsOverride?: Record<number, number>,
): boolean {
  const eligibleBodies = eligibleBodiesOverride ?? FERAL_RULE.eligibleBodies;
  const orbs = orbsOverride ?? FERAL_RULE.orbs;

  if (!eligibleBodies.includes(planet)) return false;

  // Sun is never feral in this corpus, even if the caller includes it.
  if (planet === 'Sun') return false;

  const ownEntry = planets[planet];
  if (!ownEntry) return false;
  const ownDegree = ownEntry.degree;
  if (typeof ownDegree !== 'number' || !Number.isFinite(ownDegree)) return false;

  for (const other of eligibleBodies) {
    if (other === planet) continue;
    const otherEntry = planets[other];
    if (!otherEntry) continue;
    const otherDegree = otherEntry.degree;
    if (typeof otherDegree !== 'number' || !Number.isFinite(otherDegree)) continue;

    const separation = Math.abs(normDeg(ownDegree) - normDeg(otherDegree));
    const distance = separation > 180 ? 360 - separation : separation;

    for (const aspect of FERAL_RULE.aspects) {
      const orb = orbs[aspect];
      if (typeof orb !== 'number') continue;
      if (Math.abs(distance - aspect) <= orb) {
        return false;
      }
    }
  }

  return true;
}

// ─── Planet Name Mapping (EN → display) ─────────────────────────────────────

export const PLANET_NAMES_PT: Record<string, string> = {
  Sun: 'Sol', Moon: 'Lua', Mercury: 'Mercúrio', Venus: 'Vênus',
  Mars: 'Marte', Jupiter: 'Júpiter', Saturn: 'Saturno',
  Uranus: 'Urano', Neptune: 'Netuno', Pluto: 'Plutão', Chiron: 'Quíron',
};

// ─── Dignity State per Planet ───────────────────────────────────────────────

export type DignityState =
  | 'domicile'
  | 'exaltation'
  | 'detriment'
  | 'fall'
  | 'peregrine'; // no essential dignity

export interface DignityInfo {
  state: DignityState;
  label: string;
  color: string;
  bg: string;
}

const DIGNITY_META: Record<DignityState, { label: string; color: string; bg: string }> = {
  domicile:   { label: 'Domicílio',  color: '#16a34a', bg: 'bg-green-50 text-green-700' },
  exaltation: { label: 'Exaltação',  color: '#2563eb', bg: 'bg-blue-50 text-blue-700'  },
  detriment:  { label: 'Exílio',     color: '#dc2626', bg: 'bg-red-50 text-red-600'    },
  fall:       { label: 'Queda',      color: '#d97706', bg: 'bg-amber-50 text-amber-700'},
  peregrine:  { label: '',           color: '#9ca3af', bg: 'bg-gray-50 text-gray-400'  },
};

/**
 * Determine the dignity state for a single planet.
 * Uses both traditional and modern rulerships.
 */
export function getDignityState(planetName: string, degree: number): DignityInfo {
  const si = getSignIdx(degree);

  // Domicile (traditional + modern)
  if (TRAD_DOMICILE[si] === planetName || MODERN_DOMICILE[si] === planetName) {
    const s = 'domicile';
    return { state: s, ...DIGNITY_META[s] };
  }
  // Exaltation (traditional)
  if (EXALTATION_SIGN[planetName] !== undefined && EXALTATION_SIGN[planetName] === si) {
    const s = 'exaltation';
    return { state: s, ...DIGNITY_META[s] };
  }
  // Detriment (traditional + modern)
  if (TRAD_DETRIMENT[si] === planetName || MODERN_DETRIMENT[si] === planetName) {
    const s = 'detriment';
    return { state: s, ...DIGNITY_META[s] };
  }
  // Fall
  if (FALL_SIGN[planetName] !== undefined && FALL_SIGN[planetName] === si) {
    const s = 'fall';
    return { state: s, ...DIGNITY_META[s] };
  }
  return { state: 'peregrine', ...DIGNITY_META['peregrine'] };
}

// ─── Elements & Qualities ───────────────────────────────────────────────────

const COUNTED_PLANETS = [
  'Sun','Moon','Mercury','Venus','Mars',
  'Jupiter','Saturn','Uranus','Neptune','Pluto','Chiron',
];

interface ElementResult {
  fire: number; earth: number; air: number; water: number;
  total: number;
  pct: { fire: number; earth: number; air: number; water: number };
}

export function calcElements(planets: Record<string, { degree: number }>): ElementResult {
  const counts = { fire: 0, earth: 0, air: 0, water: 0 };
  let total = 0;
  for (const name of COUNTED_PLANETS) {
    const p = planets[name];
    if (!p) continue;
    const el = ELEMENTS[getSignIdx(p.degree)];
    counts[el]++;
    total++;
  }
  const pct = {
    fire:  total ? Math.round((counts.fire  / total) * 100) : 0,
    earth: total ? Math.round((counts.earth / total) * 100) : 0,
    air:   total ? Math.round((counts.air   / total) * 100) : 0,
    water: total ? Math.round((counts.water / total) * 100) : 0,
  };
  return { ...counts, total, pct };
}

interface QualityResult {
  cardinal: number; fixed: number; mutable: number;
  total: number;
  pct: { cardinal: number; fixed: number; mutable: number };
}

export function calcQualities(planets: Record<string, { degree: number }>): QualityResult {
  const counts = { cardinal: 0, fixed: 0, mutable: 0 };
  let total = 0;
  for (const name of COUNTED_PLANETS) {
    const p = planets[name];
    if (!p) continue;
    const q = QUALITIES[getSignIdx(p.degree)];
    counts[q]++;
    total++;
  }
  const pct = {
    cardinal: total ? Math.round((counts.cardinal / total) * 100) : 0,
    fixed:    total ? Math.round((counts.fixed    / total) * 100) : 0,
    mutable:  total ? Math.round((counts.mutable  / total) * 100) : 0,
  };
  return { ...counts, total, pct };
}

// ─── Midpoints ───────────────────────────────────────────────────────────────

export interface MidpointEntry {
  p1: string; p2: string;
  degree: number;  // near midpoint (0–360)
  signIdx: number;
  posInSign: number;
  priority: number; // lower = more important
}

const MIDPOINT_PRIORITY: Record<string, number> = {
  'ASC/MC': 0, 'MC/ASC': 0,
  'Sun/Moon': 1, 'Moon/Sun': 1,
  'ASC/Sun': 2, 'Sun/ASC': 2,
  'ASC/Moon': 3, 'Moon/ASC': 3,
  'Sun/Mars': 4, 'Mars/Sun': 4,
  'Moon/Venus': 5, 'Venus/Moon': 5,
  'Jupiter/Saturn': 6, 'Saturn/Jupiter': 6,
};

export function calcMidpoints(
  planets: Record<string, { degree: number }>,
  maxResults = 10,
): MidpointEntry[] {
  const MP_PLANETS = ['Sun','Moon','Mercury','Venus','Mars','Jupiter','Saturn',
                      'Uranus','Neptune','Pluto','ASC','MC'];
  const available = MP_PLANETS.filter(n => planets[n]);

  const results: MidpointEntry[] = [];

  for (let i = 0; i < available.length; i++) {
    for (let j = i + 1; j < available.length; j++) {
      const p1 = available[i];
      const p2 = available[j];
      const d1 = normDeg(planets[p1].degree);
      const d2 = normDeg(planets[p2].degree);

      // Near midpoint (shorter arc)
      let mid = (d1 + d2) / 2;
      if (Math.abs(d1 - d2) > 180) mid = normDeg(mid + 180);
      mid = normDeg(mid);

      const key = `${p1}/${p2}`;
      const priority = MIDPOINT_PRIORITY[key] ?? 99;

      results.push({
        p1, p2,
        degree: Math.round(mid * 100) / 100,
        signIdx: getSignIdx(mid),
        posInSign: mid % 30,
        priority,
      });
    }
  }

  // Sort: priority first, then by absolute degree
  results.sort((a, b) => a.priority - b.priority || a.degree - b.degree);
  return results.slice(0, maxResults);
}

// ─── Dignity Scoring ─────────────────────────────────────────────────────────

export interface DignityScore {
  name: string;
  domicile: number;
  exaltation: number;
  triplicity: number;
  terms: number;
  decanate: number;
  detriment: number;
  fall: number;
  mutualReception: number;
  accidental: number;
  totalTrad: number;  // classical only, for traditional score
  totalModern: number; // includes modern rulerships
}

function hasMutualReception(name: string, degree: number, planets: Record<string, { degree: number }>, useModern: boolean): boolean {
  const si1 = getSignIdx(degree);
  for (const other of Object.keys(planets)) {
    if (other === name || !planets[other]) continue;
    const si2 = getSignIdx(planets[other].degree);

    const otherRulesSi1 = (useModern ? MODERN_DOMICILE[si1] : TRAD_DOMICILE[si1]) === other ||
                          (useModern ? (MODERN_EXALTATION_SIGN[other] ?? EXALTATION_SIGN[other]) : EXALTATION_SIGN[other]) === si1;

    const nameRulesSi2 = (useModern ? MODERN_DOMICILE[si2] : TRAD_DOMICILE[si2]) === name ||
                         (useModern ? (MODERN_EXALTATION_SIGN[name] ?? EXALTATION_SIGN[name]) : EXALTATION_SIGN[name]) === si2;

    if (otherRulesSi1 && nameRulesSi2) return true;
  }
  return false;
}

function isDiurnal(planets: Record<string, { degree: number }>): boolean {
  // Chart is diurnal if Sun is above horizon
  const sun = planets['Sun']?.degree ?? 0;
  const asc = planets['ASC']?.degree ?? 0;
  const diff = normDeg(sun - asc);
  // Degrees 180 to 360 relative to ASC are above the horizon (DSC -> MC -> ASC)
  return diff > 180;
}

/** Score a single planet across all five essential dignities plus accidental */
function scorePlanet(
  name: string,
  degree: number,
  planets: Record<string, { degree: number; house?: number; speed?: number }>,
  useModern: boolean,
): DignityScore {
  const si = getSignIdx(degree);
  const el = ELEMENTS[si];
  const diurnal = isDiurnal(planets);

  let domicile = 0, exaltation = 0, triplicity = 0, terms = 0, decanate = 0;
  let detriment = 0, fall = 0;

  // Domicile (+5) or Detriment (−5)
  const tradDom  = TRAD_DOMICILE[si]   === name;
  const modDom   = MODERN_DOMICILE[si] === name;
  const tradDet  = TRAD_DETRIMENT[si]  === name;
  const modDet   = MODERN_DETRIMENT[si]=== name;

  if (tradDom || (useModern && modDom)) domicile = 5;
  else if (tradDet || (useModern && modDet)) detriment = -5;

  // Exaltation (+4) or Fall (−4)
  const exSign = useModern
    ? (MODERN_EXALTATION_SIGN[name] ?? EXALTATION_SIGN[name])
    : EXALTATION_SIGN[name];
  if (exSign !== undefined && exSign === si) exaltation = 4;
  else if (FALL_SIGN[name] !== undefined && FALL_SIGN[name] === si) fall = -4;

  // Triplicity (+3)
  const tri = TRIPLICITY[el];
  if (tri) {
    const triRuler = diurnal ? tri.day : tri.night;
    if (triRuler === name) triplicity = 3;
    else if (tri.cooperating === name) triplicity = 1; // participating triplicity ruler = +1
  }

  // Terms (+2)
  if (getTermRuler(degree) === name) terms = 2;

  // Decanate (+1)
  if (getDecanateRuler(degree) === name) decanate = 1;

  // Mutual Reception (+5 bonus to mitigate detriment/fall)
  let mutualReception = 0;
  if (hasMutualReception(name, degree, planets, useModern)) {
    mutualReception = 5;
  }

  // Accidental Dignities
  let accidental = 0;
  const pData = planets[name];
  if (pData) {
    if (pData.house) {
      if ([1,4,7,10].includes(pData.house)) accidental += 5;
      else if ([2,5,8,11].includes(pData.house)) accidental += 4;
      else if ([3,6,9,12].includes(pData.house)) accidental += 3;
    }

    if (pData.speed !== undefined && pData.speed < 0 && name !== 'Sun' && name !== 'Moon') {
      accidental -= 5;
    }
    if (pData.speed !== undefined && getMotionStatus(name, pData.speed) === 'Rápido') {
      accidental += 2;
    }
  }

  const sunDeg = planets['Sun']?.degree ?? 0;
  const prox = getProximityToSun(name, degree, sunDeg);
  if (prox === 'Cazimi') accidental += 5;
  if (prox === 'Combusto') accidental -= 5;

  const totalTrad = domicile + exaltation + triplicity + terms + decanate + detriment + fall + mutualReception + accidental;
  const totalModern = totalTrad; // same formula; modern is resolved by useModern flag

  return { name, domicile, exaltation, triplicity, terms, decanate, detriment, fall, mutualReception, accidental, totalTrad, totalModern };
}

const TRAD_7 = ['Sun','Moon','Mercury','Venus','Mars','Jupiter','Saturn'];
const MODERN_10 = [...TRAD_7, 'Uranus', 'Neptune', 'Pluto'];

export interface DominanceEntry {
  name: string;
  symbol: string;
  namePt: string;
  scoreTrad: number;
  scoreModern: number;
  breakdown: { d: number; e: number; tri: number; ter: number; dec: number; det: number; fall: number; mut: number; acc: number };
  dignity: DignityInfo;
}

export function calcDominance(
  planets: Record<string, { degree: number }>,
): DominanceEntry[] {
  const results: DominanceEntry[] = [];

  for (const name of MODERN_10) {
    const p = planets[name];
    if (!p) continue;

    const trad   = scorePlanet(name, p.degree, planets, false);
    const modern = scorePlanet(name, p.degree, planets, true);
    const dignity = getDignityState(name, p.degree);

    results.push({
      name,
      symbol: PLANET_SYMBOLS[name] ?? name[0],
      namePt: PLANET_NAMES_PT[name] ?? name,
      scoreTrad:   trad.totalTrad,
      scoreModern: modern.totalModern,
      breakdown: {
        d:   trad.domicile,
        e:   trad.exaltation,
        tri: trad.triplicity,
        ter: trad.terms,
        dec: trad.decanate,
        det: trad.detriment,
        fall: trad.fall,
        mut: trad.mutualReception,
        acc: trad.accidental,
      },
      dignity,
    });
  }

  // Sort by modern score descending for display
  results.sort((a, b) => b.scoreModern - a.scoreModern);
  return results;
}

// ─── Regente do Ascendente ──────────────────────────────────────────────────

export interface RegentInfo {
  planet: string;
  planetPt: string;
  symbol: string;
  signPt: string;
  signSymbol: string;
  modernCo?: string;  // modern co-ruler if applicable
  modernCoPt?: string;
  modernCoSymbol?: string;
}

export function calcRegentAsc(ascDeg: number): RegentInfo {
  const si = getSignIdx(ascDeg);
  const trad = TRAD_DOMICILE[si];
  const mod  = MODERN_DOMICILE[si];
  return {
    planet:    trad,
    planetPt:  PLANET_NAMES_PT[trad]   ?? trad,
    symbol:    PLANET_SYMBOLS[trad]    ?? '?',
    signPt:    SIGN_NAMES_PT[si],
    signSymbol: SIGN_SYMBOLS[si],
    ...(mod && mod !== trad ? {
      modernCo:       mod,
      modernCoPt:     PLANET_NAMES_PT[mod] ?? mod,
      modernCoSymbol: PLANET_SYMBOLS[mod]  ?? '?',
    } : {}),
  };
}

// ─── Senhor da Genitura ──────────────────────────────────────────────────────

export interface SenhorInfo {
  planet: string;
  planetPt: string;
  symbol: string;
  scoreTrad: number;
  scoreModern: number;
}

export function calcSenhorGenitura(
  dominance: DominanceEntry[],
): SenhorInfo {
  // Senhor da Genitura = highest traditional dignity score among 7 classical planets
  const trad7 = dominance.filter(d => TRAD_7.includes(d.name));
  const best = trad7.reduce((acc, cur) =>
    cur.scoreTrad > acc.scoreTrad ? cur : acc, trad7[0] ?? dominance[0]);

  return {
    planet:      best?.name     ?? '—',
    planetPt:    best?.namePt   ?? '—',
    symbol:      best?.symbol   ?? '?',
    scoreTrad:   best?.scoreTrad   ?? 0,
    scoreModern: best?.scoreModern ?? 0,
  };
}

// ─── Alcocoden (Giver of Years) ──────────────────────────────────────────────
// Classical: the planet with most dignities over the Hyleg point.
// Simplified modern approach used here:
//   Hyleg = prominence point (Sun in day charts / Moon in night charts).
//   Alcocoden = classical planet with highest dignity score IN the Hyleg's sign.

export interface AlcododenInfo {
  planet: string;
  planetPt: string;
  symbol: string;
  hyleg: string;
  hylegPt: string;
  method: string;
}

export function calcAlcocoden(
  planets: Record<string, { degree: number }>,
): AlcododenInfo {
  const diurnal = isDiurnal(planets);
  const hylegInfo = calcHyleg(planets);
  const hylegName = hylegInfo.planet;
  const hylegDeg = hylegInfo.degree;
  const hylegSign = hylegInfo.signIdx;

  // Score each classical planet's dignity IN the Hyleg's sign
  // (evaluate as if the planet were there — i.e. count domicile/exaltation/terms there)
  // Standard approach: which classical planet has most dignities over that sign?
  const scores = TRAD_7.map(name => {
    let sc = 0;
    if (TRAD_DOMICILE[hylegSign] === name) sc += 5;
    if (EXALTATION_SIGN[name] === hylegSign) sc += 4;
    const el = ELEMENTS[hylegSign];
    const tri = TRIPLICITY[el];
    if (tri) {
      const ruler = diurnal ? tri.day : tri.night;
      if (ruler === name) sc += 3;
      if (tri.cooperating === name) sc += 1;
    }
    // Terms in hyleg's position within sign
    if (getTermRuler(hylegDeg) === name) sc += 2;
    if (getDecanateRuler(hylegDeg) === name) sc += 1;
    return { name, sc };
  });

  scores.sort((a, b) => b.sc - a.sc);
  const best = scores[0];

  return {
    planet:    best?.name          ?? '—',
    planetPt:  PLANET_NAMES_PT[best?.name ?? ''] ?? '—',
    symbol:    PLANET_SYMBOLS[best?.name ?? '']  ?? '?',
    hyleg:     hylegName,
    hylegPt:   PLANET_NAMES_PT[hylegName] ?? hylegName,
    method:    diurnal ? 'Carta Diurna' : 'Carta Noturna',
  };
}

// ─── Assinatura Astrológica ──────────────────────────────────────────────────

export interface AstroSignature {
  element: string;
  elementPt: string;
  quality: string;
  qualityPt: string;
  label: string;
  desc: string;
  color: string;
}

// ─── Hyleg (Apheta — Giver of Life) ─────────────────────────────────────────
// Classical rule (simplified):
//   Day chart  → Sun if in aphetical house (1,7,9,10,11), else Moon, else ASC
//   Night chart → Moon if in aphetical house, else Sun, else ASC
// Aphetical houses: 1, 7, 9, 10, 11 (above-horizon angular + succeedent)

export interface HylegInfo {
  planet: string;
  planetPt: string;
  symbol: string;
  degree: number;
  signIdx: number;
  signPt: string;
  signSymbol: string;
  posInSign: string;
  method: string; // 'Diurna' | 'Noturna'
  aphetical: boolean;
}

const APHETICAL_HOUSES = new Set([1, 7, 9, 10, 11]);

export function calcHyleg(
  planets: Record<string, { degree: number; house?: number }>,
): HylegInfo {
  const diurnal = isDiurnal(planets);
  const primary   = diurnal ? 'Sun' : 'Moon';
  const secondary = diurnal ? 'Moon' : 'Sun';

  const tryPlanet = (name: string): HylegInfo | null => {
    const p = planets[name];
    if (!p) return null;
    const house = p.house ?? 1;
    const si  = getSignIdx(p.degree);
    return {
      planet:    name,
      planetPt:  PLANET_NAMES_PT[name] ?? name,
      symbol:    PLANET_SYMBOLS[name] ?? '?',
      degree:    p.degree,
      signIdx:   si,
      signPt:    SIGN_NAMES_PT[si],
      signSymbol: SIGN_SYMBOLS[si],
      posInSign: formatDeg(p.degree),
      method:    diurnal ? 'Diurna' : 'Noturna',
      aphetical: APHETICAL_HOUSES.has(house),
    };
  };

  // Prefer primary if in aphetical house, else try secondary, else fallback to ASC
  const pri = tryPlanet(primary);
  if (pri && pri.aphetical) return pri;
  const sec = tryPlanet(secondary);
  if (sec && sec.aphetical) return sec;
  // Fallback: use primary regardless
  if (pri) return { ...pri, aphetical: false };
  // Last resort: ASC
  const asc = planets['ASC'];
  const si  = asc ? getSignIdx(asc.degree) : 0;
  return {
    planet: 'ASC', planetPt: 'Ascendente', symbol: 'Asc',
    degree: asc?.degree ?? 0, signIdx: si,
    signPt: SIGN_NAMES_PT[si], signSymbol: SIGN_SYMBOLS[si],
    posInSign: formatDeg(asc?.degree ?? 0),
    method: diurnal ? 'Diurna' : 'Noturna', aphetical: true,
  };
}

export function calcAstroSignature(
  elResult: ElementResult,
  qResult: QualityResult,
): AstroSignature {
  const elKey = (['fire','earth','air','water'] as const)
    .reduce((a, b) => elResult[a] >= elResult[b] ? a : b);
  const qKey = (['cardinal','fixed','mutable'] as const)
    .reduce((a, b) => qResult[a] >= qResult[b] ? a : b);

  const elPt = ELEMENT_LABELS[elKey];
  const qPt  = QUALITY_LABELS[qKey];

  const SIGN_MAP: Record<string, Record<string, string>> = {
    fire: { cardinal: 'Áries', fixed: 'Leão', mutable: 'Sagitário' },
    earth: { cardinal: 'Capricórnio', fixed: 'Touro', mutable: 'Virgem' },
    air: { cardinal: 'Libra', fixed: 'Aquário', mutable: 'Gêmeos' },
    water: { cardinal: 'Câncer', fixed: 'Escorpião', mutable: 'Peixes' },
  };

  const dominantSign = SIGN_MAP[elKey][qKey] || 'Desconhecido';

  return {
    element:   elKey,
    elementPt: elPt,
    quality:   qKey,
    qualityPt: qPt,
    label:     dominantSign,
    desc:      `energia de ${elPt.toLowerCase()} ${qPt.toLowerCase()}`,
    color:     ELEMENT_COLORS[elKey],
  };
}

// ─── Temperamento (Humores) ─────────────────────────────────────────────────

export interface TemperamentScore {
  colerico: number;     // Fogo
  sanguineo: number;    // Ar
  melancolico: number;  // Terra
  fleumatico: number;   // Água
  dominante: string;
}

export function calcTemperament(
  planets: Record<string, { degree: number }>,
  ascDeg: number,
  moonPhaseStr: string
): TemperamentScore {
  const scores = { colerico: 0, sanguineo: 0, melancolico: 0, fleumatico: 0 };
  let total = 0;

  const addScore = (element: string, points: number) => {
    if (element === 'fire') scores.colerico += points;
    else if (element === 'air') scores.sanguineo += points;
    else if (element === 'earth') scores.melancolico += points;
    else if (element === 'water') scores.fleumatico += points;
    total += points;
  };

  // 1. Ascendant Sign (3 pts)
  const ascSi = getSignIdx(ascDeg);
  const ascEl = ELEMENTS[ascSi];
  addScore(ascEl, 3);

  // 2. Lord of Ascendant (3 pts)
  const lordAsc = TRAD_DOMICILE[ascSi];
  const lordAscData = planets[lordAsc];
  if (lordAscData) {
    const lordEl = ELEMENTS[getSignIdx(lordAscData.degree)];
    addScore(lordEl, 3);
  }

  // 3. Moon Sign (3 pts)
  const moon = planets['Moon'];
  if (moon) {
    const moonSi = getSignIdx(moon.degree);
    const moonEl = ELEMENTS[moonSi];
    addScore(moonEl, 3);

    // Lord of Moon Sign (2 pts)
    const lordMoon = TRAD_DOMICILE[moonSi];
    const lordMoonData = planets[lordMoon];
    if (lordMoonData) {
      const lordMoonEl = ELEMENTS[getSignIdx(lordMoonData.degree)];
      addScore(lordMoonEl, 2);
    }
  }

  // 4. Sun Sign (2 pts)
  const sun = planets['Sun'];
  if (sun) {
    const sunEl = ELEMENTS[getSignIdx(sun.degree)];
    addScore(sunEl, 2);
  }

  // 5. Moon Phase (3 pts)
  // Nova -> 1Q (Quarto Crescente): Sanguine (Air)
  // 1Q -> Cheia: Choleric (Fire)
  // Cheia -> 3Q (Quarto Minguante): Melancholic (Earth)
  // 3Q -> Nova: Phlegmatic (Water)
  const p = moonPhaseStr.toLowerCase();
  if (p.includes('nova') || p === 'crescente') addScore('air', 3);
  else if (p.includes('quarto crescente') || p === 'gibosa crescente') addScore('fire', 3);
  else if (p.includes('cheia') || p === 'gibosa minguante') addScore('earth', 3);
  else if (p.includes('quarto minguante') || p.includes('minguante')) addScore('water', 3);

  const entries = Object.entries(scores);
  entries.sort((a, b) => b[1] - a[1]);

  // Convert to percentages
  if (total > 0) {
    scores.colerico = Math.round((scores.colerico / total) * 100);
    scores.sanguineo = Math.round((scores.sanguineo / total) * 100);
    scores.melancolico = Math.round((scores.melancolico / total) * 100);
    scores.fleumatico = Math.round((scores.fleumatico / total) * 100);
  }

  let dominanteLabel = entries[0][0];
  dominanteLabel = dominanteLabel.charAt(0).toUpperCase() + dominanteLabel.slice(1);

  return {
    ...scores,
    dominante: dominanteLabel
  };
}
