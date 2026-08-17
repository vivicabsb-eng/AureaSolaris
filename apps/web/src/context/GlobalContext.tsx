import { createContext, useContext, type ReactNode, useMemo } from 'react';
import { useAgenda } from '../features/agenda/AgendaContext';
import { getPlanetaryDayRegent } from '../features/astrology/planetaryRegency';
import { useHealthDocuments } from '../features/health/HealthDocumentsContext';
import { useIdentity } from '../features/identity/IdentityContext';
import { useLiveTransitData } from '../hooks/useLiveTransitData';
import type { LiveAstroData, AstroAspect, PlanetaryPosition } from '../types/astrology';

interface AstroState {
  liveData: LiveAstroData | null;
  transits: ReturnType<typeof useLiveTransitData>['transits'];
  loading: boolean;
  error: string | null;
  planetaryHour: { icon: string; name: string; time: string };
  dayRegent: { icon: string; name: string };
}

interface GlobalContextType {
  astro: AstroState;
  system: {
    status: string;
    lastSync: Date;
  };
  getAiContext: () => string;
}

const GlobalContext = createContext<GlobalContextType | undefined>(undefined);

export const GlobalProvider = ({ children }: { children: ReactNode }) => {
  const identity = useIdentity();
  const agenda = useAgenda();
  const healthDocuments = useHealthDocuments();
  // Personal transits stay unavailable until this context consumes a natal
  // calculation with a verifiable receipt, never the legacy `profile.natal`.
  const { liveData, transits, loading, error, getPlanetaryHour } = useLiveTransitData(undefined);

  const value = useMemo(() => {
    const pPager = getPlanetaryHour();
    const dRegent = getPlanetaryDayRegent(new Date());

    const getAiContext = () => {
      const pendingTasks = agenda.tasks.filter((task) => !task.completed && !task.is_completed);
      const completedTasks = agenda.tasks.filter((task) => task.completed || task.is_completed);
      const planets = liveData?.planets || {};
      const retrogradePlanets = Object.entries(planets)
        .filter(([name, value]: [string, PlanetaryPosition]) => value?.retrograde && !['ASC', 'MC', 'DSC', 'IC'].includes(name))
        .map(([key]) => key);
      const planetPositions = Object.entries(planets)
        .map(([key, value]: [string, PlanetaryPosition]) => Number.isFinite(value?.pos_in_sign) && typeof value?.sign === 'string'
          ? `${key}: ${value.pos_in_sign.toFixed(1)}° ${value.sign}`
          : null)
        .filter((position): position is string => Boolean(position))
        .join(', ');
      const skyAspects = (liveData?.aspects || []).slice(0, 5)
        .map((aspect: AstroAspect) => `${aspect.p1} ${aspect.symbol} ${aspect.p2}`)
        .join(', ') || 'Nenhum';
      const transitSummary = 'Não calculados: mapa natal certificado não disponível';

      return `
═══════════════════════════════════════════════════
CONTEXTO UNIFICADO AUREA SOLARIS
═══════════════════════════════════════════════════

--- TEMPORAL ---
Data: ${new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' })}
Hora Planetária: ${pPager.icon} ${pPager.name} (${pPager.time})
Regente do Dia: ${dRegent.icon} ${dRegent.name}

--- PERFIL ---
Nome: ${identity.activeProfile?.name || 'Não configurado'}

--- ASTROLOGIA ---
Planetas: ${planetPositions}
Aspectos no céu: ${skyAspects}
Trânsitos pessoais: ${transitSummary}
Retrogradações: ${retrogradePlanets.length > 0 ? retrogradePlanets.join(', ') : 'Nenhuma'}

--- TAREFAS ---
Pendentes: ${pendingTasks.length} | Completas: ${completedTasks.length} | Progresso: ${agenda.getMetrics().done}%
Top 3 Pendentes: ${pendingTasks.slice(0, 3).map((task) => `- ${task.content}`).join('\n') || 'Nenhuma'}

--- SAÚDE ---
Documentos: ${healthDocuments.documents.length} registrados

--- STATUS DO SISTEMA ---
Estabilidade: Alta | Agentes: Sintonizados | Conectividade: OK
`;
    };

    return {
      astro: { liveData, transits, loading, error, planetaryHour: pPager, dayRegent: dRegent },
      system: {
        status: error ? 'Astronomical engine unavailable' : loading ? 'Calculating' : 'Stable',
        lastSync: new Date(),
      },
      getAiContext,
    };
  }, [liveData, transits, loading, error, getPlanetaryHour, identity, agenda, healthDocuments.documents]);

  return <GlobalContext.Provider value={value}>{children}</GlobalContext.Provider>;
};

export const useGlobalContext = () => {
  const context = useContext(GlobalContext);
  if (context === undefined) {
    throw new Error('useGlobalContext must be used within a GlobalProvider');
  }
  return context;
};