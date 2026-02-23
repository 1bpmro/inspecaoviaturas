import React from 'react';
import { useAuth } from './lib/AuthContext';
import Login from './pages/Login';
import { ClipboardCheck, LogOut, Car, User, Shield } from 'lucide-react';

// Componente simples para a página inicial (Dashboard)
const Dashboard = () => {
  const { user, logout, isAdmin } = useAuth();

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Barra Superior */}
      <nav className="bg-slate-800 text-white p-4 shadow-lg flex justify-between items-center">
        <div className="flex items-center gap-2">
          <Shield className="text-blue-400" />
          <span className="font-bold tracking-tighter uppercase">1º BPM - Rondon</span>
        </div>
        <button 
          onClick={logout}
          className="bg-slate-700 hover:bg-red-600 p-2 rounded-lg transition-colors"
          title="Sair"
        >
          <LogOut size={20} />
        </button>
      </nav>

      {/* Conteúdo Principal */}
      <main className="p-6 max-w-4xl mx-auto">
        <header className="mb-8">
          <h2 className="text-2xl font-bold text-slate-800">Olá, {user.patente} {user.nome}</h2>
          <p className="text-slate-500">Selecione uma operação abaixo:</p>
        </header>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Botão de Nova Vistoria */}
          <button className="flex items-center gap-4 p-6 bg-white border border-slate-200 rounded-xl shadow-sm hover:border-blue-500 hover:shadow-md transition-all group">
            <div className="p-4 bg-blue-50 rounded-lg text-blue-600 group-hover:bg-blue-600 group-hover:text-white transition-colors">
              <ClipboardCheck size={32} />
            </div>
            <div className="text-left">
              <h3 className="font-bold text-lg text-slate-800">Nova Vistoria</h3>
              <p className="text-sm text-slate-500">Registrar entrada ou saída de viatura</p>
            </div>
          </button>

          {/* Botão de Frota (Patrimônio) */}
          <button className="flex items-center gap-4 p-6 bg-white border border-slate-200 rounded-xl shadow-sm hover:border-blue-500 hover:shadow-md transition-all group">
            <div className="p-4 bg-slate-50 rounded-lg text-slate-600 group-hover:bg-slate-600 group-hover:text-white transition-colors">
              <Car size={32} />
            </div>
            <div className="text-left">
              <h3 className="font-bold text-lg text-slate-800">Consultar Frota</h3>
              <p className="text-sm text-slate-500">Ver status das viaturas do batalhão</p>
            </div>
          </button>

          {/* Acesso Administrativo (Só aparece se for ADMIN) */}
          {isAdmin && (
            <button className="flex items-center gap-4 p-6 bg-amber-50 border border-amber-200 rounded-xl shadow-sm hover:border-amber-500 transition-all col-span-1 md:col-span-2">
              <div className="p-4 bg-amber-500 rounded-lg text-white">
                <User size={32} />
              </div>
              <div className="text-left">
                <h3 className="font-bold text-lg text-amber-900">Painel de Gestão</h3>
                <p className="text-sm text-amber-700">Relatórios e Gerenciamento de Efetivo</p>
              </div>
            </button>
          )}
        </div>
      </main>
    </div>
  );
};

// Lógica de Roteamento Principal
function App() {
  const { isAuthenticated } = useAuth();

  // Se não estiver logado, mostra Login. Se estiver, mostra Dashboard.
  return isAuthenticated ? <Dashboard /> : <Login />;
}

export default App;
