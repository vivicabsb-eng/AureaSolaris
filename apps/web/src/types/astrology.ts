import type { CertifiedCalculation } from '../utils/certifiedCalculation';

export interface PlanetaryPosition {
  sign: string;
  pos_in_sign: number;
  degree: number;
  element: string;
  house: string | number;
  retrograde: boolean;
}

export interface AstroAspect {
  p1: string;
  p2: string;
  type: string;
  symbol: string;
  orb: number;
  applying?: boolean;
}

export interface LiveAstroData {
  planets: Record<string, PlanetaryPosition>;
  aspects: AstroAspect[];
  houses: number[];
  regence: {
    day_regent: string;
    hour_regent: string;
  };
  moon_phase: {
    phase: string;
    icon: string;
    illumination: number;
  };
  meta: {
    timestamp: string;
    location: { lat: number; lon: number };
  };
  secondary?: Record<string, PlanetaryPosition>;
}

export interface AstrologyCalculationRequest {
  year: number;
  month: number;
  day: number;
  hour: number;
  lat?: number;
  lon?: number;
  timezone_name?: string;
  timezone?: string;
  house_system?: string;
  include_asteroids?: boolean;
}

export type CertifiedAstrologyResult = CertifiedCalculation & {
  planets: Record<string, PlanetaryPosition | Record<string, unknown>>;
  houses?: number[];
  aspects?: AstroAspect[];
  secondary?: Record<string, PlanetaryPosition | Record<string, unknown>>;
  error?: string;
};

export interface NatalCalculationPayload extends AstrologyCalculationRequest {
  lat: number;
  lon: number;
}

export interface BrowserCommandPayload {
  command: string;
  args?: Record<string, unknown>;
}
