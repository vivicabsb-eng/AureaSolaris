import type { ProfileConnection } from '../../types/private-profile';
import { applyReferenceNatalMock, resolveLocalOwnerSubjectId } from '../../utils/reference-natal';
import type { AstroMapSubject, AureaProfile, ConnectionBirthData } from './types';

function asRecord(value: unknown): Record<string, unknown> | null {
  return value !== null && typeof value === 'object' ? value as Record<string, unknown> : null;
}

export function stripLegacySecrets(profile: Record<string, unknown>): AureaProfile {
  const { password, passwordVerifier, composioKey, ...safeProfile } = profile;
  void password;
  void passwordVerifier;
  void composioKey;
  return {
    ...safeProfile,
    connections: Array.isArray(profile.connections) ? profile.connections as ProfileConnection[] : [],
  } as unknown as AureaProfile;
}

export function isLegacySeedProfile(profile: AureaProfile): boolean {
  return profile.id === 'viviane' && profile.name === 'Viviane'
    && !profile.birthDate && !profile.birthTime && !profile.birthCity && !profile.natal
    && (!Array.isArray(profile.connections) || profile.connections.length === 0);
}

export function sanitizeProfiles(input: unknown[]): AureaProfile[] {
  return input.flatMap((value) => {
    const record = asRecord(value);
    if (!record) return [];
    const sanitized = stripLegacySecrets(record);
    if (sanitized.id === 'damiao' || sanitized.name === 'Damiao') return [];
    if (isLegacySeedProfile(sanitized)) return [];
    return [sanitized];
  });
}

export function resolveSubjectId(profiles: AureaProfile[], profileId: string, requestedId: string): string {
  const profile = profiles.find((candidate) => candidate.id === profileId);
  if (!profile) return '';
  const connections = Array.isArray(profile.connections) ? profile.connections : [];
  const subjectIds = [profile.id, ...connections.map((connection) => connection.id)];
  return subjectIds.includes(requestedId) ? requestedId : subjectIds[0] || '';
}

export function buildMapSubjects(profiles: AureaProfile[]): AstroMapSubject[] {
  return profiles.flatMap((profile) => [
    {
      id: profile.id,
      name: profile.name,
      kind: 'profile' as const,
      ownerProfileId: profile.id,
      source: profile,
    },
    ...(Array.isArray(profile.connections) ? profile.connections : []).map((connection) => ({
      id: connection.id,
      name: connection.name,
      kind: 'connection' as const,
      ownerProfileId: profile.id,
      source: connection,
    })),
  ]);
}

export function updateProfileInList(
  profiles: AureaProfile[],
  id: string,
  updates: Partial<AureaProfile>,
): AureaProfile[] {
  return profiles.map((profile) => profile.id === id ? { ...profile, ...updates } : profile);
}

export function validateConnectionBirthData(birthData: ConnectionBirthData): 'coordinates' | 'timezone' | null {
  if (!Number.isFinite(birthData.lat) || !Number.isFinite(birthData.lng)
    || birthData.lat < -90 || birthData.lat > 90 || birthData.lng < -180 || birthData.lng > 180) {
    return 'coordinates';
  }
  if (!birthData.timezone || (birthData.timezone !== 'UTC' && !birthData.timezone.includes('/'))) {
    return 'timezone';
  }
  return null;
}

export function createConnection(
  name: string,
  birthData: ConnectionBirthData,
  nowMs: number = Date.now(),
): ProfileConnection {
  return {
    id: `${name.toLowerCase().replace(/\s+/g, '_')}_${nowMs}`,
    name,
    birthData,
  };
}

export function ensureLocalOwner(
  profiles: AureaProfile[],
  ownerId: string,
  displayName: string,
  requestedSubjectId: string,
  referenceNatalEnabled: boolean,
): { profiles: AureaProfile[]; activeSubjectId: string } {
  const existing = profiles.find((profile) => profile.id === ownerId);
  const resolvedName = displayName || 'Aurea';
  const nextName = existing?.name?.trim() ? existing.name : resolvedName;
  const baseProfile: AureaProfile = existing
    ? { ...existing, name: nextName, active: true }
    : { id: ownerId, name: resolvedName, active: true, connections: [] };
  const nextProfile = applyReferenceNatalMock(baseProfile, referenceNatalEnabled);
  const nextProfiles = existing
    ? profiles.map((profile) => profile.id === ownerId ? nextProfile : profile)
    : [...profiles, nextProfile];
  return {
    profiles: nextProfiles,
    activeSubjectId: resolveLocalOwnerSubjectId(nextProfile, requestedSubjectId),
  };
}
