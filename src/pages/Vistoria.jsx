import React, { useState, useEffect, useMemo, useCallback } from "react";
import { useAuth } from "../lib/AuthContext";
import { gasApi } from "../api/gasClient";
import imageCompression from "browser-image-compression";

import CardGuarnicao from "../components/vistoria/CardGuarnicao";
import ChecklistGrupo from "../components/vistoria/ChecklistGrupo";
import ModalComunitaria from "../components/vistoria/ModalComunitaria";

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

  const res = await fetch(CLOUDINARY_URL, {
    method: "POST",
    body: fd
  });

  const data = await res.json();
  if (!data.secure_url) throw new Error("Erro upload");
  return data.secure_url;
};

/* ---------- CHECKLIST ---------- */

const GRUPOS_ENTRADA = [
  {
    nome: "Documentação",
    icon: <Shield size={16} />,
    itens: ["Documento", "Estepe", "Triângulo", "Extintor"]
  },
  {
    nome: "Estado Geral",
    icon: <Car size={16} />,
    itens: ["Pneus", "Capô", "Vidros", "Portas"]
  }
];

/* ---------- COMPONENTE ---------- */

const Vistoria = ({ onBack }) => {
  const { user } = useAuth();

  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);

  const [uploadStatus, setUploadStatus] = useState("");
  const [modalComunitaria, setModalComunitaria] = useState(false);

  const [viaturas, setViaturas] = useState([]);
  const [tipoVistoria, setTipoVistoria] = useState("ENTRADA");

  const [fotos, setFotos] = useState([]);
  const [checklist, setChecklist] = useState({});
  const [kmReferencia, setKmReferencia] = useState(0);

  const [formData, setFormData] = useState({
    prefixo_vtr: "",
    placa_vtr: "",
    hodometro: "",
    motorista_re: "",
    motorista_nome: "",
    motorista_unidade: "",
    comandante_re: "",
    comandante_nome: "",
    comandante_unidade: "",
    patrulheiro_re: "",
    patrulheiro_nome: "",
    patrulheiro_unidade: "",
    termo_aceite: false,
    motorista_externo: false,
    comandante_externo: false,
    patrulheiro_externo: false,
    modalidade: "",
    operacao_nome: ""
  });

  const [tipoServico, setTipoServico] = useState("");

  /* ---------- LOAD ---------- */

  useEffect(() => {
    (async () => {
      try {
        const res = await gasApi.getViaturas();
        if (res?.status === "success") setViaturas(res.data);
      } catch (e) { console.error(e); }
    })();
  }, []);

  /* ---------- EFEITOS ---------- */

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

  /* ---------- UTILS ---------- */

  const toStr = (v) => v ? String(v) : "";

  const viaturasFiltradas = useMemo(() => {
    return (viaturas || [])
      .sort((a, b) => {
        const pa = toStr(a.PREFIXO || a.Prefixo);
        const pb = toStr(b.PREFIXO || b.Prefixo);
        return pa.localeCompare(pb);
      });
  }, [viaturas]);

  const findVtr = (prefixo) => {
    return viaturas.find(v => {
      return toStr(v.PREFIXO || v.Prefixo) === prefixo;
    });
  };

  /* ---------- VTR ---------- */

  const handleVtrChange = (prefixo) => {
    const vtr = findVtr(prefixo);

    if (!vtr) {
      setFormData(p => ({ ...p, prefixo_vtr: "", placa_vtr: "" }));
      return;
    }

    const placa = toStr(vtr.PLACA || vtr.Placa);
    const km = vtr.ULTIMOKM || vtr.UltimoKM || 0;

    setKmReferencia(Number(km));

    setFormData(p => ({
      ...p,
      prefixo_vtr: prefixo,
      placa_vtr: placa,
      hodometro: tipoVistoria === "SAÍDA" ? km : ""
    }));
  };

  const buscarMilitar = async (re) => {
    if (!re) return null;
    try {
      const res = await gasApi.getMilitarPorRe(re);
      if (res?.status === "success" && res.data) {
        return res.data;
      }
      return null;
    } catch (e) {
      console.error(e);
      return null;
    }
  };

  /* ---------- KM ---------- */

  const kmInvalido = useMemo(() => {
    const km = Number(formData.hodometro);
    if (!km) return false;
    if (km < kmReferencia) return true;
    if (tipoVistoria === "SAÍDA" && km <= kmReferencia) return true;
    return false;
  }, [formData.hodometro, kmReferencia, tipoVistoria]);

  /* ---------- FOTO ---------- */

  const adicionarFoto = async (file) => {
    if (!file) return;
    setUploading(true);
    try {
      const compressed = await imageCompression(file, { maxSizeMB: 0.05 });
      const reader = new FileReader();
      reader.onloadend = () => {
        setFotos(p => [...p, reader.result]);
        setUploading(false);
      };
      reader.readAsDataURL(compressed);
    } catch (e) {
      console.error(e);
      setUploading(false);
    }
  };

  const removerFoto = (i) => setFotos(p => p.filter((_, x) => x !== i));

  /* ---------- FINAL ---------- */

  const handleFinalizar = async () => {
    if (!formData.prefixo_vtr) return alert("Selecione a viatura");
    if (!tipoServico) return alert("Selecione o tipo de serviço");
    if (tipoServico === "PATRULHA COMUNITÁRIA" && !formData.modalidade) {
        return alert("Selecione a modalidade comunitária");
    }
    if (!formData.motorista_nome) return alert("Preencha o nome do motorista");
    if (kmInvalido) return alert("KM inválido");
    if (!formData.termo_aceite) return alert("Aceite o termo");

    setLoading(true);

    try {
      setUploadStatus("Salvando vistoria...");

      const payload = {
        ...formData,
        tipo_vistoria: tipoVistoria,
        tipo_servico: tipoServico,
        checklist: JSON.stringify(checklist),
        militar_logado: `${user.patente} ${user.nome}`
      };

      const res = await gasApi.saveVistoria(payload);
      if (res.status !== "success") throw new Error();

      const id = res.id;

      if (fotos.length) {
        let links = [];
        for (let i = 0; i < fotos.length; i++) {
          setUploadStatus(`Upload ${i + 1}/${fotos.length}`);
          const link = await uploadParaCloudinary(
            fotos[i],
            formData.prefixo_vtr,
            tipoVistoria,
            formData.hodometro,
            i
          );
          links.push(link);
        }

        await gasApi.saveVistoria({
          id_referencia: id,
          links_fotos: links
        });
      }

      alert("Vistoria enviada!");
      onBack();
    } catch (e) {
      console.error(e);
      alert("Erro envio");
    } finally {
      setLoading(false);
      setUploadStatus("");
    }
  };

  /* ---------- TERMO ---------- */

  const termo = tipoVistoria === "ENTRADA"
    ? `EU, ${formData.motorista_nome || "MOTORISTA"}, DECLARO QUE RECEBI A VIATURA ${formData.prefixo_vtr}, APÓS VISTORIA, ESTANDO CIENTE DAS CONDIÇÕES GERAIS, RESPONSABILIZANDO-ME POR SUA GUARDA, CONSERVAÇÃO E EMPREGO DURANTE O SERVIÇO.`
    : `EU, ${formData.motorista_nome || "MOTORISTA"}, DECLARO QUE DEVOLVO A VIATURA ${formData.prefixo_vtr}, INFORMANDO QUE TODAS AS ALTERAÇÕES, AVARIAS OU IRREGULARIDADES FORAM DEVIDAMENTE REGISTRADAS, ASSUMINDO RESPONSABILIDADE PELAS INFORMAÇÕES PRESTADAS.`;

  /* ---------- UI ---------- */

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="bg-slate-900 text-white p-4 flex justify-between items-center">
        <button onClick={onBack}><ArrowLeft /></button>
        <div className="text-center text-xs">
          VISTORIA<br />{tipoVistoria}
        </div>
        <div className="w-6" />
      </header>

      <main className="p-4 space-y-4">
        {step === 1 && (
          <>
            <CardGuarnicao formData={formData} />

            <select
              className="vtr-input w-full"
              value={formData.prefixo_vtr}
              onChange={(e) => handleVtrChange(e.target.value)}
            >
              <option value="">Selecione VTR</option>
              {viaturasFiltradas.map((v, i) => {
                const p = toStr(v.PREFIXO || v.Prefixo);
                return <option key={i} value={p}>{p}</option>;
              })}
            </select>

            <select
              className="vtr-input w-full"
              value={tipoServico}
              onChange={(e) => setTipoServico(e.target.value)}
            >
              <option value="">Tipo de Serviço</option>
              <option>RADIOPATRULHA</option>
              <option>OPERAÇÃO</option>
              <option>PATRULHA COMUNITÁRIA</option>
              <option>FORÇA TÁTICA</option>
              <option>OUTROS</option>
            </select>

            {(tipoServico === "OPERAÇÃO" || tipoServico === "OUTROS") && (
              <input
                placeholder="Nome da operação"
                className="vtr-input w-full"
                value={formData.operacao_nome}
                onChange={(e) => setFormData(p => ({ ...p, operacao_nome: e.target.value }))}
              />
            )}

            <input
              placeholder="KM"
              type="number"
              className="vtr-input w-full"
              value={formData.hodometro}
              onChange={(e) => setFormData({ ...formData, hodometro: e.target.value })}
            />

            <input
              placeholder="RE MOTORISTA"
              className="vtr-input w-full"
              value={formData.motorista_re}
              onChange={(e) => setFormData(p => ({ ...p, motorista_re: e.target.value }))}
              onBlur={async (e) => {
                const re = e.target.value;
                const militar = await buscarMilitar(re);
                if (militar) {
                  const nome = militar.nome || militar.NOME || militar.Nome || "";
                  setFormData(p => ({
                    ...p,
                    motorista_nome: nome,
                    motorista_externo: false
                  }));
                } else {
                  setFormData(p => ({
                    ...p,
                    motorista_nome: "",
                    motorista_externo: true
                  }));
                }
              }}
            />

            {formData.motorista_externo && (
              <>
                <input
                  placeholder="NOME DE GUERRA"
                  className="vtr-input w-full"
                  value={formData.motorista_nome}
                  onChange={(e) => setFormData(p => ({ ...p, motorista_nome: e.target.value }))}
                />
                <input
                  placeholder="UNIDADE"
                  className="vtr-input w-full"
                  value={formData.motorista_unidade}
                  onChange={(e) => setFormData(p => ({ ...p, motorista_unidade: e.target.value }))}
                />
              </>
            )}

            <input
              placeholder="RE COMANDANTE"
              className="vtr-input w-full"
              value={formData.comandante_re}
              onChange={(e) => setFormData(p => ({ ...p, comandante_re: e.target.value }))}
              onBlur={async (e) => {
                const re = e.target.value;
                const militar = await buscarMilitar(re);
                if (militar) {
                  const nome = militar.nome || militar.NOME || militar.Nome || "";
                  setFormData(p => ({
                    ...p,
                    comandante_nome: nome,
                    comandante_externo: false
                  }));
                } else {
                  setFormData(p => ({
                    ...p,
                    comandante_nome: "",
                    comandante_externo: true
                  }));
                }
              }}
            />

            {formData.comandante_externo && (
              <>
                <input
                  placeholder="NOME DE GUERRA"
                  className="vtr-input w-full"
                  value={formData.comandante_nome}
                  onChange={(e) => setFormData(p => ({ ...p, comandante_nome: e.target.value }))}
                />
                <input
                  placeholder="UNIDADE"
                  className="vtr-input w-full"
                  value={formData.comandante_unidade}
                  onChange={(e) => setFormData(p => ({ ...p, comandante_unidade: e.target.value }))}
                />
              </>
            )}

            <input
              placeholder="RE PATRULHEIRO"
              className="vtr-input w-full"
              value={formData.patrulheiro_re}
              onChange={(e) => setFormData(p => ({ ...p, patrulheiro_re: e.target.value }))}
              onBlur={async (e) => {
                const re = e.target.value;
                const militar = await buscarMilitar(re);
                if (militar) {
                  const nome = militar.nome || militar.NOME || militar.Nome || "";
                  setFormData(p => ({
                    ...p,
                    patrulheiro_nome: nome,
                    patrulheiro_externo: false
                  }));
                } else {
                  setFormData(p => ({
                    ...p,
                    patrulheiro_nome: "",
                    patrulheiro_externo: true
                  }));
                }
              }}
            />

            {formData.patrulheiro_externo && (
              <>
                <input
                  placeholder="NOME DE GUERRA"
                  className="vtr-input w-full"
                  value={formData.patrulheiro_nome}
                  onChange={(e) => setFormData(p => ({ ...p, patrulheiro_nome: e.target.value }))}
                />
                <input
                  placeholder="UNIDADE"
                  className="vtr-input w-full"
                  value={formData.patrulheiro_unidade}
                  onChange={(e) => setFormData(p => ({ ...p, patrulheiro_unidade: e.target.value }))}
                />
              </>
            )}

            <button 
                onClick={() => setStep(2)} 
                disabled={!tipoServico}
                className="btn-tatico w-full flex justify-center items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
            >
              CHECKLIST <ChevronRight size={18} />
            </button>
          </>
        )}

        {step === 2 && (
          <>
            <CardGuarnicao formData={formData} compacto />

            <div className="grid grid-cols-3 gap-2">
              {fotos.map((f, i) => (
                <div key={i} className="relative aspect-square bg-slate-200 rounded overflow-hidden">
                  <img src={f} className="w-full h-full object-cover" alt="vistoria" />
                  <button
                    className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-1"
                    onClick={() => removerFoto(i)}
                  >
                    <X size={14} />
                  </button>
                </div>
              ))}

              {fotos.length < MAX_FOTOS && (
                <label className="border-2 border-dashed border-slate-300 rounded flex items-center justify-center aspect-square cursor-pointer">
                  <input type="file" hidden accept="image/*" onChange={(e) => adicionarFoto(e.target.files[0])} />
                  {uploading ? <Loader2 className="animate-spin" /> : <Plus />}
                </label>
              )}
            </div>

            {GRUPOS_ENTRADA.map(g => (
              <ChecklistGrupo
                key={g.nome}
                titulo={g.nome}
                itens={g.itens}
                checklist={checklist}
                onToggle={(item) => setChecklist(p => ({
                  ...p,
                  [item]: p[item] === "OK" ? "FALHA" : "OK"
                }))}
              />
            ))}

            <label className="flex items-start gap-2 p-2 bg-white rounded border cursor-pointer">
              <input
                className="mt-1"
                type="checkbox"
                checked={formData.termo_aceite}
                onChange={(e) => setFormData({ ...formData, termo_aceite: e.target.checked })}
              />
              <span className="text-[10px] uppercase leading-tight select-none">{termo}</span>
            </label>

            <button onClick={handleFinalizar} className="btn-tatico w-full py-3" disabled={loading}>
              {loading ? (
                <div className="flex flex-col items-center">
                  <Loader2 className="animate-spin" />
                  <span className="text-[10px]">{uploadStatus}</span>
                </div>
              ) : "FINALIZAR"}
            </button>

            <button onClick={() => setStep(1)} className="w-full text-slate-500 text-sm hover:underline">VOLTAR</button>
          </>
        )}

        <ModalComunitaria
          isOpen={modalComunitaria}
          onClose={() => setModalComunitaria(false)}
          onSelect={(valor) => {
            setFormData(p => ({ ...p, modalidade: valor }));
            setModalComunitaria(false);
          }}
        />
      </main>
    </div>
  );
};

export default Vistoria;
