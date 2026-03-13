import React, { useState } from 'react';
import { useAuth } from '../lib/AuthContext'; 
import imageCompression from 'browser-image-compression';
import { gasApi } from '../api/gasClient';
import { photoService } from '../api/photoService'; 

import { 
  ArrowLeft, ChevronRight, Loader2, X, Plus, 
  Users, Car, Shield, Search
} from 'lucide-react';
import CardGuarnicao from "../components/vistoria/CardGuarnicao";
import ChecklistGrupo from "../components/vistoria/ChecklistGrupo";

const GRUPOS_ENTRADA = [
  { nome: "Documentação e Equipamentos", icon: <Shield size={16} />, itens: ["Documento da Viatura", "Estepe", "Chave de Roda", "Macaco", "Triângulo", "Extintor", "Giroscópio", "Sirene", "Rádio"] },
  { nome: "Estado Externo", icon: <Car size={16} />, itens: ["Pneus", "Capô", "Parachoque Dianteiro", "Parachoque Traseiro", "Lanternas", "Vidros e Portas", "Retrovisores"] },
  { nome: "Interior e Conforto", icon: <Users size={16} />, itens: ["Cinto", "Painel", "Bancos", "Limpeza Interna"] }
];

const Vistoria = ({ onBack, frotaInicial = [] }) => { 
  const { user } = useAuth();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [tipoVistoria, setTipoVistoria] = useState('ENTRADA'); 
  const [fotosVistoria, setFotosVistoria] = useState([]);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [militarNaoEncontrado, setMilitarNaoEncontrado] = useState(false);
  
  const [formData, setFormData] = useState({
    prefixo_vtr: '',
    placa_vtr: '',
    hodometro: '',
    motorista_re: user?.re || '', 
    motorista_nome: user?.nome || '',
    motorista_unidade: '1º BPM',
    comandante_re: '',
    patrulheiro_re: '',
    termo_aceite: false
  });

  const [checklist, setChecklist] = useState({});

  // Remove "1000" do início se existir
  const formatarRE = (re) => re.toString().replace(/^1000/, '');

  const buscarMilitar = async () => {
    if (!formData.motorista_re) return;
    setLoading(true);
    try {
      const reLimpo = formatarRE(formData.motorista_re);
      const res = await gasApi.buscarMilitar(reLimpo);
      
      if (res.status === 'success' && res.data) {
        setFormData(prev => ({ 
          ...prev, 
          motorista_nome: res.data.NOME, 
          motorista_unidade: res.data.UNIDADE || '1º BPM' 
        }));
        setMilitarNaoEncontrado(false);
      } else {
        setMilitarNaoEncontrado(true);
      }
    } catch (e) {
      setMilitarNaoEncontrado(true);
    } finally {
      setLoading(false);
    }
  };

  const handleVtrChange = (prefixo) => {
    const vtr = frotaInicial.find(v => v.PREFIXO === prefixo);
    if (vtr) {
      setFormData(prev => ({
        ...prev,
        prefixo_vtr: prefixo,
        placa_vtr: vtr.PLACA || '',
        hodometro: tipoVistoria === 'SAÍDA' ? String(vtr.ULTIMOKM || '') : ''
      }));
      if (vtr.ALERTA_OLEO) alert(`⚠️ ÓLEO: ${vtr.MOTIVO_OLEO}`);
    }
  };

  const handleFinalizar = async () => {
    if (!formData.termo_aceite) return alert("Aceite o termo.");
    if (!formData.comandante_re) return alert("RE do Comandante é obrigatório.");
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
    <div className="min-h-screen bg-slate-50 pb-10 font-sans text-slate-900">
      <header className="bg-slate-900 text-white p-5 sticky top-0 z-50 flex justify-between items-center">
        <button onClick={onBack}><ArrowLeft size={24}/></button>
        <div className="text-center">
            <h1 className="font-black text-[10px] uppercase tracking-widest">Vistoria de Viatura</h1>
            <p className="text-[9px] text-blue-400 font-bold uppercase">{tipoVistoria}</p>
        </div>
        <div className="w-6" />
      </header>

      <main className="max-w-xl mx-auto p-4 space-y-4">
        {/* Toggle Entrada/Saída */}
        <div className="flex bg-slate-200 p-1 rounded-xl">
          {['ENTRADA', 'SAÍDA'].map(t => (
            <button key={t} onClick={() => { setTipoVistoria(t); setStep(1); }}
              className={`flex-1 py-2 rounded-lg font-black text-[10px] transition-all ${tipoVistoria === t ? 'bg-blue-600 text-white shadow' : 'text-slate-500'}`}>
              {t === 'ENTRADA' ? 'ENTRADA (PÁTIO)' : 'SAÍDA (SERVIÇO)'}
            </button>
          ))}
        </div>

        {step === 1 ? (
          <div className="bg-white rounded-[2rem] p-6 shadow-xl space-y-4 animate-in fade-in">
             <div className="grid grid-cols-2 gap-3">
               <div className="space-y-1">
                 <label className="text-[9px] font-black text-slate-400 uppercase ml-2">Viatura</label>
                 <select className="w-full p-3 bg-slate-50 rounded-xl border border-slate-200 font-bold text-sm"
                   value={formData.prefixo_vtr}
                   onChange={(e) => handleVtrChange(e.target.value)}>
                   <option value="">SELECIONE</option>
                   {frotaInicial.map(v => (
                     <option key={v.PREFIXO} value={v.PREFIXO}>{v.PREFIXO}</option>
                   ))}
                 </select>
               </div>
               <div className="space-y-1">
                 <label className="text-[9px] font-black text-slate-400 uppercase ml-2">KM Atual</label>
                 <input type="number" className="w-full p-3 bg-slate-50 rounded-xl border border-slate-200 font-bold text-sm"
                   value={formData.hodometro}
                   onChange={(e) => setFormData({...formData, hodometro: e.target.value})} />
               </div>
             </div>

             <div className="space-y-2">
                <label className="text-[9px] font-black text-slate-400 uppercase ml-2">Motorista</label>
                <div className="flex gap-2">
                    <input type="tel" className="flex-1 p-3 bg-slate-50 rounded-xl border border-slate-200 font-bold"
                        placeholder="RE" value={formData.motorista_re}
                        onChange={(e) => setFormData({...formData, motorista_re: e.target.value})} />
                    <button onClick={buscarMilitar} className="bg-blue-600 text-white px-4 rounded-xl">
                        {loading ? <Loader2 size={18} className="animate-spin"/> : <Search size={18} />}
                    </button>
                </div>
                {militarNaoEncontrado && (
                    <div className="grid grid-cols-2 gap-2 animate-in slide-in-from-top-2">
                        <input type="text" className="p-3 bg-amber-50 rounded-xl border border-amber-200 font-bold text-[10px] uppercase"
                            placeholder="NOME DE GUERRA" value={formData.motorista_nome}
                            onChange={(e) => setFormData({...formData, motorista_nome: e.target.value})} />
                        <input type="text" className="p-3 bg-amber-50 rounded-xl border border-amber-200 font-bold text-[10px] uppercase"
                            placeholder="UNIDADE" value={formData.motorista_unidade}
                            onChange={(e) => setFormData({...formData, motorista_unidade: e.target.value})} />
                    </div>
                )}
             </div>

             <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                    <label className="text-[9px] font-black text-slate-400 uppercase ml-2">Comandante *</label>
                    <input type="tel" className="w-full p-3 bg-slate-50 rounded-xl border border-slate-200 font-bold text-sm"
                        placeholder="RE" value={formData.comandante_re}
                        onChange={(e) => setFormData({...formData, comandante_re: e.target.value})} />
                </div>
                <div className="space-y-1">
                    <label className="text-[9px] font-black text-slate-400 uppercase ml-2">Patrulheiro</label>
                    <input type="tel" className="w-full p-3 bg-slate-50 rounded-xl border border-slate-200 font-bold text-sm"
                        placeholder="RE" value={formData.patrulheiro_re}
                        onChange={(e) => setFormData({...formData, patrulheiro_re: e.target.value})} />
                </div>
             </div>

             <button onClick={() => setStep(2)} disabled={!formData.prefixo_vtr || !formData.hodometro || !formData.comandante_re}
               className="w-full bg-blue-900 text-white p-4 rounded-2xl font-black text-xs uppercase flex justify-center items-center gap-2 disabled:bg-slate-300">
               Próxima Etapa <ChevronRight size={18}/>
             </button>
          </div>
        ) : (
          <div className="space-y-4 animate-in slide-in-from-right-4">
             {/* PARTE DAS FOTOS */}
             <div className="bg-white rounded-[2rem] p-5 shadow-md border border-slate-200">
              <h3 className="text-[10px] font-black text-slate-400 mb-4 uppercase tracking-widest text-center">Fotos Obrigatórias</h3>
              <div className="grid grid-cols-4 gap-3">
                {fotosVistoria.map((foto, i) => (
                  <div key={i} className="relative aspect-square rounded-xl overflow-hidden border">
                    <img src={foto} className="w-full h-full object-cover" alt="Vistoria" />
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

            {/* CHECKLIST */}
            <div className="space-y-3">
              {GRUPOS_ENTRADA.map(grupo => (
                <ChecklistGrupo key={grupo.nome} titulo={grupo.nome} itens={grupo.itens} checklist={checklist}
                  onToggle={(item) => setChecklist(prev => ({ ...prev, [item]: prev[item] === 'FALHA' ? 'OK' : 'FALHA' }))} />
              ))}
            </div>

            <label className="flex items-start gap-3 p-4 bg-amber-50 rounded-2xl border border-amber-100 cursor-pointer">
              <input type="checkbox" checked={formData.termo_aceite} onChange={(e) => setFormData({...formData, termo_aceite: e.target.checked})} className="mt-1" />
              <span className="text-[10px] font-bold text-amber-800 uppercase leading-tight">Declaro que realizei a vistoria e as informações são verídicas sob pena de sanção administrativa.</span>
            </label>

            <div className="flex gap-2 pb-10">
               <button onClick={() => setStep(1)} className="flex-1 bg-slate-200 p-4 rounded-2xl font-black text-[10px] uppercase">Voltar</button>
               <button onClick={handleFinalizar} disabled={loading || !formData.termo_aceite}
                 className="flex-[2] bg-green-600 text-white p-4 rounded-2xl font-black text-xs shadow-lg disabled:bg-slate-400">
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
