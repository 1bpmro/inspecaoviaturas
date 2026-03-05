import React, { useState, useEffect, useMemo, useCallback } from 'react';
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

const OPCOES_COMUNITARIA = ["Escolar", "Comercial", "Residencial", "Rural"];
const ITENS_SAIDA = Object.keys(MAPA_FALHAS_SAIDA);
const ITENS_ENTRADA = GRUPOS_ENTRADA.flatMap(g => g.itens);
const TIPOS_SERVICO = ["Patrulhamento Ordinário", "Operação", "Força Tática", "Patrulha Comunitária", "Patrulhamento Rural", "Outro"];

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
    if (isOpen) setDadosOleo(prev => ({ ...prev, km_troca: kmEntrada }));
  }, [isOpen, kmEntrada]);

  if (!isOpen || !vtr) return null;

  const handleSalvar = async () => {
    const kmTrocaNum = Number(dadosOleo.km_troca);
    if (!kmTrocaNum || kmTrocaNum < Number(kmEntrada)) return alert("KM inválido.");
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
      if (res.status === 'success') { alert("Registrado!"); onClose(); }
    } catch (e) { alert("Erro ao salvar."); } finally { setLoading(false); }
  };

  return (
    <div className="fixed inset-0 z-[100] bg-slate-900/95 backdrop-blur-md flex items-center justify-center p-4">
      <div className="bg-white w-full max-w-md rounded-[2.5rem] p-6 space-y-4 border-t-8 border-orange-500">
        <div className="text-center">
          <Wrench size={32} className="mx-auto text-orange-600 mb-2" />
          <h2 className="font-black text-slate-900 uppercase text-sm">Registrar Troca de Óleo</h2>
        </div>
        <input type="date" className="vtr-input w-full" value={dadosOleo.data_troca} onChange={e => setDadosOleo({...dadosOleo, data_troca: e.target.value})} />
        <input type="number" className="vtr-input w-full" placeholder="KM DA TROCA" value={dadosOleo.km_troca} onChange={e => setDadosOleo({...dadosOleo, km_troca: e.target.value})} />
        
        <div className="p-4 border-2 border-dashed rounded-3xl bg-slate-50 text-center">
          {fotoOleo ? (
            <div className="relative aspect-video">
              <img src={fotoOleo} className="w-full h-full object-cover rounded-xl" />
              <button onClick={() => setFotoOleo(null)} className="absolute -top-2 -right-2 bg-red-600 text-white p-1 rounded-full"><X size={14}/></button>
            </div>
          ) : (
            <label className="cursor-pointer block py-4">
              {uploading ? <Loader2 className="animate-spin mx-auto text-orange-500" /> : <span className="text-[10px] font-black text-slate-500">FOTO DO COMPROVANTE</span>}
              <input type="file" accept="image/*" capture="environment" className="hidden" onChange={async (e) => {
                const file = e.target.files[0]; if (!file) return;
                setUploading(true);
                const compressed = await imageCompression(file, { maxSizeMB: 0.2, maxWidthOrHeight: 1024 });
                const reader = new FileReader(); reader.readAsDataURL(compressed);
                reader.onloadend = () => { setFotoOleo(reader.result); setUploading(false); };
              }} />
            </label>
          )}
        </div>
        <div className="flex gap-2">
          <button onClick={onClose} className="flex-1 font-black text-slate-400">CANCELAR</button>
          <button onClick={handleSalvar} disabled={loading} className="flex-[2] bg-orange-500 text-white p-4 rounded-2xl font-black">
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
  const [modalOleoOpen, setModalOleoOpen] = useState(false);
  const [protegerFotos, setProtegerFotos] = useState(false);
  
  const [viaturas, setViaturas] = useState(frotaInicial);
  const [efetivoLocal, setEfetivoLocal] = useState([]);
  const [tipoVistoria, setTipoVistoria] = useState('ENTRADA');
  const [kmReferencia, setKmReferencia] = useState(0);
  const [fotos, setFotos] = useState([]);

  const [formData, setFormData] = useState({
    prefixo_vtr: '', placa_vtr: '', hodometro: '', videomonitoramento: 'OPERANTE',
    tipo_servico: '', servico_detalhe: '',
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

  const precisaTrocaOleo = useMemo(() => {
    const vtr = viaturas.find(v => toStr(v.Prefixo || v.PREFIXO) === toStr(formData.prefixo_vtr));
    if (!vtr || tipoVistoria !== 'ENTRADA') return false;
    const kmTroca = Number(vtr.ProximaTrocaOleo || vtr.PROXIMA_TROCA) || 0;
    const kmAtual = Number(formData.hodometro) || 0;
    return kmAtual > 0 && (kmTroca - kmAtual <= 500);
  }, [formData.prefixo_vtr, formData.hodometro, viaturas, tipoVistoria]);

  const handleVtrChange = (prefixo) => {
    const vtr = viaturas.find(v => toStr(v.Prefixo || v.PREFIXO) === toStr(prefixo));
    if (!vtr) return;
    const ultKM = Number(vtr.UltimoKM || vtr.ULTIMOKM) || 0;
    setKmReferencia(ultKM);
    setFormData(prev => ({ ...prev, prefixo_vtr: prefixo, placa_vtr: vtr.Placa || vtr.PLACA, hodometro: tipoVistoria === 'SAÍDA' ? toStr(ultKM) : '' }));
  };

  const handleMatriculaChange = (valor, cargo) => {
    const re = valor.replace(/\D/g, '');
    setFormData(prev => ({ ...prev, [`${cargo}_re`]: re }));
    const mil = efetivoLocal.find(m => toStr(m.re).includes(re) && re.length >= 5);
    if (mil) {
      setFormData(prev => ({ ...prev, [`${cargo}_nome`]: `${mil.patente} ${mil.nome}`, [`${cargo}_unidade`]: mil.unidade || '1º BPM' }));
    }
  };

  const isFormIncompleto = !formData.prefixo_vtr || !formData.hodometro || !formData.motorista_nome || (tipoVistoria === 'SAÍDA' && Number(formData.hodometro) <= kmReferencia);

  const handleFinalizar = async () => {
    setLoading(true);
    try {
      const falhas = Object.entries(checklist).filter(([_, v]) => v === 'FALHA').map(([k]) => k);
      const res = await gasApi.saveVistoria({
        ...formData, tipo_vistoria: tipoVistoria, 
        checklist_resumo: falhas.length ? `FALHA EM: ${falhas.join(', ')}` : "SEM ALTERAÇÕES",
        fotos_vistoria: fotos, proteger_ocorrencia: protegerFotos
      });
      if (res.status === 'success') onBack();
    } finally { setLoading(false); }
  };

  return (
    <div className="min-h-screen bg-slate-50 pb-10 font-sans">
      <header className="bg-slate-900 text-white p-5 sticky top-0 z-50 flex items-center justify-between">
        <button onClick={onBack}><ArrowLeft /></button>
        <span className="font-black text-xs uppercase tracking-widest text-blue-400">Vistoria 1º BPM</span>
        <div className="w-6" />
      </header>

      <main className="max-w-xl mx-auto p-4 space-y-4">
        <div className="flex bg-slate-200 p-1 rounded-2xl">
          <button onClick={() => setTipoVistoria('ENTRADA')} className={`flex-1 py-3 rounded-xl font-black text-[10px] ${tipoVistoria === 'ENTRADA' ? 'bg-green-600 text-white' : ''}`}>ENTRADA</button>
          <button onClick={() => setTipoVistoria('SAÍDA')} className={`flex-1 py-3 rounded-xl font-black text-[10px] ${tipoVistoria === 'SAÍDA' ? 'bg-orange-500 text-white' : ''}`}>SAÍDA</button>
        </div>

        {step === 1 ? (
          <div className="space-y-4 animate-in slide-in-from-bottom-4">
            <div className="bg-white p-6 rounded-[2.5rem] shadow-sm border space-y-4">
              <select className="vtr-input w-full" value={formData.prefixo_vtr} onChange={(e) => handleVtrChange(e.target.value)}>
                <option value="">SELECIONE A VTR</option>
                {viaturas.map(v => <option key={v.Prefixo || v.PREFIXO} value={v.Prefixo || v.PREFIXO}>{v.Prefixo || v.PREFIXO}</option>)}
              </select>
              <input type="number" className="vtr-input w-full" placeholder="KM ATUAL" value={formData.hodometro} onChange={(e) => setFormData({...formData, hodometro: e.target.value})} />
              
              {['motorista', 'comandante'].map(cargo => (
                <div key={cargo} className="p-3 bg-slate-50 rounded-2xl border">
                  <input type="tel" placeholder={`RE ${cargo.toUpperCase()}`} className="vtr-input !bg-white mb-2" value={formData[`${cargo}_re`]} onChange={(e) => handleMatriculaChange(e.target.value, cargo)} />
                  <input type="text" placeholder="NOME" className="vtr-input !bg-white !py-2 text-[10px]" value={formData[`${cargo}_nome`]} readOnly />
                </div>
              ))}

              {precisaTrocaOleo && (
                <button onClick={() => setModalOleoOpen(true)} className="w-full bg-orange-50 border-2 border-orange-500 p-4 rounded-2xl flex items-center gap-3">
                  <Wrench className="text-orange-500 animate-bounce" />
                  <div className="text-left text-[10px] font-black text-orange-700 uppercase">Troca de Óleo Necessária</div>
                </button>
              )}
            </div>
            <button onClick={() => setStep(2)} disabled={isFormIncompleto} className="btn-tatico w-full disabled:opacity-50">PRÓXIMO</button>
          </div>
        ) : (
          <div className="space-y-4 animate-in slide-in-from-right-4">
             <div onClick={() => setProtegerFotos(!protegerFotos)} className={`p-4 rounded-2xl border-2 flex items-center gap-4 cursor-pointer ${protegerFotos ? 'bg-blue-600 text-white' : 'bg-white'}`}>
              {protegerFotos ? <Lock size={20} /> : <Unlock size={20} />}
              <span className="font-black text-[10px]">PROTEGER IMAGENS</span>
            </div>
            
            {Object.keys(checklist).map(item => (
              <div key={item} onClick={() => setChecklist(prev => ({...prev, [item]: prev[item] === 'OK' ? 'FALHA' : 'OK'}))} className={`flex justify-between p-4 rounded-xl border ${checklist[item] === 'FALHA' ? 'bg-red-50 border-red-500' : 'bg-white'}`}>
                <span className="text-[10px] font-black uppercase">{item}</span>
                <span className={`text-[10px] font-bold ${checklist[item] === 'OK' ? 'text-green-600' : 'text-red-600'}`}>{checklist[item]}</span>
              </div>
            ))}

            <label className="flex items-center gap-3 p-4 bg-white rounded-2xl border">
              <input type="checkbox" checked={formData.termo_aceite} onChange={e => setFormData({...formData, termo_aceite: e.target.checked})} />
              <span className="text-[9px] font-black uppercase">Confirmo as informações</span>
            </label>

            <div className="flex gap-2">
              <button onClick={() => setStep(1)} className="flex-1 p-4 font-black">VOLTAR</button>
              <button onClick={handleFinalizar} disabled={!formData.termo_aceite || loading} className="flex-[2] btn-tatico">
                {loading ? <Loader2 className="animate-spin mx-auto"/> : "FINALIZAR"}
              </button>
            </div>
          </div>
        )}
      </main>
      <ModalTrocaOleo isOpen={modalOleoOpen} onClose={() => setModalOleoOpen(false)} vtr={viaturas.find(v => toStr(v.Prefixo || v.PREFIXO) === toStr(formData.prefixo_vtr))} kmEntrada={formData.hodometro} user={user} />
    </div>
  );
};

export default Vistoria;
