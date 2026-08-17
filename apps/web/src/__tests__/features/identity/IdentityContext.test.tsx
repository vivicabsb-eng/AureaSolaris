import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';
import { IdentityProvider, useIdentity } from '../../../features/identity/IdentityContext';
import type { IdentityStorage } from '../../../features/identity/identityStorage';
import type { AureaProfile } from '../../../features/identity/types';
import { REFERENCE_NATAL_CONNECTION } from '../../../utils/reference-natal';

type IdentityStorageState = {
  profiles: AureaProfile[];
  activeProfileId: string;
  subjects: Record<string, string>;
};

function memoryIdentityStorage(seed: {
  profiles: AureaProfile[];
  activeProfileId?: string;
  subjects?: Record<string, string>;
}): IdentityStorage & { state: IdentityStorageState } {
  const state: IdentityStorageState = {
    profiles: structuredClone(seed.profiles),
    activeProfileId: seed.activeProfileId ?? '',
    subjects: { ...(seed.subjects ?? {}) },
  };
  return {
    state,
    loadProfiles: () => structuredClone(state.profiles),
    saveProfiles: (profiles) => { state.profiles = structuredClone(profiles); },
    loadActiveProfileId: () => state.activeProfileId,
    saveActiveProfileId: (id) => { state.activeProfileId = id; },
    loadActiveSubjectId: (profileId) => state.subjects[profileId] ?? '',
    saveActiveSubjectId: (profileId, subjectId) => { state.subjects[profileId] = subjectId; },
  };
}

function Probe() {
  const identity = useIdentity();
  return (
    <div>
      <output data-testid="profile">{identity.activeProfileId}</output>
      <output data-testid="subject">{identity.activeSubjectId}</output>
      <output data-testid="profiles">{JSON.stringify(identity.profiles)}</output>
      <button type="button" onClick={() => identity.setActiveProfileId('profile-b')}>switch-b</button>
      <button type="button" onClick={() => identity.setActiveProfileId('profile-a')}>switch-a</button>
      <button type="button" onClick={() => identity.updateProfile('profile-a', { connections: [] })}>remove-a</button>
      <button type="button" onClick={() => identity.ensureLocalUiProfile('profile-a', 'Account name')}>ensure-a</button>
      <button type="button" onClick={() => identity.ensureLocalUiProfile('owner-1', 'Aurea Local')}>ensure-owner</button>
    </div>
  );
}

describe('IdentityProvider', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('keeps a valid saved connection selected on initial load', () => {
    const storage = memoryIdentityStorage({
      profiles: [{
        id: 'profile-a',
        name: 'Perfil A',
        active: true,
        connections: [{ id: 'connection-a', name: 'Conexão A' }],
      }],
      activeProfileId: 'profile-a',
      subjects: { 'profile-a': 'connection-a' },
    });

    render(<IdentityProvider storage={storage} referenceNatalEnabled={false}><Probe /></IdentityProvider>);

    expect(screen.getByTestId('profile').textContent).toBe('profile-a');
    expect(screen.getByTestId('subject').textContent).toBe('connection-a');
    expect(storage.state.subjects['profile-a']).toBe('connection-a');
  });

  it('persists the resolved fallback for an invalid initial subject', async () => {
    const storage = memoryIdentityStorage({
      profiles: [{ id: 'profile-a', name: 'Perfil A', active: true, connections: [] }],
      activeProfileId: 'profile-a',
      subjects: { 'profile-a': 'missing' },
    });

    render(<IdentityProvider storage={storage} referenceNatalEnabled={false}><Probe /></IdentityProvider>);

    expect(screen.getByTestId('subject').textContent).toBe('profile-a');
    await waitFor(() => expect(storage.state.subjects['profile-a']).toBe('profile-a'));
  });

  it('sanitizes malformed legacy connections without crashing', () => {
    const malformedProfile = {
      id: 'profile-a',
      name: 'Perfil A',
      active: true,
      connections: { id: 'legacy-connection' },
    } as unknown as AureaProfile;
    const storage = memoryIdentityStorage({
      profiles: [malformedProfile],
      activeProfileId: 'profile-a',
    });

    render(<IdentityProvider storage={storage} referenceNatalEnabled={false}><Probe /></IdentityProvider>);

    const profiles = JSON.parse(screen.getByTestId('profiles').textContent || '[]') as AureaProfile[];
    expect(profiles[0].connections).toEqual([]);
    expect(screen.getByTestId('subject').textContent).toBe('profile-a');
    expect(storage.state.profiles[0].connections).toEqual([]);
  });

  it('switches profile and subject together without restoring a previous connection', async () => {
    const storage = memoryIdentityStorage({
      profiles: [
        { id: 'profile-a', name: 'Perfil A', active: true, connections: [{ id: 'connection-a', name: 'A' }] },
        { id: 'profile-b', name: 'Perfil B', active: true, connections: [{ id: 'connection-b', name: 'B' }] },
      ],
      activeProfileId: 'profile-a',
      subjects: { 'profile-a': 'connection-a', 'profile-b': 'connection-b' },
    });

    render(<IdentityProvider storage={storage} referenceNatalEnabled={false}><Probe /></IdentityProvider>);
    expect(screen.getByTestId('subject').textContent).toBe('connection-a');

    fireEvent.click(screen.getByRole('button', { name: 'switch-b' }));
    await waitFor(() => expect(screen.getByTestId('profile').textContent).toBe('profile-b'));
    expect(screen.getByTestId('subject').textContent).toBe('profile-b');
    expect(storage.state.subjects['profile-b']).toBe('profile-b');

    fireEvent.click(screen.getByRole('button', { name: 'switch-a' }));
    await waitFor(() => expect(screen.getByTestId('profile').textContent).toBe('profile-a'));
    expect(screen.getByTestId('subject').textContent).toBe('profile-a');
    expect(storage.state.subjects['profile-a']).toBe('profile-a');
  });

  it('falls back to the active profile when its selected connection is removed', async () => {
    const storage = memoryIdentityStorage({
      profiles: [{
        id: 'profile-a',
        name: 'Perfil A',
        active: true,
        connections: [{ id: 'connection-a', name: 'Conexão A' }],
      }],
      activeProfileId: 'profile-a',
      subjects: { 'profile-a': 'connection-a' },
    });

    render(<IdentityProvider storage={storage} referenceNatalEnabled={false}><Probe /></IdentityProvider>);
    fireEvent.click(screen.getByRole('button', { name: 'remove-a' }));

    await waitFor(() => expect(screen.getByTestId('subject').textContent).toBe('profile-a'));
    expect(storage.state.subjects['profile-a']).toBe('profile-a');
  });

  it('creates exactly one missing local owner and activates owner and subject', () => {
    const storage = memoryIdentityStorage({ profiles: [] });

    render(<IdentityProvider storage={storage} referenceNatalEnabled={false}><Probe /></IdentityProvider>);
    fireEvent.click(screen.getByRole('button', { name: 'ensure-owner' }));
    fireEvent.click(screen.getByRole('button', { name: 'ensure-owner' }));

    expect(storage.state.profiles.filter((profile) => profile.id === 'owner-1')).toEqual([
      { id: 'owner-1', name: 'Aurea Local', active: true, connections: [] },
    ]);
    expect(screen.getByTestId('profile').textContent).toBe('owner-1');
    expect(screen.getByTestId('subject').textContent).toBe('owner-1');
    expect(storage.state.activeProfileId).toBe('owner-1');
    expect(storage.state.subjects['owner-1']).toBe('owner-1');
  });

  it('ensures an existing local owner idempotently while preserving identity data', () => {
    const storage = memoryIdentityStorage({
      profiles: [{
        id: 'profile-a',
        name: 'Existing name',
        active: false,
        birthDate: '1990-01-15',
        birthTime: '08:30',
        connections: [{ id: 'connection-a', name: 'A' }],
      }],
      activeProfileId: 'profile-a',
    });

    render(<IdentityProvider storage={storage} referenceNatalEnabled={false}><Probe /></IdentityProvider>);
    fireEvent.click(screen.getByRole('button', { name: 'ensure-a' }));
    fireEvent.click(screen.getByRole('button', { name: 'ensure-a' }));

    const profiles = JSON.parse(screen.getByTestId('profiles').textContent || '[]') as AureaProfile[];
    expect(profiles).toHaveLength(1);
    expect(profiles[0]).toMatchObject({
      id: 'profile-a',
      name: 'Existing name',
      active: true,
      birthDate: '1990-01-15',
      birthTime: '08:30',
      connections: [{ id: 'connection-a', name: 'A' }],
    });
  });

  it('seeds and focuses the reference natal for an owner without natal data when enabled', () => {
    const storage = memoryIdentityStorage({ profiles: [] });

    render(<IdentityProvider storage={storage} referenceNatalEnabled><Probe /></IdentityProvider>);
    fireEvent.click(screen.getByRole('button', { name: 'ensure-owner' }));

    const owner = storage.state.profiles.find((profile) => profile.id === 'owner-1');
    expect(owner?.connections).toEqual([REFERENCE_NATAL_CONNECTION]);
    expect(screen.getByTestId('subject').textContent).toBe(REFERENCE_NATAL_CONNECTION.id);
    expect(storage.state.subjects['owner-1']).toBe(REFERENCE_NATAL_CONNECTION.id);
  });

  it('does not overwrite personal natal data or duplicate an existing reference map', () => {
    const storage = memoryIdentityStorage({
      profiles: [{
        id: 'profile-a',
        name: 'Existing name',
        active: true,
        birthDate: '1990-01-15',
        birthTime: '08:30',
        connections: [structuredClone(REFERENCE_NATAL_CONNECTION)],
      }],
      activeProfileId: 'profile-a',
      subjects: { 'profile-a': REFERENCE_NATAL_CONNECTION.id },
    });

    render(<IdentityProvider storage={storage} referenceNatalEnabled><Probe /></IdentityProvider>);
    fireEvent.click(screen.getByRole('button', { name: 'ensure-a' }));

    const owner = storage.state.profiles[0];
    expect(owner.birthDate).toBe('1990-01-15');
    expect(owner.birthTime).toBe('08:30');
    expect(owner.connections?.filter((connection) => connection.id === REFERENCE_NATAL_CONNECTION.id)).toHaveLength(1);
    expect(screen.getByTestId('subject').textContent).toBe(REFERENCE_NATAL_CONNECTION.id);
  });
});
