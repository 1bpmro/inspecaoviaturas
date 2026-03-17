import React, { useState } from "react";

const ModalOleo = ({ isOpen, onClose, onSave }) => {
  const [status, setStatus] = useState("");
  const [quantidade, setQuantidade] = useState("");
  const [obs, setObs] = useState("");

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[110] bg-slate-900/90 flex items-center justify-center p-6">
      <div className="bg-white w-full max-w-sm rounded-2xl p-6 shadow-2xl">

        <h3 className="text-center font-black text-xs mb-4 uppercase">
          Verificação de Óleo
        </h3>

        <div className="space-y-2">
          {["OK", "BAIXO", "COMPLETADO"].map(op => (
            <button
              key={op}
              onClick={() => setStatus(op)}
              className={`w-full p-3 rounded-xl border font-bold text-xs ${
                status === op ? "bg-blue-100 border-blue-500" : "bg-slate-100"
              }`}
            >
              {op}
            </button>
          ))}
        </div>

        {status === "COMPLETADO" && (
          <input
            placeholder="Quantidade (ml)"
            className="vtr-input w-full mt-3"
            value={quantidade}
            onChange={(e) => setQuantidade(e.target.value)}
          />
        )}

        <input
          placeholder="Observação (opcional)"
          className="vtr-input w-full mt-3"
          value={obs}
          onChange={(e) => setObs(e.target.value)}
        />

        <div className="flex gap-2 mt-4">
          <button
            onClick={onClose}
            className="flex-1 text-xs font-bold text-slate-400"
          >
            Cancelar
          </button>

          <button
            onClick={() => onSave({ status, quantidade, obs })}
            className="flex-1 bg-blue-600 text-white text-xs font-bold rounded-xl p-2"
          >
            Salvar
          </button>
        </div>
      </div>
    </div>
  );
};

export default ModalOleo;
