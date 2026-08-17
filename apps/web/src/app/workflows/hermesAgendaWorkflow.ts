import type { HermesInsight } from '../../types/private-profile';

export interface HermesAgendaActions {
  addTask: (content: string) => Promise<void>;
  addEvent: (title: string, start: string, ownerId?: string) => Promise<void>;
}

export async function executeHermesInsight(
  insight: HermesInsight,
  actions: HermesAgendaActions,
  ownerId?: string,
  now: () => Date = () => new Date(),
): Promise<void> {
  const text = insight.suggestion ?? insight.content ?? '';
  if (insight.type === 'move' || insight.type === 'opportunity') {
    await actions.addTask(text);
    return;
  }
  await actions.addEvent(text, now().toISOString(), ownerId);
}

export function getHermesInsights(transits?: unknown[]): HermesInsight[] {
  void transits;
  // Do not publish interpretations before they can carry rule, source and
  // a visible "Hermes inference" label in the certified vertical.
  return [];
}
