import { beforeEach, describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { AgendaProvider, useAgendaContext } from '../../context/AgendaContext';

function CompatibilityProbe() {
  const context = useAgendaContext();
  return (
    <output data-testid="compatibility-state">
      {JSON.stringify({
        profiles: context.profiles.length,
        tasks: context.tasks.length,
        events: context.events.length,
        documents: context.documents.length,
        houseSystem: context.houseSystem,
        insights: context.getHermesInsights().length,
      })}
    </output>
  );
}

describe('legacy AgendaContext compatibility facade', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('delegates legacy reads to the feature-owned providers', () => {
    localStorage.setItem('aurea_profiles', JSON.stringify([
      { id: 'profile-a', name: 'Perfil A', active: true, connections: [] },
    ]));
    localStorage.setItem('aurea_tasks', JSON.stringify([
      { id: 'task-1', content: 'Teste', completed: false },
    ]));
    localStorage.setItem('aurea_events', JSON.stringify([
      { id: 'event-1', title: 'Evento', start: '2026-08-14T12:00:00.000Z' },
    ]));
    localStorage.setItem('aurea_documents', JSON.stringify([
      { id: 'doc-1', name: 'Exame.pdf', type: 'pdf', size: '1 KB', path: '/exam' },
    ]));
    localStorage.setItem('aurea_house_system', 'Placidus');

    render(
      <AgendaProvider>
        <CompatibilityProbe />
      </AgendaProvider>,
    );

    expect(JSON.parse(screen.getByTestId('compatibility-state').textContent || '{}')).toEqual({
      profiles: 1,
      tasks: 1,
      events: 1,
      documents: 1,
      houseSystem: 'Placidus',
      insights: 0,
    });
  });
});
