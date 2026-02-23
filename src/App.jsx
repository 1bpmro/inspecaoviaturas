import React, { useState } from 'react';
import { useAuth } from './lib/AuthContext';
import Login from './pages/Login';
import Vistoria from './pages/Vistoria';
import ConsultarFrota from './pages/ConsultarFrota'; // Importando a nova página
import { ClipboardCheck, LogOut, Car, User, Shield, LayoutDashboard } from 'lucide-react';

const Dashboard = ({ onNavigate }) => {
  const { user, logout, isAdmin } = useAuth();

  return (
    <div className="min-h-screen bg-[var(--bg-app)]">
      {/* NAV TÁTICA */}
      <nav className="bg-slate-900 text-white p-5 shadow-2xl flex justify-between items-center border-b-4 border-blue-900 sticky top-0 z-50">
        <div className="flex items-center gap-3">
          <Shield className="text-blue-400" size={24} />
          <div className="flex flex-col">
            <span className="font-black text-xs tracking-widest uppercase leading-none">1º BPM - Rondon</span>
            <span className="text-[9px] text-blue-400 font-bold uppercase tracking-tighter">PMRO - Porto Velho</span>
          </div>
        </div>
        <button onClick={logout} className="p-2 bg-slate-800 hover:bg-red-600 rounded-xl transition-all active:scale-90">
          <LogOut size={20} />
        </button>
      </nav>

      <main className="p-6 max-w-xl mx-auto space-y-8">
        <header className="animate-in fade-in slide-in-from-left duration-500">
          <h2 className="text-2xl font-black text-slate-800 tracking-tight">Olá, {user.patente} {user.nome}</h2>
          <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mt-1">Selecione uma operação de serviço</p>
        </header>

        <div className="grid grid-cols-1 gap-4 animate-in fade-in slide-in-from-bottom-6 duration-700">
          
          {/* Botão Nova Vistoria */}
          <button 
            onClick={() => onNavigate('vistoria')}
            className="vtr-card p-6 flex items-center gap-5 group text-left transition-all active:scale-[0.98]"
          >
            <div className="p-4 bg-blue-600 text-white rounded-2xl shadow-lg shadow-blue-200 group-hover:bg-blue-700 transition-colors">
              <ClipboardCheck size={32} />
            </div>
            <div>
              <h3 className="font-black text-lg text-slate-800 uppercase leading-none">Nova Vistoria</h3>
              <p className="text-xs text-slate-500 font-bold mt-1">Checklist de Entrada/Saída</p>
            </div>
          </button>

          {/* Botão Consultar Frota */}
          <button 
            onClick={() => onNavigate('frota')}
            className="vtr-card p-6 flex items-center gap-5 group text-left transition-all active:scale-[0.98]"
          >
            <div className="p-4 bg-slate-800 text-white rounded-2xl shadow-lg shadow-slate-200 group-hover:bg-slate-900 transition-colors">
              <Car size={32} />
            </div>
            <div>
              <h3 className="font-black text-lg text-slate-800 uppercase leading-none">Consultar Frota</h3>
              <p className="text-xs text-slate-500 font-bold mt-1">Status atual das viaturas</p>
            </div>
          </button>

          {/* Painel Administrativo (Apenas para Admins) */}
          {isAdmin && (
            <button className="vtr-card p-6 flex items-center gap-5 bg-amber-50 border-amber-200 group text-left transition-all active:scale-[0.98]">
              <div className="p-4 bg-amber-500 text-white rounded-2xl shadow-lg shadow-amber-200">
                <LayoutDashboard size={32} />
              </div>
              <div>
                <h3 className="font-black text-lg text-amber-900 uppercase leading-none">Gestão e Relatórios</h3>
                <p className="text-xs text-amber-700 font-bold mt-1">Controle de efetivo e VTRs</p>
              </div>
            </button>
          )}
        </div>

        <footer className="text-center pt-10 opacity-20">
          <p className="text-[9px] font-black uppercase tracking-[0.4em]">Sistema de Inspeção de Viaturas</p>
        </footer>
      </main>
    </div>
  );
};

function App() {
  const { isAuthenticated } = useAuth();
  const [view, setView] = useState('dashboard'); // 'dashboard', 'vistoria', 'frota'

  if (!isAuthenticated) return <Login />;

  // Navegação entre as telas
  switch(view) {
    case 'vistoria':
      return <Vistoria onBack={() => setView('dashboard')} />;
    case 'frota':
      return <ConsultarFrota onBack={() => setView('dashboard')} />;
    default:
      return <Dashboard onNavigate={(target) => setView(target)} />;
  }
}

export default App;
