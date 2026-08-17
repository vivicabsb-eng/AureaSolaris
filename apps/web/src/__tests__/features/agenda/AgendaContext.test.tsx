import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { AgendaProvider, useAgenda } from '../../../features/agenda/AgendaContext';
import type { AgendaStorage } from '../../../features/agenda/agendaStorage';
import type { AureaEvent, AureaTask } from '../../../features/agenda/types';

function memoryAgendaStorage(): AgendaStorage & { tasks: AureaTask[]; events: AureaEvent[] } {
  return {
    tasks: [],
    events: [],
    loadTasks() { return structuredClone(this.tasks); },
    saveTasks(tasks) { this.tasks = structuredClone(tasks); },
    loadEvents() { return structuredClone(this.events); },
    saveEvents(events) { this.events = structuredClone(events); },
  };
}

function Probe() {
  const agenda = useAgenda();
  return (
    <div>
      <output data-testid="tasks">{agenda.tasks.length}</output>
      <output data-testid="events">{agenda.events.length}</output>
      <button type="button" onClick={() => void agenda.addTask('Nova tarefa')}>task</button>
      <button type="button" onClick={() => void agenda.addEvent('Evento', '2026-08-14T13:00:00.000Z', 'owner-1')}>event</button>
      <button type="button" onClick={agenda.refreshFromStorage}>refresh</button>
    </div>
  );
}

describe('AgendaProvider', () => {
  it('persists mutations through injected storage', async () => {
    const storage = memoryAgendaStorage();
    render(<AgendaProvider storage={storage}><Probe /></AgendaProvider>);

    fireEvent.click(screen.getByRole('button', { name: 'task' }));
    fireEvent.click(screen.getByRole('button', { name: 'event' }));

    await waitFor(() => expect(screen.getByTestId('tasks').textContent).toBe('1'));
    expect(screen.getByTestId('events').textContent).toBe('1');
    expect(storage.tasks[0]).toMatchObject({ content: 'Nova tarefa', completed: false });
    expect(storage.events[0]).toMatchObject({ title: 'Evento', profileId: 'owner-1' });
  });

  it('reloads externally seeded tasks and events', async () => {
    const storage = memoryAgendaStorage();
    render(<AgendaProvider storage={storage}><Probe /></AgendaProvider>);

    storage.tasks = [{ id: 'seed-task', content: 'Seed', completed: false }];
    storage.events = [{ id: 'seed-event', title: 'Seed', start: '2026-08-14T13:00:00.000Z' }];
    fireEvent.click(screen.getByRole('button', { name: 'refresh' }));

    await waitFor(() => expect(screen.getByTestId('tasks').textContent).toBe('1'));
    expect(screen.getByTestId('events').textContent).toBe('1');
  });
});
