import React, { useState, useEffect } from "react";
import { useAuth } from "../lib/AuthContext";
import { gasApi } from "../api/gasClient";

import CardGuarnicao from "../components/vistoria/CardGuarnicao";
import ModalComunitaria from "../components/vistoria/ModalComunitaria";
import ModalTrocaOleo from "../components/vistoria/ModalOleo";

import { ArrowLeft, Loader2, ChevronRight, Car, Shield, AlertCircle, Users, CheckCircle2 } from "lucide-react";

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
  },
  {
    nome: "Interior e Conforto",
    icon: <Users size={16} />,
    itens: ["Cinto", "Retrovisor Interno", "Painel de Instrumentos", "Bancos", "Forro Interno", "Tapetes", "Regulador dos Bancos", "Porta Traseira", "Porta Dianteira"]
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
  const data = await res.json();
  if (!data.secure_url) throw new Error("Erro upload");
  return data.secure_url;
};

const Vistoria = ({ onBack }) => {
  const { user } = useAuth();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
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
    prefixo_vtr: "", 
    placa_vtr: "", 
    hodometro_entrada: "", // SEPARADO
    hodometro_saida: "",   // SEPARADO
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
        const res = await gasApi.getViaturas();
        console.log("VIATURAS API:", res);
        if (res?.status === "success") setViaturas(res.data);
      } catch (e) { 
  console.error("Erro ao carregar viaturas:", e);
  setViaturas([]); 
}
    })();
  }, []);

  // Sincronizar KM ao trocar Tipo de Vistoria
  useEffect(() => {
    if (!formData.prefixo_vtr) return;
    const vtr = viaturas.find(v => String(v.PREFIXO || v.Prefixo) === formData.prefixo_vtr);
    if (!vtr) return;
    const km = vtr.ULTIMOKM || vtr.UltimoKM || 0;
    
    // Se for SAÍDA, auto-preenche o KM de Saída com o último registro
    if (tipoVistoria === "SAÍDA") {
      setFormData(p => ({ ...p, hodometro_saida: km }));
    }
  }, [tipoVistoria, formData.prefixo_vtr, viaturas]); // Dependência corrigida (removido [] extra)

  // Monitorar KM para Troca de Óleo
 useEffect(() => {
  const kmDigitado = tipoVistoria === "ENTRADA" 
    ? formData.hodometro_entrada 
    : formData.hodometro_saida;

  // Só prossegue se tiver KM, referência, não tiver dados salvos e o alerta ainda não disparou
  if (kmDigitado && kmReferencia > 0 && !dadosOleo && !alertaOleoDisparado) {
    const kmRodadosDesdeATroca = Number(kmDigitado) - Number(kmReferencia);

    // Segurança extra: evita processar se o KM digitado for menor que a última troca (erro de digitação)
    if (kmRodadosDesdeATroca < 0) return;

    if (kmRodadosDesdeATroca >= 10000) {
      setModalOleo(true);
      setAlertaOleoDisparado(true); // Trava o gatilho para não repetir
    }
  }
}, [
  formData.hodometro_entrada, 
  formData.hodometro_saida, 
  kmReferencia, 
  tipoVistoria, 
  dadosOleo,
  alertaOleoDisparado // Dependência importante
]);

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

const carregarDadosUltimaVistoria = async (prefixo) => {
  try {
    const res = await gasApi.getUltimaVistoria(prefixo);
console.log("ULTIMA VISTORIA:", res);
    if (res?.status === "success" && res.data) {
      const v = res.data;
      
      // Atualiza o tipo de serviço se ele vier no banco
      if (v.tipo_servico) setTipoServico(v.tipo_servico);

      setFormData(p => ({
        ...p,
        // Trazendo os Nomes
        motorista_nome: v.motorista_nome,
        comandante_nome: v.comandante_nome,
        patrulheiro_nome: v.patrulheiro_nome,
        
        // Trazendo as Matrículas (RE)
        motorista_re: v.motorista_re,
        comandante_re: v.comandante_re,
        patrulheiro_re: v.patrulheiro_re,

        // Trazendo Unidades (opcional, mas ajuda a guarnição)
        motorista_unidade: v.motorista_unidade,
        comandante_unidade: v.comandante_unidade,
        patrulheiro_unidade: v.patrulheiro_unidade,

        hodometro_saida: v.hodometro // KM de entrada da última vira o inicial da saída
      }));
    }
  } catch (e) { console.error("Erro ao carregar dados da última vistoria:", e); }
};

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

const handleVtrChange = async (prefixo) => {
  // 1. Resets de segurança para nova VTR (evita que dados da VTR anterior interfiram)
  setAlertaOleoDisparado(false);
  setDadosOleo(null);

  // 2. Localiza a viatura no estado local
  const vtr = viaturas.find(v => String(v.PREFIXO || v.Prefixo) === prefixo);

  if (!vtr) {
    setFormData(p => ({ ...p, prefixo_vtr: "", placa_vtr: "" }));
    setKmReferencia(0);
    return;
  }

  // 3. Extrai dados básicos da viatura
  const kmAtualDaVtr = Number(vtr.ULTIMOKM || vtr.UltimoKM || 0);
  const placa = String(vtr.PLACA || vtr.Placa || "");
  const kmReferenciaOleo = Number(vtr.KM_TROCA_OLEO || vtr.km_troca_oleo || 0);

  // 4. Define a referência para o cálculo do alerta de óleo
  setKmReferencia(kmReferenciaOleo);

  // 5. Atualiza o estado básico imediatamente
  setFormData(prev => ({
    ...prev,
    prefixo_vtr: prefixo,
    placa_vtr: placa,
    // Se for SAÍDA, já sugere o último KM registrado no banco como KM inicial da saída
    [tipoVistoria === "ENTRADA" ? "hodometro_entrada" : "hodometro_saida"]: 
      tipoVistoria === "SAÍDA" ? kmAtualDaVtr : ""
  }));

  // 6. Fluxo de SAÍDA: Busca os dados da guarnição que entrou
  if (tipoVistoria === "SAÍDA") {
    try {
      setLoading(true);
      const res = await gasApi.getUltimaVistoria(prefixo);

      if (res?.status === "success" && res.data) {
        const d = res.data;
        
        // Sincroniza o tipo de serviço no select principal
        if (d.tipo_servico) setTipoServico(d.tipo_servico);

        // Preenche automaticamente R.E, Nomes e Unidades
        setFormData(prev => ({
          ...prev,
          // Motorista
          motorista_re: d.motorista_re || "",
          motorista_nome: d.motorista_nome || "",
          motorista_unidade: d.motorista_unidade || "",
          // Comandante
          comandante_re: d.comandante_re || "",
          comandante_nome: d.comandante_nome || "",
          comandante_unidade: d.comandante_unidade || "",
          // Patrulheiro
          patrulheiro_re: d.patrulheiro_re || "",
          patrulheiro_nome: d.patrulheiro_nome || "",
          patrulheiro_unidade: d.patrulheiro_unidade || "",
          // Usa o hodômetro da última vistoria como base, fallback para o atual da VTR
          hodometro_saida: d.hodometro || kmAtualDaVtr,
          // Recupera operação e modalidade
          operacao_nome: d.operacao_nome || "",
          modalidade: d.modalidade || ""
        }));
      }
    } catch (error) {
      console.error("Erro ao recuperar dados de entrada:", error);
    } finally {
      setLoading(false);
    }
  }
};

  const toggleCheck = (item) => {
    setChecklist(prev => ({ ...prev, [item]: !prev[item] }));
  };

  const handleFinalizar = async () => {
    const kmFinal = tipoVistoria === "ENTRADA" ? formData.hodometro_entrada : formData.hodometro_saida;
    
    if (!formData.prefixo_vtr) return alert("Selecione a viatura");
    if (!formData.motorista_nome) return alert("Preencha o nome do motorista");
    if (!kmFinal) return alert("Preencha o hodômetro");
    if (!formData.termo_aceite) return alert("Aceite o termo de responsabilidade");

    setLoading(true);
    try {
      setUploadStatus("Processando...");
      const payload = {
        ...formData,
        hodometro: kmFinal, // Envia o valor correto para a coluna única do banco
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
          const link = await uploadParaCloudinary(fotos[i], formData.prefixo_vtr, tipoVistoria, kmFinal, i);
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

  const gruposAtivos = tipoVistoria === "ENTRADA" ? GRUPOS_ENTRADA : GRUPOS_SAIDA;

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
            <div className="flex bg-slate-200 p-1 rounded-xl gap-1">
              <button onClick={() => setTipoVistoria("ENTRADA")} className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all ${tipoVistoria === "ENTRADA" ? "bg-slate-900 text-white shadow" : "text-slate-600"}`}>ENTRADA</button>
              <button onClick={() => setTipoVistoria("SAÍDA")} className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all ${tipoVistoria === "SAÍDA" ? "bg-slate-900 text-white shadow" : "text-slate-600"}`}>SAÍDA</button>
            </div>

            <CardGuarnicao formData={formData} />

            <div className="space-y-3 bg-white p-4 rounded-2xl shadow-sm border border-slate-100">
              <h3 className="text-xs font-black text-slate-400 flex items-center gap-2"><Car size={14} /> DADOS DA VIATURA</h3>
             <select
  className="vtr-input w-full"
  value={formData.prefixo_vtr}
  onChange={(e) => handleVtrChange(e.target.value)}
>
  <option value="">Selecione VTR</option>

  {viaturas
    .filter(v => {
      const status = String(v.STATUS || v.Status || "").toUpperCase();

      return tipoVistoria === "SAÍDA"
        ? status.includes("SERV")
        : status.includes("DISP");
    })
    .map((v, i) => (
      <option key={i} value={v.PREFIXO || v.Prefixo}>
        {v.PREFIXO || v.Prefixo}
      </option>
    ))}
</select>

              <select className="vtr-input w-full" value={tipoServico} onChange={(e) => setTipoServico(e.target.value)}>
                <option value="">Tipo de Serviço</option>
                <option value="RADIOPATRULHA">RADIOPATRULHA</option>
                <option value="FORCA_TATICA">FORÇA TÁTICA</option>
                <option value="OPERACAO">OPERAÇÃO</option>
                <option value="PATRULHA COMUNITÁRIA">PATRULHA COMUNITÁRIA</option>
                <option value="OUTROS">OUTROS</option>
              </select>

              {formData.modalidade && <div className="text-[10px] text-blue-600 font-bold px-2">MODALIDADE: {formData.modalidade}</div>}

              {(tipoServico === "OPERACAO" || tipoServico === "OUTROS") && (
                <input placeholder="NOME DA OPERAÇÃO / SERVIÇO" className="vtr-input w-full border-blue-200" value={formData.operacao_nome} onChange={(e) => setFormData(p => ({ ...p, operacao_nome: e.target.value.toUpperCase() }))} />
              )}

              <div className="relative">
                <input 
                  placeholder="HODÔMETRO (KM)" 
                  type="number" 
                  className="vtr-input w-full" 
                  value={tipoVistoria === "ENTRADA" ? formData.hodometro_entrada : formData.hodometro_saida} 
                  onChange={(e) => {
                    const valor = e.target.value;
                    const field = tipoVistoria === "ENTRADA" ? "hodometro_entrada" : "hodometro_saida";

                    if (valor === "") {
                      setFormData({ ...formData, [field]: "" });
                      return;
                    }

                    const numero = Number(valor);
                    if (numero < kmReferencia) {
                      alert(`KM não pode ser menor que ${kmReferencia}`);
                      return;
                    }

                    setFormData({ ...formData, [field]: numero });
                  }} 
                />
                {tipoVistoria === "SAÍDA" && <span className="absolute right-3 top-3 text-[10px] text-blue-500 font-bold">KM INICIAL</span>}
              </div>
            </div>

            <div className="space-y-3 bg-white p-4 rounded-2xl shadow-sm border border-slate-100">
              <h3 className="text-xs font-black text-slate-400 flex items-center gap-2"><Shield size={14} /> EFETIVO</h3>
              <div className="grid grid-cols-1 gap-6">
                {["motorista", "comandante", "patrulheiro"].map((campo) => (
  <div key={campo} className="space-y-2 border-b pb-4 border-slate-50 last:border-0 last:pb-0">
    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">{campo}</span>
    <input 
      placeholder={`RE ${campo.toUpperCase()}`} 
      className="vtr-input w-full"
      value={formData[`${campo}_re`] || ""} // ADICIONADO: para mostrar o RE carregado
      onChange={(e) => setFormData(p => ({ ...p, [`${campo}_re`]: e.target.value }))} // ADICIONADO
      onBlur={(e) => {
        const re = e.target.value;
        buscarMilitarAction(re, campo);
      }} 
    />
    {/* Se o militar for externo ou se o nome foi carregado, exibe os campos de nome/unidade */}
    {(formData[`${campo}_externo`] || formData[`${campo}_nome`]) && (
      <div className="grid grid-cols-2 gap-2 animate-in fade-in">
        <input 
          placeholder="NOME" 
          className="vtr-input w-full border-orange-300" 
          value={formData[`${campo}_nome`] || ""} 
          onChange={(e) => setFormData(p => ({ ...p, [`${campo}_nome`]: e.target.value.toUpperCase() }))} 
        />
        <input 
          placeholder="UNIDADE" 
          className="vtr-input w-full border-orange-300" 
          value={formData[`${campo}_unidade`] || ""} 
          onChange={(e) => setFormData(p => ({ ...p, [`${campo}_unidade`]: e.target.value.toUpperCase() }))} 
        />
      </div>
    )}
  </div>
))}
              </div>
            </div>

            <button onClick={() => setStep(2)} disabled={!tipoServico || !formData.prefixo_vtr} className="btn-tatico w-full py-4 flex justify-center items-center gap-2 disabled:opacity-50">
              PRÓXIMA ETAPA <ChevronRight size={18} />
            </button>
          </>
        )}

        {step === 2 && (
          <div className="space-y-4 animate-in slide-in-from-right">
            <div className="bg-amber-50 p-4 rounded-xl border border-amber-200 flex gap-3 items-start">
              <AlertCircle className="text-amber-600 shrink-0" size={20} />
              <p className="text-xs text-amber-900 leading-relaxed">
                Confirme os itens de {tipoVistoria} e anexe as fotos para finalizar.
              </p>
            </div>

            {gruposAtivos.map((grupo, idx) => (
              <div key={idx} className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100 space-y-3">
                <h4 className="text-[10px] font-black text-slate-400 flex items-center gap-2 uppercase tracking-widest">
                  {grupo.icon} {grupo.nome}
                </h4>
                <div className="grid grid-cols-1 gap-2">
                  {grupo.itens.map(item => (
                    <button key={item} onClick={() => toggleCheck(item)} className={`flex items-center justify-between p-3 rounded-xl border transition-all ${checklist[item] ? "bg-green-50 border-green-200 text-green-700" : "bg-slate-50 border-slate-100 text-slate-500"}`}>
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
                <span className="text-[10px] font-bold text-slate-600 leading-tight uppercase">
                  {tipoVistoria === "ENTRADA" 
                    ? `EU, ${formData.motorista_nome || "MOTORISTA"}, ME RESPONSABILIZO PELA VTR ${formData.prefixo_vtr || "SELECIONADA"}, DECLARANDO QUE AS INFORMAÇÕES SÃO VERDADEIRAS.`
                    : `EU, ${formData.motorista_nome || "MOTORISTA"}, FINALIZO O SERVIÇO NA VTR ${formData.prefixo_vtr || "SELECIONADA"} E ATÉSTO A CONDIÇÃO DE ENTREGA CONFORME DESCRITO.`
                  }
                </span>
              </label>
            </div>

            <button onClick={handleFinalizar} className="btn-tatico w-full py-4 shadow-lg" disabled={loading}>
              {loading ? <div className="flex items-center gap-2"><Loader2 className="animate-spin" /> {uploadStatus}</div> : "FINALIZAR VISTORIA"}
            </button>
            <button onClick={() => setStep(1)} className="w-full py-2 text-xs font-bold text-slate-400">VOLTAR</button>
          </div>
        )}

        <ModalComunitaria isOpen={modalComunitaria} onClose={() => setModalComunitaria(false)} onSelect={(v) => { setFormData(p => ({ ...p, modalidade: v })); setModalComunitaria(false); }} />
        <ModalTrocaOleo isOpen={modalOleo} onClose={() => setModalOleo(false)} kmAtual={tipoVistoria === "ENTRADA" ? formData.hodometro_entrada : formData.hodometro_saida} onConfirm={(dados) => { setDadosOleo(dados); setModalOleo(false); }} />
      </main>
    </div>
  );
};

export default Vistoria;
