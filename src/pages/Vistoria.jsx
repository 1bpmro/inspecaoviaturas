import React, { useState, useEffect } from 'react';
import { useAuth } from '../lib/AuthContext'; 
import imageCompression from 'browser-image-compression';
import { gasApi } from '../api/gasClient';
import { photoService } from '../api/photoService'; 

import { 
  ArrowLeft, ChevronRight, Loader2, X, Plus, 
  Users, Car, Shield, Search, UserCheck
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
    motorista_unidade: '',
    comandante_re: '',
    comandante_nome: '',
    patrulheiro_re: '',
    patrulheiro_nome: '',
    termo_aceite: false
  });

  // Controla se devemos exibir os campos manuais para cada função
  const [manual, setManual] = useState({ mot: false, cmd: false, ptr: false });
  const [checklist, setChecklist] = useState({});

  // --- FUNÇÃO DE BUSCA ---
  const pesquisarRE = async (reDigitado, tipo) => {
    // Limpa 1000 inicial e espaços
    const reLimpo = reDigitado.toString().trim().replace(/^1000/, '');
    
    // Só pesquisa se tiver entre 4 e 7 dígitos (padrão RE)
    if (reLimpo.length < 4) return;

    try {
      const res = await gasApi.buscarMilitar(reLimpo);
      
      if (res && res.status === 'success' && res.data) {
        setFormData(prev => ({ 
          ...prev, 
          [`${tipo}_nome`]: res.data.NOME,
          ...(tipo === 'motorista' ? { motorista_unidade: res.data.UNIDADE } : {})
        }));
        setManual(prev => ({ ...prev, [tipo.slice(0,3)]: false }));
      } else {
        // Se não encontrou no DB, permite digitar
        setManual(prev => ({ ...prev, [tipo.slice(0,3)]: true }));
      }
    } catch (error) {
      console.error("Erro na busca:", error);
      setManual(prev => ({ ...prev, [tipo.slice(0,3)]: true }));
    }
  };

  // Efeitos para busca automática (Debounce)
  useEffect(() => {
    const t = setTimeout(() => pesquisarRE(formData.motorista_re, 'motorista'), 700);
    return () => clearTimeout(t);
  }, [formData.motorista_re]);

  useEffect(() => {
    const t = setTimeout(() => pesquisarRE(formData.comandante_re, 'comandante'), 700);
    return () => clearTimeout(t);
  }, [formData.comandante_re]);

  useEffect(() => {
    const t = setTimeout(() => pesquisarRE(formData.patrulheiro_re, 'patrulheiro'), 700);
    return () => clearTimeout(t);
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
        
        {/* CARD DE GUARNIÇÃO EM TEMPO REAL */}
        <div className="bg-slate-900 rounded-3xl p-5 shadow-xl text-white border-b-4 border-blue-500">
            <h2 className="text-[9px] font-black uppercase tracking-[0.2em] mb-3 text-blue-400">Efetivo da Guarnição</h2>
            <div className="space-y-3">
                <div className="flex justify-between border-b border-slate-800 pb-1">
                    <span className="text-[9px] font-black text-slate-500 uppercase">MOT</span>
                    <span className="text-xs font-bold uppercase">{formData.motorista_nome || 'Aguardando...'}</span>
                </div>
                <div className="flex justify-between border-b border-slate-800 pb-1">
                    <span className="text-[9px] font-black text-slate-500 uppercase">CMD</span>
                    <span className="text-xs font-bold uppercase">{formData.comandante_nome || 'Aguardando...'}</span>
                </div>
                <div className="flex justify-between border-b border-slate-800 pb-1">
                    <span className="text-[9px] font-black text-slate-500 uppercase">PTR</span>
                    <span className="text-xs font-bold uppercase">{formData.patrulheiro_nome || '---'}</span>
                </div>
            </div>
        </div>

        {step === 1 ? (
          <div className="space-y-4 animate-in fade-in">
             {/* SELEÇÃO VTR */}
             <div className="bg-white rounded-3xl p-6 shadow-md border border-slate-100">
                <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                        <label className="text-[9px] font-black text-slate-400 uppercase ml-2">Viatura</label>
                        <select className="w-full p-4 bg-slate-50 rounded-2xl border border-slate-200 font-bold text-sm"
                            value={formData.prefixo_vtr} onChange={(e) => handleVtrChange(e.target.value)}>
                            <option value="">SELECIONE</option>
                            {PATRIMONIO && PATRIMONIO.length > 0 ? (
                                PATRIMONIO.map(v => (
                                    <option key={v.PREFIXO} value={v.PREFIXO}>{v.PREFIXO}</option>
                                ))
                            ) : (
                                <option disabled>Sem viaturas no banco</option>
                            )}
                        </select>
                    </div>
                    <div className="space-y-1">
                        <label className="text-[9px] font-black text-slate-400 uppercase ml-2">KM Atual</label>
                        <input type="number" className="w-full p-4 bg-slate-50 rounded-2xl border border-slate-200 font-bold text-sm"
                            value={formData.hodometro} onChange={(e) => setFormData({...formData, hodometro: e.target.value})} />
                    </div>
                </div>
             </div>

             {/* CAMPOS DE MATRÍCULA */}
             <div className="bg-white rounded-3xl p-6 shadow-md border border-slate-100 space-y-4">
                {/* MOTORISTA */}
                <div className="space-y-2">
                    <label className="text-[9px] font-black text-slate-400 uppercase ml-2">Motorista (RE)</label>
                    <input type="tel" className="w-full p-4 bg-slate-50 rounded-2xl border border-slate-200 font-bold text-sm"
                        placeholder="RE do Motorista" value={formData.motorista_re}
                        onChange={(e) => setFormData({...formData, motorista_re: e.target.value})} />
                    {manual.mot && (
                        <div className="flex gap-2 animate-in slide-in-from-top-2">
                            <input type="text" placeholder="NOME GUERRA" className="flex-1 p-3 bg-amber-50 rounded-xl border border-amber-200 text-xs font-bold"
                                value={formData.motorista_nome} onChange={(e) => setFormData({...formData, motorista_nome: e.target.value})} />
                            <input type="text" placeholder="UNIDADE" className="w-24 p-3 bg-amber-50 rounded-xl border border-amber-200 text-xs font-bold"
                                value={formData.motorista_unidade} onChange={(e) => setFormData({...formData, motorista_unidade: e.target.value})} />
                        </div>
                    )}
                </div>

                {/* COMANDANTE */}
                <div className="space-y-2">
                    <label className="text-[9px] font-black text-slate-400 uppercase ml-2">Comandante (RE) *</label>
                    <input type="tel" className="w-full p-4 bg-slate-50 rounded-2xl border border-slate-200 font-bold text-sm"
                        placeholder="RE do Comandante" value={formData.comandante_re}
                        onChange={(e) => setFormData({...formData, comandante_re: e.target.value})} />
                    {manual.cmd && (
                        <input type="text" placeholder="NOME DE GUERRA DO COMANDANTE" className="w-full p-3 bg-amber-50 rounded-xl border border-amber-200 text-xs font-bold"
                            value={formData.comandante_nome} onChange={(e) => setFormData({...formData, comandante_nome: e.target.value})} />
                    )}
                </div>

                {/* PATRULHEIRO */}
                <div className="space-y-2">
                    <label className="text-[9px] font-black text-slate-400 uppercase ml-2">Patrulheiro (RE)</label>
                    <input type="tel" className="w-full p-4 bg-slate-50 rounded-2xl border border-slate-200 font-bold text-sm"
                        placeholder="RE do Patrulheiro" value={formData.patrulheiro_re}
                        onChange={(e) => setFormData({...formData, patrulheiro_re: e.target.value})} />
                    {manual.ptr && (
                        <input type="text" placeholder="NOME DE GUERRA DO PATRULHEIRO" className="w-full p-3 bg-amber-50 rounded-xl border border-amber-200 text-xs font-bold"
                            value={formData.patrulheiro_nome} onChange={(e) => setFormData({...formData, patrulheiro_nome: e.target.value})} />
                    )}
                </div>
             </div>

             <button onClick={() => setStep(2)} disabled={!formData.prefixo_vtr || !formData.hodometro || !formData.comandante_re}
                className="w-full bg-blue-700 text-white p-5 rounded-3xl font-black text-xs uppercase shadow-lg disabled:bg-slate-300">
                Avançar para Checklist <ChevronRight size={18} className="inline ml-1"/>
             </button>
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
