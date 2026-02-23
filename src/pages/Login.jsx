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

    if (!re || !senha) {
      setError('Preencha todos os campos');
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
    <div className="min-h-screen flex items-center justify-center bg-slate-100 p-4">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-xl overflow-hidden">
        <div className="bg-slate-800 p-6 text-center">
          <div className="inline-flex p-3 rounded-full bg-slate-700 mb-4">
            <ShieldCheck className="w-8 h-8 text-blue-400" />
          </div>
          <h1 className="text-xl font-bold text-white uppercase tracking-wider">
            1º BPM - Rondon
          </h1>
          <p className="text-slate-400 text-sm">Sistema de Inspeção de Viaturas</p>
        </div>

        <form onSubmit={handleSubmit} className="p-8 space-y-6">
          {error && (
            <div className="bg-red-50 border-l-4 border-red-500 p-4 text-red-700 text-sm animate-pulse">
              {error}
            </div>
          )}

          <div className="space-y-2">
            <label className="text-sm font-semibold text-slate-700 flex items-center gap-2">
              <User size={16} /> RE (Matrícula)
            </label>
            <input
              type="text"
              value={re}
              onChange={(e) => setRe(e.target.value)}
              className="w-full p-3 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none transition-all"
              placeholder="Digite seu RE"
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-semibold text-slate-700 flex items-center gap-2">
              <Lock size={16} /> Senha
            </label>
            <input
              type="password"
              value={senha}
              onChange={(e) => setSenha(e.target.value)}
              className="w-full p-3 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none transition-all"
              placeholder="••••••••"
            />
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full bg-slate-800 hover:bg-slate-900 text-white font-bold py-3 rounded-lg flex items-center justify-center gap-2 transition-colors disabled:opacity-70"
          >
            {isSubmitting ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              "ENTRAR"
            )}
          </button>
        </form>

        <div className="p-4 bg-slate-50 text-center text-xs text-slate-500 border-t">
          &copy; 2026 1º BPM/RO - Seção de Logística
        </div>
      </div>
    </div>
  );
};

export default Login;
