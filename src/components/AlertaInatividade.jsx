import React from 'react';
import { AlertTriangle, Timer } from 'lucide-react';

const AlertaInatividade = ({ viaturas }) => {
  const paradas = viaturas.filter(v => v.Status === 'AGUARDANDO');

  return (
    <div className="bg-white rounded-[2.5rem] border border-red-100 shadow-sm p-6">
      <div className="flex items-center gap-2 mb-6">
        <div className="p-2 bg-red-100 text-red-600 rounded-lg">
          <AlertTriangle size={18} />
        </div>
        <p className="text-[10px] font-black uppercase text-red-500 tracking-widest">Alerta de Pátio Parado</p>
      </div>

      <div className="space-y-4">
        {paradas.length > 0 ? paradas.map((v, i) => (
          <div key={i} className="flex justify-between items-center p-3 bg-red-50/50 rounded-xl border border-red-50">
            <div className="flex items-center gap-3">
              <span className="font-black text-slate-800 italic">{v.Prefixo}</span>
              <span className="text-[9px] font-bold bg-white px-2 py-1 rounded border border-red-100 text-red-600 uppercase">Aguardando Conferência</span>
            </div>
            <Timer size={14} className="text-red-300 animate-pulse" />
          </div>
        )) : (
          <p className="text-[10px] text-slate-400 font-bold text-center italic">Pátio fluindo normalmente</p>
        )}
      </div>
    </div>
  );
};

export default AlertaInatividade;
