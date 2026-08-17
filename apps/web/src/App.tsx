import { lazy, Suspense, useEffect, useState } from 'react';
import { Edit3, Star, Activity, Calendar, User, PanelLeftOpen, PanelLeftClose, MessageCircle, FileText } from 'lucide-react';
import "./styles.css";

// Contexts
import { useGlobalContext } from './context/GlobalContext.tsx';
import { useAgenda } from './features/agenda/AgendaContext';
import { useIdentity } from './features/identity/IdentityContext';

// Components
import { NavItem } from './components/common/UIComponents';
import { PageLoadingFallback } from './components/common/PageLoadingFallback';
import { LoginView } from './components/LoginView';
import { ProfileEditor } from './components/ProfileEditor';
import { HermesChat } from './components/HermesChat';
import { openInitialAccess, safeInvoke, type InitialAccess } from './utils/tauri';
import { LOCAL_API_URL } from './utils/api';
import { applyTestUserUiSeed, TEST_USER_OWNER_ID } from './utils/test-user-ui-seed';
import type { CadernoIntent } from './components/MesaCriacao';

const AstrologiaPage = lazy(() => import('./components/AstrologiaBoard').then(m => ({ default: m.AstrologiaPage })));
const SaudeView = lazy(() => import('./components/SaudeView').then(m => ({ default: m.SaudeView })));
const AgendaView = lazy(() => import('./components/agenda/AgendaView').then(m => ({ default: m.AgendaView })));
const MesaCriacao = lazy(() => import('./components/MesaCriacao').then(m => ({ default: m.MesaCriacao })));
const MemoriasView = lazy(() => import('./components/MemoriasView').then(m => ({ default: m.MemoriasView })));
const DiarioView = lazy(() => import('./components/DiarioView').then(m => ({ default: m.DiarioView })));

// --- ESTILOS GLOBAIS ---
const globalStyles = `
  @import url('https://fonts.googleapis.com/css2?family=Cinzel:wght@400;500;600;700;800&family=Inter:wght@300;400;500;600;700&display=swap');
  .font-sans { font-family: var(--font-body); }
  .font-display { font-family: var(--font-display); }

  .layout-grid { display: grid; height: 100vh; width: 100vw; overflow: hidden; background: var(--aurea-navy); gap: 16px; padding: 16px; transition: grid-template-columns 0.4s cubic-bezier(0.4, 0, 0.2, 1); }
  .main-area { border-radius: 16px; overflow: hidden; display: flex; flex-direction: column; background-color: var(--aurea-bg); background-image: radial-gradient(circle at 92% 88%, transparent 0 96px, rgba(217,166,83,.10) 97px 98px, transparent 99px 145px, rgba(217,166,83,.06) 146px 147px, transparent 148px), radial-gradient(circle at 92% 88%, rgba(217,166,83,.10) 0 2px, transparent 3px); position: relative; }

  .text-gold { color: var(--aurea-gold); }
  .bg-gold { background-color: var(--aurea-gold); }

  .section-title {
    font-family: var(--font-display);
    font-size: 10px;
    text-transform: uppercase;
    letter-spacing: 4px;
    color: var(--aurea-gold);
    border-bottom: 1px solid var(--aurea-line);
    padding-bottom: 8px;
    margin-bottom: 15px;
  }
`;

const PlanetaryInfo = () => {
  const { astro } = useGlobalContext();
  return (
    <div className="flex items-center gap-2 flex-nowrap">
      {/* Moon Phase */}
      <div title={astro.error || 'Valor astronômico recebido do motor'} className="flex items-center gap-1.5 bg-mystic-bg border border-gold/20 px-2 py-1 rounded-sm">
        <span className="text-gold text-[10px]">{astro.liveData?.moon_phase?.icon || '—'}</span>
        <span className="text-[10px] font-bold uppercase tracking-wider text-gold">{astro.loading ? 'calculando' : astro.liveData?.moon_phase?.phase || 'indisponível'}</span>
      </div>

      {/* Regent Pill */}
      <div title="Regra tradicional baseada no dia da semana; não é um valor astronômico calculado." className="flex items-center gap-2 bg-white border border-gray-100 px-2 py-1 rounded-sm">
        <span className="text-gold text-[10px]">{astro.dayRegent.icon}</span>
        <span className="text-[9px] font-bold uppercase text-gray-400 tracking-wider">Regra do dia: {astro.dayRegent.name}</span>
      </div>

      {/* Planetary Hour */}
      <div title={astro.error || 'Valor astronômico recebido do motor'} className="flex items-center gap-1.5 bg-[#171c31] text-gold px-2 py-1 rounded-sm border border-gold/30">
        <span className="text-[10px] opacity-80">{astro.planetaryHour.icon}</span>
        <span className="text-[10px] font-bold text-white">{astro.loading ? '...' : astro.planetaryHour.time}</span>
      </div>
    </div>
  );
};

function AccessStatusPanel({
  title,
  message,
  retry,
}: {
  title: string;
  message: string;
  retry?: () => void;
}) {
  return (
    <div
      className="fixed inset-0 z-[2000] flex items-center justify-center font-sans"
      style={{ background: 'var(--aurea-bg)' }}
      role={retry ? 'alert' : 'status'}
    >
      <div className="max-w-md p-10 text-center space-y-4">
        <h1 className="text-lg font-black uppercase tracking-[0.2em]" style={{ color: 'var(--aurea-text)' }}>{title}</h1>
        <p className="text-sm leading-relaxed" style={{ color: 'var(--aurea-text-muted)' }}>{message}</p>
        {retry && (
          <button type="button" onClick={retry} className="aurea-button-primary px-8 py-3 font-black uppercase text-[10px] tracking-[0.2em]">
            Tentar novamente
          </button>
        )}
      </div>
    </div>
  );
}

export default function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isRestoringAccess, setIsRestoringAccess] = useState(true);
  const [access, setAccess] = useState<InitialAccess | null>(null);
  const [bootAttempt, setBootAttempt] = useState(0);
  const [currentPage, setCurrentPage] = useState('astrologia');
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [cadernoIntent, setCadernoIntent] = useState<CadernoIntent | null>(null);

  const identity = useIdentity();
  const agenda = useAgenda();
  const masterProfile = identity.activeProfile;

  const isMesa = currentPage === 'mesa-criacao';
  const pageTitles: Record<string, string> = {
    astrologia: 'Astrologia',
    saude: 'Saúde & Vitalidade',
    agenda: 'Agenda Preditiva',
    memorias: 'Memórias',
    diario: 'Histórico & Notas',
    'mesa-criacao': 'Caderno Vivo',
  };

  const openCaderno = (intent: CadernoIntent) => {
    setCadernoIntent(intent);
    setCurrentPage('mesa-criacao');
  };

  useEffect(() => {
    let active = true;
    const restoreAccess = async () => {
      setIsRestoringAccess(true);
      const result = await openInitialAccess();
      if (!active) return;
      setAccess(result);
      if (result.kind === 'local-owner') {
        identity.ensureLocalUiProfile(result.ownerId, result.displayName);
        try {
          const healthResponse = await fetch(`${LOCAL_API_URL}/health`);
          if (healthResponse.ok) {
            const health = await healthResponse.json() as { test_user?: boolean };
            if (health.test_user === true && result.ownerId === TEST_USER_OWNER_ID) {
              applyTestUserUiSeed(result.ownerId, result.displayName);
              identity.refreshFromStorage();
              agenda.refreshFromStorage();
            }
          }
        } catch {
          // Test-user UI seed is optional; normal local-owner boot continues.
        }
        setIsAuthenticated(true);
      } else {
        setIsAuthenticated(false);
      }
      setIsRestoringAccess(false);
    };
    void restoreAccess();
    return () => { active = false; };
    // Retry is explicit via bootAttempt. Do not re-run when feature identity changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bootAttempt]);

  const handleLogout = async () => {
    await safeInvoke('private_session_close');
    await safeInvoke('remembered_owner_clear');
    localStorage.removeItem('aurea_active_id');
    identity.setActiveProfileId('');
    setIsAuthenticated(false);
    setIsProfileOpen(false);
  };

  useEffect(() => {
    const handleOpen = () => setIsChatOpen(true);
    const handleOpenCaderno = (event: Event) => {
      const intent = (event as CustomEvent<CadernoIntent>).detail;
      if (!intent || !['browse', 'create-study', 'open-study'].includes(intent.type)) return;
      setCadernoIntent(intent);
      setCurrentPage('mesa-criacao');
    };
    window.addEventListener('open-hermes-chat', handleOpen);
    window.addEventListener('open-caderno-vivo', handleOpenCaderno);
    return () => {
      window.removeEventListener('open-hermes-chat', handleOpen);
      window.removeEventListener('open-caderno-vivo', handleOpenCaderno);
    };
  }, []);

  const renderPage = () => {
    switch (currentPage) {
      case 'astrologia': return <AstrologiaPage onOpenCaderno={openCaderno} />;
      case 'saude': return <SaudeView />;
      case 'agenda': return <AgendaView />;
      case 'mesa-criacao': return <MesaCriacao intent={cadernoIntent} onIntentHandled={() => setCadernoIntent(null)} />;
      case 'memorias': return <MemoriasView />;
      case 'diario': return (
        <DiarioView
          onOpenStudy={(boardId, nodeId) => openCaderno({ type: 'open-study', boardId, nodeId })}
        />
      );
      default: return <AstrologiaPage onOpenCaderno={openCaderno} />;
    }
  };

  const pageContent = (
    <Suspense fallback={<PageLoadingFallback />}>
      {renderPage()}
    </Suspense>
  );

  if (isRestoringAccess || !access) {
    return <div className="fixed inset-0 bg-[#FCF9F1]" aria-label="Restaurando acesso" />;
  }

  if (access.kind === 'setup-required') {
    return <AccessStatusPanel title="Configuração necessária" message={access.message} />;
  }

  if (access.kind === 'runtime-failure') {
    return (
      <AccessStatusPanel
        title="Não foi possível iniciar"
        message={access.message}
        retry={() => setBootAttempt((attempt) => attempt + 1)}
      />
    );
  }

  if (access.kind === 'login-required' && !isAuthenticated) {
    return (
      <LoginView 
        profiles={identity.profiles} 
        onLogin={async (id, password, rememberAccess) => {
          const profile = identity.profiles.find(candidate => candidate.id === id);
          if (!profile) return { ok: false, error: 'Perfil não encontrado.' };
          const openedOwner = await safeInvoke<string>('private_session_open', {
            ownerId: id,
            loginName: profile.name,
            password,
          });
          if (openedOwner !== id) return { ok: false, error: 'Não foi possível abrir sua sessão privada neste computador.' };
          identity.setActiveProfileId(id);
          localStorage.setItem('aurea_active_id', id);
          let notice: string | undefined;
          await safeInvoke('remembered_owner_clear');
          if (rememberAccess) notice = 'Por segurança, será necessário confirmar a senha ao reabrir o aplicativo.';
          setIsAuthenticated(true);
          return { ok: true, notice };
        }}
        onSignUp={async (name, password, rememberAccess) => {
          try {
            const accountId = crypto.randomUUID();
            const openedOwner = await safeInvoke<string>('private_account_register', {
              ownerId: accountId,
              displayName: name,
              loginName: name,
              password,
            });
            if (openedOwner !== accountId) return { ok: false, error: 'Não foi possível criar o perfil privado neste computador.' };
            await identity.addProfile(name, password, accountId);
            let notice: string | undefined;
            await safeInvoke('remembered_owner_clear');
            if (rememberAccess) notice = 'Por segurança, será necessário confirmar a senha ao reabrir o aplicativo.';
            setIsAuthenticated(true);
            return { ok: true, notice };
          } catch (error) {
            return { ok: false, error: error instanceof Error ? error.message : 'Não foi possível criar o perfil.' };
          }
        }}
      />
    );
  }

  return (
    <div className="layout-grid font-sans overflow-hidden" 
      style={{ gridTemplateColumns: `${isSidebarCollapsed ? "80px" : "260px"} 1fr` }}>
      <style>{globalStyles}</style>
      
      {/* SIDEBAR */}
      <aside className="rounded-[1.5rem] border border-white/10 shadow-xl shrink-0 z-30 flex flex-col relative overflow-hidden transition-all duration-300 cosmic-border" style={{ background: 'var(--aurea-navy)', color: 'var(--aurea-text-on-dark)' }}>
        <div className="flex items-center gap-4 p-8 pb-4 shrink-0">
          <button type="button" aria-label={isSidebarCollapsed ? 'Expandir menu lateral' : 'Recolher menu lateral'} aria-expanded={!isSidebarCollapsed} className="p-1 hover:rotate-12 focus-visible:outline-2 focus-visible:outline-gold rounded transition-all shrink-0" onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}>
            {isSidebarCollapsed ? <PanelLeftOpen size={24} className="text-gold"/> : <PanelLeftClose size={24} className="text-gold"/>}
          </button>
          <svg width="28" height="28" viewBox="0 0 130 130" fill="none">
            <circle cx="65" cy="65" r="18" stroke="var(--color-gold)" strokeWidth="1.5"/>
            <circle cx="65" cy="65" r="3" fill="var(--color-gold)"/>
            <line x1="65" y1="6" x2="65" y2="20" stroke="var(--color-gold)" strokeWidth="1.5" strokeLinecap="round"/>
            <line x1="65" y1="110" x2="65" y2="124" stroke="var(--color-gold)" strokeWidth="1.5" strokeLinecap="round"/>
            <line x1="6" y1="65" x2="20" y2="65" stroke="var(--color-gold)" strokeWidth="1.5" strokeLinecap="round"/>
            <line x1="110" y1="65" x2="124" y2="65" stroke="var(--color-gold)" strokeWidth="1.5" strokeLinecap="round"/>
          </svg>
          {!isSidebarCollapsed && <h1 className="text-[12px] font-black tracking-[0.2em] text-[var(--color-gold)] uppercase">Aurea Solaris</h1>}
        </div>
        
        <nav className="flex-1 space-y-1.5 px-4 overflow-y-auto no-scrollbar pb-6 pt-4">
          <NavItem icon={<Edit3 size={18} />} label="Caderno Vivo" active={currentPage === 'mesa-criacao'} onClick={() => { setCadernoIntent(null); setCurrentPage('mesa-criacao'); }} collapsed={isSidebarCollapsed} />
          <NavItem icon={<Star size={18} />} label="Astrologia" active={currentPage === 'astrologia'} onClick={() => setCurrentPage('astrologia')} collapsed={isSidebarCollapsed} />
          <NavItem icon={<Activity size={18} />} label="Saúde & Vitalidade" active={currentPage === 'saude'} onClick={() => setCurrentPage('saude')} collapsed={isSidebarCollapsed} />
          <NavItem icon={<Calendar size={18} />} label="Agenda Preditiva" active={currentPage === 'agenda'} onClick={() => setCurrentPage('agenda')} collapsed={isSidebarCollapsed} />
          <NavItem icon={<FileText size={18} />} label="Memórias" active={currentPage === 'memorias'} onClick={() => setCurrentPage('memorias')} collapsed={isSidebarCollapsed} />
          <NavItem icon={<Edit3 size={18} />} label="Histórico & Notas" active={currentPage === 'diario'} onClick={() => setCurrentPage('diario')} collapsed={isSidebarCollapsed} />
        </nav>

        <div className="p-4 pt-2 border-t border-white/10 shrink-0">
          <button onClick={() => setIsProfileOpen(true)} className="w-full flex items-center gap-4 p-4 rounded-2xl border border-white/10 transition-all group shadow-sm" style={{ background: 'rgba(255,255,255,0.06)' }}>
            <div className="w-10 h-10 rounded-full border-2 shadow-md flex items-center justify-center shrink-0" style={{ borderColor: 'var(--aurea-gold)', background: 'var(--aurea-navy-2)', color: 'var(--aurea-gold-light)' }}><User size={16} /></div>
            {!isSidebarCollapsed && <div className="text-left overflow-hidden"><p className="text-[12px] font-bold uppercase truncate text-[var(--aurea-text-on-dark)] leading-none">{masterProfile?.name || 'Perfil indisponível'}</p></div>}
          </button>
        </div>
      </aside>

      {/* CONTEÚDO PRINCIPAL */}
      <main className="main-area cosmic-border">
        {!isMesa && currentPage !== 'astrologia' && (
          <header className="aurea-page-header px-6 py-3 flex justify-between items-center glass-panel shrink-0 z-20">
            <h2 className="aurea-page-title text-sm uppercase truncate mr-3">{pageTitles[currentPage] || currentPage.replace('-', ' ')}</h2>
            <PlanetaryInfo />
          </header>
        )}
        <div className={`flex-1 relative overflow-hidden ${isMesa ? '' : currentPage === 'astrologia' ? 'flex flex-col px-6 pt-6' : 'px-6 pt-8 overflow-y-auto no-scrollbar pb-32'}`}>
          {currentPage === 'astrologia' ? (
            <div className="flex-1 h-full flex flex-col overflow-hidden">
              {pageContent}
            </div>
          ) : (
            pageContent
          )}
        </div>
      </main>

      {/* HERMES CHAT PANEL */}
      <HermesChat isOpen={isChatOpen} onClose={() => setIsChatOpen(false)} />
      
      {/* CHAT FAB BUTTON */}
      {!isChatOpen && (
        <button
          onClick={() => setIsChatOpen(true)}
          className="fixed bottom-6 right-6 z-50 flex h-12 w-12 items-center justify-center rounded-full border-2 border-gold/30 bg-[#171c31] text-gold shadow-xl transition-all hover:scale-110"
          aria-label="Abrir conversa com Hermes"
          title="Perguntar ao Hermes"
        >
          <MessageCircle size={21} />
        </button>
      )}

      {isProfileOpen && masterProfile && (
        <ProfileEditor
          profile={masterProfile}
          showLogout={access.kind === 'login-required'}
          onSave={(updates) => {
            identity.updateProfile(masterProfile.id, updates);
            setIsProfileOpen(false);
          }}
          onClose={() => setIsProfileOpen(false)}
          onLogout={() => { void handleLogout(); }}
        />
      )}
    </div>
  );
}