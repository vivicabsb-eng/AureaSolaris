import type { AgendaMetrics, AureaEvent, AureaTask } from './types';

function randomSuffix(random: number): string {
  return random.toString(16).slice(2);
}

export function createTask(content: string, nowMs: number = Date.now(), random: number = Math.random()): AureaTask {
  return {
    id: `${nowMs}-${randomSuffix(random)}`,
    content,
    completed: false,
    is_completed: false,
  };
}

export function deleteTask(tasks: AureaTask[], id: string): AureaTask[] {
  return tasks.filter((task) => task.id !== id);
}

export function toggleTask(tasks: AureaTask[], id: string, completed: boolean): AureaTask[] {
  return tasks.map((task) => task.id === id ? { ...task, completed, is_completed: completed } : task);
}

export function postponeTask(tasks: AureaTask[], id: string, now: Date = new Date()): AureaTask[] {
  const tomorrow = new Date(now);
  tomorrow.setDate(tomorrow.getDate() + 1);
  return tasks.map((task) => task.id === id ? { ...task, due: tomorrow.toISOString() } : task);
}

export function createEvent(
  title: string,
  start: string,
  ownerId?: string,
  nowMs: number = Date.now(),
  random: number = Math.random(),
): AureaEvent {
  const event: AureaEvent = {
    id: `event-${nowMs}-${randomSuffix(random)}`,
    title,
    start,
    type: 'local',
  };
  if (ownerId) event.profileId = ownerId;
  return event;
}

export function deleteEvent(events: AureaEvent[], id: string): AureaEvent[] {
  return events.filter((event) => event.id !== id);
}

export function getAgendaMetrics(tasks: AureaTask[]): AgendaMetrics {
  if (tasks.length === 0) return { done: 0, pending: 0, notDone: 0 };
  const doneCount = tasks.filter((task) => task.completed || task.is_completed).length;
  return {
    done: Math.round((doneCount / tasks.length) * 100),
    pending: Math.round(((tasks.length - doneCount) / tasks.length) * 100),
    notDone: 0,
  };
}

export function getWeekStart(date: Date = new Date()): Date {
  const start = new Date(date);
  start.setDate(start.getDate() - start.getDay());
  return start;
}

export function getWeekDays(weekStart: Date): Date[] {
  return Array.from({ length: 7 }, (_, index) => {
    const day = new Date(weekStart);
    day.setDate(day.getDate() + index);
    return day;
  });
}

export function shiftWeek(weekStart: Date, days: number): Date {
  const next = new Date(weekStart);
  next.setDate(next.getDate() + days);
  return next;
}
