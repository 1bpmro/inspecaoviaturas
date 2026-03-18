import React, { useMemo } from 'react';
import { ChevronRight, Clock, User, HardHat, Zap } from 'lucide-react';

const VistoriaCard = ({ v, onAnalisar }) => {
  // Lógica de cálculo de tempo de espera (Relógio em Tempo Real)
  const espera = useMemo(() => {
    const min = Math.floor((new Date() - new Date(v.data_hora)) / 60000);
    
    if (min > 30) return { 
      label: `${min} MIN`, 
      classe: "bg-red-600 animate-pulse text-white shadow-red-200", 
      border: "border-red-500",
      urgencia: "CRÍTICA" 
    };
    if (min > 15) return { 
      label: `${min} MIN`, 
      classe: "bg-amber-500 text-slate-900 shadow-amber-200", 
      border: "border-amber-400",
      urgencia: "ALERTA" 
    };
    return { 
      label: `${min} MIN`, 
      classe: "bg-emerald-100 text-emerald-700", 
      border: "border-slate-200",
      urgencia: "NORMAL" 
    };
  }, [v.data_hora]);

  return (
    <div className={`group bg-white rounded-[2.5rem] border-2 ${espera.border} p-6 shadow-sm hover:shadow-xl transition-all duration-300 relative overflow-hidden`}>
      
      {/* Indicador Visual de Urgência (Faixa Lateral) */}
      <div className={`absolute top-0 left-0 w-1.5 h-full ${espera.classe.split(' ')[0]}`} />

      <div className="flex justify-between items-start mb-6">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <HardHat size={12} className="text-slate-400" />
            <span className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em]">Pátio / Check-in</span>
          </div>
          <h2 className="text-5xl font-black text-slate-900 tracking-tighter group-hover:text-amber-600 transition-colors">
            {v.prefixo_vtr}
          </h2>
        </div>
        
        {/* Badge de Tempo com Sombra Dinâmica */}
        <div className={`flex flex-col items-end gap-1`}>
          <span className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase shadow-lg flex items-center gap-1.5 ${espera.classe}`}>
            <Clock size={12} />
            {espera.label}
          </span>
          <span className="text-[7px] font-black text-slate-300 tracking-widest mr-2 uppercase">Tempo de Fila</span>
        </div>
      </div>

      {/* Info do Motorista com Card Interno */}
      <div className="bg-slate-50 p-4 rounded-3xl border border-slate-100 mb-6 flex items-center gap-4 group-hover:bg-slate-100 transition-colors">
        <div className="w-12 h-12 rounded-2xl bg-white shadow-sm flex items-center justify-center text-slate-400">
          <User size={24} />
        </div>
        <div className="overflow-hidden">
          <p className="text-[8px] font-black text-slate-400 uppercase tracking-tighter leading-none mb-1">Responsável pela Entrega</p>
          <p className="text-sm font-black text-slate-700 truncate uppercase leading-tight">
            {v.motorista_nome || "NÃO INFORMADO"}
          </p>
        </div>
      </div>

      {/* Detalhes do Serviço em Grid */}
      <div className="grid grid-cols-2 gap-4 mb-6 px-2">
        <div>
          <p className="text-[7px] font-black text-slate-400 uppercase tracking-widest mb-1 font-mono">Tipo de Serviço</p>
          <div className="flex items-center gap-1">
             <Zap size={10} className="text-amber-500" />
             <p className="text-[10px] font-black text-slate-600 uppercase">{v.tipo_servico || "ROTINA"}</p>
          </div>
        </div>
        <div className="text-right">
          <p className="text-[7px] font-black text-slate-400 uppercase tracking-widest mb-1 font-mono">Hodômetro Lido</p>
          <p className="text-[10px] font-black text-slate-900 uppercase">KM {v.hodometro || "---"}</p>
        </div>
      </div>

      {/* Botão de Ação Principal */}
      <button 
        onClick={onAnalisar}
        className="w-full bg-slate-900 hover:bg-amber-500 text-white hover:text-slate-900 py-5 rounded-[1.8rem] font-black uppercase text-[11px] flex items-center justify-center gap-3 active:scale-95 transition-all shadow-lg hover:shadow-amber-200"
      >
        Iniciar Conferência 
        <ChevronRight size={16} strokeWidth={3} />
      </button>

    </div>
  );
};

export default VistoriaCard;
