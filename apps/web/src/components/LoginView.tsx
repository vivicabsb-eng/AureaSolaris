import { useState } from 'react';
import { 
  ChevronRight, Sparkles, Star,
  Lock, ArrowRight, Eye, EyeOff
} from 'lucide-react';
import aureaSymbol from '../assets/brand/logo/aurea-symbol.svg';
import type { PrivateProfile } from '../types/private-profile';

type Profile = PrivateProfile & { passwordVerifier?: unknown };

interface LoginViewProps {
  profiles: Profile[];
  onLogin: (profileId: string, password: string, rememberAccess: boolean) => Promise<{ ok: boolean; error?: string; notice?: string }>;
  onSignUp: (name: string, password: string, rememberAccess: boolean) => Promise<{ ok: boolean; error?: string; notice?: string }>;
}

export const LoginView = ({ profiles, onLogin, onSignUp }: LoginViewProps) => {
  const [mode, setMode] = useState<'signIn' | 'signUp'>('signIn');
  const [newName, setNewName] = useState('');
  const [selectedProfile, setSelectedProfile] = useState<Profile | null>(null);
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberAccess, setRememberAccess] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const handleLogin = async () => {
    if (!selectedProfile) return;
    const result = await onLogin(selectedProfile.id, password, rememberAccess);
    setError(result.error || '');
    setNotice(result.notice || '');
  };

  const handleSignUp = async () => {
    if (!newName.trim()) return;
    const result = await onSignUp(newName, password, rememberAccess);
    setError(result.error || '');
    setNotice(result.notice || '');
  };

  return (
    <div className="fixed inset-0 z-[2000] flex items-center justify-center overflow-hidden font-sans" style={{ background: 'var(--aurea-bg)' }}>
      {/* Background Elements */}
      <div className="absolute inset-0 overflow-hidden opacity-40">
         <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full blur-[120px]" style={{ background: 'var(--aurea-gold-deep)', opacity: 0.25 }} />
         <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] rounded-full blur-[120px]" style={{ background: 'var(--aurea-gold-deep)', opacity: 0.25 }} />
         <div className="absolute inset-0" style={{ background: 'radial-gradient(circle_at_center, transparent 0%, var(--aurea-bg) 100%)' }} />
      </div>

      {/* Login Card */}
      <div className="relative w-full max-w-lg p-10 animate-in fade-in zoom-in-95 duration-700">
        
        {/* Logo/Icon */}
        <div className="flex flex-col items-center mb-12 text-center">
           <div className="relative mb-6">
              <div className="absolute inset-0 rounded-full blur-xl" style={{ background: 'var(--aurea-gold)', opacity: 0.12 }} />
              <div className="relative p-6 rounded-full shadow-lg" style={{ background: 'var(--aurea-surface)', border: '1px solid rgba(217,166,83,0.25)' }}>
                 <img src={aureaSymbol} alt="Aurea Solaris" className="w-16 h-16" />
              </div>
           </div>
           <h1 className="text-3xl font-black uppercase tracking-[0.5em] mb-2" style={{ color: 'var(--aurea-text)' }}>Aurea Solaris</h1>
            <p className="text-[10px] font-black uppercase tracking-[0.3em] italic" style={{ color: 'var(--aurea-gold)' }}>Protocolo de Identidade Ativa</p>
        </div>

        {/* Tab Switcher */}
        {!selectedProfile && (
          <div className="flex p-1 rounded-full mb-10" style={{ background: 'rgba(217,166,83,0.08)', border: '1px solid rgba(217,166,83,0.15)' }}>
            <button 
              onClick={() => { setMode('signIn'); setSelectedProfile(null); }} 
              className={`flex-1 py-3 text-[10px] font-black uppercase tracking-widest rounded-full transition-all ${mode === 'signIn' ? 'text-white shadow-md' : 'hover:opacity-80'}`}
              style={{ background: mode === 'signIn' ? 'var(--aurea-bg-deep)' : 'transparent', color: mode === 'signIn' ? 'var(--aurea-text-on-dark)' : 'var(--aurea-text-muted)' }}
            >
              Entrar
            </button>
            <button 
              onClick={() => { setMode('signUp'); setSelectedProfile(null); }} 
              className={`flex-1 py-3 text-[10px] font-black uppercase tracking-widest rounded-full transition-all ${mode === 'signUp' ? 'text-white shadow-md' : 'hover:opacity-80'}`}
              style={{ background: mode === 'signUp' ? 'var(--aurea-bg-deep)' : 'transparent', color: mode === 'signUp' ? 'var(--aurea-text-on-dark)' : 'var(--aurea-text-muted)' }}
            >
              Inscrever-se
            </button>
          </div>
        )}

        {!selectedProfile ? (
          mode === 'signIn' ? (
            <div className="space-y-6 animate-in slide-in-from-bottom-4">
               <h2 className="text-[11px] font-black uppercase tracking-[0.2em] px-2" style={{ color: 'var(--aurea-text-muted)' }}>Selecionar Identidade</h2>
               <div className="grid grid-cols-1 gap-4 max-h-[350px] overflow-y-auto no-scrollbar pr-1">
                  {profiles.map(profile => (
                    <button 
                      key={profile.id}
                      onClick={() => setSelectedProfile(profile)}
                      className="group relative flex items-center gap-4 p-6 rounded-lg transition-all text-left shadow-sm"
                      style={{ background: 'var(--aurea-surface)', border: '1px solid rgba(217,166,83,0.12)' }}
                    >
                       <div className="w-14 h-14 flex items-center justify-center rounded-lg overflow-hidden shadow-inner" style={{ background: 'var(--aurea-bg)', border: '1px solid rgba(217,166,83,0.15)' }}>
                          {profile.avatar ? (
                            <img src={profile.avatar} className="w-full h-full object-cover" alt="" />
                          ) : (
                            <Sparkles size={24} style={{ color: 'var(--aurea-gold)', opacity: 0.45 }} />
                          )}
                       </div>
                       <div className="flex-1">
                          <p className="text-[15px] font-black tracking-widest uppercase" style={{ color: 'var(--aurea-text)' }}>{profile.name}</p>
                          <p className="text-[9px] font-bold uppercase tracking-tighter" style={{ color: 'var(--aurea-gold)', opacity: 0.75 }}>Sua Identidade Ativa</p>
                       </div>
                       <ChevronRight size={18} style={{ color: 'var(--aurea-gold)', opacity: 0.35 }} />
                    </button>
                  ))}
                  {profiles.length === 0 && (
                    <div className="p-12 rounded-[2rem] text-center" style={{ background: 'rgba(11,23,34,0.5)', border: '1px dashed rgba(217,166,83,0.25)' }}>
                        <p className="text-[11px] font-black uppercase italic tracking-widest leading-relaxed" style={{ color: 'var(--aurea-text-muted)' }}>
                          Nenhuma identidade detectada.<br/>Inicie seu protocolo na aba &quot;Inscrever-se&quot;.
                        </p>
                    </div>
                  )}
               </div>
            </div>
          ) : (
            <div className="space-y-8 animate-in slide-in-from-bottom-4">
               <h2 className="text-[11px] font-black uppercase tracking-[0.2em] px-2" style={{ color: 'var(--aurea-text-muted)' }}>Iniciar Nova Jornada</h2>
               <div className="space-y-6">
                  <div>
                    <label className="text-[9px] font-black uppercase tracking-widest mb-2 block pl-1" style={{ color: 'var(--aurea-text-muted)' }}>Nome de Batismo</label>
                    <input 
                      type="text" 
                      autoFocus
                      value={newName}
                      onChange={(e) => setNewName(e.target.value)}
                      placeholder="Ex: Viviane Solaris"
                      className="w-full p-5 rounded-lg outline-none transition-all shadow-sm"
                      style={{ background: 'var(--aurea-surface)', border: '1px solid rgba(217,166,83,0.15)', color: 'var(--aurea-text)' }}
                    />
                  </div>
                  <div>
                    <label className="text-[9px] font-black uppercase tracking-widest mb-2 block pl-1" style={{ color: 'var(--aurea-text-muted)' }}>Chave de Proteção (Senha)</label>
                    <div className="relative">
                       <Lock className="absolute left-5 top-1/2 -translate-y-1/2" size={18} style={{ color: 'var(--aurea-gold)', opacity: 0.55 }} />
                       <input 
                         type={showPassword ? "text" : "password"} 
                         value={password}
                         onChange={(e) => setPassword(e.target.value)}
                         placeholder="••••••••"
                         className="w-full p-5 pl-14 rounded-lg outline-none transition-all shadow-sm"
                         style={{ background: 'var(--aurea-surface)', border: '1px solid rgba(217,166,83,0.15)', color: 'var(--aurea-text)' }}
                      />
                      <p className="mt-2 text-[9px] font-bold uppercase tracking-wide" style={{ color: 'var(--aurea-text-muted)' }}>Mínimo de 12 caracteres. A senha nunca é salva em texto aberto.</p>
                    </div>
                  </div>
                  <RememberAccess checked={rememberAccess} onChange={setRememberAccess} />
                  <button 
                    onClick={handleSignUp}
                    className="w-full py-6 rounded-[2rem] font-black uppercase text-[11px] tracking-[0.4em] shadow-xl flex items-center justify-center gap-3 transition-all"
                    style={{ background: 'var(--aurea-bg-deep)', color: 'var(--aurea-text-on-dark)', border: '1px solid rgba(217,166,83,0.25)' }}
                  >
                     Selar Identidade <ArrowRight size={16} />
                  </button>
               </div>
            </div>
          )
        ) : (
          <div className="space-y-8 animate-in slide-in-from-right-4">
             <div className="flex items-center gap-6 mb-8 p-4 rounded-[2rem]" style={{ background: 'rgba(217,166,83,0.08)', border: '1px solid rgba(217,166,83,0.15)' }}>
                <button onClick={() => setSelectedProfile(null)} className="p-3 rounded-full transition-all shadow-sm" style={{ background: 'var(--aurea-surface)', color: 'var(--aurea-gold)', border: '1px solid rgba(217,166,83,0.2)' }}>
                   <Lock size={20} />
                </button>
                <div className="flex-1">
                   <p className="text-[9px] font-black uppercase tracking-[0.3em]" style={{ color: 'var(--aurea-gold)', opacity: 0.9 }}>Autenticando</p>
                   <h2 className="text-xl font-black uppercase tracking-[0.1em]" style={{ color: 'var(--aurea-text)' }}>{selectedProfile.name}</h2>
                </div>
             </div>

             <div className="space-y-6">
                <div className="relative">
                   <label className="text-[9px] font-black uppercase tracking-widest mb-2 block pl-1" style={{ color: 'var(--aurea-text-muted)' }}>Chave de Proteção</label>
                   <div className="relative">
                      <Lock className="absolute left-5 top-1/2 -translate-y-1/2" size={18} style={{ color: 'var(--aurea-gold)', opacity: 0.55 }} />
                      <input 
                        type={showPassword ? "text" : "password"} 
                        autoFocus
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="••••••••"
                        className="w-full p-5 pl-14 rounded-lg outline-none transition-all shadow-sm"
                        style={{ background: 'var(--aurea-surface)', border: '1px solid rgba(217,166,83,0.15)', color: 'var(--aurea-text)' }}
                      />
                      <button 
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-5 top-1/2 -translate-y-1/2 transition-all"
                        style={{ color: 'var(--aurea-text-muted)' }}
                      >
                         {showPassword ? <EyeOff size={20}/> : <Eye size={20}/>}
                      </button>
                  </div>
                </div>

                <RememberAccess checked={rememberAccess} onChange={setRememberAccess} />

                <button 
                  onClick={handleLogin}
                  className="w-full py-6 rounded-[2rem] font-black uppercase text-[11px] tracking-[0.4em] shadow-xl flex items-center justify-center gap-3 transition-all"
                  style={{ background: 'var(--aurea-bg-deep)', color: 'var(--aurea-text-on-dark)', border: '1px solid rgba(217,166,83,0.25)' }}
                >
                   Acessar Dashboard <ArrowRight size={16} />
                </button>
                {error && <p role="alert" className="text-center text-sm font-semibold" style={{ color: '#EF4444' }}>{error}</p>}
                {notice && <p role="status" className="text-center text-sm font-semibold" style={{ color: 'var(--aurea-gold)' }}>{notice}</p>}
             </div>
          </div>
        )}

        {/* Footer info */}
        <div className="mt-16 text-center">
           <p className="text-[10px] font-black uppercase tracking-[0.3em] flex items-center justify-center gap-3" style={{ color: 'var(--aurea-text-muted)' }}>
              <Star size={12} style={{ color: 'var(--aurea-gold)', opacity: 0.35 }} /> Aurea Solaris v2.8 <span className="w-1 h-1 rounded-full" style={{ background: 'var(--aurea-gold)', opacity: 0.4 }} /> Local Encryption <Star size={12} style={{ color: 'var(--aurea-gold)', opacity: 0.35 }} />
           </p>
        </div>
      </div>
    </div>
  );
};

const RememberAccess = ({ checked, onChange }: { checked: boolean; onChange: (value: boolean) => void }) => (
  <label className="flex items-start gap-3 cursor-pointer rounded-lg border border-gold/10 bg-white/60 p-4 text-left">
    <input
      type="checkbox"
      checked={checked}
      onChange={(event) => onChange(event.target.checked)}
      className="mt-0.5 h-4 w-4 accent-[#b8860b]"
    />
    <span>
      <span className="block text-[10px] font-black uppercase tracking-wider text-gray-700">Manter meu acesso neste Windows</span>
      <span className="mt-1 block text-[10px] leading-relaxed text-gray-500">Não salva sua senha. Este dispositivo guardará apenas a identidade protegida pelo Windows.</span>
    </span>
  </label>
);
