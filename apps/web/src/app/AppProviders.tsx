import type { ReactNode } from 'react';
import { GlobalProvider } from '../context/GlobalContext';
import { SaudeProvider } from '../context/SaudeContext';
import { AgendaProvider } from '../features/agenda/AgendaContext';
import { AstrologyPreferencesProvider } from '../features/astrology/AstrologyPreferencesContext';
import { HealthDocumentsProvider } from '../features/health/HealthDocumentsContext';
import { IdentityProvider } from '../features/identity/IdentityContext';

export function AppProviders({ children }: { children: ReactNode }) {
  return (
    <IdentityProvider>
      <AgendaProvider>
        <AstrologyPreferencesProvider>
          <HealthDocumentsProvider>
            <SaudeProvider>
              <GlobalProvider>{children}</GlobalProvider>
            </SaudeProvider>
          </HealthDocumentsProvider>
        </AstrologyPreferencesProvider>
      </AgendaProvider>
    </IdentityProvider>
  );
}
