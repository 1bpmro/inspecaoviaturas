import React, { useState } from "react";
import { ChevronDown } from "lucide-react";

const ChecklistGrupo = ({
  titulo,
  icon,
  itens,
  checklist,
  onToggle
}) => {

  const [aberto, setAberto] = useState(false);

  return (
    <div className="bg-white rounded-3xl border border-slate-200 overflow-hidden">

      <div
        onClick={() => setAberto(!aberto)}
        className="flex items-center justify-between p-4 cursor-pointer"
      >

        <div className="flex items-center gap-2 text-blue-700">
          {icon}
          <span className="font-black text-[10px] uppercase">
            {titulo}
          </span>
        </div>

        <ChevronDown
          size={18}
          className={`transition-transform ${aberto ? "rotate-180" : ""}`}
        />

      </div>

      {aberto && (
        <div className="px-4 pb-4">

          {itens.map(item => {

            const status = checklist[item];

            return (
              <div
                key={item}
                onClick={() => onToggle(item)}
                className={`flex justify-between items-center p-3 mb-1 rounded-xl border cursor-pointer transition-all
                ${status === "FALHA"
                  ? "border-red-500 bg-red-50"
                  : "bg-slate-50 border-transparent"
                }`}
              >

                <span className="text-[11px] font-bold uppercase">
                  {item}
                </span>

                <span
                  className={`text-[9px] font-black px-2 py-1 rounded
                  ${status === "OK"
                    ? "text-green-600"
                    : "bg-red-600 text-white"
                  }`}
                >
                  {status}
                </span>

              </div>
            );

          })}

        </div>
      )}

    </div>
  );
};

export default React.memo(ChecklistGrupo);
