import { describe, expect, it, vi } from 'vitest';
import { executeHermesInsight, getHermesInsights } from '../../app/workflows/hermesAgendaWorkflow';

describe('hermesAgendaWorkflow', () => {
  it.each(['move', 'opportunity'])('%s routes to a task only', async (type) => {
    const addTask = vi.fn(async () => undefined);
    const addEvent = vi.fn(async () => undefined);
    await executeHermesInsight({ type, suggestion: 'Faça isso' }, { addTask, addEvent }, 'owner-1');
    expect(addTask).toHaveBeenCalledOnce();
    expect(addTask).toHaveBeenCalledWith('Faça isso');
    expect(addEvent).not.toHaveBeenCalled();
  });

  it('routes other insights to an event with injected time and owner id', async () => {
    const addTask = vi.fn(async () => undefined);
    const addEvent = vi.fn(async () => undefined);
    const now = () => new Date('2026-08-14T12:00:00.000Z');
    await executeHermesInsight({ type: 'note', content: 'Observe' }, { addTask, addEvent }, 'owner-1', now);
    expect(addEvent).toHaveBeenCalledWith('Observe', '2026-08-14T12:00:00.000Z', 'owner-1');
    expect(addTask).not.toHaveBeenCalled();
  });

  it('preserves the empty text fallback and unsupported insight list', async () => {
    const addTask = vi.fn(async () => undefined);
    const addEvent = vi.fn(async () => undefined);
    await executeHermesInsight({ type: 'move' }, { addTask, addEvent });
    expect(addTask).toHaveBeenCalledWith('');
    expect(getHermesInsights()).toEqual([]);
  });
});
