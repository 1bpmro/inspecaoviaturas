import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../lib/AuthContext';
import { gasApi } from '../api/gasClient';
import imageCompression from 'browser-image-compression';
import { 
  ArrowLeft, ChevronRight, Loader2, X, Plus, 
  Users, AlertTriangle, Lock, Unlock, Wrench
} from 'lucide-react';

// --- COMPONENTE DO MODAL DE ÓLEO ---
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

  if (!isOpen || !vtr) return null;

  const handleSalvarOleo = async () => {
    if (!dadosOleo.km_troca) return alert("Insira o KM da etiqueta.");
    if (!fotoOleo) return alert("A foto da etiqueta é obrigatória.");

    setLoading(true);
    try {
      const payload = {
        prefixo: vtr.Prefixo || vtr.PREFIXO,
        data_troca: dadosOleo.data_troca,
        km_troca: Number(dadosOleo.km_troca),
        foto: fotoOleo,
        militar_re: user?.re || '',
        militar_nome: `${user?.patente || ''} ${user?.nome || ''}`.trim()
      };
      const res = await gasApi.registrarTrocaOleo(payload);
      if (res.status === 'success') {
        alert("Troca de óleo registrada!");
        onClose();
      }
    } catch (e) { alert("Erro ao salvar óleo."); }
    finally { setLoading(false); }
  };

  return (
    <div className="fixed inset-0 z-[100] bg-slate-900/95 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white dark:bg-slate-900 w-full max-w-md rounded-[2.5rem] p-6 border-t-8 border-orange-500 shadow-2xl">
        <div className="text-center mb-4">
          <Wrench size={32} className="mx-auto text-orange-600 mb-2" />
          <h2 className="font-black text-slate-900 dark:text-white uppercase text-sm">Registrar Troca de Óleo</h2>
        </div>
        <input type="date" className="vtr-input mb-3 w-full" value={dadosOleo.data_troca} onChange={e => setDadosOleo({...dadosOleo, data_troca: e.target.value})} />
        <input type="number" className="vtr-input mb-4 w-full" placeholder="KM DA ETIQUETA" value={dadosOleo.km_troca} onChange={e => setDadosOleo({...dadosOleo, km_troca: e.target.value})} />
        
        <div className="p-4 border-2 border-dashed rounded-3xl bg-slate-50 dark:bg-slate-800 text-center mb-4">
          {fotoOleo ? (
            <div className="relative aspect-video rounded-xl overflow-hidden">
              <img src={fotoOleo} className="w-full h-full object-cover" alt="Etiqueta" />
              <button onClick={() => setFotoOleo(null)} className="absolute top-2 right-2 bg-red-600 text-white p-2 rounded-full"><X size={16}/></button>
            </div>
          ) : (
            <label className="cursor-pointer block py-4">
              {uploading ? <Loader2 className="animate-spin mx-auto text-orange-500" /> : <><Plus className="mx-auto text-orange-500 mb-1" /><span className="text-[10px] font-black text-slate-500 uppercase">Foto da Etiqueta</span></>}
              <input type="file" accept="image/*" capture="environment" className="hidden" onChange={async (e) => {
                const file = e.target.files[0]; if (!file) return;
                setUploading(true);
                const compressed = await imageCompression(file, { maxSizeMB: 0.2, maxWidthOrHeight: 800 });
                const reader = new FileReader(); reader.readAsDataURL(compressed);
                reader.onloadend = () => { setFotoOleo(reader.result); setUploading(false); };
              }} />
            </label>
          )}
        </div>
        <div className="flex gap-2">
          <button onClick={onClose} className="flex-1 font-black text-slate-400 uppercase text-xs">Sair</button>
          <button onClick={handleSalvarOleo} disabled={loading} className="flex-[2] bg-orange-500 text-white p-4 rounded-2xl font-black shadow-lg">
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
  const [uploading, setUploading] = useState(false);
  const [viaturas, setViaturas] = useState(frotaInicial);
  const [efetivoLocal, setEfetivoLocal] = useState([]);
  const [tipoVistoria, setTipoVistoria] = useState('ENTRADA');
  const [fotos, setFotos] = useState([]);
  const [protegerFotos, setProtegerFotos] = useState(false);
  const [kmReferencia, setKmReferencia] = useState(0);
  const [modalOleoOpen, setModalOleoOpen] = useState(false);
  
  const [formData, setFormData] = useState({
    prefixo_vtr: '', placa_vtr: '', hodometro: '', videomonitoramento: '', 
    tipo_servico: '', unidade_externa: '',
    motorista_re: '', motorista_nome: '', motorista_unidade: '',
    comandante_re: '', comandante_nome: '', comandante_unidade: '',
    patrulheiro_re: '', patrulheiro_nome: '', patrulheiro_unidade: '',
    termo_aceite: false
  });

  const [checklist, setChecklist] = useState({});

  useEffect(() => {
    const itens = tipoVistoria === 'ENTRADA' ? [
      "Documento da Viatura", "Estepe", "Chave de Roda", "Macaco", "Triângulo", "Extintor",
      "Nível de Água", "Porta Traseira", "Porta Dianteira", "Pneus", "Capô", "Cinto",
      "Paralama Dianteiro", "Paralama Traseiro", "Parachoque Dianteiro", "Parachoque Traseiro",
      "Lanternas", "Caçamba", "Vidros e Portas", "Retrovisor Externo", "Retrovisor Interno",
      "Maçanetas", "Para-brisas", "Sirene", "Giroscópio", "Rádio", "Painel de Instrumentos",
      "Bancos", "Forro Interno", "Tapetes", "Protetor Dianteiro", "Regulador dos Bancos"
    ] : ["Viatura Entregue Limpa", "Viatura em Condições de Uso", "Avarias Constatadas", "Limpeza Interna", "Limpeza Externa", "Pertences da Guarnição Retirados"];
    
    setChecklist(itens.reduce((acc, item) => ({ ...acc, [item]: 'OK' }), {}));
  }, [tipoVistoria]);

  const toStr = (val) => (val !== undefined && val !== null ? String(val).trim() : '');

  const vtrSelecionada = useMemo(() => {
    return viaturas.find(v => toStr(v.Prefixo || v.PREFIXO) === toStr(formData.prefixo_vtr));
  }, [formData.prefixo_vtr, viaturas]);

  // LOGICA DA TROCA DE ÓLEO
  const precisaTrocaOleo = useMemo(() => {
    if (!vtrSelecionada || tipoVistoria !== 'ENTRADA') return false;
    const kmUltima = Number(vtrSelecionada.KM_UltimaTroca || vtrSelecionada.KM_ULTIMATROCA) || 0;
    const dataUltimaStr = vtrSelecionada.Data_UltimaTroca || vtrSelecionada.DATA_ULTIMATROCA;
    const kmAtual = Number(formData.hodometro) || 0;

    if (kmAtual === 0) return false;
    if (!kmUltima) return true; // Se não tem registro, alerta

    const diferencaKM = kmAtual - kmUltima;
    if (diferencaKM >= 9950) return true; // Próximo de 10k

    if (dataUltimaStr) {
      const diffInDays = Math.floor((new Date() - new Date(dataUltimaStr)) / (1000 * 60 * 60 * 24));
      if (diffInDays >= 170) return true; // Próximo de 6 meses
    }
    return false;
  }, [vtrSelecionada, formData.hodometro, tipoVistoria]);

  const handleMatriculaChange = (valor, cargo) => {
    let reLimpo = toStr(valor).replace(/\D/g, '');
    setFormData(prev => ({ ...prev, [`${cargo}_re`]: reLimpo }));
    if (reLimpo.length >= 4) {
      const militar = efetivoLocal.find(m => toStr(m.re).includes(reLimpo));
      if (militar) {
        let nomeFinal = toStr(militar.nome).toUpperCase();
        const pat = toStr(militar.patente).toUpperCase();
        if (!nomeFinal.startsWith(pat)) nomeFinal = `${pat} ${nomeFinal}`;
        
        setFormData(prev => ({
          ...prev,
          [`${cargo}_re`]: toStr(militar.re),
          [`${cargo}_nome`]: nomeFinal,
          [`${cargo}_unidade`]: militar.unidade || '1º BPM'
        }));
      }
    }
  };

  const handleVtrChange = (prefixo) => {
    const vtr = viaturas.find(v => toStr(v.Prefixo || v.PREFIXO) === toStr(prefixo));
    if (!vtr) return;
    const kmAnterior = Number(vtr.UltimoKM || vtr.ULTIMOKM) || 0;
    setKmReferencia(kmAnterior);
    setFormData(prev => ({ ...prev, prefixo_vtr: toStr(vtr.Prefixo || vtr.PREFIXO), placa_vtr: toStr(vtr.Placa || vtr.PLACA) }));
  };

  const handleFinalizar = async () => {
    setLoading(true);
    try {
      const payload = {
        ...formData,
        tipo_vistoria: tipoVistoria,
        Links_fotos: fotos,
        militar_logado: `${user.patente} ${user.nome}`,
        status_garageiro: "PENDENTE"
      };
      const res = await gasApi.saveVistoria(payload);
      if (res.status === 'success') { alert("Sucesso!"); onBack(); }
    } catch (e) { alert("Erro conexão"); }
    finally { setLoading(false); }
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 pb-10">
      <header className="bg-slate-900 text-white p-5 sticky top-0 z-50 flex items-center justify-between">
        <button onClick={onBack}><ArrowLeft /></button>
        <h1 className="text-xs font-bold uppercase">Inspeção de Viatura</h1>
        <div className="w-6" />
      </header>

      <main className="max-w-xl mx-auto p-4 space-y-6">
        <div className="flex bg-slate-200 dark:bg-slate-800 p-1 rounded-2xl">
          <button onClick={() => setTipoVistoria('ENTRADA')} className={`flex-1 py-3 rounded-xl font-black text-[10px] ${tipoVistoria === 'ENTRADA' ? 'bg-green-600 text-white' : 'text-slate-500'}`}>ENTRADA</button>
          <button onClick={() => setTipoVistoria('SAÍDA')} className={`flex-1 py-3 rounded-xl font-black text-[10px] ${tipoVistoria === 'SAÍDA' ? 'bg-orange-500 text-white' : 'text-slate-500'}`}>SAÍDA</button>
        </div>

        {step === 1 ? (
          <div className="space-y-4">
            <select className="vtr-input w-full" value={formData.prefixo_vtr} onChange={e => handleVtrChange(e.target.value)}>
              <option value="">SELECIONE A VTR</option>
              {viaturas.map(v => <option key={v.Prefixo || v.PREFIXO} value={v.Prefixo || v.PREFIXO}>{v.Prefixo || v.PREFIXO}</option>)}
            </select>

            <input type="number" className="vtr-input w-full" placeholder="KM ATUAL" value={formData.hodometro} onChange={e => setFormData({...formData, hodometro: e.target.value})} />

            {/* BOTÃO DE ALERTA DE ÓLEO - SÓ APARECE SE PRECISAR */}
            {precisaTrocaOleo && (
              <button onClick={() => setModalOleoOpen(true)} className="w-full bg-orange-50 border-2 border-orange-500 p-4 rounded-2xl flex items-center justify-between animate-pulse">
                <div className="flex items-center gap-3">
                  <Wrench className="text-orange-500" size={20} />
                  <span className="text-[10px] font-black text-orange-700 uppercase">Troca de Óleo Necessária</span>
                </div>
                <Plus size={16} className="text-orange-500" />
              </button>
            )}

            {['motorista', 'comandante', 'patrulheiro'].map(cargo => (
              <input key={cargo} placeholder={`MATRÍCULA ${cargo.toUpperCase()}`} className="vtr-input w-full" value={formData[`${cargo}_re`]} onChange={e => handleMatriculaChange(e.target.value, cargo)} />
            ))}
            
            <button onClick={() => setStep(2)} className="btn-tatico w-full">PRÓXIMO</button>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="grid gap-2">
              {Object.keys(checklist).map(item => (
                <div key={item} onClick={() => setChecklist(p => ({...p, [item]: p[item] === 'OK' ? 'FALHA' : 'OK'}))} className={`p-4 rounded-2xl border-2 flex justify-between ${checklist[item] === 'FALHA' ? 'border-red-500 bg-red-50' : 'border-slate-100'}`}>
                  <span className="text-xs font-bold uppercase">{item}</span>
                  <span className="font-black text-[10px]">{checklist[item]}</span>
                </div>
              ))}
            </div>
            <button onClick={handleFinalizar} className="btn-tatico w-full">FINALIZAR</button>
          </div>
        )}
      </main>

      <ModalTrocaOleo 
        isOpen={modalOleoOpen} 
        onClose={() => setModalOleoOpen(false)}
        vtr={vtrSelecionada}
        kmEntrada={formData.hodometro}
        user={user}
      />
    </div>
  );
};

export default Vistoria;
