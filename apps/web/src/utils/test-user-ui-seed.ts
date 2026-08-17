import testUserUiFixture from '../fixtures/test-user-ui.json';
import type { AureaEvent, AureaTask } from '../features/agenda/types';
import type { AureaProfile } from '../features/identity/types';
import type { ProfileConnection } from '../types/private-profile';

export const TEST_USER_OWNER_ID = 'aurea-test';
export const TEST_USER_UI_SEED_VERSION = testUserUiFixture.version;
export const TEST_USER_UI_SEED_STORAGE_KEY = 'aurea_test_user_seed_version';

type StorageLike = Pick<Storage, 'getItem' | 'setItem'>;

function readProfiles(storage: StorageLike): AureaProfile[] {
  const raw = storage.getItem('aurea_profiles');
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw) as AureaProfile[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function readJsonArray<T>(storage: StorageLike, key: string): T[] {
  const raw = storage.getItem(key);
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw) as T[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function ensureMaps(connections: ProfileConnection[]): ProfileConnection[] {
  const next = [...connections];
  for (const map of testUserUiFixture.maps) {
    if (!next.some((connection) => connection.id === map.id)) {
      next.push({
        id: map.id,
        name: map.name,
        birthData: { ...map.birthData },
      });
    }
  }
  return next;
}

export function applyTestUserUiSeed(
  ownerId: string,
  displayName: string,
  storage: StorageLike = localStorage,
): void {
  if (ownerId !== TEST_USER_OWNER_ID) return;
  if (storage.getItem(TEST_USER_UI_SEED_STORAGE_KEY) === TEST_USER_UI_SEED_VERSION) return;

  const profiles = readProfiles(storage);
  const existing = profiles.find((profile) => profile.id === ownerId);
  const nextProfile: AureaProfile = existing
    ? {
        ...existing,
        name: existing.name?.trim() ? existing.name : displayName,
        active: true,
        connections: ensureMaps(Array.isArray(existing.connections) ? existing.connections : []),
      }
    : {
        id: ownerId,
        name: displayName,
        active: true,
        connections: ensureMaps([]),
      };

  const updatedProfiles = existing
    ? profiles.map((profile) => (profile.id === ownerId ? nextProfile : profile))
    : [...profiles, nextProfile];

  storage.setItem('aurea_profiles', JSON.stringify(updatedProfiles));
  storage.setItem('aurea_active_id', ownerId);
  storage.setItem(`aurea_active_subject:${ownerId}`, 'aurea-reference-natal');

  if (readJsonArray<AureaTask>(storage, 'aurea_tasks').length === 0) {
    storage.setItem('aurea_tasks', JSON.stringify(testUserUiFixture.tasks));
  }

  if (readJsonArray<AureaEvent>(storage, 'aurea_events').length === 0) {
    const events = testUserUiFixture.events.map((event) => ({ ...event, profileId: ownerId }));
    storage.setItem('aurea_events', JSON.stringify(events));
  }

  storage.setItem(TEST_USER_UI_SEED_STORAGE_KEY, TEST_USER_UI_SEED_VERSION);
}
