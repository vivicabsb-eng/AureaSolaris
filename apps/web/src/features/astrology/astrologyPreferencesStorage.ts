export interface AstrologyPreferencesStorage {
  loadHouseSystem: () => string;
  saveHouseSystem: (houseSystem: string) => void;
}

export function createBrowserAstrologyPreferencesStorage(storage: Storage = localStorage): AstrologyPreferencesStorage {
  return {
    loadHouseSystem: () => storage.getItem('aurea_house_system') || 'Regiomontanus',
    saveHouseSystem: (houseSystem) => storage.setItem('aurea_house_system', houseSystem),
  };
}
