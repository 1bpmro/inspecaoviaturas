import React from "react";
import { ChevronRight } from "lucide-react";

const ChecklistGrupo = ({
  titulo,
  icon,
  itens,
  checklist,
  onToggle
}) => {

  return (
    <div className="bg-white rounded-3xl p-4 border border-slate-200">

      <div className="flex items-center gap-2 mb-3 text-blue-700">
        {icon}
        <span className="font-black text-[10px] uppercase">
          {titulo}
        </span>
      </div>

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

            <span className={`text-[9px] font-black px-2 py-1 rounded
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
  );
};

export default React.memo(ChecklistGrupo);
