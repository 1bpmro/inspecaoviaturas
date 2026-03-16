import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useAuth } from '../lib/AuthContext'; 
import { gasApi } from '../api/gasClient';
import imageCompression from 'browser-image-compression';

import ModalComunitaria from "../components/vistoria/ModalComunitaria";
import CardGuarnicao from "../components/vistoria/CardGuarnicao";
import ChecklistGrupo from "../components/vistoria/ChecklistGrupo";
import { 
  ArrowLeft, ChevronRight, Loader2, X, Plus, 
  Users, Car, Shield, Wrench 
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
    itens: ["Pneus", "Capô", "Parachoque Dianteiro", "Parachoque Traseiro", "Lanternas", "Vidros e Portas", "Retrovisores"]
  },
  {
    nome: "Interior e Conforto",
    icon: <Users size={16} />,
    itens: ["Cinto", "Painel", "Bancos", "Limpeza Interna"]
  }
];

const DEFAULT_COMPRESSION = {
  maxSizeMB: 0.08,
  maxWidthOrHeight: 1280,
  useWebWorker: true,
  fileType: "image/jpeg",
  initialQuality: 0.6
};

const MOBILE_SAFE_COMPRESSION = {
  maxSizeMB: 0.05,
  maxWidthOrHeight: 800,
  useWebWorker: true,
  fileType: "image/jpeg",
  initialQuality: 0.5
};

// --- COMPONENTE ---
const Vistoria = ({ onBack, PATRIMONIO = [] }) => { 
  const { user } = useAuth();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);

  // local "canon" of viaturas: inicializa com prop ou cache e mantém sincronizado
  const [patrimonioList, setPatrimonioList] = useState(() => {
    try {
      const cache = localStorage.getItem("viaturas_cache");
      if (Array.isArray(PATRIMONIO) && PATRIMONIO.length > 0) {
        return PATRIMONIO;
      } else if (cache) {
        return JSON.parse(cache);
      }
    } catch {}
    return [];
  });

  const [efetivoLocal, setEfetivoLocal] = useState([]);
  const [tipoVistoria, setTipoVistoria] = useState('ENTRADA'); 
  const [protegerFotos, setProtegerFotos] = useState(false);

  const [formData, setFormData] = useState({
    prefixo_vtr: '',
    placa_vtr: '',
    hodometro: '',
    motorista_re: user?.re || '',
    motorista_nome: user?.nome || '',
    motorista_unidade: '',
    comandante_re: '',
    comandante_nome: '',
    patrulheiro_re: '',
    patrulheiro_nome: '',
    termo_aceite: false
  });

  const [manual, setManual] = useState({ mot: false, cmd: false, ptr: false });
  const [checklist, setChecklist] = useState({});
  const [fotosVistoria, setFotosVistoria] = useState([]);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);

  // DEBUG: ver o que está chegando
  useEffect(() => {
    console.debug("prop PATRIMONIO:", PATRIMONIO);
  }, [PATRIMONIO]);

  // mantem patrimonioList sincronizado com prop e cache
  useEffect(() => {
    if (Array.isArray(PATRIMONIO) && PATRIMONIO.length > 0) {
      setPatrimonioList(PATRIMONIO);
      try { localStorage.setItem("viaturas_cache", JSON.stringify(PATRIMONIO)); } catch {}
    } else {
      // tenta cache (já usado no state inicial)
      const cache = localStorage.getItem("viaturas_cache");
      if (cache) {
        try {
          setPatrimonioList(JSON.parse(cache));
        } catch {
          localStorage.removeItem("viaturas_cache");
        }
      }
    }
  }, [PATRIMONIO]);

  // busca efetivo (militares) — tentativa única aqui, pode ser adaptada
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const res = await gasApi.getEfetivoCompleto();
        if (mounted && res?.status === 'success') setEfetivoLocal(res.data);
      } catch (e) {
        console.warn("Não foi possível obter efetivo:", e);
      }
    })();
    return () => { mounted = false; };
  }, []);

  // inicializa checklist ao trocar tipo de vistoria
  useEffect(() => {
    const items = GRUPOS_ENTRADA.flatMap(g => g.itens);
    setChecklist(items.reduce((acc, i) => ({ ...acc, [i]: 'OK' }), {}));
    // limpa campos dependentes
    setFormData(prev => ({ 
      ...prev, 
      prefixo_vtr: '', placa_vtr: '', hodometro: ''
    }));
  }, [tipoVistoria]);

  // debounce simples para pesquisar militar (exemplo adaptado)
  const pesquisarRE = useCallback(async (reDigitado, tipo) => {
    if (!reDigitado) return;
    const reLimpo = String(reDigitado).replace(/\D/g, '').replace(/^1000/, '');
    if (reLimpo.length < 4) {
      setFormData(prev => ({ ...prev, [`${tipo}_nome`]: '' }));
      return;
    }
    try {
      const res = await gasApi.buscarMilitar(reLimpo);
      if (res && res.status === 'success' && res.data) {
        setFormData(prev => ({ 
          ...prev,
          [`${tipo}_nome`]: (res.data.NOME || `${res.data.patente || ''} ${res.data.nome || ''}`).toString().toUpperCase(),
          ...(tipo === 'motorista' ? { motorista_unidade: (res.data.UNIDADE || '').toString().toUpperCase() } : {})
        }));
        // marca como não-manual
        setManual(prev => ({ ...prev, [tipo.slice(0,3)]: false }));
      } else {
        setFormData(prev => ({ ...prev, [`${tipo}_nome`]: 'NÃO ENCONTRADO' }));
        setManual(prev => ({ ...prev, [tipo.slice(0,3)]: true }));
      }
    } catch (err) {
      setManual(prev => ({ ...prev, [tipo.slice(0,3)]: true }));
    }
  }, []);

  useEffect(() => {
    const t = setTimeout(() => pesquisarRE(formData.motorista_re, 'motorista'), 700);
    return () => clearTimeout(t);
  }, [formData.motorista_re, pesquisarRE]);

  useEffect(() => {
    const t = setTimeout(() => pesquisarRE(formData.comandante_re, 'comandante'), 700);
    return () => clearTimeout(t);
  }, [formData.comandante_re, pesquisarRE]);

  useEffect(() => {
    const t = setTimeout(() => pesquisarRE(formData.patrulheiro_re, 'patrulheiro'), 700);
    return () => clearTimeout(t);
  }, [formData.patrulheiro_re, pesquisarRE]);

  // lista filtrada e ordenada para o select (memoizada)
  const viaturasFiltradas = useMemo(() => {
    return (patrimonioList || [])
      .filter(Boolean)
      .slice()
      .sort((a, b) => {
        const pa = String(a.PREFIXO || a.prefixo || a.Prefixo || "");
        const pb = String(b.PREFIXO || b.prefixo || b.Prefixo || "");
        return pa.localeCompare(pb);
      });
  }, [patrimonioList]);

  // util: safe string
  const toStr = useCallback((v) => (v !== undefined && v !== null ? String(v) : ''), []);

  // procura item de patrimônio por prefixo com tolerância a cases/fields
  const findVtrByPrefixo = useCallback((prefixo) => {
    if (!prefixo) return undefined;
    const p = String(prefixo);
    return (patrimonioList || []).find(v => {
      const cand = toStr(v.PREFIXO || v.prefixo || v.Prefixo || v?.prefix || '');
      return cand === p;
    });
  }, [patrimonioList, toStr]);

  // handle VTR change: preenche placa, hodometro (se saída), etc.
  const handleVtrChange = (prefixo) => {
    setFormData(prev => ({ ...prev, prefixo_vtr: prefixo }));
    if (!prefixo) {
      setFormData(prev => ({ ...prev, placa_vtr: "", hodometro: "" }));
      return;
    }

    const vtr = findVtrByPrefixo(prefixo);
    if (!vtr) {
      // fallback: limpa outros campos
      setFormData(prev => ({ ...prev, placa_vtr: "", hodometro: "" }));
      return;
    }

    const placa = toStr(vtr.PLACA || vtr.placa || '');
    // possíveis campos de km: ULTIMOKM, UltimoKM, ultimoKM, ULTIMO_KM, etc.
    const ultimoKM = vtr.ULTIMOKM || vtr.UltimoKM || vtr.ultimoKM || vtr.ULTIMO_KM || vtr.ultimo_km || '';
    const kmStr = ultimoKM ? String(ultimoKM) : '';

    setFormData(prev => ({
      ...prev,
      prefixo_vtr: toStr(vtr.PREFIXO || vtr.prefixo || vtr.Prefixo || prefixo),
      placa_vtr: placa,
      hodometro: tipoVistoria === 'SAÍDA' ? kmStr : ''
    }));
  };

  // compressão com fallback (tenta padrão, se estourar memória tenta mobile-safe e, por fim, retorna original)
  const compressFileSafe = async (file) => {
    try {
      const compressed = await imageCompression(file, DEFAULT_COMPRESSION);
      return await imageCompression.getDataUrlFromFile(compressed);
    } catch (err) {
      console.warn("compress default failed, trying mobile-safe", err);
      try {
        const compressed = await imageCompression(file, MOBILE_SAFE_COMPRESSION);
        return await imageCompression.getDataUrlFromFile(compressed);
      } catch (err2) {
        console.warn("mobile-safe compress failed", err2);
        // fallback: try a very small resize
        try {
          const compressed = await imageCompression(file, { maxSizeMB: 0.02, maxWidthOrHeight: 600, useWebWorker: true });
          return await imageCompression.getDataUrlFromFile(compressed);
        } catch {
          // último recurso: return base64 directly (may OOM on very low memory)
          return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result);
            reader.onerror = reject;
            reader.readAsDataURL(file);
          });
        }
      }
    }
  };

  // handler de upload de foto (usado no segundo step)
  const handlePhotoInput = async (file) => {
    if (!file) return;
    setUploadingPhoto(true);
    try {
      const dataUrl = await compressFileSafe(file);
      setFotosVistoria(prev => [...prev, dataUrl]);
    } catch (err) {
      console.error("Erro ao processar imagem:", err);
      alert("Falha ao processar a imagem. Tente reduzir a resolução da foto ou usar o modo câmera mais simples.");
    } finally {
      setUploadingPhoto(false);
    }
  };

  // finalização: tenta enviar, se offline salva na fila
  const handleFinalizar = async () => {
    if (!formData.termo_aceite) return alert("Aceite o termo para continuar.");
    setLoading(true);

    const falhas = Object.entries(checklist).filter(([_, s]) => s === 'FALHA').map(([i]) => i);
    const resumo = falhas.length === 0 ? "SEM ALTERAÇÕES" : `FALHA EM: ${falhas.join(", ")}`;

    const payload = {
      ...formData,
      tipo: tipoVistoria,
      checklist_resumo: resumo,
      fotos: fotosVistoria,
      proteger_ocorrencia: protegerFotos,
      data_hora: new Date().toISOString(),
      militar_logado: `${user?.patente || ""} ${user?.nome || ""}`.trim()
    };

    try {
      const res = await gasApi.saveVistoria(payload);
      if (res?.status === 'success') {
        alert("Vistoria enviada com sucesso!");
        onBack && onBack();
      } else {
        throw new Error(res?.message || "Resposta inválida do servidor");
      }
    } catch (err) {
      console.warn("Envio falhou, salvando na fila:", err);
      try {
        const fila = JSON.parse(localStorage.getItem("vistoria_fila") || "[]");
        fila.push(payload);
        localStorage.setItem("vistoria_fila", JSON.stringify(fila));
        alert("Sem internet. Vistoria salva localmente e será enviada assim que possível.");
      } catch (e) {
        console.error("Não foi possível salvar na fila:", e);
        alert("Erro ao salvar localmente.");
      }
    } finally {
      setLoading(false);
    }
  };

  // small helper to render option label safely
  const optionLabel = (v) => {
    const pref = toStr(v.PREFIXO || v.prefixo || v.Prefixo || '');
    const status = toStr(v.STATUS || v.status || '');
    return pref + (status ? ` (${status})` : '');
  };

  return (
    <div className="min-h-screen bg-slate-50 pb-10 font-sans text-slate-900">
      <header className="bg-slate-900 text-white p-5 sticky top-0 z-50 flex justify-between items-center shadow-md">
        <button onClick={onBack}><ArrowLeft size={24}/></button>
        <div className="text-center font-black">
            <h1 className="text-[10px] uppercase tracking-widest text-slate-400">Vistoria</h1>
            <p className="text-[11px] text-blue-400 uppercase">{tipoVistoria}</p>
        </div>
        <div className="w-6" />
      </header>

      <main className="max-w-xl mx-auto p-4 space-y-4">
        <div className="flex bg-slate-200 p-1 rounded-2xl">
          {['ENTRADA', 'SAÍDA'].map(t => (
            <button key={t} onClick={() => setTipoVistoria(t)} className={`flex-1 py-3 rounded-xl font-black text-[10px] transition-all ${tipoVistoria === t ? (t === 'ENTRADA' ? 'bg-green-600 text-white' : 'bg-orange-500 text-white') : 'text-slate-500'}`}>{t}</button>
          ))}
        </div>

        {step === 1 ? (
          <div className="space-y-4">
            <section className="bg-white rounded-[2rem] p-6 shadow-sm border border-slate-200 space-y-4">
              <CardGuarnicao formData={formData} />
              <div className="grid grid-cols-2 gap-2">
                <select
                  className="vtr-input w-full p-4 bg-slate-50 rounded-2xl border border-slate-200 font-bold text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                  value={formData.prefixo_vtr || ""}
                  onChange={(e) => handleVtrChange(e.target.value)}
                >
                  <option value="">SELECIONE A VTR</option>

                  {Array.isArray(viaturasFiltradas) && viaturasFiltradas.length > 0 ? (
                    viaturasFiltradas.map((v, idx) => {
                      const pref = toStr(v.PREFIXO || v.prefixo || v.Prefixo || '');
                      if (!pref) return null;
                      return (
                        <option key={`${pref}-${idx}`} value={pref}>
                          {optionLabel(v)}
                        </option>
                      );
                    })
                  ) : (
                    <option disabled>Carregando viaturas...</option>
                  )}
                </select>

                <input 
                  type="number" 
                  inputMode="numeric"
                  className="vtr-input w-full p-4 bg-slate-50 rounded-2xl border border-slate-200 font-bold text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                  placeholder="KM ATUAL"
                  value={formData.hodometro}
                  onChange={(e) => setFormData({...formData, hodometro: e.target.value})}
                />
              </div>

              {/* RE inputs */}
              <div className="grid grid-cols-1 gap-3">
                <input type="tel" placeholder="RE do Motorista" value={formData.motorista_re} onChange={(e) => setFormData({...formData, motorista_re: e.target.value})}
                  className="w-full p-4 bg-slate-50 rounded-2xl border border-slate-200 font-bold text-sm" />
                <input type="tel" placeholder="RE do Comandante" value={formData.comandante_re} onChange={(e) => setFormData({...formData, comandante_re: e.target.value})}
                  className="w-full p-4 bg-slate-50 rounded-2xl border border-slate-200 font-bold text-sm" />
                <input type="tel" placeholder="RE do Patrulheiro" value={formData.patrulheiro_re} onChange={(e) => setFormData({...formData, patrulheiro_re: e.target.value})}
                  className="w-full p-4 bg-slate-50 rounded-2xl border border-slate-200 font-bold text-sm" />
              </div>
            </section>

            <button onClick={() => setStep(2)} disabled={!formData.prefixo_vtr || !formData.hodometro || !formData.comandante_re} className="btn-tatico w-full disabled:opacity-40">
              CHECKLIST <ChevronRight size={18}/>
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            <CardGuarnicao formData={formData} compacto />
            <div onClick={() => setProtegerFotos(!protegerFotos)} className={`p-4 rounded-3xl border-2 flex items-center gap-4 cursor-pointer transition-colors ${protegerFotos ? 'bg-blue-600 text-white border-blue-700' : 'bg-white text-slate-400 border-slate-200'}`}>
              <Wrench size={20} />
              <span className="font-black text-[10px] uppercase">Proteger Imagens da Ocorrência</span>
            </div>

            {/* fotos */}
            <div className="bg-white rounded-[2rem] p-5 shadow-md border border-slate-200">
              <h3 className="text-[10px] font-black text-slate-400 mb-4 uppercase tracking-widest text-center">Registros Fotográficos</h3>
              <div className="grid grid-cols-4 gap-3">
                {fotosVistoria.map((foto, i) => (
                  <div key={i} className="relative aspect-square rounded-xl overflow-hidden border">
                    <img src={foto} className="w-full h-full object-cover" alt={`foto-${i}`} />
                    <button onClick={() => setFotosVistoria(prev => prev.filter((_, idx) => idx !== i))} className="absolute top-1 right-1 bg-red-600 text-white rounded-full p-0.5"><X size={12}/></button>
                  </div>
                ))}
                {fotosVistoria.length < 8 && (
                  <label className="aspect-square rounded-xl border-2 border-dashed border-blue-200 flex flex-col items-center justify-center bg-blue-50 text-blue-600 cursor-pointer active:bg-blue-100">
                    {uploadingPhoto ? <Loader2 className="animate-spin" size={20}/> : <Plus size={24}/>}
                    <input type="file" accept="image/*" capture="environment" className="hidden" onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) handlePhotoInput(file);
                    }} />
                  </label>
                )}
              </div>
            </div>

            {/* checklist groups */}
            <div className="space-y-3">
              {GRUPOS_ENTRADA.map(grupo => (
                <ChecklistGrupo 
                  key={grupo.nome} 
                  titulo={grupo.nome} 
                  itens={grupo.itens} 
                  checklist={checklist}
                  onToggle={(item) => setChecklist(prev => ({ ...prev, [item]: prev[item] === 'FALHA' ? 'OK' : 'FALHA' }))} 
                />
              ))}
            </div>

            <label className="flex items-start gap-3 p-4 bg-amber-50 rounded-2xl border border-amber-100 cursor-pointer">
              <input type="checkbox" checked={formData.termo_aceite} onChange={(e) => setFormData({...formData, termo_aceite: e.target.checked})} className="mt-1 h-4 w-4" />
              <span className="text-[10px] font-bold text-amber-800 uppercase leading-tight">Declaro que realizei a vistoria e as informações são verídicas.</span>
            </label>

            <div className="flex gap-2">
               <button onClick={() => setStep(1)} className="flex-1 bg-slate-200 p-4 rounded-2xl font-black text-[10px] uppercase">Voltar</button>
               <button onClick={handleFinalizar} disabled={loading || !formData.termo_aceite} className="flex-[2] bg-green-600 text-white p-4 rounded-2xl font-black text-xs shadow-lg disabled:bg-slate-300">
                 {loading ? <Loader2 className="animate-spin mx-auto"/> : "FINALIZAR INSPEÇÃO"}
               </button>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default Vistoria;
