import React, { useState, useEffect } from 'react';
import { useAuth } from '../lib/AuthContext';
import { ShieldAlert, LogOut, Play, RefreshCw } from 'lucide-react';

const AlertaInatividade = () => {
  const { logout } = useAuth();
  const [countdown, setCountdown] = useState(30); // 30 segundos para o bloqueio final
  const [isInactive, setIsInactive] = useState(false);

  // CONFIGURAÇÃO RIGOROSA: 5 MINUTOS
  const TEMPO_LIMITE = 5 * 60 * 1000; 

  useEffect(() => {
    let timer;

    const resetTimer = () => {
      setIsInactive(false);
      setCountdown(30);
      clearTimeout(timer);
      
      timer = setTimeout(() => {
        setIsInactive(true);
      }, TEMPO_LIMITE);
    };

    // 1. MONITORAMENTO DE ATIVIDADE
    const events = ['mousedown', 'keydown', 'touchstart', 'scroll', 'click'];
    events.forEach(event => window.addEventListener(event, resetTimer));

    // 2. PROTEÇÃO CONTRA F5 / FECHAR ABA
    // Isso avisa o navegador para tratar o fechamento
    const handleBeforeUnload = (e) => {
      // Opcional: Deslogar imediatamente ao fechar/f5 se quiser segurança máxima
      // logout(); 
      e.preventDefault();
      e.returnValue = ''; // Mostra o alerta padrão do navegador: "Deseja sair?"
    };
    window.addEventListener('beforeunload', handleBeforeUnload);

    resetTimer();

    return () => {
      events.forEach(event => window.removeEventListener(event, resetTimer));
      window.removeEventListener('beforeunload', handleBeforeUnload);
      clearTimeout(timer);
    };
  }, [logout]);

  // Contagem regressiva visual
  useEffect(() => {
    let interval;
    if (isInactive && countdown > 0) {
      interval = setInterval(() => {
        setCountdown(prev => prev - 1);
      }, 1000);
    } else if (countdown === 0) {
      logout(); // Bloqueio total
    }
    return () => clearInterval(interval);
  }, [isInactive, countdown, logout]);

  if (!isInactive) return null;

  return (
    <div className="fixed inset-0 bg-slate-900/95 backdrop-blur-md z-[999] flex items-center justify-center p-6">
      <div className="bg-white w-full max-w-sm rounded-[2.5rem] p-8 text-center shadow-2xl border-t-8 border-amber-500 animate-in fade-in zoom-in duration-300">
        <div className="w-16 h-16 bg-amber-100 text-amber-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
          <ShieldAlert size={32} />
        </div>
        
        <h2 className="font-black text-xl text-slate-800 uppercase tracking-tighter">
          Segurança do Pátio
        </h2>
        <p className="text-slate-500 font-bold text-[10px] uppercase mt-2 px-4">
          Inatividade detectada (5 min). A sessão será encerrada para proteger seus dados.
        </p>

        <div className="my-6 py-4 bg-slate-50 rounded-3xl border border-slate-100">
          <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Bloqueio em</p>
          <span className="text-5xl font-black text-slate-900 tabular-nums">
            {countdown}s
          </span>
        </div>

        <div className="space-y-3">
          <button 
            onClick={() => setIsInactive(false)} 
            className="w-full py-4 bg-slate-900 text-white rounded-2xl font-black uppercase text-xs flex items-center justify-center gap-2 hover:bg-slate-800 transition-all"
          >
            <RefreshCw size={16} /> Manter Conectado
          </button>
          
          <button 
            onClick={logout} 
            className="w-full py-4 text-slate-400 font-black uppercase text-[10px] hover:text-red-500 transition-colors"
          >
            Encerrar Sessão Agora
          </button>
        </div>
      </div>
    </div>
  );
};

export default AlertaInatividade;
