import React, { useState } from "react";
import { X, AlertTriangle } from "lucide-react";
import { gasApi } from "../../api/gasClient";

const GarageiroPowerModal = ({ viatura, onClose, user, onSuccess }) => {
  const [loading, setLoading] = useState(false);
  const [motivo, setMotivo] = useState("");
  const [km, setKm] = useState("");
  const [confirmText, setConfirmText] = useState("");

  if (!viatura) return null;

  const prefixo = viatura.PREFIXO;

  const executarAcao = async (acao) => {
    if (confirmText !== prefixo) {
      alert("Digite o PREFIXO para confirmar.");
      return;
    }

    if (!motivo.trim()) {
      alert("Motivo obrigatório.");
      return;
    }

    setLoading(true);

    try {
      await gasApi.alterarStatusVtr(prefixo, acao, {
        motivo: `AÇÃO GARAGEIRO: ${motivo}`,
        re_responsavel: `${user?.re} - ${user?.nome}`,
        km_registro: km ? Number(km) : null
      });

      onSuccess?.();
      onClose();
    } catch (e) {
      alert("Erro na ação.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl w-full max-w-md p-6 shadow-2xl">

        {/* HEADER */}
        <div className="flex justify-between items-center mb-4">
          <h2 className="font-black text-sm uppercase">
            ⚡ Ações Avançadas
          </h2>
          <button onClick={onClose}>
            <X />
          </button>
        </div>

        {/* INFO */}
        <div className="mb-4 text-xs font-bold">
          PREFIXO: <span className="text-amber-600">{prefixo}</span>
        </div>

        {/* MOTIVO */}
        <textarea
          placeholder="MOTIVO (OBRIGATÓRIO)"
          className="w-full p-3 border rounded-xl text-xs font-bold mb-3"
          value={motivo}
          onChange={(e) => setMotivo(e.target.value.toUpperCase())}
        />

        {/* KM */}
        <input
          placeholder="KM (opcional)"
          className="w-full p-3 border rounded-xl text-xs font-bold mb-3"
          value={km}
          onChange={(e) => setKm(e.target.value)}
        />

        {/* CONFIRMAÇÃO */}
        <div className="mb-4">
          <p className="text-[10px] font-black text-red-600 mb-1 flex items-center gap-1">
            <AlertTriangle size={12} /> DIGITE O PREFIXO PARA CONFIRMAR
          </p>
          <input
            className="w-full p-3 border-2 border-red-400 rounded-xl text-xs font-black"
            value={confirmText}
            onChange={(e) => setConfirmText(e.target.value.toUpperCase())}
          />
        </div>

        {/* AÇÕES */}
        <div className="grid grid-cols-2 gap-2">

          <button
            disabled={loading}
            onClick={() => executarAcao("DISPONIVEL")}
            className="bg-emerald-500 text-white p-3 rounded-xl text-xs font-black"
          >
            LIBERAR
          </button>

          <button
            disabled={loading}
            onClick={() => executarAcao("MANUTENCAO")}
            className="bg-red-600 text-white p-3 rounded-xl text-xs font-black"
          >
            MANUTENÇÃO
          </button>

          <button
            disabled={loading}
            onClick={() => executarAcao("OFICINA")}
            className="bg-orange-500 text-white p-3 rounded-xl text-xs font-black"
          >
            OFICINA
          </button>

          <button
            disabled={loading}
            onClick={() => executarAcao("DISPONIVEL")}
            className="bg-blue-600 text-white p-3 rounded-xl text-xs font-black"
          >
            FORÇAR LIBERAÇÃO
          </button>

        </div>
      </div>
    </div>
  );
};

export default GarageiroPowerModal;
