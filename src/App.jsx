import React, { useState, useEffect, useCallback } from 'react';
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
  ClipboardCheck, 
  LogOut, 
  Shield, 
  ShieldCheck, 
  Settings, 
  History, 
  Key,
  Loader2 
} from 'lucide-react';

// --- COMPONENTE DASHBOARD (HOME) ---
const Dashboard = ({ onNavigate, frotaCarregada, onRefresh }) => {
  const { user, logout, isAdmin, isGarageiro } = useAuth();
  const [showModalSenha, setShowModalSenha] = useState(false);
  
  // Define se o usuário é apenas operacional (Soldado/Cabo/Sargento em viatura)
  const isOperacionalOnly = !isAdmin && !isGarageiro;

  return (
    <div className="min-h-screen bg-slate-50 animate-in fade-in duration-500">
      {/* NAVBAR TÁTICA */}
      <nav className="bg-slate-900 text-white p-5 shadow-2xl flex justify-between items-center border-b-4 border-blue-900 sticky top-0 z-50">
        <div className="flex items-center gap-3">
          <Shield className="text-blue-400" size={24} />
          <div className="flex flex-col">
            <span className="font-black text-xs tracking-widest uppercase leading-none">1º BPM - Rondon</span>
            <span className="text-[9px] text-blue-400 font-bold uppercase tracking-tighter">PMRO - Porto Velho</span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* BOTÃO TROCAR SENHA */}
          <button 
            onClick={() => setShowModalSenha(true)} 
            title="Alterar Senha"
            className="p-2 bg-slate-800 hover:bg-blue-600 rounded-xl transition-all active:scale-90 flex items-center gap-2 group"
          >
            <Key size={20} className="text-blue-400 group-hover:text-white" />
          </button>
          
          {/* BOTÃO SAIR */}
          <button 
            onClick={logout} 
            className="p-2 bg-slate-800 hover:bg-red-600 rounded-xl transition-all active:scale-90 flex items-center gap-2 group"
          >
            <span className="hidden sm:block text-[10px] font-black uppercase pr-1 text-slate-300 group-hover:text-white">Sair</span>
            <LogOut size={20} className="text-red-400 group-hover:text-white" />
          </button>
        </div>
      </nav>

      {/* MODAL DE SEGURANÇA */}
      {showModalSenha && (
        <ModalTrocaSenha 
          user={user} 
          aoFechar={() => setShowModalSenha(false)} 
        />
      )}

      <main className="p-6 max-w-xl mx-auto space-y-6">
        {/* HEADER DE BOAS-VINDAS */}
        <header className="text-center mb-8">
          <h2 className="text-2xl font-black text-slate-800 tracking-tight">
            Olá, <span className="text-blue-700">{user?.patente} {user?.nome}</span>
          </h2>
          
          {/* INDICADOR DE SINCRONIZAÇÃO */}
          <div className="flex items-center justify-center mt-3">
            <button 
              onClick={onRefresh}
              disabled={!frotaCarregada}
              className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 rounded-full shadow-sm hover:border-blue-300 transition-all active:scale-95 disabled:opacity-70"
            >
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

        {/* GRID DE BOTÕES DE AÇÃO */}
        <div className="grid grid-cols-1 gap-4">
          
          {/* BOTÃO NOVA VISTORIA (Visível para Operacional e Admin) */}
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
                  Iniciar Vistoria
                </h3>
                {isOperacionalOnly && <p className="text-blue-100 text-[10px] mt-2 font-bold uppercase tracking-widest">Checklist de Saída/Entrada</p>}
              </div>
            </button>
          )}

          {/* BOTÃO CONTROLE DE PÁTIO (Garageiro e Admin) */}
          {(isAdmin || isGarageiro) && (
            <button 
              onClick={() => onNavigate('garageiro')} 
              className="vtr-card p-6 flex items-center gap-5 border-l-8 border-amber-500 bg-white rounded-[2rem] shadow-md transition-all active:scale-[0.98]"
            >
              <div className="p-4 bg-amber-600 text-white rounded-2xl">
                <ShieldCheck size={32} />
              </div>
              <div className="text-left">
                <h3 className="font-black text-lg text-slate-800 uppercase italic leading-tight">Controle de Pátio</h3>
                <p className="text-[9px] text-slate-400 font-bold uppercase">Validar Vistorias / Chaves</p>
              </div>
            </button>
          )}

          {/* BOTÃO GESTÃO DE FROTA (Apenas Admin/P4) */}
          {isAdmin && (
            <button 
              onClick={() => onNavigate('frota')} 
              className="vtr-card p-6 flex items-center gap-5 border-l-8 border-slate-800 bg-white rounded-[2rem] shadow-md transition-all active:scale-[0.98]"
            >
              <div className="p-4 bg-slate-900 text-white rounded-2xl">
                <Settings size={32} />
              </div>
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
  const { isAuthenticated, isGarageiro, isAdmin } = useAuth();
  const [view, setView] = useState('dashboard');
  
  // Estado da frota com Initializer Function para carregar do cache instantaneamente
  const [dadosFrota, setDadosFrota] = useState(() => {
    const cache = localStorage.getItem("viaturas_cache");
    return cache ? JSON.parse(cache) : [];
  });
  const [carregado, setCarregado] = useState(false);

  // Função de sincronização com o Google Apps Script
  const sincronizarFrota = useCallback(async () => {
    setCarregado(false);
    try {
      const res = await gasApi.getViaturas();
      if (res.status === 'success') {
        setDadosFrota(res.data);
        localStorage.setItem("viaturas_cache", JSON.stringify(res.data));
        console.log("Frota sincronizada via API.");
      }
    } catch (error) {
      console.error("Erro na sincronização:", error);
    } finally {
      setCarregado(true);
    }
  }, []);

  // Sincroniza sempre que o usuário logar
  useEffect(() => {
    if (isAuthenticated) {
      sincronizarFrota();
    }
  }, [isAuthenticated, sincronizarFrota]);

  // Se não estiver logado, redireciona para Login
  if (!isAuthenticated) return <Login />;

  // Roteamento simples baseado no estado 'view'
  const renderView = () => {
    switch(view) {
     case 'vistoria': 
  return <Vistoria onBack={() => setView('dashboard')} PATRIMONIO={dadosFrota} />;
      
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

  return (
    <div className="w-full min-h-screen">
      {renderView()}
    </div>
  );
}

export default App;
