const CHALDEAN_ORDER = ['Saturn', 'Jupiter', 'Mars', 'Sun', 'Venus', 'Mercury', 'Moon'];
const DAY_REGENTS = ['Sun', 'Moon', 'Mars', 'Mercury', 'Jupiter', 'Venus', 'Saturn'];
const PLANET_ICONS: Record<string, string> = {
  Sun: '☉', Moon: '☽', Mercury: '☿', Venus: '♀', Mars: '♂', Jupiter: '♃', Saturn: '♄',
};
const PLANET_NAMES_PT: Record<string, string> = {
  Sun: 'Sol', Moon: 'Lua', Mercury: 'Mercúrio', Venus: 'Vênus', Mars: 'Marte', Jupiter: 'Júpiter', Saturn: 'Saturno',
};

export function getPlanetaryHour(date: Date): { icon: string; name: string; hour: string } {
  const dayRegent = DAY_REGENTS[date.getDay()];
  const startIdx = CHALDEAN_ORDER.indexOf(dayRegent);
  const regent = CHALDEAN_ORDER[(startIdx + date.getHours()) % 7];
  return {
    icon: PLANET_ICONS[regent] || '?',
    name: PLANET_NAMES_PT[regent] || regent,
    hour: date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
  };
}

export function getPlanetaryDayRegent(date: Date): { icon: string; name: string } {
  const regent = DAY_REGENTS[date.getDay()];
  return { icon: PLANET_ICONS[regent] || '?', name: PLANET_NAMES_PT[regent] || regent };
}

export const getPlanetRegency = getPlanetaryDayRegent;
