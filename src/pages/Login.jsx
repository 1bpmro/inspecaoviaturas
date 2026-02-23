import React, { useState, useEffect } from 'react';
import { useAuth } from '../lib/AuthContext';
import { gasApi } from '../api/gasClient';
import { ShieldCheck, Lock, User, Loader2, ArrowRight } from 'lucide-react';

const Login = () => {
  const [re, setRe] = useState('');
  const [senha, setSenha] = useState('');
  const [perfil, setPerfil] = useState(null); // 'ADMIN', 'GARAGEIRO' ou 'COMUM'
  const [loadingPerfil, setLoadingPerfil] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const { login } = useAuth();

  // Quando o RE tem 5 ou mais dígitos, checa o perfil automaticamente
  useEffect(() => {
    const verificar = async () => {
      if (re.length >= 4) {
        setLoadingPerfil(true);
        const res = await gasApi.checkProfile(re);
        if (res.status === 'success') {
          setPerfil(res.role);
        } else {
          setPerfil('COMUM');
        }
        setLoadingPerfil(false);
      } else {
        setPerfil(null);
      }
    };
    const timer = setTimeout(verificar, 500); // Aguarda o usuário parar de digitar
    return () => clearTimeout(timer);
  }, [re]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setIsSubmitting(true);
    
    const result = await login(re, senha);
    if (!result.success) setError(result.message);
    setIsSubmitting(false);
  };

  const precisaSenha = perfil === 'ADMIN' || perfil === 'GARAGEIRO';

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-900 p-4">
      <div className="max-w-md w-full bg-white rounded-3xl shadow-2xl overflow-hidden">
        <div className="bg-slate-800 p-8 text-center">
          <ShieldCheck className="w-12 h-12 text-blue-500 mx-auto mb-2" />
          <h1 className="text-2xl font-black text-white uppercase tracking-tighter">1º BPM - RONDON</h1>
          <p className="text-slate-400 text-xs font-bold tracking-widest">SISTEMA OPERACIONAL</p>
        </div>

        <form onSubmit={handleSubmit} className="p-8 space-y-6">
          {error && <div className="bg-red-50 border-l-4 border-red-500 p-3 text-red-700 text-sm font-bold">{error}</div>}

          <div className="relative">
            <label className="text-[10px] font-black text-slate-400 uppercase absolute left-3 top-2">Matrícula (RE)</label>
            <User className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-300" size={20} />
            <input 
              type="text" 
              value={re} 
              onChange={(e) => setRe(e.target.value)} 
              className="w-full pt-7 pb-3 px-3 bg-slate-50 border-2 border-slate-100 focus:border-blue-500 rounded-xl outline-none font-bold text-xl transition-all"
              placeholder="00000"
            />
            {loadingPerfil && <Loader2 className="absolute right-12 top-1/2 -translate-y-1/2 animate-spin text-blue-500" size={16} />}
          </div>

          {/* O campo de SENHA só aparece se o perfil exigir */}
          {precisaSenha && (
            <div className="relative animate-in slide-in-from-top-4 duration-300">
              <label className="text-[10px] font-black text-slate-400 uppercase absolute left-3 top-2">Senha de Acesso</label>
              <Lock className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-300" size={20} />
              <input 
                type="password" 
                value={senha} 
                onChange={(e) => setSenha(e.target.value)}
                className="w-full pt-7 pb-3 px-3 bg-slate-50 border-2 border-blue-100 focus:border-blue-500 rounded-xl outline-none font-bold text-xl"
                placeholder="••••••••"
                autoFocus
              />
            </div>
          )}

          <button 
            type="submit" 
            disabled={isSubmitting || (re.length < 4)} 
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-black py-5 rounded-2xl shadow-lg transition-all flex items-center justify-center gap-3 uppercase tracking-widest disabled:opacity-30"
          >
            {isSubmitting ? <Loader2 className="animate-spin" /> : (
              <>Acessar <ArrowRight size={20} /></>
            )}
          </button>
        </form>
      </div>
    </div>
  );
};

export default Login;
