import React, { useState } from 'react';
import { useAuth } from './lib/AuthContext';
import Login from './pages/Login';
import Vistoria from './pages/Vistoria';
import { ClipboardCheck, LogOut, Car, User, Shield } from 'lucide-react';

const Dashboard = ({ onStartVistoria }) => {
  const { user, logout, isAdmin } = useAuth();

  return (
    <div className="min-h-screen bg-slate-50">
      <nav className="bg-slate-800 text-white p-4 shadow-lg flex justify-between items-center">
        <div className="flex items-center gap-2">
          <Shield className="text-blue-400" />
          <span className="font-bold tracking-tighter uppercase">1º BPM - Rondon</span>
        </div>
        <button onClick={logout} className="bg-slate-700 hover:bg-red-600 p-2 rounded-lg transition-colors">
          <LogOut size={20} />
        </button>
      </nav>

      <main className="p-6 max-w-4xl mx-auto">
        <header className="mb-8">
          <h2 className="text-2xl font-bold text-slate-800">Olá, {user.patente} {user.nome}</h2>
          <p className="text-slate-500">Selecione uma operação:</p>
        </header>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Botão que agora abre a página de Vistoria */}
          <button 
            onClick={onStartVistoria}
            className="flex items-center gap-4 p-6 bg-white border border-slate-200 rounded-xl shadow-sm hover:border-blue-500 transition-all group text-left"
          >
            <div className="p-4 bg-blue-50 rounded-lg text-blue-600 group-hover:bg-blue-600 group-hover:text-white transition-colors">
              <ClipboardCheck size={32} />
            </div>
            <div>
              <h3 className="font-bold text-lg text-slate-800">Nova Vistoria</h3>
              <p className="text-sm text-slate-500">Entrada ou Saída</p>
            </div>
          </button>

          <button className="flex items-center gap-4 p-6 bg-white border border-slate-200 rounded-xl shadow-sm hover:border-blue-500 transition-all group text-left">
            <div className="p-4 bg-slate-50 rounded-lg text-slate-600 group-hover:bg-slate-600 group-hover:text-white transition-colors">
              <Car size={32} />
            </div>
            <div>
              <h3 className="font-bold text-lg text-slate-800">Consultar Frota</h3>
              <p className="text-sm text-slate-500">Status das viaturas</p>
            </div>
          </button>

          {isAdmin && (
            <button className="flex items-center gap-4 p-6 bg-amber-50 border border-amber-200 rounded-xl shadow-sm hover:border-amber-500 transition-all col-span-1 md:col-span-2 text-left">
              <div className="p-4 bg-amber-500 rounded-lg text-white">
                <User size={32} />
              </div>
              <div>
                <h3 className="font-bold text-lg text-amber-900">Painel de Gestão</h3>
                <p className="text-sm text-amber-700">Relatórios e Efetivo</p>
              </div>
            </button>
          )}
        </div>
      </main>
    </div>
  );
};

function App() {
  const { isAuthenticated } = useAuth();
  const [view, setView] = useState('dashboard'); // 'dashboard' ou 'vistoria'

  if (!isAuthenticated) return <Login />;

  return view === 'dashboard' ? (
    <Dashboard onStartVistoria={() => setView('vistoria')} />
  ) : (
    <Vistoria onBack={() => setView('dashboard')} />
  );
}

export default App;
