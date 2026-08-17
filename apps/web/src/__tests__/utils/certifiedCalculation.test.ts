import { describe, expect, it } from 'vitest';
import { parseConfirmedBirthDate, readCertifiedCalculation } from '../../utils/certifiedCalculation';

const certifiedTransit = {
  planets: { Sun: { sign: 'Aries', pos_in_sign: 10 } },
  meta: {
    receipt: {
      schema_version: 'calculation-receipt.v1',
      kind: 'transit',
      input_hash: '91b0f6e9',
      engine: { name: 'aurea-solaris-astro-engine', version: '2026.08.audit-1' },
      resolved_time: { utc: '2026-08-10T12:00:00Z', iana_timezone: 'UTC' },
    },
  },
};

describe('readCertifiedCalculation', () => {
  it('accepts a calculation only when its full receipt matches the expected kind', () => {
    expect(readCertifiedCalculation(certifiedTransit, 'transit')).toEqual(certifiedTransit);
  });

  it('rejects raw birth records, missing receipts, and mismatched calculation kinds', () => {
    expect(readCertifiedCalculation({ birthDate: '2000-01-02', lat: 0, lon: 0 }, 'natal')).toBeNull();
    expect(readCertifiedCalculation({ planets: certifiedTransit.planets, meta: {} }, 'transit')).toBeNull();
    expect(readCertifiedCalculation(certifiedTransit, 'natal')).toBeNull();
  });
});

describe('parseConfirmedBirthDate', () => {
  it('parses complete ISO and display dates without changing their day, month, or year', () => {
    expect(parseConfirmedBirthDate('2000-01-02')).toEqual({ day: 2, month: 1, year: 2000 });
    expect(parseConfirmedBirthDate('02/01/2000')).toEqual({ day: 2, month: 1, year: 2000 });
  });

  it('rejects incomplete and invalid dates instead of supplying numeric defaults', () => {
    expect(parseConfirmedBirthDate('')).toBeNull();
    expect(parseConfirmedBirthDate('2000-02-31')).toBeNull();
    expect(parseConfirmedBirthDate('02/01')).toBeNull();
  });
});
