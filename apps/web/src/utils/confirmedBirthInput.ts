export interface ConfirmedBirthInput {
  year: number;
  month: number;
  day: number;
  hour: number;
  lat: number;
  lon: number;
  timezone: string;
}

type RecordValue = Record<string, unknown>;

function asRecord(value: unknown): RecordValue | null {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? value as RecordValue
    : null;
}

function firstText(...values: unknown[]): string | null {
  for (const value of values) {
    if (typeof value === 'string' && value.trim()) return value.trim();
  }
  return null;
}

function firstFiniteNumber(...values: unknown[]): number | null {
  for (const value of values) {
    const parsed = typeof value === 'number' ? value : typeof value === 'string' ? Number(value.replace(',', '.')) : NaN;
    if (Number.isFinite(parsed)) return parsed;
  }
  return null;
}

function parseDate(value: string): { year: number; month: number; day: number } | null {
  const iso = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  const display = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(value);
  const [, first = '', second = '', third = ''] = iso || display || [];
  const year = Number(iso ? first : third);
  const month = Number(second);
  const day = Number(iso ? third : first);
  const candidate = new Date(Date.UTC(year, month - 1, day));

  if (
    !Number.isInteger(year) || !Number.isInteger(month) || !Number.isInteger(day) ||
    candidate.getUTCFullYear() !== year || candidate.getUTCMonth() !== month - 1 || candidate.getUTCDate() !== day
  ) return null;

  return { year, month, day };
}

function parseTime(value: string): number | null {
  const match = /^(\d{2}):(\d{2})$/.exec(value);
  if (!match) return null;
  const hours = Number(match[1]);
  const minutes = Number(match[2]);
  return Number.isInteger(hours) && Number.isInteger(minutes) && hours >= 0 && hours < 24 && minutes >= 0 && minutes < 60
    ? hours + minutes / 60
    : null;
}

/**
 * Converte apenas um nascimento integralmente declarado em entrada para o motor.
 * Não escolhe data, hora, local, coordenadas ou fuso por conta própria.
 */
export function readConfirmedBirthInput(profile: unknown): ConfirmedBirthInput | null {
  const subject = asRecord(profile);
  if (!subject) return null;

  const birthData = asRecord(subject.birthData);
  const natal = asRecord(subject.natal);
  const dateText = firstText(subject.birthDate, birthData?.birthDate, birthData?.date, natal?.birthDate, natal?.date);
  const timeText = firstText(subject.birthTime, birthData?.birthTime, birthData?.time, natal?.birthTime, natal?.time);
  const timezone = firstText(subject.birthTimezone, birthData?.timezone, birthData?.birthTimezone, natal?.timezone, natal?.birthTimezone);
  const lat = firstFiniteNumber(birthData?.lat, natal?.lat, subject.lat);
  const lon = firstFiniteNumber(birthData?.lon, birthData?.lng, natal?.lon, natal?.lng, subject.lon, subject.lng);
  const date = dateText ? parseDate(dateText) : null;
  const hour = timeText ? parseTime(timeText) : null;

  if (
    !date || hour === null || lat === null || lon === null || !timezone || (timezone !== 'UTC' && !timezone.includes('/')) ||
    lat < -90 || lat > 90 || lon < -180 || lon > 180
  ) return null;

  return { ...date, hour, lat, lon, timezone };
}
