import { describe, expect, it, beforeEach } from 'vitest';
import { applyTestUserUiSeed, TEST_USER_OWNER_ID } from '../../utils/test-user-ui-seed';
import { REFERENCE_NATAL_CONNECTION } from '../../utils/reference-natal';
import type { AureaProfile } from '../../context/AgendaContext';

class MemoryStorage {
  private store = new Map<string, string>();

  getItem(key: string): string | null {
    return this.store.has(key) ? this.store.get(key)! : null;
  }

  setItem(key: string, value: string): void {
    this.store.set(key, value);
  }
}

describe('applyTestUserUiSeed', () => {
  let storage: MemoryStorage;

  beforeEach(() => {
    storage = new MemoryStorage();
  });

  it('seeds profile maps, active subject, and tasks on empty storage', () => {
    applyTestUserUiSeed(TEST_USER_OWNER_ID, 'Pessoa Teste', storage);

    const profiles = JSON.parse(storage.getItem('aurea_profiles') || '[]') as AureaProfile[];
    const profile = profiles.find((item) => item.id === TEST_USER_OWNER_ID);
    expect(profile).toBeTruthy();
    expect(profile?.connections).toHaveLength(2);
    expect(profile?.connections?.map((connection: { id: string }) => connection.id)).toEqual([
      'aurea-reference-natal',
      'aurea-test-known-person',
    ]);
    expect(profile?.connections?.[0]?.birthData).toEqual(REFERENCE_NATAL_CONNECTION.birthData);
    expect(storage.getItem('aurea_active_id')).toBe(TEST_USER_OWNER_ID);
    expect(storage.getItem(`aurea_active_subject:${TEST_USER_OWNER_ID}`)).toBe('aurea-reference-natal');

    const tasks = JSON.parse(storage.getItem('aurea_tasks') || '[]');
    expect(tasks).toHaveLength(2);
    expect(storage.getItem('aurea_test_user_seed_version')).toBe('1');
  });

  it('does not duplicate connections or tasks on second apply', () => {
    applyTestUserUiSeed(TEST_USER_OWNER_ID, 'Pessoa Teste', storage);
    applyTestUserUiSeed(TEST_USER_OWNER_ID, 'Pessoa Teste', storage);

    const profiles = JSON.parse(storage.getItem('aurea_profiles') || '[]') as AureaProfile[];
    const profile = profiles.find((item) => item.id === TEST_USER_OWNER_ID);
    expect(profile?.connections).toHaveLength(2);

    const tasks = JSON.parse(storage.getItem('aurea_tasks') || '[]');
    expect(tasks).toHaveLength(2);
  });

  it('does not write fixtures for a non-test owner', () => {
    applyTestUserUiSeed('owner-1', 'Aurea Local', storage);

    expect(storage.getItem('aurea_profiles')).toBeNull();
    expect(storage.getItem('aurea_tasks')).toBeNull();
    expect(storage.getItem('aurea_test_user_seed_version')).toBeNull();
  });
});
