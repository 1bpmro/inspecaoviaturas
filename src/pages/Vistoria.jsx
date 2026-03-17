import React, { useState, useEffect } from "react";
import { useAuth } from "../lib/AuthContext";
import { gasApi } from "../api/gasClient";

import CardGuarnicao from "../components/vistoria/CardGuarnicao";
import ModalComunitaria from "../components/vistoria/ModalComunitaria";
import ModalTrocaOleo from "../components/vistoria/ModalTrocaOleo";

import { ArrowLeft, Loader2, ChevronRight, Car, Shield, AlertCircle } from "lucide-react";

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

const Vistoria = ({ onBack }) => {
  const { user } = useAuth();

  // Estados de Fluxo e UI
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
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

  // Sincronizar KM ao trocar Tipo de Vistoria (Refino 4)
  useEffect(() => {
    if (!formData.prefixo_vtr) return;
    const vtr = viaturas.find(v => String(v.PREFIXO || v.Prefixo) === formData.prefixo_vtr);
    if (!vtr) return;
    const km = vtr.ULTIMOKM || vtr.UltimoKM || 0;
    setFormData(p => ({
      ...p,
      hodometro: tipoVistoria === "SAÍDA" ? km : ""
    }));
  }, [tipoVistoria]);

  // Monitorar KM para Troca de Óleo (Refino 3)
  useEffect(() => {
    if (!kmReferencia || !formData.hodometro || dadosOleo) return;
    const kmDiff = Number(formData.hodometro) - kmReferencia;
    if (kmDiff >= 9800) {
      setModalOleo(true);
    }
  }, [formData.hodometro, kmReferencia, dadosOleo]);

  // Ajustes de Tipo de Serviço
  useEffect(() => {
    if (tipoServico === "PATRULHA COMUNITÁRIA") {
      setModalComunitaria(true);
    } else {
      setFormData(p => ({ ...p, modalidade: "" }));
    }
    if (tipoServico !== "OPERACAO" && tipoServico !== "OUTROS") {
      setFormData(p => ({ ...p, operacao_nome: "" }));
    }
  }, [tipoServico]);

  /* ---------- BUSCA MILITAR + SALVAR RE (Refino 1) ---------- */
  const buscarMilitarAction = async (re, campo) => {
    if (!re) return;
    try {
      const res = await gasApi.buscarMilitar(re);
      if (res?.status === "success" && res?.found) {
        setFormData(p => ({ 
          ...p, 
          [`${campo}_nome`]: res.nome,
          [`${campo}_unidade`]: res.unidade,
          [`${campo}_externo`]: false 
        }));
      } else {
        setFormData(p => ({ 
          ...p, 
          [`${campo}_nome`]: "", 
          [`${campo}_unidade`]: "", 
          [`${campo}_externo`]: true 
        }));
      }
    } catch (e) { console.error(e); }
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
    } finally { setLoading(false); }
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="bg-slate-900 text-white p-4 flex justify-between items-center sticky top-0 z-50">
        <button onClick={onBack}><ArrowLeft /></button>
        <span className="text-xs font-bold tracking-widest">DERSO - VISTORIA</span>
        <div className="w-6" />
      </header>

      <main className="max-w-xl mx-auto p-4 space-y-4 pb-20">
        {step === 1 && (
          <>
            {/* Seletor de Tipo de Vistoria */}
            <div className="flex bg-slate-200 p-1 rounded-xl gap-1">
              <button
                onClick={() => setTipoVistoria("ENTRADA")}
                className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all ${tipoVistoria === "ENTRADA" ? "bg-slate-900 text-white shadow" : "text-slate-600"}`}
              >
                ENTRADA
              </button>
              <button
                onClick={() => setTipoVistoria("SAÍDA")}
                className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all ${tipoVistoria === "SAÍDA" ? "bg-slate-900 text-white shadow" : "text-slate-600"}`}
              >
                SAÍDA
              </button>
            </div>

            <CardGuarnicao formData={formData} />

            <div className="space-y-3 bg-white p-4 rounded-2xl shadow-sm border border-slate-100">
              <h3 className="text-xs font-black text-slate-400 flex items-center gap-2">
                <Car size={14} /> DADOS DA VIATURA
              </h3>
              
              <select className="vtr-input w-full" value={formData.prefixo_vtr} onChange={(e) => handleVtrChange(e.target.value)}>
                <option value="">Selecione VTR</option>
                {viaturas.map((v, i) => <option key={i} value={v.PREFIXO || v.Prefixo}>{v.PREFIXO || v.Prefixo}</option>)}
              </select>

              <select className="vtr-input w-full" value={tipoServico} onChange={(e) => setTipoServico(e.target.value)}>
                <option value="">Tipo de Serviço</option>
                <option value="RADIOPATRULHA">RADIOPATRULHA</option>
                <option value="FORCA_TATICA">FORÇA TÁTICA</option>
                <option value="OPERACAO">OPERAÇÃO</option>
                <option value="PATRULHA COMUNITÁRIA">PATRULHA COMUNITÁRIA</option>
                <option value="OUTROS">OUTROS</option>
              </select>

              {/* Modalidade Escolhida (Refino 5) */}
              {formData.modalidade && (
                <div className="text-[10px] text-blue-600 font-bold px-2">
                  MODALIDADE: {formData.modalidade}
                </div>
              )}

              {/* Nome da Operação Dinâmico */}
              {(tipoServico === "OPERACAO" || tipoServico === "OUTROS") && (
                <input
                  placeholder="NOME DA OPERAÇÃO / SERVIÇO"
                  className="vtr-input w-full border-blue-200 animate-in fade-in zoom-in duration-300"
                  value={formData.operacao_nome}
                  onChange={(e) => setFormData(p => ({ ...p, operacao_nome: e.target.value.toUpperCase() }))}
                />
              )}

              <div className="relative">
                <input 
                  placeholder="HODÔMETRO (KM)" 
                  type="number" 
                  className="vtr-input w-full" 
                  value={formData.hodometro} 
                  onChange={(e) => setFormData({ ...formData, hodometro: e.target.value })} 
                />
                {tipoVistoria === "SAÍDA" && <span className="absolute right-3 top-3 text-[10px] text-blue-500 font-bold">KM INICIAL</span>}
              </div>
            </div>

            <div className="space-y-3 bg-white p-4 rounded-2xl shadow-sm border border-slate-100">
              <h3 className="text-xs font-black text-slate-400 flex items-center gap-2">
                <Shield size={14} /> EFETIVO
              </h3>
              
              <div className="grid grid-cols-1 gap-6">
                
                {/* MOTORISTA */}
                <div className="space-y-2 border-b pb-4 border-slate-50">
                  <span className="text-[10px] font-bold text-slate-400 tracking-tighter">MOTORISTA</span>
                  <input 
                    placeholder="RE MOTORISTA" 
                    className="vtr-input w-full" 
                    onBlur={(e) => {
                      const re = e.target.value;
                      setFormData(p => ({ ...p, motorista_re: re }));
                      buscarMilitarAction(re, "motorista");
                    }}
                  />
                  {formData.motorista_externo && (
                    <div className="grid grid-cols-2 gap-2 animate-in fade-in duration-300">
                      <input placeholder="NOME" className="vtr-input w-full border-orange-300" value={formData.motorista_nome} onChange={(e) => setFormData(p => ({ ...p, motorista_nome: e.target.value.toUpperCase() }))} />
                      <input placeholder="UNIDADE" className="vtr-input w-full border-orange-300" value={formData.motorista_unidade} onChange={(e) => setFormData(p => ({ ...p, motorista_unidade: e.target.value.toUpperCase() }))} />
                    </div>
                  )}
                </div>

                {/* COMANDANTE */}
                <div className="space-y-2 border-b pb-4 border-slate-50">
                  <span className="text-[10px] font-bold text-slate-400 tracking-tighter">COMANDANTE</span>
                  <input 
                    placeholder="RE COMANDANTE" 
                    className="vtr-input w-full" 
                    onBlur={(e) => {
                      const re = e.target.value;
                      setFormData(p => ({ ...p, comandante_re: re }));
                      buscarMilitarAction(re, "comandante");
                    }}
                  />
                  {formData.comandante_externo && (
                    <div className="grid grid-cols-2 gap-2 animate-in fade-in duration-300">
                      <input placeholder="NOME" className="vtr-input w-full border-orange-300" value={formData.comandante_nome} onChange={(e) => setFormData(p => ({ ...p, comandante_nome: e.target.value.toUpperCase() }))} />
                      <input placeholder="UNIDADE" className="vtr-input w-full border-orange-300" value={formData.comandante_unidade} onChange={(e) => setFormData(p => ({ ...p, comandante_unidade: e.target.value.toUpperCase() }))} />
                    </div>
                  )}
                </div>

                {/* PATRULHEIRO */}
                <div className="space-y-2">
                  <span className="text-[10px] font-bold text-slate-400 tracking-tighter">PATRULHEIRO</span>
                  <input 
                    placeholder="RE PATRULHEIRO" 
                    className="vtr-input w-full" 
                    onBlur={(e) => {
                      const re = e.target.value;
                      setFormData(p => ({ ...p, patrulheiro_re: re }));
                      buscarMilitarAction(re, "patrulheiro");
                    }}
                  />
                  {formData.patrulheiro_externo && (
                    <div className="grid grid-cols-2 gap-2 animate-in fade-in duration-300">
                      <input placeholder="NOME" className="vtr-input w-full border-orange-300" value={formData.patrulheiro_nome} onChange={(e) => setFormData(p => ({ ...p, patrulheiro_nome: e.target.value.toUpperCase() }))} />
                      <input placeholder="UNIDADE" className="vtr-input w-full border-orange-300" value={formData.patrulheiro_unidade} onChange={(e) => setFormData(p => ({ ...p, patrulheiro_unidade: e.target.value.toUpperCase() }))} />
                    </div>
                  )}
                </div>

              </div>
            </div>

            <button 
              onClick={() => setStep(2)} 
              disabled={!tipoServico || !formData.prefixo_vtr}
              className="btn-tatico w-full py-4 flex justify-center items-center gap-2 disabled:opacity-50"
            >
              PRÓXIMA ETAPA <ChevronRight size={18} />
            </button>
          </>
        )}

        {step === 2 && (
          <div className="space-y-4 animate-in slide-in-from-right duration-300">
             <div className="bg-amber-50 p-4 rounded-xl border border-amber-200 flex gap-3 items-start">
                <AlertCircle className="text-amber-600 shrink-0" size={20} />
                <p className="text-xs text-amber-900 leading-relaxed">
                  Confirme os itens do checklist e anexe as fotos necessárias para finalizar a vistoria de {tipoVistoria}.
                </p>
             </div>
             
             <div className="p-4 bg-white rounded-xl border">
               <label className="flex items-center gap-3 cursor-pointer">
                 <input 
                  type="checkbox" 
                  className="w-5 h-5"
                  checked={formData.termo_aceite}
                  onChange={(e) => setFormData({...formData, termo_aceite: e.target.checked})}
                 />
                 <span className="text-[10px] font-bold text-slate-600 leading-tight">
                   DECLARO QUE AS INFORMAÇÕES PRESTADAS SÃO VERDADEIRAS E A VIATURA ENCONTRA-SE NAS CONDIÇÕES ACIMA.
                 </span>
               </label>
             </div>

             <button onClick={handleFinalizar} className="btn-tatico w-full py-4 shadow-lg" disabled={loading}>
              {loading ? (
                <div className="flex items-center gap-2">
                  <Loader2 className="animate-spin" /> {uploadStatus}
                </div>
              ) : "FINALIZAR VISTORIA"}
            </button>
            <button onClick={() => setStep(1)} className="w-full py-2 text-xs font-bold text-slate-400">VOLTAR</button>
          </div>
        )}

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
