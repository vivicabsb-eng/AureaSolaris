import type { PrivateProfile, ProfileConnection } from '../types/private-profile';
import { readConfirmedBirthInput } from './confirmedBirthInput';
import referenceNatalFixture from '../fixtures/reference-natal.json';

export const REFERENCE_NATAL_CONNECTION: ProfileConnection = {
  id: referenceNatalFixture.id,
  name: referenceNatalFixture.name,
  birthData: { ...referenceNatalFixture.birthData },
};

const REFERENCE_NAME = REFERENCE_NATAL_CONNECTION.name.trim().toLowerCase();

export function isReferenceNatalConnection(connection: Pick<ProfileConnection, 'id' | 'name'>): boolean {
  const id = connection.id ?? '';
  const name = (connection.name ?? '').trim().toLowerCase();
  return id === REFERENCE_NATAL_CONNECTION.id
    || name === REFERENCE_NAME
    || /^mapa_de_referencia_\d+$/.test(id);
}

function cloneReferenceNatalConnection(overrides: Partial<ProfileConnection> = {}): ProfileConnection {
  return {
    ...REFERENCE_NATAL_CONNECTION,
    ...overrides,
    birthData: { ...REFERENCE_NATAL_CONNECTION.birthData },
  };
}

export function withReferenceNatalConnection(profile: PrivateProfile): PrivateProfile {
  const connections = Array.isArray(profile.connections) ? profile.connections : [];
  const existingIndex = connections.findIndex(isReferenceNatalConnection);
  if (existingIndex >= 0) {
    const existing = connections[existingIndex];
    if (readConfirmedBirthInput(existing)) {
      return { ...profile, connections };
    }
    const restored = cloneReferenceNatalConnection({
      id: existing.id,
      name: existing.name || REFERENCE_NATAL_CONNECTION.name,
    });
    const nextConnections = connections.slice();
    nextConnections[existingIndex] = restored;
    return { ...profile, connections: nextConnections };
  }
  return {
    ...profile,
    connections: [...connections, cloneReferenceNatalConnection()],
  };
}

export const REFERENCE_NATAL_MOCK_STORAGE_KEY = 'aurea_mock_natal';

type MockFlagStorage = {
  getItem: (key: string) => string | null;
  setItem?: (key: string, value: string) => void;
  removeItem?: (key: string) => void;
};

function defaultSearch(): string {
  return typeof window === 'undefined' ? '' : window.location.search;
}

function defaultStorage(): MockFlagStorage | null {
  return typeof localStorage === 'undefined' ? null : localStorage;
}

export function isReferenceNatalMockEnabled(
  search: string = defaultSearch(),
  storage: MockFlagStorage | null = defaultStorage(),
): boolean {
  const param = new URLSearchParams(search).get('mockNatal');
  if (param === '0') return false;
  if (param === '1') return true;
  return storage?.getItem(REFERENCE_NATAL_MOCK_STORAGE_KEY) === '1';
}

export function syncReferenceNatalMockFromLocation(
  search: string = defaultSearch(),
  storage: MockFlagStorage | null = defaultStorage(),
): void {
  if (!storage?.setItem || !storage.removeItem) return;
  const param = new URLSearchParams(search).get('mockNatal');
  if (param === '1') storage.setItem(REFERENCE_NATAL_MOCK_STORAGE_KEY, '1');
  if (param === '0') storage.removeItem(REFERENCE_NATAL_MOCK_STORAGE_KEY);
}

export function applyReferenceNatalMock(
  profile: PrivateProfile,
  enabled: boolean = isReferenceNatalMockEnabled(),
): PrivateProfile {
  return enabled ? withReferenceNatalConnection(profile) : profile;
}

export function resolveLocalOwnerSubjectId(profile: PrivateProfile, requestedId: string): string {
  const connections = Array.isArray(profile.connections) ? profile.connections : [];
  const subjectIds = [profile.id, ...connections.map((connection) => connection.id)];
  if (requestedId && requestedId !== profile.id && subjectIds.includes(requestedId)) {
    return requestedId;
  }
  if (readConfirmedBirthInput(profile)) {
    return subjectIds.includes(requestedId) ? requestedId : profile.id;
  }
  const reference = connections.find(isReferenceNatalConnection);
  return reference?.id ?? profile.id;
}
