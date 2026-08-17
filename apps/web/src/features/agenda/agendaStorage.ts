import type { AureaEvent, AureaTask } from './types';

export interface AgendaStorage {
  loadTasks: () => AureaTask[];
  saveTasks: (tasks: AureaTask[]) => void;
  loadEvents: () => AureaEvent[];
  saveEvents: (events: AureaEvent[]) => void;
}

export function createBrowserAgendaStorage(storage: Storage = localStorage): AgendaStorage {
  return {
    loadTasks: () => {
      const saved = storage.getItem('aurea_tasks');
      return saved ? JSON.parse(saved) as AureaTask[] : [];
    },
    saveTasks: (tasks) => storage.setItem('aurea_tasks', JSON.stringify(tasks)),
    loadEvents: () => {
      const saved = storage.getItem('aurea_events');
      return saved ? JSON.parse(saved) as AureaEvent[] : [];
    },
    saveEvents: (events) => storage.setItem('aurea_events', JSON.stringify(events)),
  };
}
