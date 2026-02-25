import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../lib/AuthContext';
import { gasApi } from '../api/gasClient';
import { Lock, User, Loader2, ArrowRight } from 'lucide-react';
import brasaoBpm from '../assets/icon-512.png';

const Login = () => {
  const [re, setRe] = useState('');
  const [senha, setSenha] = useState('');
  const [perfil, setPerfil] = useState(null); 
  const [efetivoLocal, setEfetivoLocal] = useState([]); // Armazena a lista para busca instantânea
  const [loadingPerfil, setLoadingPerfil] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const { login } = useAuth();

  // FORMATAR RE (Mantido original)
  const formatarRE = (reRaw) => {
    const apenasNumeros = reRaw.replace(/\D/g, ''); 
    if (!apenasNumeros) return '';
    return apenasNumeros.length <= 6 ? `1000${apenasNumeros}` : apenasNumeros;
  };

  // 1. CARREGAMENTO INICIAL: Busca a lista de perfis assim que o app abre
  useEffect(() => {
    const carregarEfetivo = async () => {
      setLoadingPerfil(true);
      try {
        const res = await gasApi.getEfetivoCompleto();
        if (res.status === 'success') {
          setEfetivoLocal(res.data);
        }
      } catch (err) {
        console.error("Erro ao sincronizar perfis");
      } finally {
        setLoadingPerfil(false);
      }
    };
    carregarEfetivo();
  }, []);

  // 2. BUSCA INSTANTÂNEA: Verifica o perfil sem chamar a API de novo
  useEffect(() => {
    const reLimpo = formatarRE(re);
    if (reLimpo.length >= 7) {
      // Procura na lista que já foi baixada
      const militar = efetivoLocal.find(m => m.re === reLimpo);
      if (militar) {
        setPerfil(militar.role);
      } else {
        // Se não achar na lista baixada, pode ser um militar novo 
        // Aqui mantemos o fallback para POLICIAL
        setPerfil('POLICIAL');
      }
    } else {
      setPerfil(null);
      setSenha('');
    }
  }, [re, efetivoLocal]);

  const precisaSenha = perfil === 'ADMIN' || perfil === 'GARAGEIRO';

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    
    if (precisaSenha && !senha) {
      setError('SENHA OBRIGATÓRIA PARA ESTE NÍVEL DE ACESSO');
      return;
    }

    setIsSubmitting(true);
    try {
      const reFinal = formatarRE(re);
      const result = await login(reFinal, precisaSenha ? senha : "");
      if (!result.success) {
        setError(result.message);
      }
    } catch (err) {
      setError('ERRO DE COMUNICAÇÃO COM O SERVIDOR');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-[var(--bg-app)] p-4 relative transition-colors duration-500">
      <div className="max-w-md w-full bg-[var(--bg-card)] rounded-[2.5rem] shadow-2xl overflow-hidden border-b-[8px] border-[var(--accent)] border-2 border-[var(--border-color)]">
        
        {/* CABEÇALHO (Mantido original) */}
        <div className="bg-slate-900 dark:bg-slate-950 p-8 text-center transition-colors">
          <img src={brasaoBpm} alt="Brasão 1º BPM" className="w-24 h-24 mx-auto mb-4 drop-shadow-2xl object-contain" />
          <h1 className="text-xl font-black text-white uppercase tracking-tighter">1º BPM - BATALHÃO RONDON</h1>
          <p className="text-blue-400 text-[10px] font-bold tracking-widest uppercase mt-1 opacity-90">
            {loadingPerfil ? "SINCRONIZANDO ACESSOS..." : "Sistema de inspeção de viaturas do 1º BPM - RO"}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="p-8 space-y-6">
          {error && (
            <div className="bg-red-50 dark:bg-red-900/20 border-l-4 border-red-500 p-3 text-red-700 dark:text-red-400 text-xs font-bold animate-pulse rounded-r-lg">
              {error}
            </div>
          )}

          {/* CAMPO RE */}
          <div className="relative">
            <label className="text-[10px] font-black text-[var(--text-muted)] uppercase absolute left-3 top-2">Matrícula (RE)</label>
            <User className="absolute right-4 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" size={20} />
            <input 
              type="text" 
              value={re} 
              onChange={(e) => setRe(e.target.value)} 
              className="vtr-input pt-7 pb-3 px-3 w-full" 
              placeholder="Digite seu RE"
              maxLength={11}
            />
            {/* O loader agora só aparece na sincronização inicial ou se você quiser indicar busca */}
            {loadingPerfil && re.length > 0 && (
              <Loader2 className="absolute right-12 top-1/2 -translate-y-1/2 animate-spin text-[var(--accent)]" size={16} />
            )}
          </div>

          {/* CAMPO SENHA CONDICIONAL (Aparecerá sem delay) */}
          {precisaSenha && (
            <div className="relative animate-in slide-in-from-top-4 duration-300">
              <label className="text-[10px] font-black text-[var(--text-muted)] uppercase absolute left-3 top-2">Senha de Acesso</label>
              <Lock className="absolute right-4 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" size={20} />
              <input 
                type="password" 
                value={senha} 
                onChange={(e) => setSenha(e.target.value)}
                className="vtr-input pt-7 pb-3 px-3 border-[var(--accent)]/30 w-full"
                placeholder="••••••••"
                autoFocus
              />
            </div>
          )}

          <button 
            type="submit" 
            disabled={isSubmitting || (re.length < 3) || loadingPerfil} 
            className={`btn-tatico w-full flex items-center justify-center gap-2 ${isSubmitting ? 'opacity-70' : ''}`}
          >
            {isSubmitting ? <Loader2 className="animate-spin" size={20} /> : <>Acessar <ArrowRight size={20} /></>}
          </button>
        </form>
      </div>

      <footer className="mt-8 mb-4">
        <p className="text-[10px] text-[var(--text-muted)] font-black uppercase tracking-[0.3em] opacity-60 text-center">
          Sistema criado para uso exclusivo do 1º BPM - RO
        </p>
      </footer>
    </div>
  );
};

export default Login;
