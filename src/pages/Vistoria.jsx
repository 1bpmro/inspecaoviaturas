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
        alert("Troca de óleo registrada com sucesso!");
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
        
        <div className="space-y-3">
          <div>
            <label className="text-[9px] font-black text-slate-400 ml-2 uppercase">Data da Troca</label>
            <input type="date" className="vtr-input w-full" value={dadosOleo.data_troca} onChange={e => setDadosOleo({...dadosOleo, data_troca: e.target.value})} />
          </div>
          <div>
            <label className="text-[9px] font-black text-slate-400 ml-2 uppercase">KM da Próxima Troca (Etiqueta)</label>
            <input type="number" className="vtr-input w-full" placeholder="KM DA ETIQUETA" value={dadosOleo.km_troca} onChange={e => setDadosOleo({...dadosOleo, km_troca: e.target.value})} />
          </div>
        </div>
        
        <div className="p-4 border-2 border-dashed rounded-3xl bg-slate-50 dark:bg-slate-800 text-center my-4">
          {fotoOleo ? (
            <div className="relative aspect-video rounded-xl overflow-hidden">
              <img src={fotoOleo} className="w-full h-full object-cover" alt="Etiqueta" />
              <button onClick={() => setFotoOleo(null)} className="absolute top-2 right-2 bg-red-600 text-white p-2 rounded-full shadow-lg"><X size={16}/></button>
            </div>
          ) : (
            <label className="cursor-pointer block py-4">
              {uploading ? <Loader2 className="animate-spin mx-auto text-orange-500" /> : 
                <><Plus className="mx-auto text-orange-500 mb-1" /><span className="text-[10px] font-black text-slate-500 uppercase">Foto da Etiqueta</span></>
              }
              <input type="file" accept="image/*" capture="environment" className="hidden" onChange={async (e) => {
                const file = e.target.files[0]; if (!file) return;
                setUploading(true);
                try {
                    const compressed = await imageCompression(file, { maxSizeMB: 0.2, maxWidthOrHeight: 800 });
                    const reader = new FileReader(); reader.readAsDataURL(compressed);
                    reader.onloadend = () => { setFotoOleo(reader.result); setUploading(false); };
                } catch (err) { setUploading(false); alert("Erro ao comprimir imagem"); }
              }} />
            </label>
          )}
        </div>

        <div className="flex gap-2">
          <button onClick={onClose} className="flex-1 font-black text-slate-400 uppercase text-xs">Sair</button>
          <button onClick={handleSalvarOleo} disabled={loading} className="flex-[2] bg-orange-500 text-white p-4 rounded-2xl font-black shadow-lg">
            {loading ? <Loader2 className="animate-spin mx-auto"/> : "CONFIRMAR TROCA"}
          </button>
        </div>
      </div>
    </div>
  );
};

// --- CONSTANTES ---
const ITENS_ENTRADA = ["Documento da Viatura", "Estepe", "Chave de Roda", "Macaco", "Triângulo", "Extintor", "Nível de Água", "Porta Traseira", "Porta Dianteira", "Pneus", "Capô", "Cinto", "Paralama Dianteiro", "Paralama Traseiro", "Parachoque Dianteiro", "Parachoque Traseiro", "Lanternas", "Caçamba", "Vidros e Portas", "Retrovisor Externo", "Retrovisor Interno", "Maçanetas", "Para-brisas", "Sirene", "Giroscópio", "Rádio", "Painel de Instrumentos", "Bancos", "Forro Interno", "Tapetes", "Protetor Dianteiro", "Regulador dos Bancos"];
const MAPA_FALHAS_SAIDA = { "Viatura Entregue Limpa": "VIATURA ENTREGUE SUJA", "Viatura em Condições de Uso": "VIATURA SEM CONDIÇÕES DE USO", "Avarias Constatadas": "AVARIAS CONSTATADAS", "Limpeza Interna": "SEM LIMPEZA INTERNA", "Limpeza Externa": "SEM LIMPEZA EXTERNA", "Pertences da Guarnição Retirados": "ENCONTRADO PERTENCES DA GUARNIÇÃO" };
const ITENS_SAIDA = Object.keys(MAPA_FALHAS_SAIDA);
const TIPOS_SERVICO = ["Patrulhamento Ordinário", "Operação", "Força Tática", "Patrulha Comunitária", "Patrulhamento Rural", "Outro"];

// --- COMPONENTE PRINCIPAL ---
const Vistoria = ({ onBack, frotaInicial = [] }) => { 
  const { user } = useAuth();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [viaturas, setViaturas] = useState(frotaInicial);
  const [efetivoLocal, setEfetivoLocal] = useState([]);
  const [tipoVistoria, setTipoVistoria] = useState('ENTRADA');
  const [fotos, setFotos] = useState([]);
  const [modalOleoOpen, setModalOleoOpen] = useState(false);
  
  const [formData, setFormData] = useState({
    prefixo_vtr: '', placa_vtr: '', hodometro: '', videomonitoramento: '', 
    tipo_servico: '', motorista_re: '', motorista_nome: '', motorista_unidade: '',
    comandante_re: '', comandante_nome: '', comandante_unidade: '',
    patrulheiro_re: '', patrulheiro_nome: '', patrulheiro_unidade: '',
    termo_aceite: false
  });

  const [checklist, setChecklist] = useState({});

  const toStr = (val) => (val !== undefined && val !== null ? String(val).trim() : '');

  // Verifica se há falhas no checklist
  const temAvaria = useMemo(() => {
    return Object.values(checklist).includes('FALHA');
  }, [checklist]);

  useEffect(() => {
    const itens = tipoVistoria === 'ENTRADA' ? ITENS_ENTRADA : ITENS_SAIDA;
    const novoChecklist = itens.reduce((acc, item) => ({ ...acc, [item]: 'OK' }), {});
    setChecklist(novoChecklist);
    // Resetar aceite ao mudar tipo
    setFormData(prev => ({ ...prev, termo_aceite: false }));
  }, [tipoVistoria]);

  const vtrSelecionada = useMemo(() => {
    return viaturas.find(v => toStr(v.Prefixo || v.PREFIXO) === toStr(formData.prefixo_vtr));
  }, [formData.prefixo_vtr, viaturas]);

  const precisaTrocaOleo = useMemo(() => {
    if (!vtrSelecionada || tipoVistoria !== 'ENTRADA' || !formData.hodometro) return false;
    const kmUltima = Number(vtrSelecionada.KM_UltimaTroca || vtrSelecionada.KM_ULTIMATROCA) || 0;
    const dataUltimaStr = vtrSelecionada.Data_UltimaTroca || vtrSelecionada.DATA_ULTIMATROCA;
    const kmAtual = Number(formData.hodometro);
    if (kmAtual === 0) return false;
    if (!kmUltima) return true;
    if (kmAtual - kmUltima >= 9950) return true;
    if (dataUltimaStr) {
      const diffDays = Math.ceil(Math.abs(new Date() - new Date(dataUltimaStr)) / (1000 * 60 * 60 * 24));
      if (diffDays >= 170) return true;
    }
    return false;
  }, [vtrSelecionada, formData.hodometro, tipoVistoria]);

  useEffect(() => {
    const sincronizar = async () => {
      try {
        const [resVtr, resMil] = await Promise.all([
          viaturas.length === 0 ? gasApi.getViaturas() : Promise.resolve({ status: 'success', data: viaturas }),
          gasApi.getEfetivoCompleto()
        ]);
        if (resVtr.status === 'success') setViaturas(resVtr.data);
        if (resMil.status === 'success') setEfetivoLocal(resMil.data);
      } catch (e) { console.error(e); }
    };
    sincronizar();
  }, []);

  const handleVtrChange = (prefixo) => {
    const vtr = viaturas.find(v => toStr(v.Prefixo || v.PREFIXO) === toStr(prefixo));
    if (!vtr) return;
    setFormData(prev => ({ 
      ...prev, 
      prefixo_vtr: toStr(vtr.Prefixo || vtr.PREFIXO), 
      placa_vtr: toStr(vtr.Placa || vtr.PLACA) 
    }));
  };

  const handleMatriculaChange = (valor, cargo) => {
    let reLimpo = toStr(valor).replace(/\D/g, '');
    setFormData(prev => ({ ...prev, [`${cargo}_re`]: reLimpo }));
    if (reLimpo.length >= 4) {
      const militar = efetivoLocal.find(m => toStr(m.re) === reLimpo);
      if (militar) {
        setFormData(prev => ({
          ...prev,
          [`${cargo}_nome`]: `${militar.patente} ${militar.nome}`.toUpperCase(),
          [`${cargo}_unidade`]: militar.unidade || '1º BPM'
        }));
      } else {
        setFormData(prev => ({ ...prev, [`${cargo}_nome`]: '' }));
      }
    }
  };

  const handleFinalizar = async () => {
    setLoading(true);
    try {
      const payload = { 
        ...formData, 
        tipo_vistoria: tipoVistoria, 
        checklist: JSON.stringify(checklist),
        Links_fotos: fotos, 
        militar_logado: `${user.patente} ${user.nome}`, 
        status_garageiro: "PENDENTE",
        data_hora: new Date().toLocaleString('pt-BR')
      };
      const res = await gasApi.saveVistoria(payload);
      if (res.status === 'success') { alert("Sucesso!"); onBack(); }
    } catch (e) { alert("Erro conexão"); }
    finally { setLoading(false); }
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 pb-10 text-slate-900 dark:text-white">
      <header className="bg-slate-900 text-white p-5 sticky top-0 z-50 border-b-4 border-blue-900 flex items-center justify-between">
        <button onClick={onBack}><ArrowLeft /></button>
        <div className="text-center">
            <h1 className="font-black text-[10px] tracking-widest opacity-50 uppercase">1º BPM - Rondon</h1>
            <p className="text-xs font-bold text-blue-400 uppercase">INSPEÇÃO</p>
        </div>
        <div className="w-8" />
      </header>

      <main className="max-w-xl mx-auto p-4 space-y-6">
        <div className="flex bg-slate-200 dark:bg-slate-800 p-1 rounded-2xl shadow-inner">
          <button onClick={() => setTipoVistoria('ENTRADA')} className={`flex-1 py-3 rounded-xl font-black text-[10px] transition-all ${tipoVistoria === 'ENTRADA' ? 'bg-green-600 text-white shadow-lg' : 'text-slate-500'}`}>ENTRADA</button>
          <button onClick={() => setTipoVistoria('SAÍDA')} className={`flex-1 py-3 rounded-xl font-black text-[10px] transition-all ${tipoVistoria === 'SAÍDA' ? 'bg-orange-500 text-white shadow-lg' : 'text-slate-500'}`}>SAÍDA</button>
        </div>

        <div className="bg-slate-900 rounded-3xl p-5 shadow-2xl border-b-4 border-blue-600">
          <div className="flex items-center gap-2 mb-4 border-b border-white/10 pb-2">
            <Users className="text-blue-400" size={18} />
            <span className="text-[10px] font-black text-white tracking-widest uppercase">Guarnição Atual</span>
          </div>
          <div className="space-y-2">
            {[{ label: 'MOT', cargo: 'motorista' }, { label: 'CMD', cargo: 'comandante' }, { label: 'PTR', cargo: 'patrulheiro' }].map(m => (
              <div key={m.label} className="flex items-center justify-between">
                <span className="text-[9px] font-black text-blue-500 w-8">{m.label}</span>
                <div className={`flex-1 ml-2 h-8 flex items-center px-3 rounded-lg border transition-colors ${formData[`${m.cargo}_nome`] ? 'bg-blue-900/30 border-blue-500/50' : 'bg-white/5 border-dashed border-white/20'}`}>
                  <span className={`text-[10px] font-bold uppercase truncate ${formData[`${m.cargo}_nome`] ? 'text-white' : 'text-white/20 italic'}`}>
                    {formData[`${m.cargo}_nome`] || `Aguardando RE...`}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {step === 1 ? (
          <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4">
            <section className="bg-white dark:bg-slate-900 rounded-[2.5rem] p-6 shadow-sm border border-slate-200 dark:border-slate-800 space-y-4">
                <select className="vtr-input w-full !py-4" value={formData.prefixo_vtr} onChange={e => handleVtrChange(e.target.value)}>
                  <option value="">SELECIONE A VTR</option>
                  {viaturas.map(v => <option key={v.Prefixo || v.PREFIXO} value={v.Prefixo || v.PREFIXO}>{v.Prefixo || v.PREFIXO}</option>)}
                </select>

                <div className="grid grid-cols-2 gap-3">
                    <input type="number" className="vtr-input w-full" placeholder="KM ATUAL" value={formData.hodometro} onChange={e => setFormData({...formData, hodometro: e.target.value})} />
                    <select className="vtr-input w-full" value={formData.videomonitoramento} onChange={e => setFormData({...formData, videomonitoramento: e.target.value})}>
                        <option value="">MONITORAMENTO</option>
                        <option value="OPERANTE">OPERANTE</option>
                        <option value="INOPERANTE">INOPERANTE</option>
                        <option value="NÃO POSSUI">NÃO POSSUI</option>
                    </select>
                </div>

                <select className="vtr-input w-full" value={formData.tipo_servico} onChange={e => setFormData({...formData, tipo_servico: e.target.value})}>
                    <option value="">TIPO DE SERVIÇO</option>
                    {TIPOS_SERVICO.map(t => <option key={t} value={t}>{t}</option>)}
                </select>

                {precisaTrocaOleo && (
                  <button onClick={() => setModalOleoOpen(true)} className="w-full bg-orange-50 border-2 border-orange-500 p-4 rounded-2xl flex items-center justify-between animate-pulse shadow-md">
                    <div className="flex items-center gap-3 text-orange-700">
                      <Wrench size={20} />
                      <div className="text-left">
                        <p className="text-[10px] font-black uppercase">Troca de Óleo Necessária</p>
                        <p className="text-[8px] font-bold opacity-70">KM OU TEMPO LIMITE ATINGIDO</p>
                      </div>
                    </div>
                    <Plus size={18} className="text-orange-500" />
                  </button>
                )}

                <div className="space-y-3 pt-2">
                  {['motorista', 'comandante', 'patrulheiro'].map(cargo => (
                    <input key={cargo} placeholder={`RE ${cargo.toUpperCase()}`} className="vtr-input w-full" value={formData[`${cargo}_re`]} onChange={e => handleMatriculaChange(e.target.value, cargo)} />
                  ))}
                </div>
            </section>
            
            <button 
              onClick={() => setStep(2)} 
              disabled={!formData.prefixo_vtr || !formData.motorista_nome || !formData.hodometro}
              className="btn-tatico w-full disabled:opacity-30"
            >
              PRÓXIMO <ChevronRight size={18}/>
            </button>
          </div>
      ) : (
      
        <div className="space-y-4 animate-in slide-in-from-right-4">
        {/* --- PASSO 2: CHECKLIST E FOTOS DE AVARIAS --- */}
  
  {/* LISTA DE ITENS */}
  <div className="grid gap-2">
    {(tipoVistoria === 'ENTRADA' ? ITENS_ENTRADA : ITENS_SAIDA).map(item => (
      <div 
        key={item} 
        onClick={() => setChecklist(p => ({...p, [item]: p[item] === 'OK' ? 'FALHA' : 'OK'}))} 
        className={`p-4 rounded-2xl border-2 flex justify-between items-center transition-all active:scale-95 cursor-pointer ${
          checklist[item] === 'FALHA' 
            ? 'border-red-500 bg-red-50 dark:bg-red-900/20 shadow-inner' 
            : 'border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm'
        }`}
      >
        <span className="text-[10px] font-black uppercase tracking-tight">{item}</span>
        <div className="flex items-center gap-2">
          {checklist[item] === 'FALHA' && <AlertTriangle size={14} className="text-red-500 animate-pulse" />}
          <span className={`px-3 py-1 rounded-lg font-black text-[10px] ${
            checklist[item] === 'OK' 
              ? (tipoVistoria === 'ENTRADA' ? 'bg-green-100 text-green-700' : 'bg-blue-600 text-white') 
              : 'bg-red-600 text-white'
          }`}>
            {checklist[item] === 'OK' ? (tipoVistoria === 'ENTRADA' ? 'OK' : 'CONFIRMO') : 'FALHA'}
          </span>
        </div>
      </div>
    ))}
  </div>

  {/* SEÇÃO DE FOTOS (SÓ APARECE SE TIVER FALHA) */}
  {temAvaria && (
    <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] p-6 border-2 border-red-500 shadow-lg space-y-4">
      <div className="text-center">
        <AlertTriangle size={24} className="mx-auto text-red-600 mb-1" />
        <h3 className="text-[10px] font-black text-red-600 uppercase">Avarias Detectadas</h3>
        <p className="text-[8px] font-bold text-slate-400 uppercase">É obrigatório anexar fotos dos danos</p>
      </div>

      <div className="grid grid-cols-3 gap-3">
        {fotos.map((foto, idx) => (
          <div key={idx} className="relative aspect-square rounded-2xl overflow-hidden border-2 border-slate-100">
            <img src={foto} className="w-full h-full object-cover" />
            <button 
              onClick={() => setFotos(fotos.filter((_, i) => i !== idx))}
              className="absolute top-1 right-1 bg-red-600 text-white p-1 rounded-full shadow-lg"
            >
              <X size={12}/>
            </button>
          </div>
        ))}
        
        {fotos.length < 6 && (
          <label className="aspect-square flex flex-col items-center justify-center bg-slate-50 dark:bg-slate-800 rounded-2xl border-2 border-dashed border-slate-300 cursor-pointer hover:bg-slate-100 transition-all">
            <Plus className="text-slate-400" size={24} />
            <span className="text-[8px] font-black text-slate-400 uppercase mt-1">Foto</span>
            <input 
              type="file" accept="image/*" capture="environment" className="hidden" 
              onChange={async (e) => {
                const file = e.target.files[0];
                if (!file) return;
                const compressed = await imageCompression(file, { maxSizeMB: 0.2, maxWidthOrHeight: 800 });
                const reader = new FileReader();
                reader.readAsDataURL(compressed);
                reader.onloadend = () => setFotos(p => [...p, reader.result]);
              }} 
            />
          </label>
        )}
      </div>
    </div>
  )}

  {/* TERMO DE ACEITE (O QUE VOCÊ PEDIU) */}
  <label className="flex items-start gap-4 p-5 bg-white dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-800 rounded-3xl cursor-pointer shadow-sm hover:border-blue-300 transition-all mt-6">
    <input 
      type="checkbox" 
      className="w-6 h-6 rounded border-slate-300 text-blue-600 mt-1" 
      checked={formData.termo_aceite} 
      onChange={(e) => setFormData({...formData, termo_aceite: e.target.checked})} 
    />
    <p className="text-[10px] font-black uppercase text-slate-600 dark:text-slate-400 leading-tight text-justify">
      EU, <span className="text-slate-900 dark:text-white underline">{formData.motorista_nome || 'MOTORISTA'}</span>, 
      {tipoVistoria === 'ENTRADA' ? (
        <>&nbsp;INFORMO ESTAR ME RESPONSABILIZANDO PELA VIATURA <span className="text-blue-600 font-black">{formData.prefixo_vtr || '_______'}</span>, CIENTE DO ESTADO DE CONSERVAÇÃO DOS ITENS ACIMA VISTORIADOS.</>
      ) : (
        <>&nbsp;ESTOU REALIZANDO A ENTREGA DA VIATURA <span className="text-orange-600 font-black">{formData.prefixo_vtr || '_______'}</span>, ATESTANDO QUE O ESTADO DE LIMPEZA E CONSERVAÇÃO CONDIZ COM O CHECKLIST.</>
      )}
    </p>
  </label>
  
  <div className="flex gap-2">
    <button onClick={() => setStep(1)} className="flex-1 bg-white p-5 rounded-2xl font-black border-2 border-slate-200 text-slate-900 hover:bg-slate-50 transition-colors uppercase text-xs">Voltar</button>
    <button 
      onClick={handleFinalizar} 
      disabled={!formData.termo_aceite || loading || (temAvaria && fotos.length === 0)} 
      className="btn-tatico flex-[2] disabled:bg-slate-300 disabled:text-slate-500 shadow-lg active:scale-95 transition-all"
    >
      {loading ? <Loader2 className="animate-spin mx-auto"/> : "FINALIZAR ENVIO"}
    </button>
  </div>
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
