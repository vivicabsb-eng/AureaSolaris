import { createContext, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { validatePassword } from '../../utils/auth';
import { isReferenceNatalMockEnabled, syncReferenceNatalMockFromLocation } from '../../utils/reference-natal';
import {
  buildMapSubjects,
  createConnection,
  ensureLocalOwner,
  resolveSubjectId,
  sanitizeProfiles,
  updateProfileInList,
  validateConnectionBirthData,
} from './identityModel';
import { createBrowserIdentityStorage, type IdentityStorage } from './identityStorage';
import type { AstroMapSubject, AureaProfile, ConnectionBirthData } from './types';

export interface IdentityContextValue {
  profiles: AureaProfile[];
  mapSubjects: AstroMapSubject[];
  activeProfile: AureaProfile | null;
  activeProfileId: string;
  setActiveProfileId: (id: string) => void;
  activeSubjectId: string;
  setActiveSubjectId: (id: string) => void;
  addProfile: (name: string, password: string, id?: string) => Promise<AureaProfile>;
  ensureLocalUiProfile: (ownerId: string, displayName: string) => void;
  refreshFromStorage: () => void;
  addConnection: (name: string, birthData: ConnectionBirthData) => void;
  updateProfile: (id: string, updates: Partial<AureaProfile>) => void;
}

const IdentityContext = createContext<IdentityContextValue | undefined>(undefined);

type IdentityProviderProps = {
  children: ReactNode;
  storage?: IdentityStorage;
  referenceNatalEnabled?: boolean;
};

export function IdentityProvider({ children, storage, referenceNatalEnabled }: IdentityProviderProps) {
  const [resolvedStorage] = useState<IdentityStorage>(() => storage ?? createBrowserIdentityStorage());
  const [profiles, setProfiles] = useState<AureaProfile[]>(() => {
    const loaded = resolvedStorage.loadProfiles();
    const sanitized = sanitizeProfiles(loaded);
    if (loaded.length > 0 || sanitized.length > 0) resolvedStorage.saveProfiles(sanitized);
    return sanitized;
  });
  const profilesRef = useRef(profiles);
  const [activeProfileId, setActiveProfileIdState] = useState(() => resolvedStorage.loadActiveProfileId());
  const [activeSubjectId, setActiveSubjectIdState] = useState(() => {
    const profileId = resolvedStorage.loadActiveProfileId();
    return resolveSubjectId(profiles, profileId, resolvedStorage.loadActiveSubjectId(profileId) || profileId);
  });

  const commitProfiles = (next: AureaProfile[]) => {
    profilesRef.current = next;
    setProfiles(next);
    resolvedStorage.saveProfiles(next);
  };

  const persistActiveSubject = (profileId: string, subjectId: string) => {
    setActiveSubjectIdState(subjectId);
    resolvedStorage.saveActiveSubjectId(profileId, subjectId);
  };

  useEffect(() => {
    if (activeProfileId && activeSubjectId) {
      resolvedStorage.saveActiveSubjectId(activeProfileId, activeSubjectId);
    }
  }, [activeProfileId, activeSubjectId, resolvedStorage]);

  const activeProfile = useMemo(
    () => profiles.find((profile) => profile.id === activeProfileId) || null,
    [profiles, activeProfileId],
  );
  const mapSubjects = useMemo(() => buildMapSubjects(profiles), [profiles]);

  const setActiveProfileId = (id: string) => {
    setActiveProfileIdState(id);
    resolvedStorage.saveActiveProfileId(id);
    persistActiveSubject(id, resolveSubjectId(profilesRef.current, id, ''));
  };

  const setActiveSubjectId = (id: string) => {
    const subject = buildMapSubjects(profilesRef.current)
      .find((candidate) => candidate.id === id && candidate.ownerProfileId === activeProfileId);
    if (!subject) return;
    persistActiveSubject(activeProfileId, id);
  };

  const addProfile = async (name: string, password: string, id?: string): Promise<AureaProfile> => {
    const passwordError = validatePassword(password);
    if (passwordError) throw new Error(passwordError);
    const newProfile: AureaProfile = {
      id: id || `${name.toLowerCase().replace(/\s+/g, '_')}_${Date.now()}`,
      name,
      active: true,
      connections: [],
    };
    const updated = [...profilesRef.current, newProfile];
    commitProfiles(updated);
    setActiveProfileIdState(newProfile.id);
    resolvedStorage.saveActiveProfileId(newProfile.id);
    persistActiveSubject(newProfile.id, resolveSubjectId(updated, newProfile.id, ''));
    return newProfile;
  };

  const ensureLocalUiProfile = (ownerId: string, displayName: string) => {
    syncReferenceNatalMockFromLocation();
    const mockEnabled = referenceNatalEnabled ?? isReferenceNatalMockEnabled();
    const result = ensureLocalOwner(
      profilesRef.current,
      ownerId,
      displayName,
      resolvedStorage.loadActiveSubjectId(ownerId),
      mockEnabled,
    );
    commitProfiles(result.profiles);
    setActiveProfileIdState(ownerId);
    resolvedStorage.saveActiveProfileId(ownerId);
    persistActiveSubject(ownerId, result.activeSubjectId);
  };

  const refreshFromStorage = () => {
    const sanitized = sanitizeProfiles(resolvedStorage.loadProfiles());
    commitProfiles(sanitized);
    const ownerId = resolvedStorage.loadActiveProfileId();
    setActiveProfileIdState(ownerId);
    if (ownerId) {
      persistActiveSubject(
        ownerId,
        resolveSubjectId(sanitized, ownerId, resolvedStorage.loadActiveSubjectId(ownerId)),
      );
    } else {
      setActiveSubjectIdState('');
    }
  };

  const addConnection = (name: string, birthData: ConnectionBirthData) => {
    const profile = profilesRef.current.find((candidate) => candidate.id === activeProfileId);
    if (!profile) return;
    const validation = validateConnectionBirthData(birthData);
    if (validation === 'coordinates') {
      console.warn('[IdentityContext] Conexão não salva: coordenadas de nascimento inválidas.');
      return;
    }
    if (validation === 'timezone') {
      console.warn('[IdentityContext] Conexão não salva: fuso IANA de nascimento ausente.');
      return;
    }
    const connection = createConnection(name, birthData);
    const updated = updateProfileInList(profilesRef.current, activeProfileId, {
      connections: [...(Array.isArray(profile.connections) ? profile.connections : []), connection],
    });
    commitProfiles(updated);
  };

  const updateProfile = (id: string, updates: Partial<AureaProfile>) => {
    const updated = updateProfileInList(profilesRef.current, id, updates);
    commitProfiles(updated);
    if (id === activeProfileId) {
      persistActiveSubject(activeProfileId, resolveSubjectId(updated, activeProfileId, activeSubjectId));
    }
  };

  const value: IdentityContextValue = {
    profiles,
    mapSubjects,
    activeProfile,
    activeProfileId,
    setActiveProfileId,
    activeSubjectId,
    setActiveSubjectId,
    addProfile,
    ensureLocalUiProfile,
    refreshFromStorage,
    addConnection,
    updateProfile,
  };

  return <IdentityContext.Provider value={value}>{children}</IdentityContext.Provider>;
}

export function useIdentity(): IdentityContextValue {
  const context = useContext(IdentityContext);
  if (context === undefined) throw new Error('useIdentity must be used within an IdentityProvider');
  return context;
}
