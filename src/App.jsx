import React, { useState } from 'react';
import { useAuth } from './lib/AuthContext';
import Login from './pages/Login';
import Vistoria from './pages/Vistoria';
import ConsultarFrota from './pages/ConsultarFrota';
import Garageiro from './pages/Garageiro'; // Importando a nova página
import { ClipboardCheck, LogOut, Car, Shield, LayoutDashboard, ShieldCheck } from 'lucide-react';

const Dashboard = ({ onNavigate }) => {
  const { user, logout, isAdmin } = useAuth();

  return (
    <div className="min-h-screen bg-[var(--bg-app)]">
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

      <main className="p-6 max-w-xl mx-auto space-y-6">
        <header>
          <h2 className="text-2xl font-black text-slate-800 tracking-tight">Olá, {user.patente} {user.nome}</h2>
          <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mt-1">Selecione uma operação</p>
        </header>

        <div className="grid grid-cols-1 gap-4">
          
          {/* BOTÃO GARAGEIRO (Apenas Garageiro ou Admin) */}
          {(user.role === 'GARAGEIRO' || isAdmin) && (
            <button 
              onClick={() => onNavigate('garageiro')}
              className="vtr-card p-6 flex items-center gap-5 border-l-8 border-amber-500 transition-all active:scale-[0.98]"
            >
              <div className="p-4 bg-amber-600 text-white rounded-2xl shadow-lg shadow-amber-200">
                <ShieldCheck size={32} />
              </div>
              <div>
                <h3 className="font-black text-lg text-slate-800 uppercase leading-none">Controle de Pátio</h3>
                <p className="text-xs text-slate-500 font-bold mt-1">Validação de Entradas</p>
              </div>
            </button>
          )}

          {/* Botão Nova Vistoria */}
          <button 
            onClick={() => onNavigate('vistoria')}
            className="vtr-card p-6 flex items-center gap-5 group text-left transition-all active:scale-[0.98]"
          >
            <div className="p-4 bg-blue-600 text-white rounded-2xl shadow-lg shadow-blue-200">
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
            <div className="p-4 bg-slate-800 text-white rounded-2xl shadow-lg shadow-slate-200">
              <Car size={32} />
            </div>
            <div>
              <h3 className="font-black text-lg text-slate-800 uppercase leading-none">Consultar Frota</h3>
              <p className="text-xs text-slate-500 font-bold mt-1">Status atual das viaturas</p>
            </div>
          </button>
        </div>
      </main>
    </div>
  );
};

function App() {
  const { isAuthenticated } = useAuth();
  const [view, setView] = useState('dashboard');

  if (!isAuthenticated) return <Login />;

  switch(view) {
    case 'vistoria': return <Vistoria onBack={() => setView('dashboard')} />;
    case 'frota': return <ConsultarFrota onBack={() => setView('dashboard')} />;
    case 'garageiro': return <Garageiro onBack={() => setView('dashboard')} />;
    default: return <Dashboard onNavigate={(target) => setView(target)} />;
  }
}

export default App;
