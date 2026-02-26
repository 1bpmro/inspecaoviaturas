import React, { useState } from 'react';
import { useAuth } from './lib/AuthContext';
import Login from './pages/Login';
import Vistoria from './pages/Vistoria';
import ConsultarFrota from './pages/ConsultarFrota';
import Garageiro from './pages/GarageiroDashboard'; 
import AdminDashboard from './pages/AdminDashboard';
import { ClipboardCheck, LogOut, Car, Shield, ShieldCheck, Settings } from 'lucide-react';

const Dashboard = ({ onNavigate }) => {
  const { user, logout, isAdmin, isGarageiro } = useAuth();

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
          <span className="hidden group-hover:block text-[10px] font-black uppercase pr-1">Sair</span>
          <LogOut size={20} />
        </button>
      </nav>

      {/* CONTEÚDO */}
      <main className="p-6 max-w-xl mx-auto space-y-6">
        <header className="animate-in fade-in slide-in-from-left duration-500">
          <h2 className="text-2xl font-black text-slate-800 tracking-tight leading-tight">
            Olá, <span className="text-blue-700">{user?.patente} {user?.nome}</span>
          </h2>
          <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mt-1">
            {isAdmin ? "⚠️ MODO ADMINISTRADOR ATIVO" : "Selecione uma operação de serviço"}
          </p>
        </header>

        <div className="grid grid-cols-1 gap-4 animate-in fade-in zoom-in duration-500 delay-150">
          
          {/* BOTÃO EXCLUSIVO ADMIN: PAINEL DE COMANDO (Substitui o Consultar Frota para o Admin) */}
          {isAdmin ? (
            <button 
              onClick={() => onNavigate('frota')}
              className="vtr-card p-6 flex items-center gap-5 border-l-8 border-indigo-600 transition-all hover:shadow-xl active:scale-[0.98] bg-white rounded-[2rem] shadow-md"
            >
              <div className="p-4 bg-indigo-600 text-white rounded-2xl shadow-lg">
                <Settings size={32} />
              </div>
              <div className="text-left">
                <h3 className="font-black text-lg text-slate-800 uppercase leading-none">Painel de Comando</h3>
                <p className="text-xs text-slate-500 font-bold mt-1 uppercase tracking-tighter">Gestão de Óleo, Baixas e Frota</p>
              </div>
            </button>
          ) : (
            /* Botão Consultar Frota para Policiais Comuns */
            <button 
              onClick={() => onNavigate('frota')}
              className="vtr-card p-6 flex items-center gap-5 group text-left transition-all hover:shadow-xl active:scale-[0.98] bg-white rounded-[2rem] border-l-8 border-slate-800"
            >
              <div className="p-4 bg-slate-800 text-white rounded-2xl shadow-lg shadow-slate-200">
                <Car size={32} />
              </div>
              <div>
                <h3 className="font-black text-lg text-slate-800 uppercase leading-none">Consultar Frota</h3>
                <p className="text-xs text-slate-500 font-bold mt-1 uppercase tracking-tighter">Status e Localização das VTRs</p>
              </div>
            </button>
          )}

          {/* Botão Nova Vistoria (Sempre visível para Policial e Admin) */}
          {(!isGarageiro || isAdmin) && (
            <button 
              onClick={() => onNavigate('vistoria')}
              className="vtr-card p-6 flex items-center gap-5 group text-left transition-all hover:shadow-xl active:scale-[0.98] bg-white rounded-[2rem] border-l-8 border-blue-600"
            >
              <div className="p-4 bg-blue-600 text-white rounded-2xl shadow-lg shadow-blue-200">
                <ClipboardCheck size={32} />
              </div>
              <div>
                <h3 className="font-black text-lg text-slate-800 uppercase leading-none">Nova Vistoria</h3>
                <p className="text-xs text-slate-500 font-bold mt-1 uppercase tracking-tighter">Checklist de Entrada / Saída</p>
              </div>
            </button>
          )}

          {/* BOTÃO GARAGEIRO (Aparece para Garageiro e também para Admin caso ele precise validar algo) */}
          {(isAdmin || isGarageiro) && (
            <button 
              onClick={() => onNavigate('garageiro')}
              className="vtr-card p-6 flex items-center gap-5 border-l-8 border-amber-500 transition-all hover:shadow-xl active:scale-[0.98] bg-white rounded-[2rem] opacity-90"
            >
              <div className="p-4 bg-amber-600 text-white rounded-2xl shadow-lg shadow-amber-200">
                <ShieldCheck size={32} />
              </div>
              <div className="text-left">
                <h3 className="font-black text-lg text-slate-800 uppercase leading-none italic">Controle de Pátio</h3>
                <p className="text-xs text-slate-500 font-bold mt-1 uppercase tracking-tighter">Validação (Garageiro)</p>
              </div>
            </button>
          )}

        </div>
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
        // Lógica de bifurcação:
        return isAdmin ? 
          <AdminDashboard onBack={() => setView('dashboard')} /> : 
          <ConsultarFrota onBack={() => setView('dashboard')} />;
      
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
