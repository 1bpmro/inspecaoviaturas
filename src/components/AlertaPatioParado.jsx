import React from 'react';
import { AlertTriangle, Timer, ArrowRight } from 'lucide-react';

const AlertaPatioParado = ({ viaturas = [] }) => {
  // Filtra as viaturas que estão com status de conferência pendente
  // Adaptado para os nomes de campos que usamos no Firebase
  const paradas = viaturas.filter(v => 
    (v.status === 'AGUARDANDO' || v.status === 'EM_CONFERENCIA')
  ); 

  return (
    <div className="bg-white rounded-[2.5rem] border border-red-100 shadow-sm p-6 animate-in fade-in duration-500">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <div className="p-2 bg-red-500 text-white rounded-xl shadow-lg shadow-red-200">
            <AlertTriangle size={18} />
          </div>
          <div>
            <p className="text-[10px] font-black uppercase text-red-600 tracking-widest leading-none">Fila de Espera</p>
            <p className="text-[8px] font-bold text-slate-400 uppercase tracking-tighter">Conferência de Pátio</p>
          </div>
        </div>
        {paradas.length > 0 && (
          <span className="bg-red-100 text-red-600 text-[10px] font-black px-2 py-1 rounded-lg">
            {paradas.length} VTRs
          </span>
        )}
      </div>

      <div className="space-y-3">
        {paradas.length > 0 ? (
          paradas.map((v, i) => (
            <div 
              key={v.id || i} 
              className="group flex justify-between items-center p-4 bg-slate-50 rounded-2xl border border-slate-100 hover:border-red-200 transition-all cursor-pointer"
            >
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center border shadow-sm group-hover:bg-red-50 transition-colors">
                  <span className="font-black text-slate-800 italic text-sm">
                    {v.prefixo?.split('-')[1] || v.prefixo || '??'}
                  </span>
                </div>
                <div>
                  <p className="font-black text-slate-900 text-[11px] uppercase italic">
                    {v.prefixo}
                  </p>
                  <p className="text-[8px] font-bold text-red-500 uppercase tracking-tighter flex items-center gap-1">
                    <Timer size={10} className="animate-pulse" /> Aguardando Garageiro
                  </p>
                </div>
              </div>
              <ArrowRight size={14} className="text-slate-300 group-hover:text-red-400 transform group-hover:translate-x-1 transition-all" />
            </div>
          ))
        ) : (
          <div className="py-8 text-center border-2 border-dashed border-slate-100 rounded-[2rem]">
            <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest">Pátio Limpo</p>
            <p className="text-[8px] text-slate-300 font-bold uppercase mt-1">Sem vistorias pendentes</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default AlertaPatioParado;
