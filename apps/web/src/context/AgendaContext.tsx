import type { ReactNode } from 'react';
import { executeHermesInsight, getHermesInsights } from '../app/workflows/hermesAgendaWorkflow';
import { AgendaProvider as FeatureAgendaProvider, useAgenda } from '../features/agenda/AgendaContext';
import { AstrologyPreferencesProvider, useAstrologyPreferences } from '../features/astrology/AstrologyPreferencesContext';
import {
  getPlanetaryDayRegent,
  getPlanetaryHour,
  getPlanetRegency,
} from '../features/astrology/planetaryRegency';
import { HealthDocumentsProvider, useHealthDocuments } from '../features/health/HealthDocumentsContext';
import { IdentityProvider, useIdentity } from '../features/identity/IdentityContext';

export type { AureaEvent, AureaTask } from '../features/agenda/types';
export type { AureaDocument } from '../features/health/types';
export type { AstroMapSubject, AureaProfile, ConnectionBirthData } from '../features/identity/types';

/**
 * @deprecated Compatibility provider for legacy tests/consumers during the
 * feature-state migration. New code should use feature providers via AppProviders.
 */
export function AgendaProvider({ children }: { children: ReactNode }) {
  return (
    <IdentityProvider>
      <FeatureAgendaProvider>
        <AstrologyPreferencesProvider>
          <HealthDocumentsProvider>{children}</HealthDocumentsProvider>
        </AstrologyPreferencesProvider>
      </FeatureAgendaProvider>
    </IdentityProvider>
  );
}

/**
 * @deprecated Compatibility facade only. It owns no state, persistence or
 * domain rules. New feature code must import its feature hook directly.
 */
export function useAgendaContext() {
  const identity = useIdentity();
  const agenda = useAgenda();
  const astrologyPreferences = useAstrologyPreferences();
  const healthDocuments = useHealthDocuments();

  return {
    ...identity,
    ...agenda,
    ...astrologyPreferences,
    ...healthDocuments,
    addEvent: (title: string, start: string) => agenda.addEvent(title, start, identity.activeProfileId || undefined),
    refreshTasks: async () => undefined,
    hydrateProfilesFromStorage: () => {
      identity.refreshFromStorage();
      agenda.refreshFromStorage();
    },
    executeInsight: async (insight: Parameters<typeof executeHermesInsight>[0]) => {
      await executeHermesInsight(insight, agenda, identity.activeProfileId || undefined);
    },
    getHermesInsights,
    getPlanetaryHour,
    getPlanetaryDayRegent,
    getPlanetRegency,
  };
}
