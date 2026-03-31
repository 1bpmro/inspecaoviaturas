import React, { useState, useEffect } from "react";
import { useAuth } from "../lib/AuthContext";
import { gasApi } from "../api/gasClient";

import { db } from "../lib/firebase";
import { doc, getDoc, collection, query, where, getDocs } from "firebase/firestore";

import CardGuarnicao from "../components/vistoria/CardGuarnicao"; 
import ModalComunitaria from "../components/vistoria/ModalComunitaria";
import ModalTrocaOleo from "../components/vistoria/ModalOleo";

import { ArrowLeft, Loader2, ChevronRight, Car, Shield, AlertCircle, CheckCircle2, Camera, X } from "lucide-react";

// --- CONFIGURAÇÕES DE CHECKLIST ---
const GRUPOS_ENTRADA = [
  {
    nome: "Documentação e Equipamentos",
    icon: <Shield size={16} />,
    itens: ["Documento da Viatura", "Estepe", "Chave de Roda", "Macaco", "Triângulo", "Extintor", "Giroscópio", "Sirene", "Rádio"]
  },
  {
    nome: "Estado Externo",
    icon: <Car size={16} />,
    itens: ["Pneus", "Capô", "Paralama Dianteiro", "Paralama Traseiro", "Parachoque Dianteiro", "Parachoque Traseiro", "Lanternas", "Caçamba", "Vidros e Portas", "Retrovisor Externo", "Maçanetas", "Para-brisas", "Protetor Dianteiro"]
  }
];

const GRUPOS_SAIDA = [
  {
    nome: "Checklist Rápido de Saída",
    icon: <CheckCircle2 size={16} />,
    itens: ["Limpeza Interna", "Nível de Combustível", "Avarias Recentes", "Objetos Esquecidos", "Funcionamento de Luzes/Sirene"]
  }
];

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
  
  if (!res.ok) throw new Error(`Falha no upload Cloudinary: ${res.status}`);
  
  const data = await res.json();
  if (!data.secure_url) throw new Error("URL segura não retornada pelo Cloudinary");
  return data.secure_url;
};

const comprimirImagem = (base64) => {
  return new Promise((resolve) => {
    const img = new Image();
    img.src = base64;
    img.onload = () => {
      const canvas = document.createElement("canvas");
      let width = img.width;
      let height = img.height;
      const MAX_WIDTH = 1280; 
      const MAX_HEIGHT = 1280;

      if (width > height) {
        if (width > MAX_WIDTH) {
          height *= MAX_WIDTH / width;
          width = MAX_WIDTH;
        }
      } else {
        if (height > MAX_HEIGHT) {
          width *= MAX_HEIGHT / height;
          height = MAX_HEIGHT;
        }
      }
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext("2d");
      ctx.drawImage(img, 0, 0, width, height);
      resolve(canvas.toDataURL("image/jpeg", 0.7));
    };
  });
};

const Vistoria = ({ onBack }) => {
  const { user } = useAuth();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [loadingViaturas, setLoadingViaturas] = useState(true);
  const [uploadStatus, setUploadStatus] = useState("");
  const [modalComunitaria, setModalComunitaria] = useState(false);
  const [modalOleo, setModalOleo] = useState(false);
  const [viaturas, setViaturas] = useState([]);
  const [tipoVistoria, setTipoVistoria] = useState("ENTRADA");
  const [dadosOleo, setDadosOleo] = useState(null);
  const [fotos, setFotos] = useState([]);
  const [checklist, setChecklist] = useState({});
  const [kmReferencia, setKmReferencia] = useState(0);
  const [alertaOleoDisparado, setAlertaOleoDisparado] = useState(false);

  const [formData, setFormData] = useState({
    prefixo_vtr: "", placa_vtr: "",
    hodometro_entrada: "", hodometro_saida: "",
    motorista_re: "", motorista_nome: "", motorista_unidade: "",
    comandante_re: "", comandante_nome: "", comandante_unidade: "",
    patrulheiro_re: "", patrulheiro_nome: "", patrulheiro_unidade: "",
    termo_aceite: false, motorista_externo: false, comandante_externo: false,
    patrulheiro_externo: false, modalidade: "", operacao_nome: ""
  });

  const [tipoServico, setTipoServico] = useState("");

  useEffect(() => {
    (async () => {
      try {
        setLoadingViaturas(true);
        const cache = localStorage.getItem("viaturas_cache");
        if (cache) setViaturas(JSON.parse(cache));

        const res = await gasApi.getViaturas();
        if (res?.status === "success" && Array.isArray(res.data)) {
          setViaturas(res.data);
          localStorage.setItem("viaturas_cache", JSON.stringify(res.data));
        }
      } catch (e) {
        console.error("Erro ao carregar viaturas:", e);
      } finally {
        setLoadingViaturas(false);
      }
    })();
  }, []);

  useEffect(() => {
    setAlertaOleoDisparado(false);
    setDadosOleo(null);
    setFotos([]);
  }, [formData.prefixo_vtr]);

  useEffect(() => {
    const kmDigitado = tipoVistoria === "ENTRADA" ? formData.hodometro_entrada : formData.hodometro_saida;
    const kmNum = Number(kmDigitado);
    if (!kmNum || kmReferencia <= 0 || dadosOleo || alertaOleoDisparado) return;

    const diff = kmNum - kmReferencia;
    if (diff >= 10000) {
      setModalOleo(true);
      setAlertaOleoDisparado(true);
    }
  }, [formData.hodometro_entrada, formData.hodometro_saida, kmReferencia, tipoVistoria, dadosOleo, alertaOleoDisparado]);

  const buscarMilitarAction = async (re, campo) => {
    if (!re || re.length < 3) return;
    setLoading(true);
    try {
      const reLimpo = re.trim().replace(/^1000/, "");
      const reCom1000 = `1000${reLimpo}`;

      const usuariosRef = collection(db, "usuarios");
      const q = query(usuariosRef, where("re", "in", [reLimpo, reCom1000]));
      const querySnapshot = await getDocs(q);

      if (!querySnapshot.empty) {
        const d = querySnapshot.docs[0].data();
        const nomeMilitar = (d.nome_guerra || d.nome || "MILITAR").toUpperCase();
        const patenteMilitar = (d.patente || d.graduacao || "").toUpperCase();

        // Correção para evitar SGT SGT
        const nomeCompleto = nomeMilitar.startsWith(patenteMilitar) 
          ? nomeMilitar 
          : `${patenteMilitar} ${nomeMilitar}`.trim();

        setFormData(p => ({ 
          ...p, 
          [`${campo}_nome`]: nomeCompleto, 
          [`${campo}_unidade`]: (d.unidade || "1º BPM").toUpperCase(), 
          [`${campo}_externo`]: false 
        }));
      } else {
        setFormData(p => ({ ...p, [`${campo}_nome`]: "", [`${campo}_unidade`]: "", [`${campo}_externo`]: true }));
      }
    } catch (e) { 
      console.error(e);
      setFormData(p => ({ ...p, [`${campo}_externo`]: true }));
    } finally {
      setLoading(false);
    }
  };

  const handleVtrChange = async (prefixo) => {
    const vtr = viaturas.find(v => String(v.PREFIXO ?? v.Prefixo ?? "") === prefixo);
    
    if (!vtr) {
      setFormData(p => ({ ...p, prefixo_vtr: "", placa_vtr: "", hodometro_entrada: "", hodometro_saida: "" }));
      setKmReferencia(0);
      return;
    }

    const kmAtualDaVtr = Number(vtr.ULTIMOKM || vtr.UltimoKM || 0);
    const kmReferenciaOleo = Number(vtr.KM_TROCA_OLEO ?? vtr.km_troca_oleo ?? vtr.KM_ULTIMATROCA ?? 0);
    const diff = kmAtualDaVtr - kmReferenciaOleo;

    if (tipoVistoria === "SAÍDA" && diff >= 12000) {
      alert(`🚨 VIATURA BLOQUEADA\n\nO prefixo ${prefixo} rodou ${diff}km desde a última troca.\nProcure a Logística/P4.`);
      setUploadStatus("🚨 Viatura bloqueada para saída");
      setFormData(p => ({ ...p, prefixo_vtr: "" }));
      return; 
    }

    const baseData = {
      prefixo_vtr: prefixo,
      placa_vtr: String(vtr.PLACA ?? vtr.Placa ?? ""),
      [tipoVistoria === "ENTRADA" ? "hodometro_entrada" : "hodometro_saida"]: kmAtualDaVtr
    };

    setKmReferencia(kmReferenciaOleo);
    setUploadStatus("");

    if (tipoVistoria === "SAÍDA") {
      try {
        setLoading(true);
        const res = await gasApi.getUltimaVistoria(prefixo);
        if (res?.status === "success" && res.data) {
          const d = res.data;
          setTipoServico(d.tipo_servico || "");
          setFormData(prev => ({
            ...prev,
            ...baseData,
            motorista_re: d.motorista_matricula || d.motorista_re || "", 
            motorista_nome: d.motorista_nome || "", 
            motorista_unidade: d.motorista_unidade || "1º BPM",
            motorista_externo: false,
            comandante_re: d.comandante_matricula || d.comandante_re || "", 
            comandante_nome: d.comandante_nome || "", 
            comandante_unidade: d.comandante_unidade || "1º BPM",
            comandante_externo: false,
            patrulheiro_re: d.patrulheiro_matricula || d.patrulheiro_re || "", 
            patrulheiro_nome: d.patrulheiro_nome || "", 
            patrulheiro_unidade: d.patrulheiro_unidade || "1º BPM",
            patrulheiro_externo: false,
            hodometro_saida: kmAtualDaVtr,
            operacao_nome: d.operacao_nome || "", 
            modalidade: d.modalidade || ""
          }));
        } else {
          setFormData(prev => ({ ...prev, ...baseData }));
        }
      } catch (e) { 
        console.error("Erro ao buscar última vistoria:", e);
        setFormData(prev => ({ ...prev, ...baseData }));
      } finally { 
        setLoading(false); 
      }
    } else {
      setFormData(prev => ({ ...prev, ...baseData, hodometro_entrada: "" }));
    }
  };

  const handleFinalizar = async () => {
    const kmFinal = tipoVistoria === "ENTRADA" ? formData.hodometro_entrada : formData.hodometro_saida;
    if (Number(kmFinal) < kmReferencia && kmReferencia > 0) {
      return alert(`Erro: KM (${kmFinal}) menor que o registro anterior (${kmReferencia}).`);
    }
    if (!formData.termo_aceite) return alert("Você precisa aceitar o termo de responsabilidade.");

    setLoading(true);
    try {
      let linksSubidos = [];
      if (fotos.length > 0) {
        for (let i = 0; i < fotos.length; i++) {
          setUploadStatus(`Enviando foto ${i + 1}/${fotos.length}...`);
          const link = await uploadParaCloudinary(fotos[i], formData.prefixo_vtr, tipoVistoria, kmFinal, i);
          linksSubidos.push(link);
        }
      }
      setUploadStatus("Salvando dados...");
      const payload = {
        ...formData,
        hodometro: kmFinal,
        tipo_vistoria: tipoVistoria,
        tipo_servico: tipoServico,
        checklist_resumo: JSON.stringify(checklist),
        links_fotos: linksSubidos.join(" | "), 
        militar_logado: user ? `${user.patente} ${user.nome_guerra || user.nome}` : "NÃO IDENTIFICADO"
      };
      if (dadosOleo?.foto) {
        const linkOleo = await uploadParaCloudinary(dadosOleo.foto, formData.prefixo_vtr, "OLEO", dadosOleo.kmTroca, 0);
        payload.troca_oleo = JSON.stringify({ ...dadosOleo, foto: linkOleo });
      }
      const res = await gasApi.saveVistoria(payload);
      if (res.status === "success") {
        alert("Vistoria finalizada com sucesso!");
        onBack();
      } else {
        throw new Error(res.message);
      }
    } catch (e) { 
      console.error(e);
      alert("Erro ao salvar: " + e.message); 
    } finally { 
      setLoading(false); 
      setUploadStatus("");
    }
  };

  const gruposAtivos = tipoVistoria === "ENTRADA" ? GRUPOS_ENTRADA : GRUPOS_SAIDA;

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="bg-slate-900 text-white p-4 flex justify-between items-center sticky top-0 z-50">
        <button onClick={onBack}><ArrowLeft /></button>
        <span className="text-xs font-bold tracking-widest uppercase">DERSO - 1º BPM</span>
        <div className="w-6" />
      </header>

      <main className="max-w-xl mx-auto p-4 space-y-4 pb-20">
        {step === 1 && (
          <>
            <div className="flex bg-slate-200 p-1 rounded-xl gap-1 mb-4">
              <button onClick={() => { setTipoVistoria("ENTRADA"); setFormData(p => ({ ...p, prefixo_vtr: "" })); }} className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all ${tipoVistoria === "ENTRADA" ? "bg-slate-900 text-white shadow" : "text-slate-600"}`}>ENTRADA</button>
              <button onClick={() => { setTipoVistoria("SAÍDA"); setFormData(p => ({ ...p, prefixo_vtr: "" })); }} className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all ${tipoVistoria === "SAÍDA" ? "bg-slate-900 text-white shadow" : "text-slate-600"}`}>SAÍDA</button>
            </div>

            <CardGuarnicao formData={formData} compacto={true} />

            <div className="space-y-3 bg-white p-4 rounded-2xl shadow-sm border border-slate-100 mb-4">
              <h3 className="text-[10px] font-black text-slate-400 flex items-center gap-2 uppercase tracking-widest">
                <Shield size={14} /> Digitar RE da Guarnição
              </h3>
              {["motorista", "comandante", "patrulheiro"].map((campo) => (
                <div key={campo} className="space-y-2 border-b pb-3 last:border-0 last:pb-0 border-slate-50">
                  <input 
                    placeholder={`RE ${campo.toUpperCase()}`} 
                    className="vtr-input w-full" 
                    value={formData[`${campo}_re`] || ""} 
                    onChange={(e) => setFormData(p => ({ ...p, [`${campo}_re`]: e.target.value }))}
                    onBlur={(e) => buscarMilitarAction(e.target.value, campo)} 
                  />
                  {formData[`${campo}_externo`] && (
                    <div className="grid grid-cols-2 gap-2 animate-in fade-in zoom-in-95">
                      <input placeholder="NOME" className="vtr-input w-full border-orange-200 bg-orange-50/50" value={formData[`${campo}_nome`] || ""} onChange={(e) => setFormData(p => ({ ...p, [`${campo}_nome`]: e.target.value.toUpperCase() }))} />
                      <input placeholder="UNIDADE" className="vtr-input w-full border-orange-200 bg-orange-50/50" value={formData[`${campo}_unidade`] || ""} onChange={(e) => setFormData(p => ({ ...p, [`${campo}_unidade`]: e.target.value.toUpperCase() }))} />
                    </div>
                  )}
                </div>
              ))}
            </div>

            <div className="space-y-3 bg-white p-4 rounded-2xl shadow-sm border border-slate-100">
              <h3 className="text-xs font-black text-slate-400 flex items-center gap-2 uppercase"><Car size={14} /> Viatura</h3>
              {loadingViaturas ? (
                <div className="animate-pulse h-12 bg-slate-100 rounded-xl" />
              ) : (
                <select className="vtr-input w-full" value={formData.prefixo_vtr} onChange={(e) => handleVtrChange(e.target.value)}>
                  <option value="">Selecione VTR</option>
                  {viaturas
                    .filter(v => {
                      const status = String(v.STATUS ?? v.Status ?? "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toUpperCase();
                      return tipoVistoria === "SAÍDA" ? status.includes("SERV") : status.includes("DISP");
                    })
                    .sort((a, b) => {
                      const refA = Number(a.KM_TROCA_OLEO ?? a.km_troca_oleo ?? a.KM_ULTIMATROCA ?? 0);
                      const refB = Number(b.KM_TROCA_OLEO ?? b.km_troca_oleo ?? b.KM_ULTIMATROCA ?? 0);
                      return (Number(b.ULTIMOKM || 0) - refB) - (Number(a.ULTIMOKM || 0) - refA);
                    })
                    .map((v, i) => {
                      const pref = v.PREFIXO ?? v.Prefixo ?? "";
                      if (!pref) return null;
                      const ref = Number(v.KM_TROCA_OLEO ?? v.km_troca_oleo ?? v.KM_ULTIMATROCA ?? 0);
                      const d = Number(v.ULTIMOKM || 0) - ref;
                      let alerta = "🟢 OK";
                      if (d >= 12000) alerta = "🔴 BLOQUEADA";
                      else if (d >= 9000) alerta = "🟡 ATENÇÃO";
                      return <option key={i} value={pref}>{pref} - {alerta}</option>;
                    })}
                </select>
              )}
              <select className="vtr-input w-full" value={tipoServico} onChange={(e) => {
                  setTipoServico(e.target.value);
                  if(e.target.value === "PATRULHA COMUNITÁRIA") setModalComunitaria(true);
              }}>
                <option value="">Tipo de Serviço</option>
                <option value="RADIOPATRULHA">RADIOPATRULHA</option>
                <option value="FORCA_TATICA">FORÇA TÁTICA</option>
                <option value="OPERACAO">OPERAÇÃO</option>
                <option value="PATRULHA COMUNITÁRIA">PATRULHA COMUNITÁRIA</option>
                <option value="OUTROS">OUTROS</option>
              </select>
              <div className="relative">
                <input placeholder="HODÔMETRO (KM)" type="number" className="vtr-input w-full" value={tipoVistoria === "ENTRADA" ? formData.hodometro_entrada : formData.hodometro_saida} onChange={(e) => setFormData({ ...formData, [tipoVistoria === "ENTRADA" ? "hodometro_entrada" : "hodometro_saida"]: e.target.value })} />
                {uploadStatus && <div className="text-[10px] mt-1 font-bold text-red-500 uppercase">{uploadStatus}</div>}
              </div>
            </div>

            <button onClick={() => setStep(2)} disabled={!tipoServico || !formData.prefixo_vtr || loading} className="btn-tatico w-full py-4 flex justify-center items-center gap-2">
              {loading ? <Loader2 className="animate-spin" /> : <>PRÓXIMA ETAPA <ChevronRight size={18} /></>}
            </button>
          </>
        )}

        {step === 2 && (
          <div className="space-y-4 animate-in slide-in-from-right">
            {gruposAtivos.map((grupo, idx) => (
              <div key={idx} className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100 space-y-3">
                <h4 className="text-[10px] font-black text-slate-400 flex items-center gap-2 uppercase">{grupo.icon} {grupo.nome}</h4>
                <div className="grid grid-cols-1 gap-2">
                  {grupo.itens.map(item => (
                    <button key={item} onClick={() => setChecklist(prev => ({ ...prev, [item]: !prev[item] }))} className={`flex items-center justify-between p-3 rounded-xl border transition-all ${checklist[item] ? "bg-green-50 border-green-200 text-green-700" : "bg-slate-50 border-slate-100 text-slate-500"}`}>
                      <span className="text-[11px] font-bold uppercase">{item}</span>
                      {checklist[item] && <CheckCircle2 size={16} />}
                    </button>
                  ))}
                </div>
              </div>
            ))}
            <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100 space-y-3">
              <h4 className="text-[10px] font-black text-slate-400 flex items-center gap-2 uppercase"><Camera size={16} /> Fotos da Vistoria ({fotos.length}/4)</h4>
              <input type="file" accept="image/*" multiple onChange={async (e) => {
                  const files = Array.from(e.target.files || []);
                  if (fotos.length + files.length > 4) return alert("Máximo de 4 fotos.");
                  setUploadStatus("Processando imagens...");
                  for (const file of files) {
                    const reader = new FileReader();
                    const result = await new Promise((resolve) => {
                      reader.onloadend = () => resolve(reader.result);
                      reader.readAsDataURL(file);
                    });
                    const fotoComprimida = await comprimirImagem(result);
                    setFotos(prev => [...prev, fotoComprimida]);
                  }
                  setUploadStatus("");
                }} className="hidden" id="foto-input" />
              <label htmlFor="foto-input" className="flex flex-col items-center justify-center p-6 border-2 border-dashed border-slate-200 rounded-xl text-slate-400 hover:bg-slate-50 cursor-pointer">
                <Camera size={24} className="mb-2" />
                <span className="text-[10px] font-bold uppercase">Anexar fotos de vistoria</span>
              </label>
              {fotos.length > 0 && (
                <div className="grid grid-cols-4 gap-2">
                  {fotos.map((f, i) => (
                    <div key={i} className="relative h-16 w-16 bg-slate-100 rounded-lg overflow-hidden border">
                      <img src={f} className="h-full w-full object-cover" alt="vistoria" />
                      <button onClick={() => setFotos(p => p.filter((_, idx) => idx !== i))} className="absolute top-0 right-0 bg-red-500 text-white rounded-bl-lg p-0.5">
                        <X size={12} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div className={`p-4 rounded-2xl border-2 transition-all ${formData.termo_aceite ? 'bg-slate-900 border-slate-900' : 'bg-white border-slate-200'}`}>
              <label className="flex items-start gap-4 cursor-pointer">
                <div className="relative flex items-center mt-1">
                  <input type="checkbox" className="w-6 h-6 rounded border-slate-300 text-slate-900 focus:ring-slate-500 cursor-pointer" checked={formData.termo_aceite} onChange={(e) => setFormData({...formData, termo_aceite: e.target.checked})} />
                </div>
                <div className="flex-1">
                  <p className={`text-[11px] font-bold leading-relaxed uppercase ${formData.termo_aceite ? 'text-slate-100' : 'text-slate-500'}`}>
                    Eu, <span className={formData.termo_aceite ? 'text-yellow-400' : 'text-slate-800'}>{formData.motorista_nome || "O MOTORISTA"}</span>, de posse da VTR <span className={formData.termo_aceite ? 'text-yellow-400' : 'text-slate-800'}>{formData.prefixo_vtr || "---"}</span>, informo ter realizado a correta inspeção dos itens, me responsabilizando por qualquer divergência encontrada entre o que aqui se afirma e o estado real da viatura.
                  </p>
                </div>
              </label>
            </div>
            <button onClick={handleFinalizar} className={`w-full py-4 rounded-2xl shadow-lg flex justify-center items-center gap-2 font-black transition-all ${!formData.termo_aceite || loading ? "bg-slate-200 text-slate-400 cursor-not-allowed" : "bg-green-600 text-white hover:bg-green-700 active:scale-95"}`} disabled={!formData.termo_aceite || loading}>
              {loading ? ( <><Loader2 className="animate-spin" /> {uploadStatus || "PROCESSANDO..."}</> ) : ( <> <CheckCircle2 size={20} /> FINALIZAR VISTORIA DE {tipoVistoria} </> )}
            </button>
            <button onClick={() => { setStep(1); setChecklist({}); setFotos([]); }} className="w-full py-3 text-[10px] font-black text-slate-400 uppercase tracking-widest hover:text-slate-600 transition-colors"> ← Voltar e Corrigir Dados </button>
          </div>
        )}
        <ModalComunitaria isOpen={modalComunitaria} onClose={() => setModalComunitaria(false)} onSelect={(v) => { setFormData(p => ({ ...p, modalidade: v })); setModalComunitaria(false); }} />
        <ModalTrocaOleo isOpen={modalOleo} onClose={() => setModalOleo(false)} kmAtual={tipoVistoria === "ENTRADA" ? formData.hodometro_entrada : formData.hodometro_saida} onConfirm={(dados) => { setDadosOleo(dados); setModalOleo(false); }} />
      </main>
    </div>
  );
};

export default Vistoria;
