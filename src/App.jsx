import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from './lib/AuthContext';
import { gasApi } from './api/gasClient';
import Login from './pages/Login';
import Vistoria from './pages/Vistoria';
import Garageiro from './pages/GarageiroDashboard'; 
import AdminDashboard from './pages/AdminDashboard';
import HistoricoPessoal from './pages/HistoricoPessoal';
import ModalTrocaSenha from './components/ModalTrocaSenha'; 
import { 
  ClipboardCheck, 
  LogOut, 
  Shield, 
  ShieldCheck, 
  Settings, 
  History, 
  Key,
  Loader2 
} from 'lucide-react';

// --- COMPONENTE DASHBOARD COM REFRESH ---
const Dashboard = ({ onNavigate, frotaCarregada, onRefresh }) => {
  const { user, logout, isAdmin, isGarageiro } = useAuth();
  const [showModalSenha, setShowModalSenha] = useState(false);
  const isOperacionalOnly = !isAdmin && !isGarageiro;

  return (
    <div className="min-h-screen bg-slate-50">
      <nav className="bg-slate-900 text-white p-5 shadow-2xl flex justify-between items-center border-b-4 border-blue-900 sticky top-0 z-50">
        <div className="flex items-center gap-3">
          <Shield className="text-blue-400" size={24} />
          <div className="flex flex-col">
            <span className="font-black text-xs tracking-widest uppercase leading-none">1º BPM - Rondon</span>
            <span className="text-[9px] text-blue-400 font-bold uppercase tracking-tighter">PMRO - Porto Velho</span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button onClick={() => setShowModalSenha(true)} className="p-2 bg-slate-800 hover:bg-blue-600 rounded-xl transition-all active:scale-90 flex items-center gap-2 group">
            <Key size={20} className="text-blue-400 group-hover:text-white" />
          </button>
          <button onClick={logout} className="p-2 bg-slate-800 hover:bg-red-600 rounded-xl transition-all active:scale-90 flex items-center gap-2 group">
            <span className="hidden sm:block text-[10px] font-black uppercase pr-1">Sair</span>
            <LogOut size={20} />
          </button>
        </div>
      </nav>

      {showModalSenha && <ModalTrocaSenha user={user} aoFechar={() => setShowModalSenha(false)} />}

      <main className="p-6 max-w-xl mx-auto space-y-6">
        <header className="text-center mb-8">
          <h2 className="text-2xl font-black text-slate-800 tracking-tight">
            Olá, <span className="text-blue-700">{user?.patente} {user?.nome}</span>
          </h2>
          
          {/* INDICADOR DE STATUS E BOTÃO REFRESH */}
          <div className="flex items-center justify-center mt-3">
            <button 
              onClick={onRefresh}
              disabled={!frotaCarregada}
              className="flex items-center gap-2 px-3 py-1.5 bg-white border border-slate-200 rounded-full shadow-sm hover:border-blue-300 transition-all active:scale-95 disabled:opacity-70"
            >
              {frotaCarregada ? (
                <>
                  <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                  <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Frota Atualizada</span>
                  <History size={12} className="text-slate-400" />
                </>
              ) : (
                <>
                  <Loader2 size={12} className="animate-spin text-blue-500" />
                  <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Sincronizando...</span>
                </>
              )}
            </button>
          </div>
        </header>

        <div className="grid grid-cols-1 gap-4">
          {(!isGarageiro || isAdmin) && (
            <button 
              onClick={() => onNavigate('vistoria')}
              className={`vtr-card flex flex-col items-center justify-center gap-4 transition-all hover:shadow-2xl active:scale-[0.97] bg-blue-600 text-white rounded-[2.5rem] shadow-xl border-b-8 border-blue-800 ${
                isOperacionalOnly ? 'p-10' : 'p-6 flex-row text-left'
              }`}
            >
              <div className="p-4 bg-white/20 rounded-2xl">
                <ClipboardCheck size={isOperacionalOnly ? 48 : 32} />
              </div>
              <div>
                <h3 className={`font-black uppercase leading-none ${isOperacionalOnly ? 'text-xl' : 'text-lg'}`}>
                  Nova Vistoria
                </h3>
              </div>
            </button>
          )}

          {isAdmin && (
            <button onClick={() => onNavigate('frota')} className="vtr-card p-6 flex items-center gap-5 border-l-8 border-indigo-600 bg-white rounded-[2rem] shadow-md transition-all active:scale-[0.98]">
              <div className="p-4 bg-indigo-600 text-white rounded-2xl"><Settings size={32} /></div>
              <div className="text-left"><h3 className="font-black text-lg text-slate-800 uppercase">Painel de Comando</h3></div>
            </button>
          )}

          {(isAdmin || isGarageiro) && (
            <button onClick={() => onNavigate('garageiro')} className="vtr-card p-6 flex items-center gap-5 border-l-8 border-amber-500 bg-white rounded-[2rem] shadow-md transition-all active:scale-[0.98]">
              <div className="p-4 bg-amber-600 text-white rounded-2xl"><ShieldCheck size={32} /></div>
              <div className="text-left"><h3 className="font-black text-lg text-slate-800 uppercase italic">Controle de Pátio</h3></div>
            </button>
          )}
        </div>
      </main>
    </div>
  );
};

// --- COMPONENTE PRINCIPAL APP ---
function App() {
  const { isAuthenticated, isGarageiro, isAdmin } = useAuth();
  const [view, setView] = useState('dashboard');
  const [dadosFrota, setDadosFrota] = useState([]);
  const [carregado, setCarregado] = useState(false);

  // FUNÇÃO ÚNICA DE CARREGAMENTO (PODE SER CHAMADA NO REFRESH OU NO USEEFFECT)
  const sincronizarFrota = useCallback(async () => {
    setCarregado(false);
    try {
      const res = await gasApi.getViaturas();
      if (res.status === 'success') {
        setDadosFrota(res.data);
        console.log("Frota atualizada com sucesso.");
      }
    } catch (error) {
      console.error("Erro na sincronização:", error);
    } finally {
      setCarregado(true);
    }
  }, []);

  useEffect(() => {
    if (isAuthenticated && dadosFrota.length === 0) {
      sincronizarFrota();
    }
  }, [isAuthenticated, sincronizarFrota, dadosFrota.length]);

  if (!isAuthenticated) return <Login />;

  const renderView = () => {
    switch(view) {
      case 'vistoria': 
        return <Vistoria onBack={() => setView('dashboard')} frotaInicial={dadosFrota} />;
      
      case 'frota': 
        if (isAdmin) return <AdminDashboard onBack={() => setView('dashboard')} />;
        setView('dashboard'); return null;

      case 'historico_pessoal':
        return <HistoricoPessoal onBack={() => setView('dashboard')} />;
      
      case 'garageiro': 
        if (isGarageiro || isAdmin) return <Garageiro onBack={() => setView('dashboard')} />;
        setView('dashboard'); return null;

      default: 
        return (
          <Dashboard 
            onNavigate={(target) => setView(target)} 
            frotaCarregada={carregado} 
            onRefresh={sincronizarFrota} 
          />
        );
    }
  };

  return renderView();
}

export default App;
