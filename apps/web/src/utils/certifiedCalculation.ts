type RecordValue = Record<string, unknown>;

export type CalculationKind = 'natal' | 'transit';

export interface CertifiedCalculation {
  planets: Record<string, unknown>;
  meta: {
    receipt: {
      schema_version: string;
      kind: CalculationKind;
      input_hash: string;
      engine: { name: string; version: string };
      resolved_time: { utc: string; iana_timezone: string };
    };
  };
}

function asRecord(value: unknown): RecordValue | null {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? value as RecordValue
    : null;
}

/** Aceita somente uma resposta do motor que ainda tenha o recibo reproduzível. */
export function readCertifiedCalculation(value: unknown, expectedKind: CalculationKind): CertifiedCalculation | null {
  const calculation = asRecord(value);
  const planets = asRecord(calculation?.planets);
  const meta = asRecord(calculation?.meta);
  const receipt = asRecord(meta?.receipt);
  const engine = asRecord(receipt?.engine);
  const resolvedTime = asRecord(receipt?.resolved_time);

  if (
    !planets || !receipt || receipt.schema_version !== 'calculation-receipt.v1' || receipt.kind !== expectedKind ||
    typeof receipt.input_hash !== 'string' || !receipt.input_hash ||
    typeof engine?.name !== 'string' || !engine.name || typeof engine.version !== 'string' || !engine.version ||
    typeof resolvedTime?.utc !== 'string' || !resolvedTime.utc ||
    typeof resolvedTime.iana_timezone !== 'string' || !resolvedTime.iana_timezone
  ) return null;

  return value as CertifiedCalculation;
}

/** Aceita somente datas completas e reais; não substitui partes ausentes. */
export function parseConfirmedBirthDate(value: unknown): { day: number; month: number; year: number } | null {
  if (typeof value !== 'string') return null;
  const iso = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value.trim());
  const display = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(value.trim());
  const [, first = '', second = '', third = ''] = iso || display || [];
  const year = Number(iso ? first : third);
  const month = Number(second);
  const day = Number(iso ? third : first);
  const candidate = new Date(Date.UTC(year, month - 1, day));

  return (
    Number.isInteger(year) && Number.isInteger(month) && Number.isInteger(day) &&
    candidate.getUTCFullYear() === year && candidate.getUTCMonth() === month - 1 && candidate.getUTCDate() === day
  ) ? { day, month, year } : null;
}
