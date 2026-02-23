import React, { useState } from 'react';
import { useAuth } from '../lib/AuthContext';
import { ShieldCheck, Lock, User, Loader2 } from 'lucide-react';

const Login = () => {
  const [re, setRe] = useState('');
  const [senha, setSenha] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { login } = useAuth();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setIsSubmitting(true);

    if (!re) {
      setError('Por favor, informe seu RE');
      setIsSubmitting(false);
      return;
    }

    const result = await login(re, senha);
    if (!result.success) {
      setError(result.message);
    }
    setIsSubmitting(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-900 p-4">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-2xl overflow-hidden">
        <div className="bg-slate-800 p-8 text-center border-b-4 border-blue-600">
          <ShieldCheck className="w-12 h-12 text-blue-400 mx-auto mb-2" />
          <h1 className="text-2xl font-black text-white uppercase tracking-tighter">1º BPM - RONDON</h1>
          <p className="text-slate-400 text-xs font-bold">SISTEMA DE INSPEÇÃO DE VIATURAS</p>
        </div>

        <form onSubmit={handleSubmit} className="p-8 space-y-5">
          {error && <div className="bg-red-50 border-l-4 border-red-500 p-3 text-red-700 text-sm font-bold">{error}</div>}

          <div className="space-y-1">
            <label className="text-xs font-black text-slate-500 uppercase">Matrícula (RE)</label>
            <div className="relative">
              <User className="absolute left-3 top-3 text-slate-400" size={20} />
              <input type="text" value={re} onChange={(e) => setRe(e.target.value)} 
                className="w-full pl-10 p-3 bg-slate-100 border-2 border-transparent focus:border-blue-500 rounded-lg outline-none font-bold text-lg" placeholder="Digite seu RE"/>
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-black text-slate-500 uppercase">Senha (Apenas Admins)</label>
            <div className="relative">
              <Lock className="absolute left-3 top-3 text-slate-400" size={20} />
              <input type="password" value={senha} onChange={(e) => setSenha(e.target.value)}
                className="w-full pl-10 p-3 bg-slate-100 border-2 border-transparent focus:border-blue-500 rounded-lg outline-none" placeholder="••••••••"/>
            </div>
          </div>

          <button type="submit" disabled={isSubmitting} className="w-full bg-blue-700 hover:bg-blue-800 text-white font-black py-4 rounded-xl shadow-lg transition-all flex items-center justify-center gap-2 uppercase tracking-widest">
            {isSubmitting ? <Loader2 className="animate-spin" /> : "ACESSAR SISTEMA"}
          </button>
        </form>
      </div>
    </div>
  );
};

export default Login;
