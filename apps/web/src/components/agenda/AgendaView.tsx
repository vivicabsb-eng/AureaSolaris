import { useState } from 'react';
import {
  ChevronLeft, ChevronRight,
  Clock,
  Trash2, ListTodo
} from 'lucide-react';
import { useAgenda } from '../../features/agenda/AgendaContext';
import { getPlanetRegency } from '../../features/astrology/planetaryRegency';
import { useIdentity } from '../../features/identity/IdentityContext';
import { Card } from '../common/UIComponents';

export const AgendaView = () => {
  const {
    profiles,
    mapSubjects,
    activeProfileId,
    activeSubjectId,
    setActiveSubjectId,
  } = useIdentity();
  const {
    tasks,
    events,
    selectedDay, setSelectedDay, weekDays,
    nextWeek, prevWeek, addTask, deleteTask, toggleTask,
    addEvent, deleteEvent,
  } = useAgenda();

  const [showEventModal, setShowEventModal] = useState(false);
  const [showTaskModal, setShowTaskModal] = useState(false);
  const [modalText, setModalText] = useState('');
  const [eventTime, setEventTime] = useState('');
  const [eventAction, setEventAction] = useState<{ status: 'idle' | 'loading' | 'success' | 'error'; message?: string }>({ status: 'idle' });
  const [taskAction, setTaskAction] = useState<{ status: 'idle' | 'loading' | 'success' | 'error'; message?: string }>({ status: 'idle' });
  const availableMaps = (mapSubjects?.filter(map => map.ownerProfileId === activeProfileId) || []).length
    ? mapSubjects!.filter(map => map.ownerProfileId === activeProfileId)
    : profiles.filter(profile => profile.id === activeProfileId).map(profile => ({ id: profile.id, name: profile.name, kind: 'profile' as const, ownerProfileId: profile.id, source: profile }));
  const focusedMap = availableMaps.find(map => map.id === activeSubjectId) || availableMaps[0];

  const handleAddEvent = async () => {
    if (!modalText.trim()) {
      setEventAction({ status: 'error', message: 'Informe o título do compromisso.' });
      return;
    }
    if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(eventTime)) {
      setEventAction({ status: 'error', message: 'Informe o horário local do compromisso.' });
      return;
    }
    setEventAction({ status: 'loading', message: 'Salvando compromisso…' });
    try {
      const [hours, minutes] = eventTime.split(':').map(Number);
      const localStart = new Date(selectedDay);
      localStart.setHours(hours, minutes, 0, 0);
      await addEvent(modalText.trim(), localStart.toISOString(), activeProfileId || undefined);
      setEventAction({ status: 'success', message: 'Compromisso criado com sucesso.' });
      setModalText('');
    } catch (error) {
      setEventAction({ status: 'error', message: error instanceof Error ? error.message : 'Não foi possível criar o compromisso.' });
    }
  };

  const handleAddTask = async () => {
    if (!modalText.trim()) {
      setTaskAction({ status: 'error', message: 'Informe o texto da tarefa.' });
      return;
    }
    setTaskAction({ status: 'loading', message: 'Salvando tarefa…' });
    try {
      await addTask(modalText.trim());
      setTaskAction({ status: 'success', message: 'Tarefa criada com sucesso.' });
      setModalText('');
    } catch (error) {
      setTaskAction({ status: 'error', message: error instanceof Error ? error.message : 'Não foi possível criar a tarefa.' });
    }
  };

  const masterProfile = profiles.find(p => p.id === activeProfileId);

  return (
    <div className="space-y-8">
      {/* 1. HEADER COM PERFIL */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-[11px] font-black uppercase tracking-[0.3em] text-[var(--aurea-text)]">
            Agenda {focusedMap ? `— ${focusedMap.name}` : masterProfile ? `— ${masterProfile.name}` : ''}
          </h2>
          <p className="text-[10px] text-[var(--aurea-gold)] font-bold mt-1">
            {tasks.filter(t => t.completed || t.is_completed).length} tarefas concluídas · {tasks.filter(t => !t.completed && !t.is_completed).length} pendentes
          </p>
        </div>
        <label className="flex items-center gap-2 rounded-xl border px-3 py-2" style={{ borderColor: 'var(--aurea-line)', background: 'var(--aurea-surface)' }}>
          <span className="text-[9px] font-black uppercase tracking-widest" style={{ color: 'var(--aurea-text-muted)' }}>Mapa em foco</span>
          <select
            aria-label="Mapa em foco na agenda"
            value={focusedMap?.id || ''}
            onChange={event => setActiveSubjectId(event.target.value)}
            className="max-w-[180px] bg-transparent text-[11px] font-bold outline-none"
            style={{ color: 'var(--aurea-text)' }}
          >
            {availableMaps.map(map => <option key={map.id} value={map.id}>{map.name}</option>)}
          </select>
        </label>
      </div>

      {/* 2. CALENDAR SEMANAL */}
      <div className="rounded-2xl border p-6" style={{ background: 'var(--aurea-surface)', borderColor: 'var(--aurea-line)', boxShadow: 'var(--aurea-shadow)' }}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-[#596a76]">
            {selectedDay.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })}
          </h3>
          <div className="flex gap-1.5">
            <button type="button" aria-label="Semana anterior" onClick={prevWeek} className="p-2 hover:bg-[var(--aurea-surface)] focus-visible:outline-2 focus-visible:outline-gold rounded-lg text-gold transition-all shadow-sm" style={{ border: '1px solid rgba(217,166,83,0.15)' }}>
              <ChevronLeft size={16}/>
            </button>
            <button type="button" aria-label="Próxima semana" onClick={nextWeek} className="p-2 hover:bg-[var(--aurea-surface)] focus-visible:outline-2 focus-visible:outline-gold rounded-lg text-gold transition-all shadow-sm" style={{ border: '1px solid rgba(217,166,83,0.15)' }}>
              <ChevronRight size={16}/>
            </button>
          </div>
        </div>

        <div className="grid grid-cols-7 gap-3">
          {weekDays.map(d => {
            const isToday = d.toDateString() === new Date().toDateString();
            const isSelected = d.toDateString() === selectedDay.toDateString();
            const regency = getPlanetRegency(d);

            return (
              <button
                type="button"
                key={d.getTime()}
                onClick={() => setSelectedDay(d)}
                aria-pressed={isSelected}
                aria-label={`Selecionar ${d.toLocaleDateString('pt-BR')}`}
                className={`relative flex flex-col items-center p-3 rounded-xl transition-all border focus-visible:outline-2 focus-visible:outline-gold ${
                  isSelected
                    ? 'bg-[#0E1A25] text-white border-[#0E1A25] shadow-lg scale-[1.02]'
                    : 'bg-white text-[#1E2A33] border-[#E6DED2] hover:border-[#D9A653]'
                }`}
              >
                <span className={`text-[10px] font-black uppercase mb-1 tracking-widest ${
                  isSelected ? 'text-gold' : 'text-[#596a76]'
                }`}>
                  {d.toLocaleDateString('pt-BR', { weekday: 'short' })}
                </span>
                <span className="text-xl font-black leading-none">{d.getDate()}</span>
                <div className="mt-2 flex gap-1.5 items-center">
                  <span className={`text-[12px] ${isSelected ? 'opacity-100' : 'opacity-30'}`} title={`Regente: ${regency.icon}`}>
                    {regency.icon}
                  </span>
                </div>
                {isToday && !isSelected && (
                  <div className="absolute top-1.5 right-1.5 w-1.5 h-1.5 bg-gold rounded-full shadow-[0_0_8px_rgba(184,134,11,0.6)]" />
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* 3. GRID: COMPROMISSOS + TAREFAS */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">

        {/* COLUNA ESQUERDA: EVENTOS */}
        <Card title={`Compromissos - ${selectedDay.toLocaleDateString('pt-BR')}`} icon={<Clock size={14}/>}>
          <div className="space-y-3 mt-4">
            {events
              .filter(e => new Date(e.start).toDateString() === selectedDay.toDateString())
              .map(e => (
                <div key={e.id} className="p-4 rounded-xl flex justify-between items-center group transition-all" style={{ background: 'var(--aurea-gold-soft)', border: '1px solid rgba(169,109,45,0.18)' }}>
                  <div className="flex gap-4 items-center">
                    <div className="p-2 rounded-lg shadow-xs border bg-[var(--aurea-surface)] text-gold" style={{ borderColor: 'rgba(217,166,83,0.15)' }}>
                      <Clock size={12}/>
                    </div>
                    <div>
                      <p className="text-[12px] font-black text-[var(--aurea-text)] tracking-tight">{e.title}</p>
                      <p className="text-[10px] text-[var(--aurea-gold)] font-bold">
                        {new Date(e.start).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </div>
                  </div>
                  <button type="button" aria-label={`Excluir compromisso ${e.title}`} onClick={() => void deleteEvent(e.id)} className="p-2 text-[#596a76] hover:text-red-500 focus-visible:text-red-500 focus-visible:outline-2 focus-visible:outline-red-400 transition-all">
                    <Trash2 size={14} />
                  </button>
                </div>
              ))
            }
            {events.filter(e => new Date(e.start).toDateString() === selectedDay.toDateString()).length === 0 && (
              <p className="text-[10px] text-[#596a76] font-bold uppercase tracking-[0.3em] text-center py-8">
                Nenhum compromisso
              </p>
            )}
            <button
              onClick={() => { setModalText(''); setEventTime(''); setEventAction({ status: 'idle' }); setShowEventModal(true); }}
              className="w-full p-3 border border-dashed rounded-xl text-[10px] font-black uppercase tracking-widest text-[#A96D2D] hover:text-[#8B572A] focus-visible:outline-2 focus-visible:outline-gold transition-all" style={{ borderColor: 'rgba(169,109,45,0.3)' }}
            >
              + Novo Compromisso
            </button>
          </div>
        </Card>

        {/* COLUNA DIREITA: TAREFAS */}
        <Card title="Tarefas do Dia" icon={<ListTodo size={14}/>}>
          <div className="space-y-2 mt-4">
            {tasks.map(task => (
              <div key={task.id} className="flex items-center gap-4 p-4 panel-light hover:border-gold/30 transition-all group shadow-sm">
                <button
                  type="button"
                  aria-label={`${(task.completed || task.is_completed) ? 'Reabrir' : 'Concluir'} tarefa ${task.content}`}
                  aria-pressed={Boolean(task.completed || task.is_completed)}
                  onClick={() => void toggleTask(task.id, !(task.completed || task.is_completed))}
                  className={`w-5 h-5 rounded-md border-2 flex items-center justify-center transition-colors shrink-0 focus-visible:outline-2 focus-visible:outline-gold ${(task.completed || task.is_completed) ? 'bg-gold border-gold text-white' : 'border-gray-200 text-transparent group-hover:border-[rgba(217,166,83,0.15)]'}`}
                >
                  ✓
                </button>
                <span className={`flex-1 text-[13px] font-medium ${(task.completed || task.is_completed) ? 'line-through text-[#596a76]' : 'text-[var(--aurea-text)]'}`}>
                  {task.content}
                </span>
                <button
                  onClick={() => deleteTask(task.id)}
                  className="opacity-0 group-hover:opacity-100 text-[#596a76] hover:text-red-400 transition-all"
                >
                  <Trash2 size={12}/>
                </button>
              </div>
            ))}
            {tasks.length === 0 && (
              <p className="text-[10px] text-[#596a76] font-bold uppercase tracking-[0.3em] text-center py-8">
                Nenhuma tarefa
              </p>
            )}
            <button
              onClick={() => { setModalText(''); setTaskAction({ status: 'idle' }); setShowTaskModal(true); }}
              className="w-full p-3 border border-dashed rounded-xl text-[10px] font-black uppercase tracking-widest text-[#A96D2D] hover:text-[#8B572A] focus-visible:outline-2 focus-visible:outline-gold transition-all" style={{ borderColor: 'rgba(169,109,45,0.3)' }}
            >
              + Nova Tarefa
            </button>
          </div>
        </Card>
      </div>

      {/* MODAL: NOVO COMPROMISSO */}
      {showEventModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={() => setShowEventModal(false)}>
          <div className="bg-[var(--aurea-surface)] rounded-2xl p-6 w-96 shadow-2xl" onClick={e => e.stopPropagation()}>
            <h3 className="text-[11px] font-black uppercase tracking-[0.3em] text-[var(--aurea-text)] mb-4">Novo Compromisso</h3>
            <label htmlFor="agenda-event-title" className="text-[10px] font-bold text-[#596a76]">Título</label>
            <input
              id="agenda-event-title"
              className="w-full p-3 border rounded-xl text-[12px] font-bold outline-none focus:border-gold transition-all"
              style={{ borderColor: 'rgba(217,166,83,0.3)' }}
              placeholder="Ex: Reunião com cliente"
              value={modalText}
              disabled={eventAction.status === 'loading' || eventAction.status === 'success'}
              aria-invalid={eventAction.status === 'error'}
              onChange={e => { setModalText(e.target.value); setEventAction({ status: 'idle' }); }}
              onKeyDown={e => e.key === 'Enter' && handleAddEvent()}
              autoFocus
            />
            <label htmlFor="agenda-event-time" className="mt-3 block text-[10px] font-bold text-[#596a76]">Horário local</label>
            <input
              id="agenda-event-time"
              type="time"
              className="w-full p-3 border rounded-xl text-[12px] font-bold outline-none focus:border-gold transition-all"
              style={{ borderColor: 'rgba(217,166,83,0.3)' }}
              value={eventTime}
              disabled={eventAction.status === 'loading' || eventAction.status === 'success'}
              onChange={event => { setEventTime(event.target.value); setEventAction({ status: 'idle' }); }}
            />
            {eventAction.message && <p role="status" className={`mt-3 text-[11px] font-bold ${eventAction.status === 'error' ? 'text-red-600' : eventAction.status === 'success' ? 'text-green-700' : 'text-gold'}`}>{eventAction.message}</p>}
            <div className="flex gap-3 mt-4">
              <button
                onClick={() => setShowEventModal(false)}
                disabled={eventAction.status === 'loading'}
                className="flex-1 py-3 text-[#596a76] font-black uppercase text-[10px] tracking-[0.3em] hover:text-gray-600 transition-all"
              >
                Cancelar
              </button>
              <button
                onClick={eventAction.status === 'success' ? () => setShowEventModal(false) : handleAddEvent}
                disabled={eventAction.status === 'loading'}
                className="flex-1 py-3 bg-[#0E1A25] text-white rounded-xl font-black uppercase text-[10px] tracking-[0.2em] hover:bg-gold transition-all shadow-lg flex items-center justify-center gap-3 px-6"
              >
                {eventAction.status === 'loading' ? 'Salvando…' : eventAction.status === 'success' ? 'Concluído' : 'Confirmar'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: NOVA TAREFA */}
      {showTaskModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={() => setShowTaskModal(false)}>
          <div className="bg-[var(--aurea-surface)] rounded-2xl p-6 w-96 shadow-2xl" onClick={e => e.stopPropagation()}>
            <h3 className="text-[11px] font-black uppercase tracking-[0.3em] text-[var(--aurea-text)] mb-4">Nova Tarefa</h3>
            <label htmlFor="agenda-task-title" className="text-[10px] font-bold text-[#596a76]">Tarefa</label>
            <input
              id="agenda-task-title"
              className="w-full p-3 border rounded-xl text-[12px] font-bold outline-none focus:border-gold transition-all"
              style={{ borderColor: 'rgba(217,166,83,0.3)' }}
              placeholder="Ex: Estudar mapas astrais"
              value={modalText}
              disabled={taskAction.status === 'loading' || taskAction.status === 'success'}
              aria-invalid={taskAction.status === 'error'}
              onChange={e => { setModalText(e.target.value); setTaskAction({ status: 'idle' }); }}
              onKeyDown={e => e.key === 'Enter' && handleAddTask()}
              autoFocus
            />
            {taskAction.message && <p role="status" className={`mt-3 text-[11px] font-bold ${taskAction.status === 'error' ? 'text-red-600' : taskAction.status === 'success' ? 'text-green-700' : 'text-gold'}`}>{taskAction.message}</p>}
            <div className="flex gap-3 mt-4">
              <button
                onClick={() => setShowTaskModal(false)}
                disabled={taskAction.status === 'loading'}
                className="flex-1 py-3 text-[#596a76] font-black uppercase text-[10px] tracking-[0.3em] hover:text-gray-600 transition-all"
              >
                Cancelar
              </button>
              <button
                onClick={taskAction.status === 'success' ? () => setShowTaskModal(false) : handleAddTask}
                disabled={taskAction.status === 'loading'}
                className="flex-1 py-3 bg-[#0E1A25] text-white rounded-xl font-black uppercase text-[10px] tracking-[0.2em] hover:bg-gold transition-all shadow-lg flex items-center justify-center gap-3 px-6"
              >
                {taskAction.status === 'loading' ? 'Salvando…' : taskAction.status === 'success' ? 'Concluído' : 'Confirmar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AgendaView;