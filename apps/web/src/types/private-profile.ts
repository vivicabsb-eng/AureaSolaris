import type { CertifiedAstrologyResult } from './astrology';

export interface BirthData {
  date?: string;
  time?: string;
  location?: string;
  lat?: number;
  lng?: number;
  timezone?: string;
  birthDate?: string;
  birthTime?: string;
  birthCity?: string;
  birthTimezone?: string;
}

export interface ProfileConnection {
  id: string;
  name: string;
  birthDate?: string;
  birthTime?: string;
  birthCity?: string;
  birthTimezone?: string;
  birthData?: BirthData;
  natal?: Record<string, unknown>;
  certifiedNatalCalculation?: CertifiedAstrologyResult;
}

export interface PrivateProfile {
  id: string;
  name: string;
  active: boolean;
  natal?: Record<string, unknown>;
  birthData?: BirthData;
  connections?: ProfileConnection[];
  birthDate?: string;
  birthTime?: string;
  birthCity?: string;
  birthTimezone?: string;
  avatar?: string;
  context?: string;
  dialogStyle?: string;
  certifiedNatalCalculation?: CertifiedAstrologyResult;
}

export interface HermesInsight {
  type: 'move' | 'opportunity' | string;
  suggestion?: string;
  content?: string;
}
