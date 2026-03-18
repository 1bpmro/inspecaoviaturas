import React, { useState } from "react";
import { X, Upload, Check, Loader2 } from "lucide-react";

// Função de compressão interna para garantir leveza no upload
const comprimirImagemDoc = (base64) => {
  return new Promise((resolve) => {
    const img = new Image();
    img.src = base64;
    img.onload = () => {
      const canvas = document.createElement("canvas");
      let width = img.width;
      let height = img.height;
      const MAX_SIZE = 1280; 

      if (width > height) {
        if (width > MAX_SIZE) {
          height *= MAX_SIZE / width;
          width = MAX_SIZE;
        }
      } else {
        if (height > MAX_SIZE) {
          width *= MAX_SIZE / height;
          height = MAX_SIZE;
        }
      }

      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext("2d");
      ctx.drawImage(img, 0, 0, width, height);
      // 0.8 de qualidade para manter leitura de textos da nota/etiqueta
      resolve(canvas.toDataURL("image/jpeg", 0.8));
    };
  });
};

const ModalTrocaOleo = ({
  isOpen,
  onClose,
  onConfirm,
  kmAtual
}) => {
  const hoje = new Date().toISOString().slice(0, 10);

  const [dataTroca, setDataTroca] = useState(hoje);
  const [kmTroca, setKmTroca] = useState(kmAtual || "");
  const [foto, setFoto] = useState(null);
  const [preview, setPreview] = useState(null);
  const [processando, setProcessando] = useState(false);

  if (!isOpen) return null;

  const handleFoto = async (file) => {
    if (!file) return;

    setProcessando(true);
    const reader = new FileReader();
    
    reader.onloadend = async () => {
      const base64Original = reader.result;
      // Comprime antes de salvar no estado para não estourar a RAM
      const fotoComprimida = await comprimirImagemDoc(base64Original);
      setFoto(fotoComprimida);
      setPreview(fotoComprimida);
      setProcessando(false);
    };
    
    reader.readAsDataURL(file);
  };

  const handleConfirmar = () => {
    if (!dataTroca || !kmTroca || !foto) {
      alert("Preencha todos os campos e tire a foto do comprovante.");
      return;
    }

    onConfirm({
      dataTroca,
      kmTroca,
      foto
    });
  };

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-[100] p-4">
      <div className="bg-slate-900 p-6 rounded-2xl w-full max-w-md border border-white/10 shadow-2xl">
        
        {/* HEADER */}
        <div className="flex justify-between items-center mb-6">
          <div className="flex flex-col">
            <h2 className="text-white font-black text-xs tracking-widest uppercase">
              Alerta de Manutenção
            </h2>
            <span className="text-[10px] text-orange-400 font-bold uppercase">Troca de Óleo Obrigatória</span>
          </div>
          <button onClick={onClose} className="p-1 hover:bg-white/10 rounded-full transition-colors">
            <X className="text-white" size={20}/>
          </button>
        </div>

        {/* DATA */}
        <div className="mb-4">
          <label className="text-[10px] font-bold text-white/50 uppercase mb-1 block">Data da troca</label>
          <input
            type="date"
            value={dataTroca}
            onChange={(e) => setDataTroca(e.target.value)}
            className="vtr-input w-full bg-slate-800 border-white/10 text-white"
          />
        </div>

        {/* KM */}
        <div className="mb-4">
          <label className="text-[10px] font-bold text-white/50 uppercase mb-1 block">KM da troca registrada</label>
          <input
            type="number"
            value={kmTroca}
            onChange={(e) => setKmTroca(e.target.value)}
            className="vtr-input w-full bg-slate-800 border-white/10 text-white"
            placeholder="Ex: 45000"
          />
        </div>

        {/* FOTO */}
        <div className="mb-6">
          <label className="text-[10px] font-bold text-white/50 uppercase mb-1 block">
            Foto do Comprovante / Etiqueta
          </label>

          <label className={`flex flex-col items-center justify-center border-2 border-dashed rounded-xl p-6 cursor-pointer mt-2 transition-all ${preview ? 'border-green-500/50 bg-green-500/5' : 'border-white/20 hover:bg-white/5'}`}>
            <input
              type="file"
              accept="image/*"
              capture="environment" // Abre direto a câmera no Android/iOS
              hidden
              onChange={(e) => handleFoto(e.target.files[0])}
              disabled={processando}
            />
            
            {processando ? (
              <Loader2 className="text-white animate-spin" size={24}/>
            ) : preview ? (
              <Check className="text-green-500" size={24}/>
            ) : (
              <Upload className="text-white/50" size={24}/>
            )}
            
            <span className="text-[10px] font-bold text-white/40 mt-2 uppercase">
              {processando ? "Processando..." : preview ? "Foto Capturada" : "Clique para tirar foto"}
            </span>
          </label>

          {preview && (
            <div className="mt-3 relative rounded-xl overflow-hidden border border-white/10 aspect-video">
              <img src={preview} className="w-full h-full object-cover" alt="preview óleo"/>
            </div>
          )}
        </div>

        {/* ACTIONS */}
        <button
          onClick={handleConfirmar}
          disabled={processando}
          className="btn-tatico w-full py-4 flex items-center justify-center gap-2 bg-orange-600 hover:bg-orange-700 text-white shadow-lg disabled:opacity-50"
        >
          {processando ? <Loader2 className="animate-spin" size={18}/> : <Check size={18}/>}
          CONFIRMAR E FINALIZAR
        </button>
      </div>
    </div>
  );
};

export default ModalTrocaOleo;
