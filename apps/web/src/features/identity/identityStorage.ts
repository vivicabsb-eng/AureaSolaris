import type { AureaProfile } from './types';

export interface IdentityStorage {
  loadProfiles: () => AureaProfile[];
  saveProfiles: (profiles: AureaProfile[]) => void;
  loadActiveProfileId: () => string;
  saveActiveProfileId: (id: string) => void;
  loadActiveSubjectId: (profileId: string) => string;
  saveActiveSubjectId: (profileId: string, subjectId: string) => void;
}

export function createBrowserIdentityStorage(storage: Storage = localStorage): IdentityStorage {
  return {
    loadProfiles: () => {
      const saved = storage.getItem('aurea_profiles');
      return saved ? JSON.parse(saved) as AureaProfile[] : [];
    },
    saveProfiles: (profiles) => storage.setItem('aurea_profiles', JSON.stringify(profiles)),
    loadActiveProfileId: () => storage.getItem('aurea_active_id') || '',
    saveActiveProfileId: (id) => storage.setItem('aurea_active_id', id),
    loadActiveSubjectId: (profileId) => storage.getItem(`aurea_active_subject:${profileId}`) || '',
    saveActiveSubjectId: (profileId, subjectId) => {
      const key = `aurea_active_subject:${profileId}`;
      if (subjectId) storage.setItem(key, subjectId);
      else storage.removeItem(key);
    },
  };
}
