import { describe, expect, it } from 'vitest';
import {
  buildMapSubjects,
  resolveSubjectId,
  sanitizeProfiles,
} from '../../../features/identity/identityModel';

describe('identityModel', () => {
  it('sanitizes legacy profiles without changing the persisted profile shape', () => {
    const profiles = sanitizeProfiles([
      { id: 'damiao', name: 'Damiao', active: true, connections: [] },
      { id: 'viviane', name: 'Viviane', active: true, connections: [] },
      {
        id: 'owner-1',
        name: 'Owner',
        active: true,
        password: 'legacy-secret',
        passwordVerifier: 'legacy-verifier',
        composioKey: 'legacy-key',
        connections: { id: 'broken' },
      },
    ] as never[]);

    expect(profiles).toEqual([
      { id: 'owner-1', name: 'Owner', active: true, connections: [] },
    ]);
  });

  it('keeps a valid selected connection and falls back to the profile for an invalid subject', () => {
    const profiles = [{
      id: 'profile-a',
      name: 'Perfil A',
      active: true,
      connections: [{ id: 'connection-a', name: 'Conexão A' }],
    }];

    expect(resolveSubjectId(profiles, 'profile-a', 'connection-a')).toBe('connection-a');
    expect(resolveSubjectId(profiles, 'profile-a', 'missing')).toBe('profile-a');
  });

  it('builds profile and connection map subjects with explicit owner ids', () => {
    const profiles = [{
      id: 'profile-a',
      name: 'Perfil A',
      active: true,
      connections: [{ id: 'connection-a', name: 'Conexão A' }],
    }];

    expect(buildMapSubjects(profiles)).toMatchObject([
      { id: 'profile-a', kind: 'profile', ownerProfileId: 'profile-a' },
      { id: 'connection-a', kind: 'connection', ownerProfileId: 'profile-a' },
    ]);
  });
});
