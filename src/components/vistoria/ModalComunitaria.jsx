import React from "react";

const OPCOES_COMUNITARIA = [
  "Patrulha Comercial",
  "Base Móvel",
  "Patrulha Escolar"
];

const ModalComunitaria = ({ isOpen, onSelect, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[110] bg-slate-900/90 backdrop-blur-sm flex items-center justify-center p-6">
      <div className="bg-white w-full max-w-xs rounded-[2rem] p-6 shadow-2xl border-t-8 border-blue-600">
        <h3 className="text-center font-black text-slate-800 uppercase text-xs mb-4">
          Selecionar Modalidade
        </h3>

        <div className="space-y-2">
          {OPCOES_COMUNITARIA.map(opcao => (
            <button
              key={opcao}
              onClick={() => onSelect(opcao.toUpperCase())}
              className="w-full p-4 bg-slate-100 hover:bg-blue-50 text-slate-700 font-bold rounded-2xl text-[10px] uppercase border"
            >
              {opcao}
            </button>
          ))}
        </div>

        <button
          onClick={onClose}
          className="w-full mt-4 text-[10px] font-black text-slate-400 uppercase"
        >
          Cancelar
        </button>
      </div>
    </div>
  );
};

export default ModalComunitaria;
