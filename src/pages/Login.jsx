import React, { useState, useEffect } from 'react';
import { useAuth } from '../lib/AuthContext';
import { gasApi } from '../api/gasClient';
import { Lock, User, Loader2, ArrowRight } from 'lucide-react';
// 1. Importação do Brasão (Certifique-se de que o arquivo está em src/assets/icon-512.png)
import brasaoBpm from '../assets/icon-512.png';

const Login = () => {
  const [re, setRe] = useState('');
  const [senha, setSenha] = useState('');
  const [perfil, setPerfil] = useState(null); 
  const [loadingPerfil, setLoadingPerfil] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const { login } = useAuth();

  // Função para limpar e formatar o RE (inserindo 1000 se necessário)
  const formatarRE = (reRaw) => {
    const apenasNumeros = reRaw.replace(/\D/g, ''); 
    if (!apenasNumeros) return '';
    return apenasNumeros.length <= 6 ? `1000${apenasNumeros}` : apenasNumeros;
  };

  // Checa o perfil automaticamente quando o RE atinge um tamanho mínimo
  useEffect(() => {
    const verificar = async () => {
      const reLimpo = formatarRE(re);
      if (reLimpo.length >= 8) { // Considerando o 1000 + 4 dígitos
        setLoadingPerfil(true);
        const res = await gasApi.checkProfile(reLimpo);
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
    const timer = setTimeout(verificar, 500);
    return () => clearTimeout(timer);
  }, [re]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setIsSubmitting(true);
    
    // Higieniza o RE antes de enviar para o login
    const reFinal = formatarRE(re);
    const result = await login(reFinal, senha);
    
    if (!result.success) setError(result.message);
    setIsSubmitting(false);
  };

  const precisaSenha = perfil === 'ADMIN' || perfil === 'GARAGEIRO';

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-slate-900 p-4 relative">
      <div className="max-w-md w-full bg-white rounded-[2.5rem] shadow-2xl overflow-hidden border-b-[8px] border-blue-600">
        
        {/* CABEÇALHO ATUALIZADO */}
        <div className="bg-slate-800 p-8 text-center">
          {/* 1. Brasão no lugar do emoji */}
          <img 
            src={brasaoBpm} 
            alt="Brasão 1º BPM" 
            className="w-24 h-24 mx-auto mb-4 drop-shadow-2xl object-contain" 
          />
          
          {/* 2. Título: 1º BPM - BATALHÃO RONDON */}
          <h1 className="text-xl font-black text-white uppercase tracking-tighter">
            1º BPM - BATALHÃO RONDON
          </h1>
          
          {/* 3. Subtítulo: Sistema de inspeção de viaturas do 1º BPM - RO */}
          <p className="text-blue-400 text-[10px] font-bold tracking-widest uppercase mt-1">
            Sistema de inspeção de viaturas do 1º BPM - RO
          </p>
        </div>

        <form onSubmit={handleSubmit} className="p-8 space-y-6">
          {error && (
            <div className="bg-red-50 border-l-4 border-red-500 p-3 text-red-700 text-xs font-bold animate-shake">
              {error}
            </div>
          )}

          <div className="relative">
            <label className="text-[10px] font-black text-slate-400 uppercase absolute left-3 top-2">Matrícula (RE)</label>
            <User className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-300" size={20} />
            <input 
              type="text" 
              value={re} 
              onChange={(e) => setRe(e.target.value)} 
              className="w-full pt-7 pb-3 px-3 bg-slate-50 border-2 border-slate-100 focus:border-blue-500 rounded-2xl outline-none font-bold text-xl transition-all"
              placeholder="00000"
            />
            {loadingPerfil && <Loader2 className="absolute right-12 top-1/2 -translate-y-1/2 animate-spin text-blue-500" size={16} />}
          </div>

          {precisaSenha && (
            <div className="relative animate-in slide-in-from-top-4 duration-300">
              <label className="text-[10px] font-black text-slate-400 uppercase absolute left-3 top-2">Senha de Acesso</label>
              <Lock className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-300" size={20} />
              <input 
                type="password" 
                value={senha} 
                onChange={(e) => setSenha(e.target.value)}
                className="w-full pt-7 pb-3 px-3 bg-slate-50 border-2 border-blue-100 focus:border-blue-500 rounded-2xl outline-none font-bold text-xl"
                placeholder="••••••••"
                autoFocus
              />
            </div>
          )}

          <button 
            type="submit" 
            disabled={isSubmitting || (re.length < 3)} 
            className="w-full bg-slate-900 hover:bg-blue-700 text-white font-black py-5 rounded-2xl shadow-lg transition-all flex items-center justify-center gap-3 uppercase tracking-widest disabled:opacity-30 active:scale-95"
          >
            {isSubmitting ? <Loader2 className="animate-spin" /> : (
              <>Acessar <ArrowRight size={20} /></>
            )}
          </button>
        </form>
      </div>

      {/* 4. RODAPÉ (Footer) com Easter Egg potencial */}
      <footer className="mt-8 mb-4">
        <p className="text-[10px] text-slate-500 font-black uppercase tracking-[0.3em] opacity-40 text-center">
          Sistema criado para uso exclusivo do 1º BPM - RO
        </p>
      </footer>
    </div>
  );
};

export default Login;
