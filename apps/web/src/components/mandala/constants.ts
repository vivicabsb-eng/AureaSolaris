import { SIGN_NAMES_PT } from '../../utils/astro-reference-data';

export const SIGN_NAMES = SIGN_NAMES_PT;

export const PLANET_COLORS: Record<string, string> = {
  Sun: '#FFD700', Moon: '#C0C0C0', Mercury: '#87CEEB', Venus: '#FF69B4',
  Mars: '#FF4500', Jupiter: '#DAA520', Saturn: '#708090', Uranus: '#00CED1',
  Neptune: '#4169E1', Pluto: '#8B0000', Chiron: '#9370DB',
  NorthNode: '#F97316', SouthNode: '#F97316',
  Lilith: '#A855F7', PartOfFortune: '#FF8C00', Vertex: '#DB2777',
  ASC: '#B8860B', MC: '#B8860B', DSC: '#B8860B', IC: '#B8860B',
};

export const ASPECT_COLORS: Record<string, string> = {
  'Conjunção': '#FFD700', 'Oposição': '#E74C3C', 'Trígono': '#27AE60',
  'Quadratura': '#E74C3C', 'Sextil': '#3498DB', 'Quincúncio': '#9B59B6',
  'Semi-Sextil': '#95A5A6', 'Quintil': '#1ABC9C', 'Bi-Quintil': '#1ABC9C',
  'Semi-Quadratura': '#E67E22', 'Sesqui-Quadratura': '#E67E22',
};

export const ASPECT_OPACITY: Record<string, number> = {
  'Conjunção': 0.7, 'Oposição': 0.55, 'Trígono': 0.45,
  'Quadratura': 0.55, 'Sextil': 0.4,
};
