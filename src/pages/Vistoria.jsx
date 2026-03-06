import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../lib/AuthContext';
import { gasApi } from '../api/gasClient';
import imageCompression from 'browser-image-compression';
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
const ITENS_ENTRADA = GRUPOS_ENTRADA.flatMap(g => g.itens);

// --- SUB-COMPONENTE: MODAL TROCA DE ÓLEO ---
const ModalTrocaOleo = ({ isOpen, onClose, vtr, kmEntrada, user, gasApi }) => {
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

  if (!isOpen || !vtr) return null;

  const handleSalvar = async () => {
    const kmTrocaNum = Number(dadosOleo.km_troca);
    if (!kmTrocaNum) return alert("Insira o KM da troca.");
    if (!fotoOleo) return alert("Anexe a foto do comprovante.");

    setLoading(true);
    try {
      const res = await gasApi.registrarTrocaOleo({
        prefixo: vtr.Prefixo || vtr.PREFIXO,
        data_troca: dadosOleo.data_troca,
        km_troca: kmTrocaNum,
        foto: fotoOleo,
        militar_re: user?.re || '',
        militar_nome: `${user?.patente || ''} ${user?.nome || ''}`.trim()
      });
      if (res.status === 'success') { 
        alert("Troca registrada com sucesso!"); 
        onClose(); 
      }
    } catch (e) { 
      alert("Erro ao salvar a troca de óleo."); 
    } finally { 
      setLoading(false); 
    }
  };

  return (
    <div className="fixed inset-0 z-[100] bg-slate-900/95 backdrop-blur-md flex items-center justify-center p-4">
      <div className="bg-white w-full max-w-md rounded-[2.5rem] p-6 space-y-4 border-t-8 border-orange-500 shadow-2xl">
        <div className="text-center">
          <Wrench size={32} className="mx-auto text-orange-600 mb-2" />
          <h2 className="font-black text-slate-900 uppercase text-sm">Registrar Troca de Óleo</h2>
        </div>
        <div className="space-y-3">
          <label className="block">
            <span className="text-[10px] font-bold text-slate-400 ml-2">DATA DA TROCA</span>
            <input type="date" className="vtr-input w-full" value={dadosOleo.data_troca} onChange={e => setDadosOleo({...dadosOleo, data_troca: e.target.value})} />
          </label>
          <label className="block">
            <span className="text-[10px] font-bold text-slate-400 ml-2">KM DA ETIQUETA</span>
            <input type="number" className="vtr-input w-full" placeholder="KM DA TROCA" value={dadosOleo.km_troca} onChange={e => setDadosOleo({...dadosOleo, km_troca: e.target.value})} />
          </label>
        </div>
        
        <div className="p-4 border-2 border-dashed rounded-3xl bg-slate-50 text-center">
          {fotoOleo ? (
            <div className="relative aspect-video">
              <img src={fotoOleo} className="w-full h-full object-cover rounded-xl" alt="Comprovante" />
              <button onClick={() => setFotoOleo(null)} className="absolute -top-2 -right-2 bg-red-600 text-white p-2 rounded-full shadow-lg"><X size={16}/></button>
            </div>
          ) : (
            <label className="cursor-pointer block py-4">
              {uploading ? <Loader2 className="animate-spin mx-auto text-orange-500" /> : (
                <>
                  <Plus className="mx-auto text-orange-500 mb-1" />
                  <span className="text-[10px] font-black text-slate-500 uppercase">Foto da Etiqueta/Recibo</span>
                </>
              )}
              <input type="file" accept="image/*" capture="environment" className="hidden" onChange={async (e) => {
                const file = e.target.files[0]; if (!file) return;
                setUploading(true);
                try {
                  const options = { maxSizeMB: 0.2, maxWidthOrHeight: 1024, useWebWorker: true };
                  const compressed = await imageCompression(file, options);
                  const reader = new FileReader(); 
                  reader.readAsDataURL(compressed);
                  reader.onloadend = () => { setFotoOleo(reader.result); setUploading(false); };
                } catch (err) { setUploading(false); }
              }} />
            </label>
          )}
        </div>
        <div className="flex gap-2 pt-2">
          <button onClick={onClose} className="flex-1 font-black text-slate-400 text-xs">CANCELAR</button>
          <button onClick={handleSalvar} disabled={loading || uploading} className="flex-[2] bg-orange-500 text-white p-4 rounded-2xl font-black shadow-lg shadow-orange-200">
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
  const [modalOleoOpen, setModalOleoOpen] = useState(false);
  const [protegerFotos, setProtegerFotos] = useState(false);
  
  const [viaturas, setViaturas] = useState(frotaInicial);
  const [efetivoLocal, setEfetivoLocal] = useState([]);
  const [tipoVistoria, setTipoVistoria] = useState('ENTRADA');
  const [kmReferencia, setKmReferencia] = useState(0);
  const [fotos, setFotos] = useState([]);

  const [formData, setFormData] = useState({
    prefixo_vtr: '', placa_vtr: '', hodometro: '', videomonitoramento: 'OPERANTE',
    tipo_servico: 'Patrulhamento Ordinário', servico_detalhe: '',
    motorista_re: user?.re || '', motorista_nome: user?.nome || '', motorista_unidade: user?.unidade || '',
    comandante_re: '', comandante_nome: '', comandante_unidade: '',
    patrulheiro_re: '', patrulheiro_nome: '', patrulheiro_unidade: '',
    termo_aceite: false
  });

  const [checklist, setChecklist] = useState({});

  useEffect(() => {
    const itens = tipoVistoria === 'ENTRADA' ? ITENS_ENTRADA : ITENS_SAIDA;
    const obj = {};
    itens.forEach(i => obj[i] = 'OK');
    setChecklist(obj);
  }, [tipoVistoria]);

  useEffect(() => {
    const carregar = async () => {
      setLoading(true);
      try {
        const [resVtr, resMil] = await Promise.all([gasApi.getViaturas(), gasApi.getEfetivoCompleto()]);
        if (resVtr.status === 'success') setViaturas(resVtr.data);
        if (resMil.status === 'success') setEfetivoLocal(resMil.data);
      } finally { setLoading(false); }
    };
    carregar();
  }, []);

  const toStr = (val) => String(val || '');

  const vtrSelecionada = useMemo(() => {
    return viaturas.find(v => toStr(v.Prefixo || v.PREFIXO) === toStr(formData.prefixo_vtr));
  }, [formData.prefixo_vtr, viaturas]);

  const precisaTrocaOleo = useMemo(() => {
    if (!vtrSelecionada || tipoVistoria !== 'ENTRADA') return false;
    const kmTroca = Number(vtrSelecionada.ProximaTrocaOleo || vtrSelecionada.PROXIMA_TROCA) || 0;
    const kmAtual = Number(formData.hodometro) || 0;
    return kmAtual > 0 && (kmTroca - kmAtual <= 500);
  }, [vtrSelecionada, formData.hodometro, tipoVistoria]);

  const handleVtrChange = (prefixo) => {
    const vtr = viaturas.find(v => toStr(v.Prefixo || v.PREFIXO) === toStr(prefixo));
    if (!vtr) return;
    const ultKM = Number(vtr.UltimoKM || vtr.ULTIMOKM) || 0;
    setKmReferencia(ultKM);
    setFormData(prev => ({ 
      ...prev, 
      prefixo_vtr: prefixo, 
      placa_vtr: vtr.Placa || vtr.PLACA, 
      hodometro: tipoVistoria === 'SAÍDA' ? toStr(ultKM) : '' 
    }));
  };

  const handleMatriculaChange = (valor, cargo) => {
    const re = valor.replace(/\D/g, '');
    setFormData(prev => ({ ...prev, [`${cargo}_re`]: re }));
    const mil = efetivoLocal.find(m => toStr(m.re) === re);
    if (mil) {
      setFormData(prev => ({ 
        ...prev, 
        [`${cargo}_nome`]: `${mil.patente} ${mil.nome}`, 
        [`${cargo}_unidade`]: mil.unidade || '1º BPM' 
      }));
    }
  };

  const isFormIncompleto = !formData.prefixo_vtr || !formData.hodometro || !formData.motorista_nome;

  const handleFinalizar = async () => {
    setLoading(true);
    try {
      const falhas = Object.entries(checklist).filter(([_, v]) => v === 'FALHA').map(([k]) => k);
      const res = await gasApi.saveVistoria({
        ...formData, 
        tipo_vistoria: tipoVistoria, 
        checklist_resumo: falhas.length ? `FALHA EM: ${falhas.join(', ')}` : "SEM ALTERAÇÕES",
        fotos_vistoria: fotos, 
        proteger_ocorrencia: protegerFotos
      });
      if (res.status === 'success') onBack();
    } catch (e) {
        alert("Erro ao enviar vistoria.");
    } finally { setLoading(false); }
  };

  return (
    <div className="min-h-screen bg-slate-50 pb-10 font-sans">
      <header className="bg-slate-900 text-white p-5 sticky top-0 z-50 flex items-center justify-between">
        <button onClick={onBack} className="p-2 hover:bg-white/10 rounded-full transition-colors"><ArrowLeft /></button>
        <span className="font-black text-xs uppercase tracking-widest text-blue-400">Vistoria 1º BPM</span>
        <div className="w-10" />
      </header>

      <main className="max-w-xl mx-auto p-4 space-y-4">
        {/* Toggle Entrada/Saída */}
        <div className="flex bg-slate-200 p-1 rounded-2xl">
          <button onClick={() => setTipoVistoria('ENTRADA')} className={`flex-1 py-3 rounded-xl font-black text-[10px] transition-all ${tipoVistoria === 'ENTRADA' ? 'bg-green-600 text-white shadow-md' : 'text-slate-500'}`}>ENTRADA</button>
          <button onClick={() => setTipoVistoria('SAÍDA')} className={`flex-1 py-3 rounded-xl font-black text-[10px] transition-all ${tipoVistoria === 'SAÍDA' ? 'bg-orange-500 text-white shadow-md' : 'text-slate-500'}`}>SAÍDA</button>
        </div>

        {step === 1 ? (
          <div className="space-y-4 animate-in slide-in-from-bottom-4 duration-300">
            <div className="bg-white p-6 rounded-[2.5rem] shadow-sm border space-y-4">
              <div className="grid grid-cols-2 gap-2">
                <select className="vtr-input w-full" value={formData.prefixo_vtr} onChange={(e) => handleVtrChange(e.target.value)}>
                  <option value="">VIATURA</option>
                  {viaturas.map(v => <option key={v.Prefixo || v.PREFIXO} value={v.Prefixo || v.PREFIXO}>{v.Prefixo || v.PREFIXO}</option>)}
                </select>
                <input type="number" className="vtr-input w-full" placeholder="KM ATUAL" value={formData.hodometro} onChange={(e) => setFormData({...formData, hodometro: e.target.value})} />
              </div>
              
              <div className="space-y-3">
                {['motorista', 'comandante'].map(cargo => (
                  <div key={cargo} className="p-3 bg-slate-50 rounded-2xl border border-slate-100">
                    <input type="tel" placeholder={`RE ${cargo.toUpperCase()}`} className="vtr-input !bg-white mb-2" value={formData[`${cargo}_re`]} onChange={(e) => handleMatriculaChange(e.target.value, cargo)} />
                    <input type="text" placeholder="NOME AUTOMÁTICO" className="vtr-input !bg-transparent !border-none !py-0 text-[10px] font-bold text-blue-600" value={formData[`${cargo}_nome`]} readOnly />
                  </div>
                ))}
              </div>

              {precisaTrocaOleo && (
                <button onClick={() => setModalOleoOpen(true)} className="w-full bg-orange-50 border-2 border-orange-500 p-4 rounded-2xl flex items-center justify-between group">
                  <div className="flex items-center gap-3">
                    <Wrench className="text-orange-500 animate-pulse" size={20} />
                    <div className="text-left">
                      <p className="text-[10px] font-black text-orange-700 uppercase">Troca de Óleo Necessária</p>
                      <p className="text-[8px] text-orange-600 font-bold">KM Próxima: {vtrSelecionada?.ProximaTrocaOleo || vtrSelecionada?.PROXIMA_TROCA}</p>
                    </div>
                  </div>
                  <ChevronRight size={16} className="text-orange-500 group-hover:translate-x-1 transition-transform" />
                </button>
              )}
            </div>
            <button onClick={() => setStep(2)} disabled={isFormIncompleto} className="btn-tatico w-full disabled:opacity-50 py-5">
              CONTINUAR <ChevronRight className="inline ml-1" size={18} />
            </button>
          </div>
        ) : (
          <div className="space-y-4 animate-in slide-in-from-right-4 duration-300">
             <div onClick={() => setProtegerFotos(!protegerFotos)} className={`p-4 rounded-2xl border-2 flex items-center justify-between cursor-pointer transition-all ${protegerFotos ? 'bg-blue-600 border-blue-700 text-white shadow-lg' : 'bg-white border-slate-200 text-slate-400'}`}>
               <div className="flex items-center gap-3">
                 {protegerFotos ? <Lock size={18} /> : <Unlock size={18} />}
                 <span className="font-black text-[10px] uppercase">Proteger Imagens (Ocorrência)</span>
               </div>
               {protegerFotos && <div className="bg-white/20 px-2 py-1 rounded text-[8px] font-bold">ATIVADO</div>}
            </div>
            
            <div className="grid gap-2">
              {Object.keys(checklist).map(item => (
                <div key={item} onClick={() => setChecklist(prev => ({...prev, [item]: prev[item] === 'OK' ? 'FALHA' : 'OK'}))} className={`flex justify-between items-center p-4 rounded-2xl border-2 transition-all cursor-pointer ${checklist[item] === 'FALHA' ? 'bg-red-50 border-red-500 shadow-sm' : 'bg-white border-slate-100'}`}>
                  <span className={`text-[10px] font-black uppercase ${checklist[item] === 'FALHA' ? 'text-red-700' : 'text-slate-700'}`}>{item}</span>
                  <div className={`px-3 py-1 rounded-full text-[8px] font-black ${checklist[item] === 'OK' ? 'bg-green-100 text-green-700' : 'bg-red-600 text-white'}`}>
                    {checklist[item]}
                  </div>
                </div>
              ))}
            </div>

            <label className="flex items-center gap-3 p-5 bg-white rounded-3xl border-2 border-blue-100">
              <input type="checkbox" className="w-5 h-5 rounded-lg text-blue-600" checked={formData.termo_aceite} onChange={e => setFormData({...formData, termo_aceite: e.target.checked})} />
              <span className="text-[9px] font-black uppercase text-slate-600">Confirmo que verifiquei todos os itens acima</span>
            </label>

            <div className="flex gap-3 pt-4">
              <button onClick={() => setStep(1)} className="flex-1 p-4 font-black text-slate-400 text-xs uppercase tracking-widest">VOLTAR</button>
              <button onClick={handleFinalizar} disabled={!formData.termo_aceite || loading} className="flex-[2] btn-tatico shadow-xl shadow-blue-200">
                {loading ? <Loader2 className="animate-spin mx-auto"/> : "FINALIZAR VISTORIA"}
              </button>
            </div>
          </div>
        )}
      </main>

      {/* MODAL TROCA DE ÓLEO - Montado fora do fluxo de scroll mas dentro do contexto */}
      <ModalTrocaOleo 
        isOpen={modalOleoOpen} 
        onClose={() => setModalOleoOpen(false)} 
        vtr={vtrSelecionada} 
        kmEntrada={formData.hodometro} 
        user={user}
        gasApi={gasApi}
      />
    </div>
  );
};

export default Vistoria;
