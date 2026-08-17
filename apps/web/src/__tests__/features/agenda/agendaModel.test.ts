import { describe, expect, it } from 'vitest';
import {
  createEvent,
  createTask,
  deleteTask,
  getAgendaMetrics,
  getWeekDays,
  getWeekStart,
  postponeTask,
  toggleTask,
} from '../../../features/agenda/agendaModel';

describe('agendaModel', () => {
  it('creates tasks with the existing id and completion shape', () => {
    expect(createTask('Ler', 1000, 0.5)).toEqual({
      id: '1000-8',
      content: 'Ler',
      completed: false,
      is_completed: false,
    });
  });

  it('toggles both completion fields and deletes only the requested task', () => {
    const tasks = [createTask('A', 1, 0.1), createTask('B', 2, 0.2)];
    const toggled = toggleTask(tasks, tasks[0].id, true);
    expect(toggled[0]).toMatchObject({ completed: true, is_completed: true });
    expect(deleteTask(toggled, tasks[0].id)).toEqual([tasks[1]]);
  });

  it('postpones a task to tomorrow using an explicit clock', () => {
    const task = createTask('A', 1, 0.1);
    const now = new Date('2026-08-14T12:00:00.000Z');
    expect(postponeTask([task], task.id, now)[0].due).toBe('2026-08-15T12:00:00.000Z');
  });

  it('creates local events with an optional owner id', () => {
    expect(createEvent('Consulta', '2026-08-14T13:00:00.000Z', 'owner-1', 1000, 0.5)).toEqual({
      id: 'event-1000-8',
      title: 'Consulta',
      start: '2026-08-14T13:00:00.000Z',
      type: 'local',
      profileId: 'owner-1',
    });
    expect(createEvent('Consulta', 'x', undefined, 1000, 0.5)).not.toHaveProperty('profileId');
  });

  it('calculates metrics and seven Sunday-based week days', () => {
    expect(getAgendaMetrics([])).toEqual({ done: 0, pending: 0, notDone: 0 });
    expect(getAgendaMetrics([
      { id: '1', content: 'A', completed: true },
      { id: '2', content: 'B', completed: false },
    ])).toEqual({ done: 50, pending: 50, notDone: 0 });

    const weekStart = getWeekStart(new Date(2026, 7, 14, 10, 30));
    expect(weekStart.getDay()).toBe(0);
    const days = getWeekDays(weekStart);
    expect(days).toHaveLength(7);
    expect(days[0].getTime()).toBe(weekStart.getTime());
    expect(days[6].getDate()).toBe(15);
  });
});
