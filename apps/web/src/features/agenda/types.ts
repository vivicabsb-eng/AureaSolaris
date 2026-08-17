export interface AureaTask {
  id: string;
  content: string;
  completed: boolean;
  is_completed?: boolean;
  profileId?: string;
  due?: string;
}

export interface AureaEvent {
  id: string;
  title: string;
  start: string;
  type?: string;
  /** Legacy browser-local event; private storage migration is tracked separately. */
  profileId?: string;
}

export interface AgendaMetrics {
  done: number;
  pending: number;
  notDone: number;
}
