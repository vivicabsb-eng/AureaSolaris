import type { PrivateProfile, ProfileConnection } from '../../types/private-profile';

export type AureaProfile = PrivateProfile;

export interface AstroMapSubject {
  id: string;
  name: string;
  kind: 'profile' | 'connection';
  ownerProfileId: string;
  source: AureaProfile | ProfileConnection;
}

export interface ConnectionBirthData {
  date: string;
  time: string;
  location: string;
  lat: number;
  lng: number;
  timezone: string;
}
