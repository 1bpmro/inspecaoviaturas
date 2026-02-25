import React, { useState } from 'react';
import { useAuth } from './lib/AuthContext';
import Login from './pages/Login';
import Vistoria from './pages/Vistoria';
import ConsultarFrota from './pages/ConsultarFrota';
import Garageiro from './pages/Garageiro'; 
import { ClipboardCheck, LogOut, Car, Shield, ShieldCheck } from 'lucide-react';

const Dashboard = ({ onNavigate }) => {
  const { user, logout, isAdmin, isGarageiro } = useAuth();

  // Permissão para ver o botão de Controle de Pátio
  const temAcessoGaragem = isAdmin || isGarageiro;

  return (
    <div className="min-h-screen bg-[var(--bg-app)]">
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
          title="Sair do Sistema"
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
            Selecione uma operação de serviço
          </p>
        </header>

        <div className="grid grid-cols-1 gap-4 animate-in fade-in zoom-in duration-500 delay-150">
          
          {/* BOTÃO GARAGEIRO (Apenas Garageiro ou Admin) */}
          {temAcessoGaragem && (
            <button 
              onClick={() => onNavigate('garageiro')}
              className="vtr-card p-6 flex items-center gap-5 border-l-8 border-amber-500 transition-all hover:shadow-xl active:scale-[0.98] bg-white rounded-[2rem]"
            >
              <div className="p-4 bg-amber-600 text-white rounded-2xl shadow-lg shadow-amber-200">
                <ShieldCheck size={32} />
              </div>
              <div className="text-left">
                <h3 className="font-black text-lg text-slate-800 uppercase leading-none">Controle de Pátio</h3>
                <p className="text-xs text-slate-500 font-bold mt-1 uppercase tracking-tighter">Validação de Vistorias e Chaves</p>
              </div>
            </button>
          )}

          {/* Botão Nova Vistoria */}
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

          {/* Botão Consultar Frota */}
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
        </div>
      </main>

      <footer className="py-8 text-center opacity-40">
        <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">
          1º BPM - Batalhão Rondon
        </p>
      </footer>
    </div>
  );
};

function App() {
  const { isAuthenticated, isGarageiro, isAdmin } = useAuth();
  const [view, setView] = useState('dashboard');

  if (!isAuthenticated) return <Login />;

  // Renderização condicional das telas
const renderView = () => {
  switch(view) {
    case 'vistoria': 
      // TRAVA DE SEGURANÇA: Garageiro não faz vistoria de motorista
      if (isGarageiro && !isAdmin) {
        alert("Acesso negado: Garageiros devem usar o 'Controle de Pátio'.");
        setView('dashboard');
        return null;
      }
      return <Vistoria onBack={() => setView('dashboard')} />;
    
    case 'frota': 
      return <ConsultarFrota onBack={() => setView('dashboard')} />;
    
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
