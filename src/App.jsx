import React, { useState } from 'react';
import { useAuth } from './lib/AuthContext';
import Login from './pages/Login';
import Vistoria from './pages/Vistoria';
import ConsultarFrota from './pages/ConsultarFrota';
import Garageiro from './pages/GarageiroDashboard'; 
import AdminDashboard from './pages/AdminDashboard';
import { ClipboardCheck, LogOut, Car, Shield, ShieldCheck, Settings, History } from 'lucide-react';

const Dashboard = ({ onNavigate }) => {
  const { user, logout, isAdmin, isGarageiro } = useAuth();

  // Define se é o perfil operacional (policial comum)
  const isOperacionalOnly = !isAdmin && !isGarageiro;

  return (
    <div className="min-h-screen bg-slate-50">
      {/* NAV BAR */}
      <nav className="bg-slate-900 text-white p-5 shadow-2xl flex justify-between items-center border-b-4 border-blue-900 sticky top-0 z-50">
        <div className="flex items-center gap-3">
          <Shield className="text-blue-400" size={24} />
          <div className="flex flex-col">
            <span className="font-black text-xs tracking-widest uppercase leading-none">1º BPM - Rondon</span>
            <span className="text-[9px] text-blue-400 font-bold uppercase tracking-tighter">PMRO - Porto Velho</span>
          </div>
        </div>
        <button 
          onClick={logout} 
          className="p-2 bg-slate-800 hover:bg-red-600 rounded-xl transition-all active:scale-90 flex items-center gap-2 group"
        >
          <span className="text-[10px] font-black uppercase pr-1">Sair</span>
          <LogOut size={20} />
        </button>
      </nav>

      {/* CONTEÚDO PRINCIPAL */}
      <main className="p-6 max-w-xl mx-auto space-y-6">
        <header className="animate-in fade-in slide-in-from-left duration-500 text-center mb-8">
          <h2 className="text-2xl font-black text-slate-800 tracking-tight leading-tight">
            Olá, <span className="text-blue-700">{user?.patente} {user?.nome}</span>
          </h2>
          <p className="text-[10px] font-bold text-slate-500 uppercase tracking-[0.2em] mt-2">
            {isAdmin ? "⚠️ ACESSO ADMINISTRATIVO" : "SISTEMA DE VISTORIAS"}
          </p>
        </header>

        <div className="grid grid-cols-1 gap-4 animate-in fade-in zoom-in duration-500">
          
          {/* BOTÃO PRINCIPAL: NOVA VISTORIA (Aumentado para o Operacional) */}
          {(!isGarageiro || isAdmin) && (
            <button 
              onClick={() => onNavigate('vistoria')}
              className={`vtr-card flex flex-col items-center justify-center gap-4 transition-all hover:shadow-2xl active:scale-[0.97] bg-blue-600 text-white rounded-[2.5rem] shadow-xl shadow-blue-100 border-b-8 border-blue-800 ${
                isOperacionalOnly ? 'p-10' : 'p-6 flex-row text-left'
              }`}
            >
              <div className={`p-4 bg-white/20 rounded-2xl ${isOperacionalOnly ? 'mb-2' : ''}`}>
                <ClipboardCheck size={isOperacionalOnly ? 48 : 32} />
              </div>
              <div>
                <h3 className={`font-black uppercase leading-none ${isOperacionalOnly ? 'text-xl' : 'text-lg'}`}>
                  Nova Vistoria
                </h3>
                <p className="text-[10px] font-bold mt-2 uppercase opacity-80 tracking-tighter italic">
                  Iniciar Checklist de Viatura
                </p>
              </div>
            </button>
          )}

          {/* BOTÃO SECUNDÁRIO OPERACIONAL: MEU HISTÓRICO (Simples, sem firula) */}
          {isOperacionalOnly && (
            <button 
              className="w-full bg-white border-2 border-slate-200 text-slate-400 p-5 rounded-[2rem] flex items-center justify-between px-8 transition-all active:scale-95 grayscale opacity-60"
              onClick={() => alert('Histórico pessoal em breve nas próximas atualizações.')}
            >
              <div className="flex flex-col items-start">
                <span className="font-black uppercase text-xs">Meu Histórico</span>
                <span className="text-[8px] font-bold uppercase">Minhas vistorias recentes</span>
              </div>
              <History size={20} />
            </button>
          )}

          {/* ÁREA DE COMANDO: APENAS ADMIN */}
          {isAdmin && (
            <button 
              onClick={() => onNavigate('frota')}
              className="vtr-card p-6 flex items-center gap-5 border-l-8 border-indigo-600 transition-all hover:shadow-xl active:scale-[0.98] bg-white rounded-[2rem] shadow-md"
            >
              <div className="p-4 bg-indigo-600 text-white rounded-2xl shadow-lg">
                <Settings size={32} />
              </div>
              <div className="text-left">
                <h3 className="font-black text-lg text-slate-800 uppercase leading-none">Painel de Comando</h3>
                <p className="text-xs text-slate-500 font-bold mt-1 uppercase tracking-tighter">Gestão de Óleo e Frota</p>
              </div>
            </button>
          )}

          {/* ÁREA GARAGEIRO: GARAGEIRO E ADMIN */}
          {(isAdmin || isGarageiro) && (
            <button 
              onClick={() => onNavigate('garageiro')}
              className="vtr-card p-6 flex items-center gap-5 border-l-8 border-amber-500 transition-all hover:shadow-xl active:scale-[0.98] bg-white rounded-[2rem] opacity-90 shadow-md"
            >
              <div className="p-4 bg-amber-600 text-white rounded-2xl shadow-lg">
                <ShieldCheck size={32} />
              </div>
              <div className="text-left">
                <h3 className="font-black text-lg text-slate-800 uppercase leading-none italic">Controle de Pátio</h3>
                <p className="text-xs text-slate-500 font-bold mt-1 uppercase tracking-tighter">Validação de Garageiro</p>
              </div>
            </button>
          )}

        </div>

        {/* NOTA DE RODAPÉ OPERACIONAL */}
        {isOperacionalOnly && (
          <div className="mt-10 p-4 bg-slate-100 rounded-2xl border border-dashed border-slate-300 text-center">
            <p className="text-[9px] font-black text-slate-400 uppercase leading-tight tracking-widest">
              A conferência do nível de óleo é <br/>obrigatória em todas as saídas.
            </p>
          </div>
        )}
      </main>
    </div>
  );
};

function App() {
  const { isAuthenticated, isGarageiro, isAdmin } = useAuth();
  const [view, setView] = useState('dashboard');

  if (!isAuthenticated) return <Login />;

  const renderView = () => {
    switch(view) {
      case 'vistoria': 
        return <Vistoria onBack={() => setView('dashboard')} />;
      
      case 'frota': 
        // Apenas Admin entra no Dashboard completo.
        if (isAdmin) {
          return <AdminDashboard onBack={() => setView('dashboard')} />;
        }
        // Se um policial comum tentar acessar por URL ou erro, volta pro dashboard
        setView('dashboard');
        return null;
      
      case 'garageiro': 
        if (isGarageiro || isAdmin) {
          return <Garageiro onBack={() => setView('dashboard')} />;
        }
        setView('dashboard');
        return null;

      default: 
        return <Dashboard onNavigate={(target) => setView(target)} />;
    }
  };

  return renderView();
}

export default App;
