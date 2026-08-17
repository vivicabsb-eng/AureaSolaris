import { createContext, useContext, useMemo, useRef, useState, type ReactNode } from 'react';
import {
  createEvent,
  createTask,
  deleteEvent as deleteEventFromList,
  deleteTask as deleteTaskFromList,
  getAgendaMetrics,
  getWeekDays,
  getWeekStart,
  postponeTask as postponeTaskInList,
  shiftWeek,
  toggleTask as toggleTaskInList,
} from './agendaModel';
import { createBrowserAgendaStorage, type AgendaStorage } from './agendaStorage';
import type { AgendaMetrics, AureaEvent, AureaTask } from './types';

export interface AgendaContextValue {
  tasks: AureaTask[];
  events: AureaEvent[];
  selectedDay: Date;
  setSelectedDay: (date: Date) => void;
  weekStart: Date;
  weekDays: Date[];
  nextWeek: () => void;
  prevWeek: () => void;
  addTask: (content: string) => Promise<void>;
  deleteTask: (id: string) => Promise<void>;
  toggleTask: (id: string, completed: boolean) => Promise<void>;
  postponeTask: (id: string) => Promise<void>;
  addEvent: (title: string, start: string, ownerId?: string) => Promise<void>;
  deleteEvent: (id: string) => Promise<void>;
  getMetrics: () => AgendaMetrics;
  refreshFromStorage: () => void;
}

const AgendaContext = createContext<AgendaContextValue | undefined>(undefined);

type AgendaProviderProps = {
  children: ReactNode;
  storage?: AgendaStorage;
};

export function AgendaProvider({ children, storage }: AgendaProviderProps) {
  const [resolvedStorage] = useState<AgendaStorage>(() => storage ?? createBrowserAgendaStorage());
  const [tasks, setTasks] = useState<AureaTask[]>(() => resolvedStorage.loadTasks());
  const [events, setEvents] = useState<AureaEvent[]>(() => resolvedStorage.loadEvents());
  const tasksRef = useRef(tasks);
  const eventsRef = useRef(events);
  const [selectedDay, setSelectedDay] = useState(new Date());
  const [weekStart, setWeekStart] = useState(() => getWeekStart());

  const commitTasks = (next: AureaTask[]) => {
    tasksRef.current = next;
    setTasks(next);
    resolvedStorage.saveTasks(next);
  };
  const commitEvents = (next: AureaEvent[]) => {
    eventsRef.current = next;
    setEvents(next);
    resolvedStorage.saveEvents(next);
  };

  const addTask = async (content: string) => commitTasks([...tasksRef.current, createTask(content)]);
  const deleteTask = async (id: string) => commitTasks(deleteTaskFromList(tasksRef.current, id));
  const toggleTask = async (id: string, completed: boolean) => commitTasks(toggleTaskInList(tasksRef.current, id, completed));
  const postponeTask = async (id: string) => commitTasks(postponeTaskInList(tasksRef.current, id));
  const addEvent = async (title: string, start: string, ownerId?: string) => {
    commitEvents([...eventsRef.current, createEvent(title, start, ownerId)]);
  };
  const deleteEvent = async (id: string) => commitEvents(deleteEventFromList(eventsRef.current, id));
  const refreshFromStorage = () => {
    const nextTasks = resolvedStorage.loadTasks();
    const nextEvents = resolvedStorage.loadEvents();
    tasksRef.current = nextTasks;
    eventsRef.current = nextEvents;
    setTasks(nextTasks);
    setEvents(nextEvents);
  };

  const weekDays = useMemo(() => getWeekDays(weekStart), [weekStart]);
  const value: AgendaContextValue = {
    tasks,
    events,
    selectedDay,
    setSelectedDay,
    weekStart,
    weekDays,
    nextWeek: () => setWeekStart((current) => shiftWeek(current, 7)),
    prevWeek: () => setWeekStart((current) => shiftWeek(current, -7)),
    addTask,
    deleteTask,
    toggleTask,
    postponeTask,
    addEvent,
    deleteEvent,
    getMetrics: () => getAgendaMetrics(tasks),
    refreshFromStorage,
  };

  return <AgendaContext.Provider value={value}>{children}</AgendaContext.Provider>;
}

export function useAgenda(): AgendaContextValue {
  const context = useContext(AgendaContext);
  if (context === undefined) throw new Error('useAgenda must be used within an AgendaProvider');
  return context;
}
