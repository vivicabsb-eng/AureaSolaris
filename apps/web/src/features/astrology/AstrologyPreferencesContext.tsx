import { createContext, useContext, useState, type ReactNode } from 'react';
import {
  createBrowserAstrologyPreferencesStorage,
  type AstrologyPreferencesStorage,
} from './astrologyPreferencesStorage';

interface AstrologyPreferencesContextValue {
  houseSystem: string;
  setHouseSystem: (houseSystem: string) => void;
}

const AstrologyPreferencesContext = createContext<AstrologyPreferencesContextValue | undefined>(undefined);

export function AstrologyPreferencesProvider({
  children,
  storage,
}: {
  children: ReactNode;
  storage?: AstrologyPreferencesStorage;
}) {
  const [resolvedStorage] = useState<AstrologyPreferencesStorage>(() => storage ?? createBrowserAstrologyPreferencesStorage());
  const [houseSystem, setHouseSystemState] = useState(() => resolvedStorage.loadHouseSystem());

  const setHouseSystem = (next: string) => {
    setHouseSystemState(next);
    resolvedStorage.saveHouseSystem(next);
  };

  return (
    <AstrologyPreferencesContext.Provider value={{ houseSystem, setHouseSystem }}>
      {children}
    </AstrologyPreferencesContext.Provider>
  );
}

export function useAstrologyPreferences(): AstrologyPreferencesContextValue {
  const context = useContext(AstrologyPreferencesContext);
  if (context === undefined) {
    throw new Error('useAstrologyPreferences must be used within an AstrologyPreferencesProvider');
  }
  return context;
}
