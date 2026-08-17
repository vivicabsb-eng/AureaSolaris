export interface Planet {
  name: string;
  degree: number;
  sign?: string;
  color?: string;
  symbol?: string;
  retrograde?: boolean;
  isAngle?: boolean;
  stationary?: boolean;
  applying?: boolean;
  speed?: number;
  house?: number;
}

export interface House {
  house: number;
  degree: number;
  sign?: string;
}

export interface Aspect {
  p1: string;
  p2: string;
  type: string;
  symbol: string;
  orb: number;
}

export interface MandalaChartProps {
  size?: number;
  planets: Planet[];
  houses: House[];
  aspects: Aspect[];
  transitPlanets?: Planet[];
  transitAspects?: Aspect[];
  showPanel?: boolean;
  calculationCertified?: boolean;
}

export interface MandalaLayout {
  size: number;
  cx: number;
  cy: number;
  radius: number;
  degreeRadius: number;
  signRadius: number;
  decanateRadius: number;
  termRadius: number;
  houseRadius: number;
  planetRadius: number;
  aspectRadius: number;
  transitRadius: number;
}

export interface MandalaPlanetPosition {
  degree: number;
  house?: number;
}

export interface MandalaSpecialRule {
  label: string;
  layer: string;
  school: string;
  criterion: string;
  aspects: readonly number[];
  orbs: Readonly<Record<number, number>>;
}

export interface PlanetTooltipModel {
  name: string;
  sign: string;
  degree: string;
  retrograde: boolean;
  stationary: boolean;
  motion: string;
  color: string;
  x: number;
  y: number;
  decanate: string;
  term: string;
  mansion: string | null;
  star: string | null;
  dignity: string;
  visibility: string;
  special: string | null;
  specialRule?: MandalaSpecialRule;
}

export interface AspectTooltipModel {
  type: string;
  p1: string;
  p2: string;
  orb: number;
  general: string;
  specific: string;
  x: number;
  y: number;
  color: string;
}
