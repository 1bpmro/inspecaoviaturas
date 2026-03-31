import React, { useState } from "react";
import { X, Loader2 } from "lucide-react";
import { gasApi } from "../../api/gasClient";
import { db } from "../../lib/firebase"; // Importe seu db
import { doc, updateDoc } from "firebase/firestore";

const GarageiroPowerModal = ({ viatura, onClose, user, onSuccess }) => {
  const [loading, setLoading] = useState(false);
  const [motivo, setMotivo] = useState("");
  const [km, setKm] = useState("");
  const [confirmText, setConfirmText] = useState("");

  if (!viatura) return null;

  const prefixoAlvo = (viatura.PREFIXO || "").toString().trim().toUpperCase();

  const executarAcao = async (acaoParaGAS) => {
    if (confirmText.trim().toUpperCase() !== prefixoAlvo) {
      alert(`Confirmação incorreta. Digite: ${prefixoAlvo}`);
      return;
    }

    if (!motivo.trim()) {
      alert("Informe o motivo.");
      return;
    }

    setLoading(true);

    try {
      // 1. Envia para o Google Sheets
      const response = await gasApi.forcarAcaoViatura({
        prefixo: prefixoAlvo,
        acao: acaoParaGAS,
        motivo: `GARAGEIRO: ${motivo.trim().toUpperCase()}`,
        garageiro_re: `${user?.re || 'NI'} - ${user?.nome || 'SISTEMA'}`,
        km_registro: km ? Number(km) : null
      });

      if (response.status === "success" || response.status === "ok") {
        
        // 2. Sincronização Forçada com Firebase para limpar a guarnição
        try {
          const vtrRef = doc(db, "viaturas", prefixoAlvo);
          await updateDoc(vtrRef, {
            status: acaoParaGAS === "LIBERAR" ? "DISPONIVEL" : "MANUTENCAO",
            comandante: "RESERVA", // Limpa para não ficar "Não Informado"
            motorista: "RESERVA",
            patrulheiro: "RESERVA",
            atualizadoEm: new Date().toISOString()
          });
        } catch (fbErr) {
          console.warn("Erro ao sincronizar Firebase, mas Planilha OK.");
        }

        onSuccess?.();
        onClose();
      } else {
        alert("Erro na Planilha: " + response.message);
      }
    } catch (e) {
      alert("Erro de conexão. Verifique a internet.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/80 z-[110] flex items-center justify-center p-4 backdrop-blur-sm">
      <div className="bg-white rounded-[2.5rem] w-full max-w-md p-8 shadow-2xl animate-in zoom-in-95">
        
        <div className="flex justify-between items-center mb-6">
          <h2 className="font-black text-sm uppercase tracking-tighter">🚨 Ações do Garageiro</h2>
          <button onClick={onClose} disabled={loading} className="p-2 hover:bg-slate-100 rounded-full">
            <X size={20} />
          </button>
        </div>

        <div className="mb-6 p-4 bg-slate-50 rounded-2xl border border-slate-100 text-center">
          <p className="text-[10px] font-black text-slate-400 uppercase">Viatura</p>
          <div className="text-3xl font-black text-slate-900">{prefixoAlvo}</div>
        </div>

        <div className="space-y-4">
          <textarea
            placeholder="MOTIVO (PNEU, ÓLEO, REVISÃO...)"
            className="w-full p-4 bg-slate-100 rounded-2xl text-xs font-bold outline-none min-h-[80px]"
            value={motivo}
            onChange={(e) => setMotivo(e.target.value.toUpperCase())}
            disabled={loading}
          />

          <div className="grid grid-cols-2 gap-4">
            <input
              type="number"
              placeholder="KM"
              className="w-full p-4 bg-slate-100 rounded-2xl text-xs font-bold outline-none"
              value={km}
              onChange={(e) => setKm(e.target.value)}
              disabled={loading}
            />
            <input
              placeholder="CONFIRMAR"
              className="w-full p-4 bg-red-50 border-2 border-red-100 rounded-2xl text-xs font-black text-red-600 outline-none"
              value={confirmText}
              onChange={(e) => setConfirmText(e.target.value.toUpperCase())}
              disabled={loading}
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 mt-8">
          <button
            disabled={loading}
            onClick={() => executarAcao("LIBERAR")}
            className="bg-emerald-500 text-white p-4 rounded-2xl text-[10px] font-black uppercase flex items-center justify-center gap-2"
          >
            {loading ? <Loader2 className="animate-spin" size={16} /> : "LIBERAR"}
          </button>

          <button
            disabled={loading}
            onClick={() => executarAcao("BAIXAR")}
            className="bg-slate-900 text-white p-4 rounded-2xl text-[10px] font-black uppercase flex items-center justify-center gap-2"
          >
            {loading ? <Loader2 className="animate-spin" size={16} /> : "BAIXAR"}
          </button>
        </div>
      </div>
    </div>
  );
};

export default GarageiroPowerModal;
