import React from 'react';
import { Lock, AlertTriangle, CheckCircle2, Wrench, Gauge } from 'lucide-react';

const ViaturaRow = ({ v, getStatus }) => {
  const status = getStatus(v);
  
  // Lógica de cores e ícones baseada no status calculado
  const statusConfig = {
    "BLOQUEADA": {
      bg: "bg-red-600",
      text: "text-white",
      rowBg: "bg-red-50/50",
      icon: <Lock size={12} className="text-red-600" />,
      dot: "bg-red-600"
    },
    "ATENÇÃO ÓLEO": {
      bg: "bg-amber-100",
      text: "text-amber-700",
      rowBg: "hover:bg-amber-50",
      icon: <AlertTriangle size={12} className="text-amber-500" />,
      dot: "bg-amber-500"
    },
    "MANUTENÇÃO": {
      bg: "bg-slate-900",
      text: "text-white",
      rowBg: "bg-slate-50 opacity-80",
      icon: <Wrench size={12} className="text-slate-400" />,
      dot: "bg-slate-400"
    },
    "OK": {
      bg: "bg-emerald-100",
      text: "text-emerald-700",
      rowBg: "hover:bg-slate-50",
      icon: <CheckCircle2 size={12} className="text-emerald-500" />,
      dot: "bg-emerald-500"
    }
  };

  const config = statusConfig[status] || statusConfig["OK"];
  const isBlocked = status === "BLOQUEADA";

  return (
    <div className={`p-4 border-b last:border-0 flex justify-between items-center transition-colors ${config.rowBg}`}>
      
      {/* Lado Esquerdo: Identificação */}
      <div className={`flex flex-col ${isBlocked ? 'opacity-50' : ''}`}>
        <div className="flex items-center gap-2">
          <span className="font-black text-slate-800 tracking-tighter text-base">
            {v.PREFIXO || "S/P"}
          </span>
          {config.icon}
        </div>
        
        <div className="flex items-center gap-2 mt-0.5">
          <p className="text-[9px] text-slate-400 font-bold uppercase tracking-tight">
            {v.PLACA || "SEM PLACA"}
          </p>
          <span className="text-[9px] text-slate-300">•</span>
          <div className="flex items-center gap-1 text-[9px] text-slate-500 font-black uppercase">
            <Gauge size={10} />
            KM {v.ULTIMOKM || 0}
          </div>
        </div>
      </div>

      {/* Lado Direito: Badge de Status */}
      <div className="flex flex-col items-end gap-1">
        <span className={`text-[8px] font-black px-3 py-1 rounded-full shadow-sm flex items-center gap-1.5 ${config.bg} ${config.text} uppercase tracking-widest`}>
          <span className={`w-1.5 h-1.5 rounded-full ${config.dot} border border-white/20`} />
          {status}
        </span>
        
        {/* Aviso de Troca de Óleo se estiver próximo */}
        {status === "ATENÇÃO ÓLEO" && (
          <p className="text-[7px] font-black text-amber-600 uppercase animate-pulse">
            Troca em breve
          </p>
        )}
      </div>
    </div>
  );
};

export default ViaturaRow;
