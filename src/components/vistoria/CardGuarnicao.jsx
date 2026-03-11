import React from "react";
import { Users } from "lucide-react";

const CardGuarnicao = ({ formData, compacto=false }) => {

  const militares = [
    { l: "MOT", c: "motorista" },
    { l: "CMD", c: "comandante" },
    { l: "PTR", c: "patrulheiro" }
  ];

  return (
    <div className={`${compacto ? "bg-slate-800 p-3 rounded-2xl" : "bg-slate-900 p-5 rounded-3xl"} mb-4 border-b-4 border-blue-600`}>
      
      <div className="flex items-center gap-2 mb-2 border-b border-white/10 pb-1">
        <Users className="text-blue-400" size={compacto ? 14 : 18}/>
        <span className="text-[10px] font-black text-white uppercase">
          Guarnição
        </span>
      </div>

      {militares.map(m => (
        <div key={m.l} className="flex items-center mb-1">
          <span className="text-[9px] font-black text-blue-500 w-8">
            {m.l}
          </span>

          <div className="flex-1 px-2 py-1 rounded bg-white/5 border border-white/10">
            <span className="text-[10px] text-white font-bold uppercase truncate block">
              {formData[`${m.c}_nome`] || "---"}
            </span>
          </div>
        </div>
      ))}

    </div>
  );
};

export default CardGuarnicao;
