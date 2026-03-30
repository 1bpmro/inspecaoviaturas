import React, { useState } from "react";
import { X, AlertTriangle, Loader2 } from "lucide-react";
import { gasApi } from "../../api/gasClient";

const GarageiroPowerModal = ({ viatura, onClose, user, onSuccess }) => {
  const [loading, setLoading] = useState(false);
  const [motivo, setMotivo] = useState("");
  const [km, setKm] = useState("");
  const [confirmText, setConfirmText] = useState("");

  if (!viatura) return null;

  // Normalização do prefixo
  const prefixoOriginal = viatura.PREFIXO || "";
  const prefixoAlvo = prefixoOriginal.toString().trim().toUpperCase();

  const executarAcao = async (acaoParaGAS) => {
    // Validação de Prefixo
    if (confirmText.trim().toUpperCase() !== prefixoAlvo) {
      alert(`Confirmação incorreta. Digite exatamente: ${prefixoAlvo}`);
      return;
    }

    if (!motivo.trim()) {
      alert("Por favor, informe o motivo da alteração.");
      return;
    }

    setLoading(true);

    try {
      /**
       * AJUSTE PRINCIPAL: 
       * Alterado de 'alterarStatusVtr' para 'forcarAcaoViatura' 
       * para bater com o seu gasClient.js
       */
      const response = await gasApi.forcarAcaoViatura({
        prefixo: prefixoAlvo,
        acao: acaoParaGAS, // "LIBERAR" ou "BAIXAR"
        motivo: `AÇÃO GARAGEIRO: ${motivo.trim().toUpperCase()}`,
        garageiro_re: `${user?.re || 'NI'} - ${user?.nome || 'SISTEMA'}`,
        km_registro: km ? Number(km) : null
      });

      if (response.status === "success" || response.status === "ok") {
        onSuccess?.();
        onClose();
      } else {
        throw new Error(response.message || "Erro retornado pelo servidor.");
      }
    } catch (e) {
      console.error("Erro na ação do garageiro:", e);
      alert("Falha ao processar ação. Verifique a conexão com a planilha.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/80 z-[110] flex items-center justify-center p-4 backdrop-blur-sm">
      <div className="bg-white rounded-[2.5rem] w-full max-w-md p-8 shadow-2xl animate-in zoom-in-95 duration-200">
        
        {/* HEADER */}
        <div className="flex justify-between items-center mb-6">
          <div className="flex items-center gap-2 text-slate-900">
            <span className="text-xl">🚨</span>
            <h2 className="font-black text-sm uppercase tracking-tighter">Ações Avançadas</h2>
          </div>
          <button 
            onClick={onClose} 
            className="p-2 hover:bg-slate-100 rounded-full transition-colors"
            disabled={loading}
          >
            <X size={20} />
          </button>
        </div>

        {/* INFO CARD */}
        <div className="mb-6 p-4 bg-slate-50 rounded-2xl border border-slate-100">
          <p className="text-[10px] font-black text-slate-400 uppercase mb-1">Viatura Selecionada</p>
          <div className="text-2xl font-black text-slate-900">{prefixoAlvo}</div>
        </div>

        {/* FORMULÁRIO */}
        <div className="space-y-4">
          <div>
            <label className="text-[10px] font-black text-slate-500 uppercase ml-2">Motivo da Alteração</label>
            <textarea
              placeholder="EX: PNEU FURADO, TROCA DE ÓLEO, ETC..."
              className="w-full p-4 bg-slate-100 rounded-2xl text-xs font-bold focus:ring-2 focus:ring-blue-500 outline-none transition-all min-h-[80px]"
              value={motivo}
              onChange={(e) => setMotivo(e.target.value.toUpperCase())}
              disabled={loading}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-[10px] font-black text-slate-500 uppercase ml-2">KM Atual (Opcional)</label>
              <input
                type="number"
                placeholder="00000"
                className="w-full p-4 bg-slate-100 rounded-2xl text-xs font-bold outline-none"
                value={km}
                onChange={(e) => setKm(e.target.value)}
                disabled={loading}
              />
            </div>
            <div>
              <label className="text-[10px] font-black text-red-500 uppercase ml-2">Confirmar Prefixo</label>
              <input
                placeholder={prefixoAlvo}
                className="w-full p-4 bg-red-50 border-2 border-red-100 rounded-2xl text-xs font-black text-red-600 outline-none focus:border-red-400 transition-all"
                value={confirmText}
                onChange={(e) => setConfirmText(e.target.value.toUpperCase())}
                disabled={loading}
              />
            </div>
          </div>
        </div>

        {/* BOTÕES DE AÇÃO */}
        <div className="grid grid-cols-2 gap-3 mt-8">
          <button
            disabled={loading}
            onClick={() => executarAcao("LIBERAR")}
            className="flex items-center justify-center gap-2 bg-emerald-500 hover:bg-emerald-600 disabled:bg-slate-300 text-white p-4 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all active:scale-95"
          >
            {loading ? <Loader2 className="animate-spin" size={16} /> : "LIBERAR VTR"}
          </button>

          <button
            disabled={loading}
            onClick={() => executarAcao("BAIXAR")}
            className="bg-slate-900 hover:bg-red-600 disabled:bg-slate-300 text-white p-4 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all active:scale-95"
          >
            {loading ? <Loader2 className="animate-spin" size={16} /> : "BAIXAR MANUT."}
          </button>

          <button
            disabled={loading}
            onClick={() => executarAcao("BLOQUEAR")}
            className="bg-orange-500 hover:bg-orange-600 disabled:bg-slate-300 text-white p-4 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all active:scale-95"
          >
            {loading ? <Loader2 className="animate-spin" size={16} /> : "OFICINA / EXT"}
          </button>

          <button
            disabled={loading}
            onClick={() => executarAcao("LIBERAR")}
            className="border-2 border-slate-200 text-slate-400 hover:bg-blue-50 hover:text-blue-600 hover:border-blue-200 p-4 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all"
          >
             {loading ? <Loader2 className="animate-spin" size={16} /> : "FORÇAR STATUS"}
          </button>
        </div>
      </div>
    </div>
  );
};

export default GarageiroPowerModal;
