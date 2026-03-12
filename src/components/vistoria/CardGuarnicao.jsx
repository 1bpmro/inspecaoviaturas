import React from "react";
import { Users } from "lucide-react";

const CardGuarnicao = ({ formData, compacto=false }) => {
  const militares = [
    { l: "MOT", c: "motorista" },
    { l: "CMD", c: "comandante" },
    { l: "PTR", c: "patrulheiro" }
  ];

  return (
    <div className={`${compacto ? "bg-slate-800 p-4 rounded-2xl" : "bg-slate-900 p-6 rounded-[2.5rem]"} mb-4 border-b-[6px] border-blue-600 shadow-xl`}>
      <div className="flex items-center gap-2 mb-4 border-b border-white/10 pb-2">
        <Users className="text-blue-400" size={compacto ? 14 : 18}/>
        <span className="text-[10px] font-black text-white uppercase tracking-[0.2em]">
          Composição da VTR
        </span>
      </div>

      <div className="space-y-2">
        {militares.map(m => (
          <div key={m.l} className="flex items-center gap-3">
            <span className="text-[10px] font-black text-blue-500 w-8 italic">
              {m.l}
            </span>

            <div className="flex-1 px-3 py-2 rounded-xl bg-white/5 border border-white/10 flex justify-between items-center overflow-hidden">
              <span className="text-[10px] text-white font-bold uppercase truncate">
                {formData[`${m.c}_nome`] || "---"}
              </span>
              {formData[`${m.c}_re`] && (
                <span className="text-[8px] text-blue-400 font-black ml-2 tabular-nums">
                  RE {formData[`${m.c}_re`]}
                </span>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
export default CardGuarnicao;
