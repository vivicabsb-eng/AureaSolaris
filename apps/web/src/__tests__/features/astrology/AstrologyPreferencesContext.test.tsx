import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { AstrologyPreferencesProvider, useAstrologyPreferences } from '../../../features/astrology/AstrologyPreferencesContext';
import type { AstrologyPreferencesStorage } from '../../../features/astrology/astrologyPreferencesStorage';

function Probe() {
  const { houseSystem, setHouseSystem } = useAstrologyPreferences();
  return <button type="button" onClick={() => setHouseSystem('Placidus')}>{houseSystem}</button>;
}

describe('AstrologyPreferencesProvider', () => {
  it('defaults to Regiomontanus and persists changes through its storage adapter', () => {
    let value = '';
    const storage: AstrologyPreferencesStorage = {
      loadHouseSystem: () => value || 'Regiomontanus',
      saveHouseSystem: (next) => { value = next; },
    };
    render(<AstrologyPreferencesProvider storage={storage}><Probe /></AstrologyPreferencesProvider>);
    expect(screen.getByRole('button').textContent).toBe('Regiomontanus');
    fireEvent.click(screen.getByRole('button'));
    expect(screen.getByRole('button').textContent).toBe('Placidus');
    expect(value).toBe('Placidus');
  });
});
