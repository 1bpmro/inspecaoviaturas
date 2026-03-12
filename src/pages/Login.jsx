import React, { useState } from 'react';
import { useAuth } from '../lib/AuthContext';
import { Loader2, ShieldCheck, Lock, User } from 'lucide-react';

const Login = () => {
  const { login } = useAuth(); // Função que criaremos no AuthContext
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  const [credentials, setCredentials] = useState({
    email: '', // Firebase usa email/senha por padrão
    password: ''
  });

  const handleLogin = async (e) => {
    e.preventDefault();
    const reLimpo = credentials.matricula.replace(/\D/g, ''); // Garante só números
    
    if (!reLimpo || !credentials.password) {
      return setError('Preencha matrícula e senha.');
    }

    setLoading(true);
    setError('');

    try {
      const { needsPasswordChange } = await login(reLimpo, credentials.password);
      
      if (needsPasswordChange) {
        alert("⚠️ ATENÇÃO: Você está usando a senha padrão. Por segurança, altere sua senha no perfil.");
        // Aqui você pode redirecionar para uma página de "Trocar Senha"
      }
    } catch (err) {
      setError('Matrícula ou senha incorretos.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center p-6">
      {/* Logo / Header */}
      <div className="mb-10 text-center">
        <div className="bg-blue-600 w-20 h-20 rounded-3xl flex items-center justify-center mx-auto mb-4 shadow-2xl shadow-blue-500/20">
          <ShieldCheck size={40} className="text-white" />
        </div>
        <h1 className="text-white font-black text-2xl tracking-tighter uppercase">
          Garagem <span className="text-blue-500">1º BPM</span>
        </h1>
        <p className="text-slate-500 text-xs font-bold uppercase tracking-widest mt-1">
          Sistema de Vistorias
        </p>
      </div>

      {/* Card de Login */}
      <div className="bg-white w-full max-w-sm rounded-[2.5rem] p-8 shadow-2xl">
        <form onSubmit={handleLogin} className="space-y-4">
          
          {error && (
            <div className="bg-red-50 text-red-600 text-[10px] font-black p-3 rounded-xl border border-red-100 uppercase text-center">
              {error}
            </div>
          )}

          <div className="space-y-1">
            <label className="text-[10px] font-black text-slate-400 uppercase ml-2">E-mail Corporativo</label>
            <div className="relative">
              <User className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
              <input 
                type="email" 
                className="w-full bg-slate-100 border-none rounded-2xl py-4 pl-12 pr-4 text-sm font-bold focus:ring-2 focus:ring-blue-500 transition-all"
                placeholder="exemplo@pm.sp.gov.br"
                value={credentials.email}
                onChange={(e) => setCredentials({...credentials, email: e.target.value})}
              />
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-[10px] font-black text-slate-400 uppercase ml-2">Senha</label>
            <div className="relative">
              <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
              <input 
                type="password" 
                className="w-full bg-slate-100 border-none rounded-2xl py-4 pl-12 pr-4 text-sm font-bold focus:ring-2 focus:ring-blue-500 transition-all"
                placeholder="••••••••"
                value={credentials.password}
                onChange={(e) => setCredentials({...credentials, password: e.target.value})}
              />
            </div>
          </div>

          <button 
            type="submit" 
            disabled={loading}
            className="w-full bg-slate-900 text-white py-4 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-blue-600 transition-all shadow-lg active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {loading ? <Loader2 className="animate-spin" size={18} /> : "Entrar no Sistema"}
          </button>
        </form>

        <div className="mt-8 text-center">
          <p className="text-[9px] text-slate-400 font-bold uppercase leading-tight">
            Uso restrito a Policiais Militares do 1º BPM.<br/>
            O acesso é monitorado.
          </p>
        </div>
      </div>

      <footer className="mt-10">
        <p className="text-slate-600 text-[10px] font-black uppercase">v2.0 • Firebase Realtime</p>
      </footer>
    </div>
  );
};

export default Login;
