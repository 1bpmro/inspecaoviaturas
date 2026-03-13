import React, { useState, useEffect } from 'react';
import { useAuth } from '../lib/AuthContext'; 
import imageCompression from 'browser-image-compression';
import { gasApi } from '../api/gasClient';
import { photoService } from '../api/photoService'; 

import { 
  ArrowLeft, ChevronRight, Loader2, X, Plus, 
  Users, Car, Shield, Search, User
} from 'lucide-react';
import ChecklistGrupo from "../components/vistoria/ChecklistGrupo";

const GRUPOS_ENTRADA = [
  { nome: "Documentação e Equipamentos", icon: <Shield size={16} />, itens: ["Documento da Viatura", "Estepe", "Chave de Roda", "Macaco", "Triângulo", "Extintor", "Giroscópio", "Sirene", "Rádio"] },
  { nome: "Estado Externo", icon: <Car size={16} />, itens: ["Pneus", "Capô", "Parachoque Dianteiro", "Parachoque Traseiro", "Lanternas", "Vidros e Portas", "Retrovisores"] },
  { nome: "Interior e Conforto", icon: <Users size={16} />, itens: ["Cinto", "Painel", "Bancos", "Limpeza Interna"] }
];

const Vistoria = ({ onBack, PATRIMONIO = [] }) => { 
  const { user } = useAuth();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [tipoVistoria, setTipoVistoria] = useState('ENTRADA'); 
  const [fotosVistoria, setFotosVistoria] = useState([]);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  
  const [formData, setFormData] = useState({
    prefixo_vtr: '',
    placa_vtr: '',
    hodometro: '',
    motorista_re: user?.re || '', 
    motorista_nome: user?.nome || '',
    motorista_unidade: '1º BPM',
    comandante_re: '',
    comandante_nome: '',
    patrulheiro_re: '',
    patrulheiro_nome: '',
    termo_aceite: false
  });

  const [militarNaoEncontrado, setMilitarNaoEncontrado] = useState({ mot: false, cmd: false, ptr: false });
  const [checklist, setChecklist] = useState({});

  const formatarRE = (re) => re.toString().replace(/^1000/, '');

  // --- LÓGICA DE BUSCA AUTOMÁTICA ---
  const handleAutoBusca = async (re, campo) => {
    const reLimpo = formatarRE(re);
    if (reLimpo.length < 4) return;

    try {
      const res = await gasApi.buscarMilitar(reLimpo);
      if (res.status === 'success' && res.data) {
        setFormData(prev => ({ 
          ...prev, 
          [`${campo}_nome`]: res.data.NOME,
          ...(campo === 'motorista' ? { motorista_unidade: res.data.UNIDADE } : {})
        }));
        setMilitarNaoEncontrado(prev => ({ ...prev, [campo.substring(0,3)]: false }));
      } else {
        setMilitarNaoEncontrado(prev => ({ ...prev, [campo.substring(0,3)]: true }));
      }
    } catch (e) {
      setMilitarNaoEncontrado(prev => ({ ...prev, [campo.substring(0,3)]: true }));
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => handleAutoBusca(formData.motorista_re, 'motorista'), 600);
    return () => clearTimeout(timer);
  }, [formData.motorista_re]);

  useEffect(() => {
    const timer = setTimeout(() => handleAutoBusca(formData.comandante_re, 'comandante'), 600);
    return () => clearTimeout(timer);
  }, [formData.comandante_re]);

  useEffect(() => {
    const timer = setTimeout(() => handleAutoBusca(formData.patrulheiro_re, 'patrulheiro'), 600);
    return () => clearTimeout(timer);
  }, [formData.patrulheiro_re]);

  const handleVtrChange = (prefixo) => {
    const vtr = PATRIMONIO.find(v => v.PREFIXO === prefixo);
    if (vtr) {
      setFormData(prev => ({
        ...prev,
        prefixo_vtr: prefixo,
        placa_vtr: vtr.PLACA || '',
        hodometro: tipoVistoria === 'SAÍDA' ? String(vtr.ULTIMOKM || '') : ''
      }));
    }
  };

  const handleFinalizar = async () => {
    if (!formData.termo_aceite) return alert("Aceite o termo.");
    setLoading(true);
    try {
      let linksFotos = "Sem Fotos";
      if (fotosVistoria.length > 0) {
        const urls = [];
        for (const foto of fotosVistoria) {
          const url = await photoService.uploadFoto(foto);
          urls.push(url);
        }
        linksFotos = urls.join(" | ");
      }

      const payload = {
        ...formData,
        km: Number(formData.hodometro),
        tipo: tipoVistoria,
        fotos: linksFotos,
        observacoes: Object.entries(checklist)
          .filter(([_, status]) => status === 'FALHA')
          .map(([item]) => item).join(", ") || "SEM ALTERAÇÕES"
      };

      const response = await gasApi.saveVistoria(payload);
      if (response.status === 'success') {
        alert("✅ Registrado com sucesso!");
        onBack();
      }
    } catch (error) {
      alert("Erro ao salvar: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-100 pb-10 font-sans text-slate-900">
      <header className="bg-slate-900 text-white p-5 sticky top-0 z-50 flex justify-between items-center shadow-lg">
        <button onClick={onBack}><ArrowLeft size={24}/></button>
        <div className="text-center">
            <h1 className="font-black text-[10px] uppercase tracking-widest text-slate-400">Inspeção de Viatura</h1>
            <p className="text-[11px] text-blue-400 font-bold uppercase">{tipoVistoria} | {formData.prefixo_vtr || 'S/ VTR'}</p>
        </div>
        <div className="w-6" />
      </header>

      <main className="max-w-xl mx-auto p-4 space-y-4">
        
        {/* --- NOVO CARD DE GUARNIÇÃO FIXO --- */}
        <div className="bg-white rounded-3xl p-4 shadow-md border-b-4 border-blue-600">
            <div className="flex items-center gap-2 mb-3 text-blue-900 font-black text-[10px] uppercase">
                <Users size={14}/> Formação da Guarnição
            </div>
            <div className="space-y-2">
                <div className="flex justify-between items-center bg-slate-50 p-2 rounded-xl border border-slate-100">
                    <span className="text-[9px] font-black text-slate-400 uppercase w-12">MOT:</span>
                    <span className="text-[11px] font-bold flex-1 text-slate-700">{formData.motorista_nome || '---'}</span>
                    <span className="text-[10px] font-mono bg-slate-200 px-2 rounded text-slate-500">{formData.motorista_re || 'RE'}</span>
                </div>
                <div className="flex justify-between items-center bg-slate-50 p-2 rounded-xl border border-slate-100">
                    <span className="text-[9px] font-black text-slate-400 uppercase w-12">CMD:</span>
                    <span className="text-[11px] font-bold flex-1 text-slate-700">{formData.comandante_nome || '---'}</span>
                    <span className="text-[10px] font-mono bg-slate-200 px-2 rounded text-slate-500">{formData.comandante_re || 'RE'}</span>
                </div>
                <div className="flex justify-between items-center bg-slate-50 p-2 rounded-xl border border-slate-100">
                    <span className="text-[9px] font-black text-slate-400 uppercase w-12">PTR:</span>
                    <span className="text-[11px] font-bold flex-1 text-slate-700">{formData.patrulheiro_nome || '---'}</span>
                    <span className="text-[10px] font-mono bg-slate-200 px-2 rounded text-slate-500">{formData.patrulheiro_re || 'RE'}</span>
                </div>
            </div>
        </div>

        <div className="flex bg-slate-200 p-1 rounded-xl">
          {['ENTRADA', 'SAÍDA'].map(t => (
            <button key={t} onClick={() => { setTipoVistoria(t); setStep(1); }}
              className={`flex-1 py-2 rounded-lg font-black text-[10px] transition-all ${tipoVistoria === t ? 'bg-blue-600 text-white shadow' : 'text-slate-500'}`}>
              {t === 'ENTRADA' ? 'ENTRADA (DEVOLUÇÃO)' : 'SAÍDA (CAUTELA)'}
            </button>
          ))}
        </div>

        {step === 1 ? (
          <div className="space-y-4 animate-in fade-in duration-300">
             {/* CAMPOS DE DADOS */}
             <div className="bg-white rounded-[2rem] p-6 shadow-xl space-y-4 border border-slate-200">
                <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                        <label className="text-[9px] font-black text-slate-400 uppercase ml-2">Viatura</label>
                        <select className="w-full p-3 bg-slate-50 rounded-xl border-2 border-slate-100 font-bold text-sm outline-none focus:border-blue-500"
                            value={formData.prefixo_vtr} onChange={(e) => handleVtrChange(e.target.value)}>
                            <option value="">SELECIONE</option>
                            {PATRIMONIO.map(v => (
                                <option key={v.PREFIXO} value={v.PREFIXO}>{v.PREFIXO}</option>
                            ))}
                        </select>
                    </div>
                    <div className="space-y-1">
                        <label className="text-[9px] font-black text-slate-400 uppercase ml-2">KM Atual</label>
                        <input type="number" className="w-full p-3 bg-slate-50 rounded-xl border-2 border-slate-100 font-bold text-sm outline-none focus:border-blue-500"
                            value={formData.hodometro} onChange={(e) => setFormData({...formData, hodometro: e.target.value})} />
                    </div>
                </div>

                <div className="space-y-3 pt-2">
                    {/* INPUT MATRICULA MOTORISTA */}
                    <div>
                        <input type="tel" className="w-full p-3 bg-slate-50 rounded-xl border-2 border-slate-100 font-bold text-sm mb-2"
                            placeholder="RE MOTORISTA" value={formData.motorista_re}
                            onChange={(e) => setFormData({...formData, motorista_re: e.target.value})} />
                        {militarNaoEncontrado.mot && (
                            <div className="flex gap-2 animate-in slide-in-from-top-1">
                                <input type="text" placeholder="NOME GUERRA" className="flex-1 p-2 bg-amber-50 rounded-lg text-[10px] font-bold border border-amber-200"
                                    onChange={(e) => setFormData({...formData, motorista_nome: e.target.value})} />
                                <input type="text" placeholder="UNIDADE" className="w-24 p-2 bg-amber-50 rounded-lg text-[10px] font-bold border border-amber-200"
                                    onChange={(e) => setFormData({...formData, motorista_unidade: e.target.value})} />
                            </div>
                        )}
                    </div>

                    {/* INPUT MATRICULA COMANDANTE */}
                    <div>
                        <input type="tel" className="w-full p-3 bg-slate-50 rounded-xl border-2 border-slate-100 font-bold text-sm mb-2"
                            placeholder="RE COMANDANTE" value={formData.comandante_re}
                            onChange={(e) => setFormData({...formData, comandante_re: e.target.value})} />
                        {militarNaoEncontrado.cmd && (
                            <input type="text" placeholder="NOME DE GUERRA (MANUAL)" className="w-full p-2 bg-amber-50 rounded-lg text-[10px] font-bold border border-amber-200"
                                onChange={(e) => setFormData({...formData, comandante_nome: e.target.value})} />
                        )}
                    </div>

                    {/* INPUT MATRICULA PATRULHEIRO */}
                    <div>
                        <input type="tel" className="w-full p-3 bg-slate-50 rounded-xl border-2 border-slate-100 font-bold text-sm mb-2"
                            placeholder="RE PATRULHEIRO" value={formData.patrulheiro_re}
                            onChange={(e) => setFormData({...formData, patrulheiro_re: e.target.value})} />
                        {militarNaoEncontrado.ptr && (
                            <input type="text" placeholder="NOME DE GUERRA (MANUAL)" className="w-full p-2 bg-amber-50 rounded-lg text-[10px] font-bold border border-amber-200"
                                onChange={(e) => setFormData({...formData, patrulheiro_nome: e.target.value})} />
                        )}
                    </div>
                </div>

                <button onClick={() => setStep(2)} disabled={!formData.prefixo_vtr || !formData.hodometro || !formData.comandante_re}
                    className="w-full bg-blue-900 text-white p-4 rounded-2xl font-black text-xs uppercase flex justify-center items-center gap-2 disabled:bg-slate-300">
                    Próxima Etapa <ChevronRight size={18}/>
                </button>
             </div>
          </div>
        ) : (
          <div className="space-y-4 animate-in slide-in-from-right-4">
             {/* PARTE DE FOTOS E CHECKLIST (STEP 2) */}
             <div className="bg-white rounded-[2rem] p-5 shadow-md border border-slate-200">
                <h3 className="text-[10px] font-black text-slate-400 mb-4 uppercase tracking-widest text-center">Registros Fotográficos</h3>
                <div className="grid grid-cols-4 gap-3">
                    {fotosVistoria.map((foto, i) => (
                        <div key={i} className="relative aspect-square rounded-xl overflow-hidden border">
                            <img src={foto} className="w-full h-full object-cover" />
                            <button onClick={() => setFotosVistoria(prev => prev.filter((_, idx) => idx !== i))}
                                className="absolute top-1 right-1 bg-red-600 text-white rounded-full p-0.5"><X size={12}/></button>
                        </div>
                    ))}
                    <label className="aspect-square rounded-xl border-2 border-dashed border-blue-200 flex flex-col items-center justify-center bg-blue-50 text-blue-600 cursor-pointer">
                        {uploadingPhoto ? <Loader2 className="animate-spin" size={20}/> : <Plus size={24}/>}
                        <input type="file" accept="image/*" capture="environment" className="hidden" onChange={(e) => {
                            const file = e.target.files[0];
                            if(file) {
                                setUploadingPhoto(true);
                                imageCompression(file, { maxSizeMB: 0.2, maxWidthOrHeight: 1280 })
                                    .then(compressed => imageCompression.getDataUrlFromFile(compressed))
                                    .then(base64 => {
                                        setFotosVistoria(prev => [...prev, base64]);
                                        setUploadingPhoto(false);
                                    });
                            }
                        }} />
                    </label>
                </div>
             </div>

             <div className="space-y-3">
              {GRUPOS_ENTRADA.map(grupo => (
                <ChecklistGrupo key={grupo.nome} titulo={grupo.nome} itens={grupo.itens} checklist={checklist}
                  onToggle={(item) => setChecklist(prev => ({ ...prev, [item]: prev[item] === 'FALHA' ? 'OK' : 'FALHA' }))} />
              ))}
            </div>

            <label className="flex items-start gap-3 p-4 bg-amber-50 rounded-2xl border border-amber-100">
              <input type="checkbox" checked={formData.termo_aceite} onChange={(e) => setFormData({...formData, termo_aceite: e.target.checked})} className="mt-1" />
              <span className="text-[10px] font-bold text-amber-800 uppercase leading-tight">Declaro que realizei a vistoria e as informações são verídicas.</span>
            </label>

            <div className="flex gap-2">
               <button onClick={() => setStep(1)} className="flex-1 bg-slate-200 p-4 rounded-2xl font-black text-[10px] uppercase">Voltar</button>
               <button onClick={handleFinalizar} disabled={loading || !formData.termo_aceite}
                 className="flex-[2] bg-green-600 text-white p-4 rounded-2xl font-black text-xs shadow-lg">
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
