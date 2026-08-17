import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { AgendaView } from '../../components/agenda/AgendaView';

const selectedDay = new Date(2026, 7, 10, 0, 0, 0, 0);
const addEvent = vi.fn(async (title: string, startsAt: string, ownerId?: string) => {
  void title;
  void startsAt;
  void ownerId;
  return undefined;
});

vi.mock('../../features/identity/IdentityContext', () => ({
  useIdentity: () => ({
    profiles: [{ id: 'owner-1', name: 'Pessoa de teste' }],
    mapSubjects: [{ id: 'owner-1', name: 'Pessoa de teste', kind: 'profile', ownerProfileId: 'owner-1', source: { id: 'owner-1', name: 'Pessoa de teste' } }],
    activeProfileId: 'owner-1',
    activeSubjectId: 'owner-1',
    setActiveSubjectId: vi.fn(),
  }),
}));

vi.mock('../../features/agenda/AgendaContext', () => ({
  useAgenda: () => ({
    tasks: [],
    events: [],
    selectedDay,
    setSelectedDay: vi.fn(),
    weekDays: Array.from({ length: 7 }, (_, index) => new Date(2026, 7, 9 + index)),
    nextWeek: vi.fn(),
    prevWeek: vi.fn(),
    addTask: vi.fn(async () => undefined),
    deleteTask: vi.fn(async () => undefined),
    toggleTask: vi.fn(async () => undefined),
    addEvent,
    deleteEvent: vi.fn(async () => undefined),
  }),
}));

vi.mock('../../features/astrology/planetaryRegency', () => ({
  getPlanetRegency: () => ({ icon: '—', name: 'Regra não selecionada' }),
}));

describe('AgendaView', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('uses semantic controls and shows error, loading contract and success', async () => {
    render(<AgendaView />);

    expect(screen.getAllByRole('button', { name: /Selecionar \d{2}\/08\/2026/ })).toHaveLength(7);
    fireEvent.click(screen.getByRole('button', { name: '+ Novo Compromisso' }));
    fireEvent.click(screen.getByRole('button', { name: 'Confirmar' }));
    expect(screen.getByRole('status').textContent).toContain('Informe o título');

    fireEvent.change(screen.getByLabelText('Título'), { target: { value: 'Consulta' } });
    fireEvent.change(screen.getByLabelText('Horário local'), { target: { value: '14:30' } });
    fireEvent.click(screen.getByRole('button', { name: 'Confirmar' }));

    await waitFor(() => expect(addEvent).toHaveBeenCalledTimes(1));
    expect(addEvent.mock.calls[0][0]).toBe('Consulta');
    expect(addEvent.mock.calls[0][1]).toBe(new Date(2026, 7, 10, 14, 30).toISOString());
    expect(addEvent.mock.calls[0][2]).toBe('owner-1');
    expect(await screen.findByText('Compromisso criado com sucesso.')).toBeInstanceOf(HTMLElement);
    expect(screen.getByRole('button', { name: 'Concluído' })).toBeInstanceOf(HTMLElement);
  });
});