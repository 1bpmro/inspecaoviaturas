import React, { useState } from "react";
import { X, Upload, Check } from "lucide-react";

const ModalTrocaOleo = ({
  isOpen,
  onClose,
  onConfirm,
  kmAtual
}) => {

  const hoje = new Date().toISOString().slice(0,10);

  const [dataTroca, setDataTroca] = useState(hoje);
  const [kmTroca, setKmTroca] = useState(kmAtual || "");
  const [foto, setFoto] = useState(null);
  const [preview, setPreview] = useState(null);

  if (!isOpen) return null;

  const handleFoto = (file) => {
    if (!file) return;

    const reader = new FileReader();
    reader.onloadend = () => {
      setFoto(reader.result);
      setPreview(reader.result);
    };
    reader.readAsDataURL(file);
  };

  const handleConfirmar = () => {
    if (!dataTroca || !kmTroca || !foto) {
      alert("Preencha todos os campos");
      return;
    }

    onConfirm({
      dataTroca,
      kmTroca,
      foto
    });
  };

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50">

      <div className="bg-slate-900 p-6 rounded-2xl w-full max-w-md border border-white/10">

        {/* HEADER */}
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-white font-bold text-sm">
            TROCA DE ÓLEO OBRIGATÓRIA
          </h2>
          <button onClick={onClose}>
            <X className="text-white"/>
          </button>
        </div>

        {/* DATA */}
        <div className="mb-3">
          <label className="text-xs text-white/60">Data da troca</label>
          <input
            type="date"
            value={dataTroca}
            onChange={(e)=>setDataTroca(e.target.value)}
            className="vtr-input w-full"
          />
        </div>

        {/* KM */}
        <div className="mb-3">
          <label className="text-xs text-white/60">KM da troca</label>
          <input
            type="number"
            value={kmTroca}
            onChange={(e)=>setKmTroca(e.target.value)}
            className="vtr-input w-full"
          />
        </div>

        {/* FOTO */}
        <div className="mb-4">
          <label className="text-xs text-white/60">
            Comprovante
          </label>

          <label className="flex items-center justify-center border border-dashed border-white/20 rounded-xl p-4 cursor-pointer mt-2">
            <input
              type="file"
              hidden
              onChange={(e)=>handleFoto(e.target.files[0])}
            />
            <Upload className="text-white/50"/>
          </label>

          {preview && (
            <img src={preview} className="mt-2 rounded-xl"/>
          )}
        </div>

        {/* ACTIONS */}
        <button
          onClick={handleConfirmar}
          className="btn-tatico w-full flex items-center justify-center gap-2"
        >
          <Check size={16}/>
          CONFIRMAR TROCA
        </button>

      </div>
    </div>
  );
};

export default ModalTrocaOleo;
