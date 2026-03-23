import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from './lib/AuthContext';
import { gasApi } from './api/gasClient';

// Páginas e Componentes
import Login from './pages/Login';
import Vistoria from './pages/Vistoria';
import Garageiro from './pages/GarageiroDashboard'; 
import AdminDashboard from './pages/AdminDashboard';
import HistoricoPessoal from './pages/HistoricoPessoal';
import ModalTrocaSenha from './components/ModalTrocaSenha'; 

// Ícones
import { 
  Shield, LogOut, Settings, History, Key, Loader2, AlertTriangle, ClipboardCheck, ShieldCheck
} from 'lucide-react';

// --- COMPONENTE DASHBOARD (HOME) ---
const Dashboard = ({ onNavigate, frotaCarregada, onRefresh }) => {
  const { user, logout, isAdmin, isGarageiro } = useAuth();
  const [showModalSenha, setShowModalSenha] = useState(false);
  const isOperacionalOnly = !isAdmin && !isGarageiro;

  return (
    <div className="min-h-screen bg-slate-50 animate-in fade-in duration-500">
      <nav className="bg-slate-900 text-white p-5 shadow-2xl flex justify-between items-center border-b-4 border-blue-900 sticky top-0 z-50">
        <div className="flex items-center gap-3">
          <Shield className="text-blue-400" size={24} />
          <div className="flex flex-col">
            <span className="font-black text-xs tracking-widest uppercase leading-none">1º BPM - Rondon</span>
            <span className="text-[9px] text-blue-400 font-bold uppercase tracking-tighter">PMRO - Porto Velho</span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button onClick={() => setShowModalSenha(true)} title="Alterar Senha" className="p-2 bg-slate-800 hover:bg-blue-600 rounded-xl transition-all active:scale-90 flex items-center gap-2 group">
            <Key size={20} className="text-blue-400 group-hover:text-white" />
          </button>
          <button onClick={logout} className="p-2 bg-slate-800 hover:bg-red-600 rounded-xl transition-all active:scale-90 flex items-center gap-2 group">
            <span className="hidden sm:block text-[10px] font-black uppercase pr-1 text-slate-300 group-hover:text-white">Sair</span>
            <LogOut size={20} className="text-red-400 group-hover:text-white" />
          </button>
        </div>
      </nav>

      {showModalSenha && <ModalTrocaSenha user={user} aoFechar={() => setShowModalSenha(false)} />}

      <main className="p-6 max-w-xl mx-auto space-y-6">
        <header className="text-center mb-8">
          <h2 className="text-2xl font-black text-slate-800 tracking-tight">Olá, <span className="text-blue-700">{user?.patente} {user?.nome}</span></h2>
          <div className="flex items-center justify-center mt-3">
            <button onClick={onRefresh} disabled={!frotaCarregada} className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 rounded-full shadow-sm hover:border-blue-300 transition-all active:scale-95 disabled:opacity-70">
              {frotaCarregada ? (
                <>
                  <div className="w-2.5 h-2.5 bg-green-500 rounded-full animate-pulse" />
                  <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Frota em Tempo Real</span>
                  <History size={12} className="text-slate-400" />
                </>
              ) : (
                <>
                  <Loader2 size={12} className="animate-spin text-blue-500" />
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Sincronizando...</span>
                </>
              )}
            </button>
          </div>
        </header>

        <div className="grid grid-cols-1 gap-4">
          {(!isGarageiro || isAdmin) && (
            <button onClick={() => onNavigate('vistoria')} className={`vtr-card flex flex-col items-center justify-center gap-4 transition-all hover:shadow-2xl active:scale-[0.97] bg-blue-600 text-white rounded-[2.5rem] shadow-xl border-b-8 border-blue-800 ${isOperacionalOnly ? 'p-10' : 'p-6 flex-row text-left'}`}>
              <div className="p-4 bg-white/20 rounded-2xl"><ClipboardCheck size={isOperacionalOnly ? 48 : 32} /></div>
              <div>
                <h3 className={`font-black uppercase leading-none ${isOperacionalOnly ? 'text-xl' : 'text-lg'}`}>Iniciar Vistoria</h3>
                {isOperacionalOnly && <p className="text-blue-100 text-[10px] mt-2 font-bold uppercase tracking-widest">Checklist de Saída/Entrada</p>}
              </div>
            </button>
          )}

          {(isAdmin || isGarageiro) && (
            <button onClick={() => onNavigate('garageiro')} className="vtr-card p-6 flex items-center gap-5 border-l-8 border-amber-500 bg-white rounded-[2rem] shadow-md transition-all active:scale-[0.98]">
              <div className="p-4 bg-amber-600 text-white rounded-2xl"><ShieldCheck size={32} /></div>
              <div className="text-left">
                <h3 className="font-black text-lg text-slate-800 uppercase italic leading-tight">Controle de Pátio</h3>
                <p className="text-[9px] text-slate-400 font-bold uppercase">Validar Vistorias / Chaves</p>
              </div>
            </button>
          )}

          {isAdmin && (
            <button onClick={() => onNavigate('frota')} className="vtr-card p-6 flex items-center gap-5 border-l-8 border-slate-800 bg-white rounded-[2rem] shadow-md transition-all active:scale-[0.98]">
              <div className="p-4 bg-slate-900 text-white rounded-2xl"><Settings size={32} /></div>
              <div className="text-left">
                <h3 className="font-black text-lg text-slate-800 uppercase leading-tight">Gestão de Frota</h3>
                <p className="text-[9px] text-slate-400 font-bold uppercase">Manutenção / Cadastro / Relatórios</p>
              </div>
            </button>
          )}
        </div>
      </main>
    </div>
  );
};

// --- COMPONENTE PRINCIPAL (ROOT) ---
function App() {
  const { isAuthenticated, isGarageiro, isAdmin, logout } = useAuth();
  const [view, setView] = useState('dashboard');
  const [showInactivityModal, setShowInactivityModal] = useState(false);
  const [countdown, setCountdown] = useState(60);
  
  const timerRef = useRef(null);
  const warnRef = useRef(null);

  const [dadosFrota, setDadosFrota] = useState(() => {
    const cache = localStorage.getItem("viaturas_cache");
    return cache ? JSON.parse(cache) : [];
  });
  const [carregado, setCarregado] = useState(false);

  // 1. BLOQUEIO DE REFRESH (F5) - Desloga ao tentar sair/recarregar
  useEffect(() => {
    const handleBeforeUnload = (e) => {
      if (isAuthenticated) {
        logout(); // Desloga antes da página recarregar
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [isAuthenticated, logout]);

  // 2. LÓGICA DE INATIVIDADE POR PÁGINA
  const resetInactivityTimer = useCallback(() => {
    if (!isAuthenticated) return;

    // Limpa timers existentes
    if (timerRef.current) clearTimeout(timerRef.current);
    if (warnRef.current) clearTimeout(warnRef.current);
    setShowInactivityModal(false);

    // Define tempos em milissegundos
    // Vistoria: 5min (300.000ms) | Outros: 20min (1.200.000ms)
    const limit = view === 'vistoria' ? 5 * 60 * 1000 : 20 * 60 * 1000;
    const warningTime = limit - (60 * 1000); // 1 minuto antes do fim

    // Timer para mostrar o aviso
    warnRef.current = setTimeout(() => {
      setShowInactivityModal(true);
      setCountdown(60);
    }, warningTime);

    // Timer para o logout real
    timerRef.current = setTimeout(() => {
      logout();
    }, limit);
  }, [isAuthenticated, view, logout]);

  // Monitora interações do usuário
  useEffect(() => {
    const events = ['mousedown', 'keydown', 'touchstart', 'mousemove'];
    events.forEach(event => window.addEventListener(event, resetInactivityTimer));
    
    resetInactivityTimer(); // Inicia o timer

    return () => {
      events.forEach(event => window.removeEventListener(event, resetInactivityTimer));
      if (timerRef.current) clearTimeout(timerRef.current);
      if (warnRef.current) clearTimeout(warnRef.current);
    };
  }, [resetInactivityTimer]);

  // Timer do contador visual do modal
  useEffect(() => {
    let interval;
    if (showInactivityModal && countdown > 0) {
      interval = setInterval(() => setCountdown(prev => prev - 1), 1000);
    } else if (countdown === 0) {
      logout();
    }
    return () => clearInterval(interval);
  }, [showInactivityModal, countdown, logout]);

  const sincronizarFrota = useCallback(async () => {
    setCarregado(false);
    try {
      const res = await gasApi.getViaturas();
      if (res.status === 'success') {
        setDadosFrota(res.data);
        localStorage.setItem("viaturas_cache", JSON.stringify(res.data));
      }
    } catch (error) {
      console.error("Erro na sincronização:", error);
    } finally {
      setCarregado(true);
    }
  }, []);

  useEffect(() => {
    if (isAuthenticated) sincronizarFrota();
  }, [isAuthenticated, sincronizarFrota]);

  if (!isAuthenticated) return <Login />;

  const renderView = () => {
    switch(view) {
      case 'vistoria': return <Vistoria onBack={() => setView('dashboard')} PATRIMONIO={dadosFrota} />;
      case 'frota': 
        if (isAdmin) return <AdminDashboard onBack={() => setView('dashboard')} />;
        setView('dashboard'); return null;
      case 'historico_pessoal': return <HistoricoPessoal onBack={() => setView('dashboard')} />;
      case 'garageiro': 
        if (isGarageiro || isAdmin) return <Garageiro onBack={() => setView('dashboard')} />;
        setView('dashboard'); return null;
      default: return <Dashboard onNavigate={(target) => setView(target)} frotaCarregada={carregado} onRefresh={sincronizarFrota} />;
    }
  };

  return (
    <div className="w-full min-h-screen relative">
      {renderView()}

      {/* MODAL DE AVISO DE LOGOUT */}
      {showInactivityModal && (
        <div className="fixed inset-0 z-[999] bg-slate-900/90 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-white rounded-[2rem] p-8 max-w-sm w-full text-center shadow-2xl border-4 border-amber-500 animate-in zoom-in-95">
            <div className="w-20 h-20 bg-amber-100 text-amber-600 rounded-full flex items-center justify-center mx-auto mb-6">
              <AlertTriangle size={40} />
            </div>
            <h2 className="text-xl font-black text-slate-800 uppercase tracking-tighter">Sessão Expirando</h2>
            <p className="text-slate-500 text-sm font-bold mt-2">Você será deslogado por inatividade em:</p>
            <div className="text-5xl font-black text-amber-600 my-6 tabular-nums">
              {countdown}s
            </div>
            <button 
              onClick={resetInactivityTimer}
              className="w-full bg-slate-900 text-white font-black py-4 rounded-2xl hover:bg-slate-800 transition-all uppercase tracking-widest"
            >
              Continuar Operando
            </button>
            <button 
              onClick={logout}
              className="w-full mt-3 text-slate-400 font-bold text-xs uppercase hover:text-red-500 transition-colors"
            >
              Sair agora
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
