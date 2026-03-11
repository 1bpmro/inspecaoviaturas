import React from "react";
import { ChevronRight } from "lucide-react";

const ChecklistGrupo = ({
  titulo,
  itens,
  respostas,
  onToggle
}) => {

  return (
    <div className="bg-slate-900 rounded-3xl p-4 mb-4 border-b-4 border-blue-600">

      <div className="flex items-center justify-between mb-3 border-b border-white/10 pb-2">
        <h3 className="text-[10px] font-black text-white uppercase">
          {titulo}
        </h3>
        <ChevronRight size={16} className="text-blue-400"/>
      </div>

      <div className="space-y-2">

        {itens.map(item => {

          const marcado = respostas[item] === true;

          return (
            <button
              key={item}
              onClick={() => onToggle(item)}
              className={`w-full flex items-center justify-between p-3 rounded-2xl border text-[10px] font-bold uppercase transition
              ${marcado
                ? "bg-green-600 border-green-500 text-white"
                : "bg-white/5 border-white/10 text-white"
              }`}
            >

              <span className="text-left flex-1">
                {item}
              </span>

              <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center
                ${marcado
                  ? "border-white bg-white"
                  : "border-white/30"
                }`}
              >
              </div>

            </button>
          );

        })}

      </div>

    </div>
  );
};

export default React.memo(ChecklistGrupo);
