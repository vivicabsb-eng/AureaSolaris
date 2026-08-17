import { describe, expect, it } from 'vitest';
import { readConfirmedBirthInput } from '../../utils/confirmedBirthInput';

describe('readConfirmedBirthInput', () => {
  it('does not fabricate a birth input when required fields are missing', () => {
    expect(readConfirmedBirthInput({ birthDate: '21/12/1989' })).toBeNull();
    expect(readConfirmedBirthInput({
      birthDate: '21/12/1989',
      birthTime: '10:32',
      natal: { lat: -15.7833, lon: -47.9333 },
    })).toBeNull();
  });

  it('reads only a complete, confirmed birth record', () => {
    expect(readConfirmedBirthInput({
      birthDate: '21/12/1989',
      birthTime: '10:32',
      birthTimezone: 'America/Sao_Paulo',
      natal: { lat: -15.7833, lon: -47.9333 },
    })).toEqual({
      year: 1989,
      month: 12,
      day: 21,
      hour: 10 + 32 / 60,
      lat: -15.7833,
      lon: -47.9333,
      timezone: 'America/Sao_Paulo',
    });
  });

  it('accepts UTC as an explicit valid timezone without substituting a default', () => {
    expect(readConfirmedBirthInput({
      birthDate: '2000-01-02',
      birthTime: '00:00',
      birthTimezone: 'UTC',
      natal: { lat: 0, lon: 0 },
    })).toMatchObject({ year: 2000, month: 1, day: 2, hour: 0, timezone: 'UTC' });
  });
});
