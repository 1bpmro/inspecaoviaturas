import React, { useState, useEffect } from "react";
import { useAuth } from "../lib/AuthContext";
import { gasApi } from "../api/gasClient";

import CardGuarnicao from "../components/vistoria/CardGuarnicao";
import ModalComunitaria from "../components/vistoria/ModalComunitaria";
import ModalTrocaOleo from "../components/vistoria/ModalOleo";

import { ArrowLeft, Loader2, ChevronRight, Car, Shield, AlertCircle, CheckCircle2 } from "lucide-react";

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
  
  // 5. CHECK DE ERRO HTTP NO CLOUDINARY
  if (!res.ok) throw new Error(`Falha no upload Cloudinary: ${res.status}`);
  
  const data = await res.json();
  if (!data.secure_url) throw new Error("URL segura não retornada pelo Cloudinary");
  return data.secure_url;
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

  // 1. Carregamento com Cache e Tratamento de Erro de Timeout
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
        if (!localStorage.getItem("viaturas_cache")) {
          alert("⚠️ Sem conexão com servidor e sem cache disponível.");
        }
      } finally {
        setLoadingViaturas(false);
      }
    })();
  }, []);

  // 2. Reset Alerta ao trocar VTR
  useEffect(() => {
    setAlertaOleoDisparado(false);
    setDadosOleo(null);
  }, [formData.prefixo_vtr]);

  // 3. Monitoramento de Alerta de Óleo (Seguro contra KM vazio/string)
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

  // 4. Lógica de Troca de Viatura (Corrigida para evitar Race Condition)
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
      alert(`🚨 VIATURA BLOQUEADA\n\nPrefixo ${prefixo} rodou ${diff}km sem troca de óleo.`);
      setUploadStatus("🚨 Viatura bloqueada para saída");
      return; 
    }

    const baseData = {
      prefixo_vtr: prefixo,
      placa_vtr: String(vtr.PLACA ?? vtr.Placa ?? ""),
      [tipoVistoria === "ENTRADA" ? "hodometro_entrada" : "hodometro_saida"]: tipoVistoria === "SAÍDA" ? kmAtualDaVtr : ""
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
            motorista_re: d.motorista_re || "", motorista_nome: d.motorista_nome || "", motorista_unidade: d.motorista_unidade || "",
            comandante_re: d.comandante_re || "", comandante_nome: d.comandante_nome || "", comandante_unidade: d.comandante_unidade || "",
            patrulheiro_re: d.patrulheiro_re || "", patrulheiro_nome: d.patrulheiro_nome || "", patrulheiro_unidade: d.patrulheiro_unidade || "",
            hodometro_saida: d.hodometro || kmAtualDaVtr,
            operacao_nome: d.operacao_nome || "", modalidade: d.modalidade || ""
          }));
        } else {
          setFormData(prev => ({ ...prev, ...baseData }));
        }
      } catch (e) { 
        console.error(e);
        setFormData(prev => ({ ...prev, ...baseData }));
      } finally { setLoading(false); }
    } else {
      setFormData(prev => ({ ...prev, ...baseData }));
    }
  };

  const handleFinalizar = async () => {
    const kmFinal = tipoVistoria === "ENTRADA" ? formData.hodometro_entrada : formData.hodometro_saida;
    
    if (Number(kmFinal) < kmReferencia && kmReferencia > 0) {
      return alert(`Erro: KM (${kmFinal}) menor que o registro anterior (${kmReferencia}).`);
    }

    setLoading(true);
    try {
      setUploadStatus("Salvando...");
      const payload = {
        ...formData,
        hodometro: kmFinal,
        tipo_vistoria: tipoVistoria,
        tipo_servico: tipoServico,
        checklist: JSON.stringify(checklist),
        // 3. SAFE USER CHECK
        militar_logado: user ? `${user.patente} ${user.nome}` : "NÃO IDENTIFICADO"
      };

      if (dadosOleo?.foto) {
        const linkOleo = await uploadParaCloudinary(dadosOleo.foto, formData.prefixo_vtr, "OLEO", dadosOleo.kmTroca, 0);
        payload.troca_oleo = JSON.stringify({ ...dadosOleo, foto: linkOleo });
      }

      const res = await gasApi.saveVistoria(payload);
      if (res.status === "success") {
        if (fotos.length) {
          let links = [];
          for (let i = 0; i < fotos.length; i++) {
            setUploadStatus(`Fotos: ${i + 1}/${fotos.length}`);
            const link = await uploadParaCloudinary(fotos[i], formData.prefixo_vtr, tipoVistoria, kmFinal, i);
            links.push(link);
          }
          await gasApi.saveVistoria({ id_referencia: res.id, links_fotos: links });
        }
        alert("Vistoria finalizada com sucesso!");
        onBack();
      }
    } catch (e) { alert("Erro ao salvar."); } finally { setLoading(false); }
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
            <div className="flex bg-slate-200 p-1 rounded-xl gap-1">
              <button onClick={() => { setTipoVistoria("ENTRADA"); setFormData(p => ({ ...p, prefixo_vtr: "" })); }} className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all ${tipoVistoria === "ENTRADA" ? "bg-slate-900 text-white shadow" : "text-slate-600"}`}>ENTRADA</button>
              <button onClick={() => { setTipoVistoria("SAÍDA"); setFormData(p => ({ ...p, prefixo_vtr: "" })); }} className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all ${tipoVistoria === "SAÍDA" ? "bg-slate-900 text-white shadow" : "text-slate-600"}`}>SAÍDA</button>
            </div>

            <CardGuarnicao formData={formData} />

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
                      // 4. PREFIXO CHECK
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

              <select className="vtr-input w-full" value={tipoServico} onChange={(e) => setTipoServico(e.target.value)}>
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
            <div className="p-4 bg-white rounded-xl border">
              <label className="flex items-center gap-3 cursor-pointer">
                <input type="checkbox" className="w-5 h-5" checked={formData.termo_aceite} onChange={(e) => setFormData({...formData, termo_aceite: e.target.checked})} />
                <span className="text-[10px] font-bold text-slate-600 leading-tight uppercase">ACEITO O TERMO DE RESPONSABILIDADE.</span>
              </label>
            </div>
            <button onClick={handleFinalizar} className="btn-tatico w-full py-4 shadow-lg" disabled={loading}>
              {loading ? <div className="flex items-center gap-2"><Loader2 className="animate-spin" /> {uploadStatus}</div> : "FINALIZAR VISTORIA"}
            </button>
            <button onClick={() => { setStep(1); setChecklist({}); }} className="w-full py-2 text-xs font-bold text-slate-400">VOLTAR E LIMPAR CHECKLIST</button>
          </div>
        )}

        <ModalComunitaria isOpen={modalComunitaria} onClose={() => setModalComunitaria(false)} onSelect={(v) => { setFormData(p => ({ ...p, modalidade: v })); setModalComunitaria(false); }} />
        <ModalTrocaOleo 
          isOpen={modalOleo} 
          onClose={() => setModalOleo(false)} 
          kmAtual={tipoVistoria === "ENTRADA" ? formData.hodometro_entrada : formData.hodometro_saida} 
          onConfirm={(dados) => { setDadosOleo(dados); setModalOleo(false); }} 
        />
      </main>
    </div>
  );
};

export default Vistoria;
