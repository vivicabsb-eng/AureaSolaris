import { describe, expect, it } from 'vitest';
import {
  REFERENCE_NATAL_CONNECTION,
  REFERENCE_NATAL_MOCK_STORAGE_KEY,
  applyReferenceNatalMock,
  isReferenceNatalConnection,
  isReferenceNatalMockEnabled,
  resolveLocalOwnerSubjectId,
  syncReferenceNatalMockFromLocation,
  withReferenceNatalConnection,
} from '../../utils/reference-natal';
import { readConfirmedBirthInput } from '../../utils/confirmedBirthInput';

describe('reference natal fixture', () => {
  it('keeps the saved testing map as a complete confirmed birth record', () => {
    expect(REFERENCE_NATAL_CONNECTION).toMatchObject({
      id: 'aurea-reference-natal',
      name: 'Mapa de referencia',
      birthData: {
        date: '1985-12-01',
        time: '16:04',
        location: 'Belo Horizonte, MG',
        lat: -19.9167,
        lng: -43.9345,
        timezone: 'America/Sao_Paulo',
      },
    });
    expect(readConfirmedBirthInput(REFERENCE_NATAL_CONNECTION)).toEqual({
      year: 1985,
      month: 12,
      day: 1,
      hour: 16 + 4 / 60,
      lat: -19.9167,
      lon: -43.9345,
      timezone: 'America/Sao_Paulo',
    });
  });

  it('adds the reference map when the owner has none', () => {
    const next = withReferenceNatalConnection({
      id: 'owner-1',
      name: 'Aurea',
      active: true,
      connections: [],
    });

    expect(next.connections).toEqual([REFERENCE_NATAL_CONNECTION]);
    expect(next.birthDate).toBeUndefined();
  });

  it('does not duplicate a reference map already saved under the generated connection id', () => {
    const existing = {
      id: 'mapa_de_referencia_1786644254167',
      name: 'Mapa de referencia',
      birthData: REFERENCE_NATAL_CONNECTION.birthData,
    };
    const next = withReferenceNatalConnection({
      id: 'local-owner',
      name: 'Aurea',
      active: true,
      connections: [existing],
    });

    expect(next.connections).toEqual([existing]);
    expect(isReferenceNatalConnection(existing)).toBe(true);
  });

  it('restores complete birth data on an incomplete reference map without changing its id', () => {
    const next = withReferenceNatalConnection({
      id: 'local-owner',
      name: 'Aurea',
      active: true,
      connections: [{
        id: 'mapa_de_referencia_1786644254167',
        name: 'Mapa de referencia',
        birthData: { date: '1985-12-01', time: '16:04' },
      }],
    });

    const restored = next.connections ?? [];
    expect(restored).toEqual([{
      id: 'mapa_de_referencia_1786644254167',
      name: 'Mapa de referencia',
      birthData: REFERENCE_NATAL_CONNECTION.birthData,
    }]);
    expect(restored[0]).not.toBe(REFERENCE_NATAL_CONNECTION);
  });

  it('keeps other connections and the owner natal untouched', () => {
    const friend = { id: 'conn-1', name: 'Conexão' };
    const next = withReferenceNatalConnection({
      id: 'owner-1',
      name: 'Nome antigo',
      active: true,
      birthDate: '1990-01-15',
      birthTime: '08:30',
      connections: [friend],
    });

    expect(next.birthDate).toBe('1990-01-15');
    expect(next.birthTime).toBe('08:30');
    expect(next.connections).toEqual([friend, REFERENCE_NATAL_CONNECTION]);
  });

  it('focuses the reference map when the owner has no confirmed natal', () => {
    const profile = withReferenceNatalConnection({
      id: 'owner-1',
      name: 'Aurea',
      active: true,
      connections: [],
    });

    expect(resolveLocalOwnerSubjectId(profile, 'owner-1')).toBe('aurea-reference-natal');
    expect(resolveLocalOwnerSubjectId(profile, '')).toBe('aurea-reference-natal');
  });

  it('keeps a valid selected connection and an owner who already has natal', () => {
    const friend = { id: 'conn-1', name: 'Conexão' };
    const withFriend = withReferenceNatalConnection({
      id: 'owner-1',
      name: 'Aurea',
      active: true,
      connections: [friend],
    });
    expect(resolveLocalOwnerSubjectId(withFriend, 'conn-1')).toBe('conn-1');

    const ownerWithNatal = withReferenceNatalConnection({
      id: 'owner-1',
      name: 'Aurea',
      active: true,
      birthDate: '1990-01-15',
      birthTime: '08:30',
      birthTimezone: 'America/Sao_Paulo',
      natal: { lat: -23.55, lng: -46.63 },
      connections: [],
    });
    expect(resolveLocalOwnerSubjectId(ownerWithNatal, 'owner-1')).toBe('owner-1');
  });
});

describe('reference natal mock switch', () => {
  const emptyOwner = {
    id: 'owner-1',
    name: 'Aurea',
    active: true,
    connections: [],
  };

  it('is off by default and does not attach the mock map', () => {
    expect(isReferenceNatalMockEnabled('', { getItem: () => null })).toBe(false);
    expect(applyReferenceNatalMock(emptyOwner, false).connections).toEqual([]);
  });

  it('turns on from the URL or from the saved testing flag', () => {
    expect(isReferenceNatalMockEnabled('?mockNatal=1', { getItem: () => null })).toBe(true);
    expect(isReferenceNatalMockEnabled('', {
      getItem: (key: string) => (key === REFERENCE_NATAL_MOCK_STORAGE_KEY ? '1' : null),
    })).toBe(true);
    expect(isReferenceNatalMockEnabled('?mockNatal=0', {
      getItem: () => '1',
    })).toBe(false);
  });

  it('remembers mockNatal=1 and forgets mockNatal=0', () => {
    const storage = new Map<string, string>();
    const adapter = {
      getItem: (key: string) => storage.get(key) ?? null,
      setItem: (key: string, value: string) => { storage.set(key, value); },
      removeItem: (key: string) => { storage.delete(key); },
    };

    syncReferenceNatalMockFromLocation('?mockNatal=1', adapter);
    expect(storage.get(REFERENCE_NATAL_MOCK_STORAGE_KEY)).toBe('1');

    syncReferenceNatalMockFromLocation('?mockNatal=0', adapter);
    expect(storage.has(REFERENCE_NATAL_MOCK_STORAGE_KEY)).toBe(false);
  });

  it('attaches the mock map only when the switch is on', () => {
    expect(applyReferenceNatalMock(emptyOwner, true).connections).toEqual([REFERENCE_NATAL_CONNECTION]);
  });
});
