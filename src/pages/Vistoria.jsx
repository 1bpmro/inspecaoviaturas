import React, { useState, useEffect } from 'react';
import { useAuth } from '../lib/AuthContext';
import { gasApi } from '../api/gasClient';
import imageCompression from 'browser-image-compression';
import { 
  ArrowLeft, CheckCircle2, ShieldCheck, 
  ChevronRight, Save, Loader2, Camera, X, Plus 
} from 'lucide-react';

const ITENS_ENTRADA = [
  "Documento da Viatura", "Estepe", "Chave de Roda", "Macaco", "Triângulo", "Extintor",
  "Nível de Água", "Porta Traseira", "Porta Dianteira", "Pneus", "Capô", "Cinto",
  "Paralama Dianteiro", "Paralama Traseiro", "Parachoque Dianteiro", "Parachoque Traseiro",
  "Lanternas", "Caçamba", "Vidros e Portas", "Retrovisor Externo", "Retrovisor Interno",
  "Maçanetas", "Para-brisas", "Sirene", "Giroscópio", "Rádio", "Painel de Instrumentos",
  "Bancos", "Forro Interno", "Tapetes", "Protetor Dianteiro", "Regulador dos Bancos"
];

const ITENS_SAIDA = [
  "Viatura Entregue Limpa", "Viatura em Condições de Uso", "Avarias Constatadas",
  "Limpeza Interna", "Limpeza Externa", "Pertences da Guarnição Retirados"
];

const Vistoria = ({ onBack }) => {
  const { user } = useAuth();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [viaturas, setViaturas] = useState([]);
  const [tipoVistoria, setTipoVistoria] = useState('ENTRADA');
  const [fotos, setFotos] = useState([]);

  const [formData, setFormData] = useState({
    prefixo_vtr: '', hodometro: '',
    motorista_re: '', motorista_nome: '',
    comandante_re: '', comandante_nome: '',
    patrulheiro_re: '', patrulheiro_nome: '',
    observacoes: '', termo_aceite: false
  });

  const [checklist, setChecklist] = useState({});
  const itensAtuais = tipoVistoria === 'ENTRADA' ? ITENS_ENTRADA : ITENS_SAIDA;

  // Carregamento inicial com Cache Local para celeridade
  useEffect(() => {
    const cachedVtrs = localStorage.getItem('vtr_cache');
    if (cachedVtrs) setViaturas(JSON.parse(cachedVtrs));
    
    carregarViaturas();
    const novoChecklist = itensAtuais.reduce((acc, item) => ({ ...acc, [item]: 'OK' }), {});
    setChecklist(novoChecklist);
  }, [tipoVistoria]);

  const carregarViaturas = async () => {
    setLoading(true);
    const res = await gasApi.getViaturas(tipoVistoria === 'SAÍDA');
    if (res.status === 'success') {
      setViaturas(res.data);
      localStorage.setItem('vtr_cache', JSON.stringify(res.data));
    }
    setLoading(false);
  };

  const buscarMilitar = async (re, campo) => {
    if (re.length < 4) return;
    try {
      const res = await gasApi.buscarMilitar(re);
      if (res.status === 'success') {
        setFormData(prev => ({ 
          ...prev, 
          [`${campo}_nome`]: `${res.patente} ${res.nome}`,
          [`${campo}_re`]: re 
        }));
      }
    } catch (e) { console.error("Erro busca:", e); }
  };

  const handleCapturePhoto = async (event) => {
    const imageFile = event.target.files[0];
    if (!imageFile) return;

    setUploading(true);
    try {
      const options = { maxSizeMB: 0.8, maxWidthOrHeight: 1024, useWebWorker: true };
      const compressedFile = await imageCompression(imageFile, options);
      
      const reader = new FileReader();
      reader.readAsDataURL(compressedFile);
      reader.onloadend = () => {
        setFotos(prev => [...prev, reader.result]);
        setUploading(false);
      };
    } catch (error) {
      console.error("Erro compressor:", error);
      setUploading(false);
    }
  };

  const toggleChecklist = (item) => {
    setChecklist(prev => ({ ...prev, [item]: prev[item] === 'OK' ? 'FALHA' : 'OK' }));
  };

  const itensComFalha = Object.values(checklist).filter(v => v === 'FALHA').length;

  const handleFinalizar = async () => {
    setLoading(true);
    const payload = {
      ...formData,
      tipo_vistoria: tipoVistoria,
      checklist: JSON.stringify(checklist),
      fotos: JSON.stringify(fotos), // Enviando array de base64
      houve_alteracoes: itensComFalha > 0 || formData.observacoes.length > 0,
      data_hora_sistema: new Date().toLocaleString('pt-BR')
    };
    
    const res = await gasApi.saveVistoria(payload);
    if (res.status === 'success') {
      alert("Registro finalizado com sucesso!");
      onBack();
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-[var(--bg-app)] pb-10 transition-all font-sans text-slate-900">
      <header className="bg-slate-900 text-white p-5 shadow-2xl sticky top-0 z-50 border-b-4 border-blue-900">
        <div className="max-w-xl mx-auto flex items-center justify-between">
          <button onClick={onBack} className="p-2 hover:bg-slate-800 rounded-full"><ArrowLeft size={24}/></button>
          <div className="text-center">
            <h1 className="font-black text-[10px] tracking-widest opacity-50 uppercase">1º BPM - Rondon</h1>
            <p className="text-xs font-bold text-blue-400 uppercase">{tipoVistoria} DE SERVIÇO</p>
          </div>
          <div className="w-10" />
        </div>
      </header>

      <main className="max-w-xl mx-auto p-4 space-y-6">
        {step === 1 && (
          <div className="space-y-6 animate-in slide-in-from-bottom-4 duration-500">
            <div className="vtr-card p-1.5 flex bg-slate-200 border-none shadow-inner">
              <button onClick={() => setTipoVistoria('ENTRADA')} className={`flex-1 py-3 rounded-2xl font-black text-[10px] transition-all ${tipoVistoria === 'ENTRADA' ? 'bg-green-600 text-white shadow-lg' : 'text-slate-500'}`}>ENTRADA</button>
              <button onClick={() => setTipoVistoria('SAÍDA')} className={`flex-1 py-3 rounded-2xl font-black text-[10px] transition-all ${tipoVistoria === 'SAÍDA' ? 'bg-orange-500 text-white shadow-lg' : 'text-slate-500'}`}>SAÍDA</button>
            </div>

            <section className="vtr-card p-6 space-y-5">
              <div className="flex items-center gap-2 border-b pb-4 border-slate-100">
                <ShieldCheck className="text-blue-600" size={20}/>
                <h3 className="text-xs font-black uppercase">Dados do Equipamento</h3>
              </div>
              <div className="space-y-4">
                <select className="vtr-input" value={formData.prefixo_vtr} onChange={(e) => setFormData({...formData, prefixo_vtr: e.target.value})}>
                  <option value="">Selecione a VTR</option>
                  {viaturas.map(v => <option key={v.Placa} value={v.Prefixo}>{v.Prefixo} - {v.Placa}</option>)}
                </select>
                <input type="number" className="vtr-input" placeholder="Hodômetro Atual" onChange={(e) => setFormData({...formData, hodometro: e.target.value})} />
              </div>

              <div className="space-y-4 pt-4 border-t border-slate-50">
                {['motorista', 'comandante', 'patrulheiro'].map(cargo => (
                  <div key={cargo}>
                    <input placeholder={`RE do ${cargo}`} className="vtr-input !py-3 !text-sm" onBlur={(e) => buscarMilitar(e.target.value, cargo)} />
                    {formData[`${cargo}_nome`] && (
                      <div className="mt-2 p-2 bg-blue-50 text-blue-700 text-[10px] font-black rounded-lg flex items-center gap-2 animate-in zoom-in-95">
                        <CheckCircle2 size={12}/> {formData[`${cargo}_nome`]}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </section>

            <button onClick={() => setStep(2)} disabled={!formData.prefixo_vtr || !formData.hodometro} className="btn-tatico w-full">CONFERIR ITENS <ChevronRight size={20}/></button>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-4 animate-in slide-in-from-right duration-500">
            <div className="flex gap-3">
              <div className="flex-1 vtr-card p-4 text-center border-b-4 border-b-green-500">
                <p className="text-2xl font-black text-green-600">{itensAtuais.length - itensComFalha}</p>
                <p className="text-[9px] font-black text-slate-400 uppercase">Integridade OK</p>
              </div>
              <div className="flex-1 vtr-card p-4 text-center border-b-4 border-b-red-500">
                <p className="text-2xl font-black text-red-600">{itensComFalha}</p>
                <p className="text-[9px] font-black text-slate-400 uppercase">Avarias/Faltas</p>
              </div>
            </div>

            <div className="grid gap-2">
              {itensAtuais.map(item => (
                <div key={item} onClick={() => toggleChecklist(item)} className={checklist[item] === 'OK' ? 'checklist-item-ok' : 'checklist-item-falha'}>
                  <span className="text-sm font-bold uppercase">{item}</span>
                  <div className={`px-3 py-1 rounded-lg text-[10px] font-black ${checklist[item] === 'OK' ? 'bg-green-100 text-green-700' : 'bg-red-600 text-white'}`}>{checklist[item]}</div>
                </div>
              ))}
            </div>

            {/* SEÇÃO DE FOTOS OPERACIONAL */}
            <div className="vtr-card p-6 space-y-4">
              <h3 className="text-xs font-black uppercase flex items-center gap-2 text-slate-700">
                <Camera size={18} className="text-blue-600" /> Registro Visual (Máx 4)
              </h3>
              <div className="grid grid-cols-4 gap-2">
                {fotos.map((foto, index) => (
                  <div key={index} className="relative aspect-square rounded-xl overflow-hidden border-2 border-slate-200 shadow-inner">
                    <img src={foto} className="object-cover w-full h-full" alt="evidencia" />
                    <button onClick={() => setFotos(fotos.filter((_, i) => i !== index))} className="absolute top-1 right-1 bg-red-600 text-white rounded-full p-1 shadow-lg"><X size={10}/></button>
                  </div>
                ))}
                {fotos.length < 4 && (
                  <label className="aspect-square rounded-xl border-2 border-dashed border-slate-300 flex flex-col items-center justify-center text-slate-400 hover:bg-blue-50 hover:border-blue-300 transition-all cursor-pointer">
                    {uploading ? <Loader2 className="animate-spin" size={20} /> : <Plus size={24} />}
                    <input type="file" accept="image/*" capture="environment" className="hidden" onChange={handleCapturePhoto} />
                  </label>
                )}
              </div>
            </div>

            <section className="vtr-card p-6 space-y-4">
              <textarea className="vtr-input text-sm" placeholder="Descreva aqui qualquer alteração ou avaria constatada..." rows="3" onChange={(e) => setFormData({...formData, observacoes: e.target.value})} />
              <div className={`p-4 rounded-2xl border-2 border-dashed transition-all ${formData.termo_aceite ? 'bg-blue-50 border-blue-400' : 'bg-slate-50 border-slate-300'}`}>
                <label className="flex items-start gap-3 cursor-pointer">
                  <input type="checkbox" className="w-6 h-6 rounded-lg mt-1" onChange={(e) => setFormData({...formData, termo_aceite: e.target.checked})} />
                  <p className="text-[10px] font-bold text-slate-600 leading-tight">
                    CONFIRMO que realizei a inspeção física e as fotos anexadas condizem com o estado atual da VTR {formData.prefixo_vtr}.
                  </p>
                </label>
              </div>
              <button onClick={handleFinalizar} disabled={!formData.termo_aceite || loading} className="btn-tatico w-full">
                {loading ? <Loader2 className="animate-spin"/> : <><Save size={20}/> FINALIZAR VISTORIA</>}
              </button>
            </section>
          </div>
        )}
      </main>
    </div>
  );
};

export default Vistoria;
