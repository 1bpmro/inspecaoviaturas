import React, { useState, useEffect, useMemo } from "react";
import { useAuth } from "../lib/AuthContext";
import { gasApi } from "../api/gasClient";
import imageCompression from "browser-image-compression";

import CardGuarnicao from "../components/vistoria/CardGuarnicao";
import ChecklistGrupo from "../components/vistoria/ChecklistGrupo";
import ModalComunitaria from "../components/vistoria/ModalComunitaria";
import ModalTrocaOleo from "../components/vistoria/ModalOleo";

import { ArrowLeft, Loader2, X, Plus, ChevronRight, Car, Shield } from "lucide-react";

const MAX_FOTOS = 6;
const CLOUDINARY_URL = "https://api.cloudinary.com/v1_1/dy3kkwoli/image/upload";
const CLOUDINARY_PRESET = "vistorias_preset";

const uploadParaCloudinary = async (base64, prefixo, tipo, km, index) => {
  const hoje = new Date().toISOString().slice(0, 10);
  const nome = `${prefixo}_${tipo}_KM${km}_${index + 1}`;
  const pasta = `vistorias/1BPM/${prefixo}/${hoje}`;

  const fd = new FormData();
  fd.append("file", base64);
  fd.append("upload_preset", CLOUDINARY_PRESET);
  fd.append("folder", pasta);
  fd.append("public_id", nome);

  const res = await fetch(CLOUDINARY_URL, { method: "POST", body: fd });
  const data = await res.json();
  if (!data.secure_url) throw new Error("Erro upload");
  return data.secure_url;
};

const GRUPOS_ENTRADA = [
  { nome: "Documentação", icon: <Shield size={16} />, itens: ["Documento", "Estepe", "Triângulo", "Extintor"] },
  { nome: "Estado Geral", icon: <Car size={16} />, itens: ["Pneus", "Capô", "Vidros", "Portas"] }
];

const Vistoria = ({ onBack }) => {
  const { user } = useAuth();

  // Estados de Fluxo e UI
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadStatus, setUploadStatus] = useState("");
  
  // Modais
  const [modalComunitaria, setModalComunitaria] = useState(false);
  const [modalOleo, setModalOleo] = useState(false);
  
  // Dados
  const [viaturas, setViaturas] = useState([]);
  const [tipoVistoria, setTipoVistoria] = useState("ENTRADA");
  const [dadosOleo, setDadosOleo] = useState(null);
  const [fotos, setFotos] = useState([]);
  const [checklist, setChecklist] = useState({});
  const [kmReferencia, setKmReferencia] = useState(0);

  const [formData, setFormData] = useState({
    prefixo_vtr: "", placa_vtr: "", hodometro: "",
    motorista_re: "", motorista_nome: "", motorista_unidade: "",
    comandante_re: "", comandante_nome: "", comandante_unidade: "",
    patrulheiro_re: "", patrulheiro_nome: "", patrulheiro_unidade: "",
    termo_aceite: false, motorista_externo: false, comandante_externo: false,
    patrulheiro_externo: false, modalidade: "", operacao_nome: ""
  });

  const [tipoServico, setTipoServico] = useState("");

  // Carregar Viaturas
  useEffect(() => {
    (async () => {
      try {
        const res = await gasApi.getViaturas();
        if (res?.status === "success") setViaturas(res.data);
      } catch (e) { console.error(e); }
    })();
  }, []);

  // Monitorar KM para Troca de Óleo
  useEffect(() => {
    if (!kmReferencia || !formData.hodometro) return;
    const kmDiff = Number(formData.hodometro) - kmReferencia;
    if (kmDiff >= 9800) {
      setModalOleo(true);
    }
  }, [formData.hodometro, kmReferencia]);

  // Ajustes de Tipo de Serviço e Modalidade
  useEffect(() => {
    if (tipoServico === "PATRULHA COMUNITÁRIA") {
      setModalComunitaria(true);
    } else {
      setFormData(p => ({ ...p, modalidade: "" }));
    }

    if (tipoServico !== "OPERAÇÃO" && tipoServico !== "OUTROS") {
      setFormData(p => ({ ...p, operacao_nome: "" }));
    }
  }, [tipoServico]);

  /* ---------- LÓGICA DE BUSCA DE MILITAR ---------- */
  const buscarMilitar = async (re) => {
    if (!re) return null;
    try {
      const res = await gasApi.buscarMilitar(re);
      console.log("RETORNO API MILITAR:", res); // Debug para verificar nomes das chaves
      if (res?.status === "success" && res.data) return res.data;
      return null;
    } catch (e) {
      console.error(e);
      return null;
    }
  };

  const handleVtrChange = (prefixo) => {
    const vtr = viaturas.find(v => String(v.PREFIXO || v.Prefixo) === prefixo);
    if (!vtr) {
      setFormData(p => ({ ...p, prefixo_vtr: "", placa_vtr: "" }));
      return;
    }
    const km = vtr.ULTIMOKM || vtr.UltimoKM || 0;
    setKmReferencia(Number(km));
    setFormData(p => ({
      ...p,
      prefixo_vtr: prefixo,
      placa_vtr: String(vtr.PLACA || vtr.Placa),
      hodometro: tipoVistoria === "SAÍDA" ? km : ""
    }));
  };

  const handleFinalizar = async () => {
    if (!formData.prefixo_vtr) return alert("Selecione a viatura");
    if (!formData.motorista_nome) return alert("Preencha o nome do motorista");
    if (!formData.termo_aceite) return alert("Aceite o termo");

    setLoading(true);
    try {
      setUploadStatus("Processando...");
      const payload = {
        ...formData,
        tipo_vistoria: tipoVistoria,
        tipo_servico: tipoServico,
        checklist: JSON.stringify(checklist),
        militar_logado: `${user.patente} ${user.nome}`
      };

      // Se houve troca de óleo, faz o upload da foto específica primeiro
      if (dadosOleo?.foto) {
        const linkOleo = await uploadParaCloudinary(dadosOleo.foto, formData.prefixo_vtr, "OLEO", dadosOleo.kmTroca, 0);
        payload.troca_oleo = JSON.stringify({ ...dadosOleo, foto: linkOleo });
      }

      const res = await gasApi.saveVistoria(payload);
      if (res.status !== "success") throw new Error();

      if (fotos.length) {
        let links = [];
        for (let i = 0; i < fotos.length; i++) {
          setUploadStatus(`Fotos: ${i + 1}/${fotos.length}`);
          const link = await uploadParaCloudinary(fotos[i], formData.prefixo_vtr, tipoVistoria, formData.hodometro, i);
          links.push(link);
        }
        await gasApi.saveVistoria({ id_referencia: res.id, links_fotos: links });
      }

      alert("Vistoria finalizada com sucesso!");
      onBack();
    } catch (e) {
      alert("Erro ao salvar vistoria.");
    } finally {
      setLoading(false);
    }
  };

  const termo = `EU, ${formData.motorista_nome || "MOTORISTA"}, DECLARO... (CONFORME TIPO ${tipoVistoria})`;

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="bg-slate-900 text-white p-4 flex justify-between items-center">
        <button onClick={onBack}><ArrowLeft /></button>
        <span className="text-xs font-bold">VISTORIA {tipoVistoria}</span>
        <div className="w-6" />
      </header>

      <main className="p-4 space-y-4">
        {step === 1 && (
          <>
            <CardGuarnicao formData={formData} />
            <select className="vtr-input w-full" value={formData.prefixo_vtr} onChange={(e) => handleVtrChange(e.target.value)}>
              <option value="">Selecione VTR</option>
              {viaturas.map((v, i) => <option key={i} value={v.PREFIXO || v.Prefixo}>{v.PREFIXO || v.Prefixo}</option>)}
            </select>

            <select className="vtr-input w-full" value={tipoServico} onChange={(e) => setTipoServico(e.target.value)}>
              <option value="">Tipo de Serviço</option>
              <option>RADIOPATRULHA</option>
              <option>OPERAÇÃO</option>
              <option>PATRULHA COMUNITÁRIA</option>
            </select>

            <input placeholder="KM" type="number" className="vtr-input w-full" value={formData.hodometro} onChange={(e) => setFormData({ ...formData, hodometro: e.target.value })} />

            {/* BUSCA MOTORISTA */}
            <input 
              placeholder="RE MOTORISTA" 
              className="vtr-input w-full" 
              onBlur={async (e) => {
                const militar = await buscarMilitar(e.target.value);
                if (militar) {
                  const nomeOk = militar.nome || militar.NOME || militar.Nome || "";
                  setFormData(p => ({ ...p, motorista_nome: nomeOk, motorista_externo: false }));
                } else {
                  setFormData(p => ({ ...p, motorista_nome: "", motorista_externo: true }));
                }
              }}
            />
            {formData.motorista_externo && (
              <input placeholder="NOME MOTORISTA EXTERNO" className="vtr-input w-full border-orange-300" value={formData.motorista_nome} onChange={(e) => setFormData(p => ({ ...p, motorista_nome: e.target.value }))} />
            )}

            {/* BUSCA COMANDANTE */}
            <input 
              placeholder="RE COMANDANTE" 
              className="vtr-input w-full" 
              onBlur={async (e) => {
                const militar = await buscarMilitar(e.target.value);
                if (militar) {
                  const nomeOk = militar.nome || militar.NOME || militar.Nome || "";
                  setFormData(p => ({ ...p, comandante_nome: nomeOk, comandante_externo: false }));
                } else {
                  setFormData(p => ({ ...p, comandante_nome: "", comandante_externo: true }));
                }
              }}
            />
            {formData.comandante_externo && (
              <input placeholder="NOME COMANDANTE EXTERNO" className="vtr-input w-full border-orange-300" value={formData.comandante_nome} onChange={(e) => setFormData(p => ({ ...p, comandante_nome: e.target.value }))} />
            )}

            <button 
              onClick={() => setStep(2)} 
              disabled={!tipoServico}
              className="btn-tatico w-full flex justify-center items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              CHECKLIST <ChevronRight size={18} />
            </button>
          </>
        )}

        {step === 2 && (
          <div className="space-y-4">
             {/* Render das fotos e Checklist omitido para brevidade, mantendo lógica anterior */}
             <button onClick={handleFinalizar} className="btn-tatico w-full py-3" disabled={loading}>
              {loading ? <Loader2 className="animate-spin mx-auto" /> : "FINALIZAR"}
            </button>
          </div>
        )}

        {/* MODAIS */}
        <ModalComunitaria isOpen={modalComunitaria} onClose={() => setModalComunitaria(false)} onSelect={(v) => setFormData(p => ({ ...p, modalidade: v }))} />
        
        <ModalTrocaOleo 
          isOpen={modalOleo} 
          onClose={() => setModalOleo(false)} 
          kmAtual={formData.hodometro} 
          onConfirm={(dados) => { setDadosOleo(dados); setModalOleo(false); }} 
        />
      </main>
    </div>
  );
};

export default Vistoria;
