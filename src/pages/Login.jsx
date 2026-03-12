import React, { useState } from 'react';
import { useAuth } from '../lib/AuthContext';
import { useNavigate } from 'react-router-dom'; // 1. Importar o hook de navegação
import { Loader2, ShieldCheck, Lock, User } from 'lucide-react';

const Login = () => {
  const { login } = useAuth();
  const navigate = useNavigate(); // 2. Inicializar o navigate
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  const [credentials, setCredentials] = useState({
    matricula: '',
    password: ''
  });

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');

    if (!credentials.matricula) {
      return setError('Digite a matrícula.');
    }

    const reLimpo = credentials.matricula.replace(/\D/g, ''); 
    
    if (!reLimpo || !credentials.password) {
      return setError('Preencha matrícula e senha.');
    }

    setLoading(true);

    try {
      const { needsPasswordChange } = await login(reLimpo, credentials.password);
      
      if (needsPasswordChange) {
        alert("⚠️ ATENÇÃO: Você está usando a senha padrão (123456).\nPor segurança, altere sua senha após entrar.");
      }
      
      // 3. REDIRECIONAMENTO TÁTICO:
      // Após o login com sucesso (e após o alert), manda para a rota principal
      navigate('/dashboard'); 

    } catch (err) {
      console.error(err);
      setError('Matrícula ou senha incorretos.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center p-6">
      {/* ... (resto do seu código de UI igual ao que você enviou) ... */}
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

      <div className="bg-white w-full max-w-sm rounded-[2.5rem] p-8 shadow-2xl">
        <form onSubmit={handleLogin} className="space-y-4">
          
          {error && (
            <div className="bg-red-50 text-red-600 text-[10px] font-black p-3 rounded-xl border border-red-100 uppercase text-center">
              {error}
            </div>
          )}

          <div className="space-y-1">
            <label className="text-[10px] font-black text-slate-400 uppercase ml-2">RE / Matrícula</label>
            <div className="relative">
              <User className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
              <input 
                type="text" 
                inputMode="numeric"
                autoComplete="username"
                className="w-full bg-slate-100 border-none rounded-2xl py-4 pl-12 pr-4 text-sm font-bold focus:ring-2 focus:ring-blue-500 transition-all text-slate-900"
                placeholder="Ex: 123456"
                value={credentials.matricula}
                onChange={(e) => setCredentials({...credentials, matricula: e.target.value})}
              />
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-[10px] font-black text-slate-400 uppercase ml-2">Senha</label>
            <div className="relative">
              <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
              <input 
                type="password" 
                autoComplete="current-password"
                className="w-full bg-slate-100 border-none rounded-2xl py-4 pl-12 pr-4 text-sm font-bold focus:ring-2 focus:ring-blue-500 transition-all text-slate-900"
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
            O acesso é monitorado e requer RE válido.
          </p>
        </div>
      </div>

      <footer className="mt-10">
        <p className="text-slate-600 text-[10px] font-black uppercase">v2.1 • Tático</p>
      </footer>
    </div>
  );
};

export default Login;
