import React, { useState } from "react";
import { ChevronDown } from "lucide-react";

const ChecklistGrupo = ({ titulo, icon, itens, checklist, onToggle }) => {
  const [aberto, setAberto] = useState(false);

  return (
    <div className="bg-white rounded-[2rem] border border-slate-200 overflow-hidden shadow-sm mb-3">
      <div
        onClick={() => setAberto(!aberto)}
        className={`flex items-center justify-between p-5 cursor-pointer transition-colors ${aberto ? 'bg-slate-50' : ''}`}
      >
        <div className="flex items-center gap-3 text-slate-800">
          <div className="text-blue-600">{icon}</div>
          <span className="font-black text-[11px] uppercase tracking-tighter">
            {titulo}
          </span>
        </div>
        <ChevronDown size={18} className={`text-slate-400 transition-transform duration-300 ${aberto ? "rotate-180" : ""}`} />
      </div>

      {aberto && (
        <div className="px-4 pb-4 space-y-2 animate-in slide-in-from-top-2 duration-200">
          {itens.map(item => {
            const status = checklist[item] || "PENDENTE"; // Estado inicial neutro

            return (
              <div
                key={item}
                onClick={() => onToggle(item)}
                className={`flex justify-between items-center p-4 rounded-2xl border-2 cursor-pointer transition-all active:scale-[0.98]
                ${status === "FALHA" ? "border-red-500 bg-red-50" : 
                  status === "OK" ? "border-emerald-500 bg-emerald-50" : "border-slate-100 bg-slate-50"}`}
              >
                <span className={`text-[11px] font-black uppercase ${status === "PENDENTE" ? "text-slate-400" : "text-slate-800"}`}>
                  {item}
                </span>

                <div className={`text-[9px] font-black px-3 py-1 rounded-full uppercase tracking-widest
                  ${status === "OK" ? "bg-emerald-600 text-white" : 
                    status === "FALHA" ? "bg-red-600 text-white" : "bg-slate-200 text-slate-500"}`}
                >
                  {status === "PENDENTE" ? "TOQUE P/ VALIDAR" : status}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default React.memo(ChecklistGrupo);
