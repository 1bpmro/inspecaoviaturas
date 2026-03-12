import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useAuth } from '../lib/AuthContext'; 
import { gasApi } from '../api/gasClient';
import imageCompression from 'browser-image-compression';

// Firebase e Cloudinary
import { db, collection, addDoc, serverTimestamp } from '../lib/firebase';
import { photoService } from '../api/photoService'; 

import ModalComunitaria from "../components/vistoria/ModalComunitaria";
import CardGuarnicao from "../components/vistoria/CardGuarnicao";
import ChecklistGrupo from "../components/vistoria/ChecklistGrupo";

import { 
  ArrowLeft, ChevronRight, Loader2, X, Plus, 
  Users, Lock, Unlock, Car, Shield, Wrench 
} from 'lucide-react';

// --- CONFIGURAÇÃO E CONSTANTES ---
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
  },
  {
    nome: "Mecânica Básica",
    icon: <Wrench size={16} />,
    itens: ["Nível de Água"]
  }
];

const MAPA_FALHAS_SAIDA = {
  "Viatura Entregue Limpa": "VIATURA ENTREGUE SUJA",
  "Viatura em Condições de Uso": "VIATURA SEM CONDIÇÕES DE USO",
  "Avarias Constatadas": "AVARIAS CONSTATADAS",
  "Limpeza Interna": "SEM LIMPEZA INTERNA",
  "Limpeza Externa": "SEM LIMPEZA EXTERNA",
  "Pertences da Guarnição Retirados": "ENCONTRADO PERTENCES DA GUARNIÇÃO"
};

const ITENS_SAIDA = Object.keys(MAPA_FALHAS_SAIDA);
const TIPOS_SERVICO = ["Patrulhamento Ordinário", "Operação", "Força Tática", "Patrulha Comunitária", "Patrulhamento Rural", "Outro"];

const COMPRESSION_OPTIONS = {
  maxSizeMB: 0.04,
  maxWidthOrHeight: 720,
  useWebWorker: true,
  fileType: "image/jpeg",
  initialQuality: 0.55
};

// --- SUB-COMPONENTE: MODAL TROCA DE ÓLEO ---
const ModalTrocaOleo = ({ isOpen, onClose, vtr, kmEntrada, user }) => {
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [fotoOleo, setFotoOleo] = useState(null);
  const [dadosOleo, setDadosOleo] = useState({
    data_troca: new Date().toISOString().split('T')[0],
    km_troca: ''
  });

  useEffect(() => {
    if (isOpen) setDadosOleo(prev => ({ ...prev, km_troca: kmEntrada || '' }));
  }, [isOpen, kmEntrada]);

  const handleProcessarFoto = async (e) => {
    const file = e.target.files[0]; 
    if (!file) return;
    setUploading(true);
    try {
      const compressedFile = await imageCompression(file, COMPRESSION_OPTIONS);
      const base64 = await imageCompression.getDataUrlFromFile(compressedFile);
      setFotoOleo(base64);
    } catch (err) { 
      console.error(err);
      alert("Erro ao processar foto.");
    } finally { setUploading(false); }
  };

  const handleSalvar = async () => {
    const kmTrocaNum = Number(dadosOleo.km_troca);
    if (!kmTrocaNum) return alert("Por favor, insira o KM da troca.");
    if (!fotoOleo) return alert("A foto do comprovante/etiqueta é obrigatória.");

    setLoading(true);
    try {
      // 1. Upload para Cloudinary
      const urlFoto = await photoService.uploadFoto(fotoOleo);

      // 2. Salvar no Firestore
      await addDoc(collection(db, "trocas_oleo"), {
        prefixo: vtr?.Prefixo || vtr?.PREFIXO,
        data_troca: dadosOleo.data_troca,
        km_troca: kmTrocaNum,
        foto_url: urlFoto,
        militar_re: user?.re || '',
        militar_nome: `${user?.patente || ''} ${user?.nome || ''}`.trim(),
        createdAt: serverTimestamp()
      });

      alert("Troca de óleo registrada com sucesso!");
      onClose();
    } catch (e) { 
      alert("Erro ao registrar troca de óleo."); 
    } finally { setLoading(false); }
  };

  if (!isOpen || !vtr) return null;

  return (
    <div className="fixed inset-0 z-[100] bg-slate-900/95 backdrop-blur-md flex items-center justify-center p-4">
      <div className="bg-white w-full max-w-md rounded-[2.5rem] p-6 space-y-4 border-t-8 border-orange-500 shadow-2xl">
        <div className="text-center">
          <Wrench size={32} className="mx-auto text-orange-600 mb-2" />
          <h2 className="font-black text-slate-900 uppercase text-sm">Registrar Troca de Óleo</h2>
        </div>
        <div className="space-y-3">
          <input type="date" className="vtr-input w-full" value={dadosOleo.data_troca} onChange={e => setDadosOleo({...dadosOleo, data_troca: e.target.value})} />
          <input type="number" className="vtr-input w-full" placeholder="KM DA ETIQUETA" value={dadosOleo.km_troca} onChange={e => setDadosOleo({...dadosOleo, km_troca: e.target.value})} />
        </div>
        <div className="p-4 border-2 border-dashed rounded-3xl bg-slate-50 text-center relative">
          {fotoOleo ? (
            <div className="relative aspect-video rounded-xl overflow-hidden">
              <img src={fotoOleo} className="w-full h-full object-cover" alt="Etiqueta" />
              <button onClick={() => setFotoOleo(null)} className="absolute top-2 right-2 bg-red-600 text-white p-2 rounded-full"><X size={16}/></button>
            </div>
          ) : (
            <label className="cursor-pointer block py-6">
              {uploading ? <Loader2 className="animate-spin mx-auto text-orange-500" /> : (
                <>
                  <Plus className="mx-auto text-orange-500 mb-2" />
                  <span className="text-[10px] font-black text-slate-500 uppercase">Foto da Etiqueta</span>
                </>
              )}
              <input type="file" accept="image/*" capture="environment" className="hidden" onChange={handleProcessarFoto} />
            </label>
          )}
        </div>
        <div className="flex gap-2">
          <button onClick={onClose} className="flex-1 font-black text-slate-400 uppercase text-xs">Sair</button>
          <button onClick={handleSalvar} disabled={loading || uploading} className="flex-[2] bg-orange-500 text-white p-4 rounded-2xl font-black">
            {loading ? <Loader2 className="animate-spin mx-auto"/> : "CONFIRMAR"}
          </button>
        </div>
      </div>
    </div>
  );
};

// --- COMPONENTE PRINCIPAL ---
const Vistoria = ({ onBack, frotaInicial = [] }) => { 
  const { user } = useAuth();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [viaturas, setViaturas] = useState(frotaInicial);
  const [efetivoLocal, setEfetivoLocal] = useState([]);
  const [tipoVistoria, setTipoVistoria] = useState('ENTRADA');
  const [protegerFotos, setProtegerFotos] = useState(false);
  const [kmReferencia, setKmReferencia] = useState(0);
  const [modalOleoOpen, setModalOleoOpen] = useState(false);
  const [reNaoEncontrado, setReNaoEncontrado] = useState({ motorista: false, comandante: false, patrulheiro: false });
  const [modalComunitariaOpen, setModalComunitariaOpen] = useState(false);

  // NOVO: Estado para fotos da vistoria
  const [fotosVistoria, setFotosVistoria] = useState([]);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);

  const [formData, setFormData] = useState({
    prefixo_vtr: '', placa_vtr: '', hodometro: '', videomonitoramento: '', 
    tipo_servico: '', servico_detalhe: '',
    motorista_re: '', motorista_nome: '', motorista_unidade: '',
    comandante_re: '', comandante_nome: '', comandante_unidade: '',
    patrulheiro_re: '', patrulheiro_nome: '', patrulheiro_unidade: '',
    termo_aceite: false
  });

  const [checklist, setChecklist] = useState({});

  const toggleChecklist = (item) => {
    setChecklist(prev => ({
      ...prev,
      [item]: prev[item] === "OK" ? "FALHA" : "OK"
    }));
  };

  const toStr = useCallback((v) => (v !== undefined && v !== null ? String(v) : ''), []);

  // Sincroniza Checklist e Reseta Campos ao trocar tipo de vistoria
  useEffect(() => {
    const itens = tipoVistoria === 'ENTRADA' ? GRUPOS_ENTRADA.flatMap(g => g.itens) : ITENS_SAIDA;
    setChecklist(itens.reduce((acc, i) => ({ ...acc, [i]: 'OK' }), {}));
    
    setFormData(prev => ({ 
      ...prev, 
      placa_vtr: '', hodometro: '', 
      motorista_re: '', motorista_nome: '', comandante_re: '', comandante_nome: '', patrulheiro_re: '', patrulheiro_nome: ''
    }));
    setKmReferencia(0);
    setFotosVistoria([]);
  }, [tipoVistoria]);

  // Efeito de Sincronização de Dados (Mantido)
  useEffect(() => {
    let isMounted = true;
    const sync = async () => {
      const cache = localStorage.getItem("viaturas_cache");
      if (cache && isMounted) {
        try { setViaturas(JSON.parse(cache)); } catch { localStorage.removeItem("viaturas_cache"); }
      }
      try {
        const [resVtr, resMil] = await Promise.all([
          gasApi.getViaturas(),
          gasApi.getEfetivoCompleto()
        ]);
        if (!isMounted) return;
        if (resVtr.status === "success") {
          setViaturas(resVtr.data);
          localStorage.setItem("viaturas_cache", JSON.stringify(resVtr.data));
        }
        if (resMil.status === "success") setEfetivoLocal(resMil.data);
      } catch (e) { console.error("Erro ao sincronizar:", e); }
    };
    sync();
    return () => { isMounted = false; };
  }, []);

  const vtrSelecionada = useMemo(() => 
    viaturas.find(v => toStr(v.Prefixo || v.PREFIXO) === toStr(formData.prefixo_vtr)), [formData.prefixo_vtr, viaturas, toStr]);

  const viaturasFiltradas = useMemo(() => {
    return viaturas
      .slice()
      .sort((a, b) => String(a.PREFIXO || a.prefixo).localeCompare(String(b.PREFIXO || b.prefixo)))
      .filter(v => {
        const s = String(v.STATUS || v.status || "").toUpperCase();
        if (tipoVistoria === "ENTRADA") {
          return (s.includes("DISP") || s.includes("PÁTIO") || s.includes("MANUT") || s === "");
        } else {
          return s.includes("SERV") || s.includes("AGUAR");
        }
      });
  }, [viaturas, tipoVistoria]);

  const precisaTrocaOleo = useMemo(() => {
    if (!vtrSelecionada || tipoVistoria !== 'ENTRADA') return false;
    return vtrSelecionada.ALERTA_OLEO === true || vtrSelecionada.alerta_oleo === true;
  }, [vtrSelecionada, tipoVistoria]);

  const kmInvalido = useMemo(() => {
    const kmAt = Number(formData.hodometro);
    return tipoVistoria === 'SAÍDA' && kmAt > 0 && kmAt <= kmReferencia;
  }, [formData.hodometro, kmReferencia, tipoVistoria]);

  const isFormIncompleto = useMemo(() => {
    const servicosEsp = ['Operação', 'Outro', 'Patrulha Comunitária'];
    const servicoIncomp = !formData.tipo_servico || (servicosEsp.includes(formData.tipo_servico) && !formData.servico_detalhe);
    return !formData.prefixo_vtr || servicoIncomp || !formData.hodometro || !formData.motorista_nome || !formData.comandante_nome || kmInvalido;
  }, [formData, kmInvalido]);

  const handleMatriculaChange = (valor, cargo) => {
    const reLimpo = String(valor).replace(/\D/g, '');
    setFormData(prev => ({ ...prev, [`${cargo}_re`]: reLimpo }));

    if (reLimpo.length >= 4) {
      const reBusca = (reLimpo.length <= 6 && !reLimpo.startsWith("1000")) ? "1000" + reLimpo : reLimpo;
      const militar = efetivoLocal.find(m => String(m.re) === reBusca || String(m.re) === reLimpo);

      if (militar) {
        setFormData(prev => ({ 
          ...prev, 
          [`${cargo}_re`]: String(militar.re),
          [`${cargo}_nome`]: `${militar.patente} ${militar.nome}`.toUpperCase(), 
          [`${cargo}_unidade`]: (militar.unidade || '1º BPM').toUpperCase()
        }));
        setReNaoEncontrado(prev => ({ ...prev, [cargo]: false }));
      } else {
        setFormData(prev => ({ ...prev, [`${cargo}_nome`]: '', [`${cargo}_unidade`]: '' }));
        setReNaoEncontrado(prev => ({ ...prev, [cargo]: true }));
      }
    }
  };

  const handleVtrChange = (prefixo) => {
    const vtr = viaturas.find(v => toStr(v.Prefixo || v.PREFIXO || v.prefixo) === toStr(prefixo));
    if (!vtr) return;
    const getV = (k) => vtr[k] || vtr[k.toUpperCase()] || vtr[k.toLowerCase()] || '';
    const pref = toStr(getV('PREFIXO') || getV('Prefixo'));
    const placa = toStr(getV('PLACA'));
    const ultKM = Number(getV('UltimoKM')) || 0;

    setKmReferencia(ultKM);
    if (tipoVistoria === 'SAÍDA') {
      const buscarNomePeloRE = (re) => {
        const mil = efetivoLocal.find(m => String(m.re) === String(re));
        return mil ? `${mil.patente} ${mil.nome}`.toUpperCase() : '';
      };
      setFormData(p => ({
        ...p, prefixo_vtr: pref, placa_vtr: placa,
        tipo_servico: toStr(getV('UltimoTipoServico')),
        servico_detalhe: toStr(getV('UltimoServicoDetalhe')),
        videomonitoramento: toStr(getV('UltimoVideo')),
        hodometro: String(ultKM),
        motorista_re: toStr(getV('UltimoMotoristaRE')),
        motorista_nome: buscarNomePeloRE(getV('UltimoMotoristaRE')),
        comandante_re: toStr(getV('UltimoComandanteRE')),
        comandante_nome: buscarNomePeloRE(getV('UltimoComandanteRE')),
        patrulheiro_re: toStr(getV('UltimoPatrulheiroRE')),
        patrulheiro_nome: buscarNomePeloRE(getV('UltimoPatrulheiroRE')),
      }));
    } else {
      setFormData(p => ({
        ...p, prefixo_vtr: pref, placa_vtr: placa, hodometro: '',
        motorista_re: '', motorista_nome: '', comandante_re: '', comandante_nome: '', patrulheiro_re: '', patrulheiro_nome: ''
      }));
    }
  };

  // Captura de Foto para Vistoria
  const handleAddFotoVistoria = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setUploadingPhoto(true);
    try {
      const compressed = await imageCompression(file, COMPRESSION_OPTIONS);
      const base64 = await imageCompression.getDataUrlFromFile(compressed);
      setFotosVistoria(prev => [...prev, base64]);
    } catch (e) { alert("Erro ao processar imagem."); }
    finally { setUploadingPhoto(false); }
  };

  const handleFinalizar = async () => {
    if (!formData.termo_aceite) return alert("Aceite o termo para prosseguir.");

    setLoading(true);
    try {
      // 1. Upload das fotos para Cloudinary
      const urlsFotos = [];
      for (const foto of fotosVistoria) {
        const url = await photoService.uploadFoto(foto);
        urlsFotos.push(url);
      }

      // 2. Preparar resumo de falhas
      const falhas = Object.entries(checklist)
        .filter(([_, s]) => s === "FALHA")
        .map(([i]) => i);

      const resumo = falhas.length === 0 ? "SEM ALTERAÇÕES" : 
        (tipoVistoria === "ENTRADA" ? `FALHA EM: ${falhas.join(", ")}` : 
        falhas.map(i => MAPA_FALHAS_SAIDA[i] || i).join(", "));

      // 3. Payload para Firestore
      const payload = {
        ...formData,
        tipo_vistoria: tipoVistoria,
        checklist_resumo: resumo,
        proteger_ocorrencia: protegerFotos,
        fotos_urls: urlsFotos,
        militar_logado: `${user?.patente || ""} ${user?.nome || ""}`.trim(),
        createdAt: serverTimestamp(),
        status_garageiro: "PENDENTE"
      };

      // 4. Salvar no Firestore
      await addDoc(collection(db, "vistorias"), payload);
      
      alert("Vistoria finalizada com sucesso!");
      onBack();

    } catch (e) {
      console.error(e);
      alert("Erro ao salvar. Tente novamente.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 pb-10">
      <header className="bg-slate-900 text-white p-5 sticky top-0 z-50">
        <div className="max-w-xl mx-auto flex items-center justify-between">
          <button onClick={onBack} className="p-2 bg-white/10 rounded-full"><ArrowLeft size={24}/></button>
          <div className="text-center">
            <h1 className="font-black text-[10px] opacity-50 uppercase">1º BPM - Rondon</h1>
            <p className="text-xs font-bold text-blue-400 uppercase">Vistoria</p>
          </div>
          <div className="w-10" />
        </div>
      </header>

      <main className="max-w-xl mx-auto p-4 space-y-4">
        <div className="flex bg-slate-200 p-1 rounded-2xl">
          {['ENTRADA', 'SAÍDA'].map(t => (
            <button key={t} onClick={() => setTipoVistoria(t)} className={`flex-1 py-3 rounded-xl font-black text-[10px] transition-all ${tipoVistoria === t ? (t === 'ENTRADA' ? 'bg-green-600 text-white' : 'bg-orange-500 text-white') : 'text-slate-50'}`}>{t}</button>
          ))}
        </div>

        {step === 1 ? (
          <div className="space-y-4">
            <section className="bg-white rounded-[2rem] p-6 shadow-sm border border-slate-200 space-y-4">
              <CardGuarnicao formData={formData} />
              <div className="grid grid-cols-2 gap-2">
                <select className="vtr-input" value={formData.prefixo_vtr} onChange={(e) => handleVtrChange(e.target.value)}>
                  <option value="">SELECIONE A VTR</option>
                  {viaturasFiltradas.map((v, i) => (
                    <option key={i} value={v.PREFIXO || v.prefixo}>{v.PREFIXO || v.prefixo}</option>
                  ))}
                </select>
                <select className="vtr-input" value={formData.tipo_servico} onChange={(e) => {
                  setFormData({...formData, tipo_servico: e.target.value, servico_detalhe: ''});
                  if (e.target.value === 'Patrulha Comunitária') setModalComunitariaOpen(true);
                }}>
                  <option value="">SERVIÇO</option>
                  {TIPOS_SERVICO.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>

              {['Operação', 'Outro', 'Patrulha Comunitária'].includes(formData.tipo_servico) && (
                <input type="text" className="vtr-input w-full uppercase" placeholder="DETALHE DO SERVIÇO" value={formData.servico_detalhe} onChange={(e) => setFormData({...formData, servico_detalhe: e.target.value.toUpperCase()})} />
              )}

              <div className="grid grid-cols-2 gap-2">
                <input type="number" className={`vtr-input ${kmInvalido ? 'border-red-500 bg-red-50' : ''}`} placeholder="KM ATUAL" value={formData.hodometro} onChange={(e) => setFormData({...formData, hodometro: e.target.value})} />
                <select className="vtr-input" value={formData.videomonitoramento} onChange={(e) => setFormData({...formData, videomonitoramento: e.target.value})}>
                  <option value="">VÍDEO</option>
                  <option value="OPERANTE">OPERANTE</option>
                  <option value="INOPERANTE">INOPERANTE</option>
                </select>
              </div>

              {precisaTrocaOleo && (
                <button onClick={() => setModalOleoOpen(true)} className="w-full bg-orange-50 border-2 border-orange-500 p-4 rounded-2xl flex items-center justify-between text-orange-700">
                  <div className="flex items-center gap-2"><Wrench size={20}/><span className="text-[10px] font-black">TROCA DE ÓLEO NECESSÁRIA</span></div>
                  <Plus size={16} />
                </button>
              )}

              {['motorista', 'comandante', 'patrulheiro'].map(cargo => (
                <div key={cargo} className="space-y-1">
                  <input type="tel" placeholder={`RE ${cargo.toUpperCase()}`} className="vtr-input w-full" value={formData[`${cargo}_re`]} onChange={(e) => handleMatriculaChange(e.target.value, cargo)} />
                  {reNaoEncontrado[cargo] && (
                    <div className="grid grid-cols-2 gap-2">
                      <input type="text" placeholder="NOME COMPLETO" className="vtr-input text-[10px]" value={formData[`${cargo}_nome`]} onChange={(e) => setFormData(p => ({ ...p, [`${cargo}_nome`]: e.target.value.toUpperCase() }))} />
                      <input type="text" placeholder="UNIDADE" className="vtr-input text-[10px]" value={formData[`${cargo}_unidade`]} onChange={(e) => setFormData(p => ({ ...p, [`${cargo}_unidade`]: e.target.value.toUpperCase() }))} />
                    </div>
                  )}
                </div>
              ))}
            </section>
            <button onClick={() => setStep(2)} disabled={isFormIncompleto} className="btn-tatico w-full disabled:opacity-40">CHECKLIST <ChevronRight size={18}/></button>
          </div>
        ) : (
          <div className="space-y-4">
            <CardGuarnicao formData={formData} compacto />

            {/* SEÇÃO DE FOTOS DA VISTORIA */}
            <div className="bg-white rounded-3xl p-5 border border-slate-200 space-y-3">
              <h3 className="font-black text-[10px] text-slate-400 uppercase flex items-center gap-2"><Car size={14}/> Fotos da Vistoria (Opcional)</h3>
              <div className="grid grid-cols-4 gap-2">
                {fotosVistoria.map((f, i) => (
                  <div key={i} className="relative aspect-square rounded-xl overflow-hidden border">
                    <img src={f} className="w-full h-full object-cover" />
                    <button onClick={() => setFotosVistoria(p => p.filter((_, idx) => idx !== i))} className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-1"><X size={10}/></button>
                  </div>
                ))}
                <label className="aspect-square rounded-xl border-2 border-dashed border-slate-200 flex flex-col items-center justify-center text-slate-400 cursor-pointer hover:bg-slate-50">
                  {uploadingPhoto ? <Loader2 size={16} className="animate-spin"/> : <Plus size={20}/>}
                  <input type="file" accept="image/*" capture="environment" className="hidden" onChange={handleAddFotoVistoria} />
                </label>
              </div>
            </div>

            <div onClick={() => setProtegerFotos(!protegerFotos)} className={`p-4 rounded-3xl border-2 flex items-center gap-4 cursor-pointer transition-colors ${protegerFotos ? 'bg-blue-600 text-white border-blue-700' : 'bg-white text-slate-400 border-slate-200'}`}>
              {protegerFotos ? <Lock size={20} /> : <Unlock size={20} />}
              <span className="font-black text-[10px] uppercase">Proteger Imagens da Ocorrência</span>
            </div>

            {tipoVistoria === "ENTRADA" ? (
              GRUPOS_ENTRADA.map(g => (
                <ChecklistGrupo key={g.nome} titulo={g.nome} icon={g.icon} itens={g.itens} checklist={checklist} onToggle={toggleChecklist} />
              ))
            ) : (
              <div className="bg-white rounded-3xl p-4 border border-slate-200">
                {ITENS_SAIDA.map(item => (
                  <div key={item} onClick={() => toggleChecklist(item)} className={`flex justify-between items-center p-3 mb-1 rounded-xl border cursor-pointer transition-all ${checklist[item] === 'FALHA' ? 'border-red-500 bg-red-50' : 'bg-slate-50 border-transparent'}`}>
                    <span className="text-[11px] font-bold uppercase">{item}</span>
                    <span className={`text-[9px] font-black px-2 py-1 rounded ${checklist[item] === 'OK' ? 'text-green-600' : 'bg-red-600 text-white'}`}>{checklist[item]}</span>
                  </div>
                ))}
              </div>
            )}

            <label className="flex items-start gap-4 p-5 bg-white border-2 border-slate-200 rounded-3xl cursor-pointer">
              <input type="checkbox" className="w-6 h-6 rounded-lg" checked={formData.termo_aceite} onChange={(e) => setFormData({...formData, termo_aceite: e.target.checked})} />
              <p className="text-[10px] font-black uppercase text-slate-600 leading-tight">EU, {formData.motorista_nome || 'MOTORISTA'}, DECLARO QUE AS INFORMAÇÕES ACIMA SÃO EXPRESSÃO DA VERDADE.</p>
            </label>

            <div className="flex gap-2">
              <button onClick={() => setStep(1)} className="flex-1 bg-white p-5 rounded-2xl font-black border-2 border-slate-200 uppercase text-xs">Voltar</button>
              <button onClick={handleFinalizar} disabled={!formData.termo_aceite || loading} className="btn-tatico flex-[2]">
                {loading ? <Loader2 className="animate-spin mx-auto" /> : "FINALIZAR VISTORIA"}
              </button>
            </div>
          </div>
        )}
      </main>

      <ModalTrocaOleo isOpen={modalOleoOpen} onClose={() => setModalOleoOpen(false)} vtr={vtrSelecionada} kmEntrada={formData.hodometro} user={user} />
      <ModalComunitaria isOpen={modalComunitariaOpen} onClose={() => setModalComunitariaOpen(false)} onSelect={(escolha) => {
        setFormData(prev => ({ ...prev, servico_detalhe: escolha }));
        setModalComunitariaOpen(false);
      }} />
    </div>
  );
};

export default Vistoria;
