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

const ITENS_SAIDA = Object.keys(MAPA_FALHAS_SAIDA);
const TIPOS_SERVICO = ["Patrulhamento Ordinário", "Operação", "Força Tática", "Patrulha Comunitária", "Patrulhamento Rural", "Outro"];
const OPCOES_COMUNITARIA = ["Patrulha Comercial", "Base Móvel", "Patrulha Escolar"];

// Configuração padrão de compressão para evitar erros de upload
const COMPRESSION_OPTIONS = {
  maxSizeMB: 0.1,          // Reduzido para 100kb para garantir sucesso no GAS
  maxWidthOrHeight: 1024,
  useWebWorker: true,
  fileType: 'image/jpeg'
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

  if (!isOpen || !vtr) return null;

  const handleSalvar = async () => {
    const kmTrocaNum = Number(dadosOleo.km_troca);
    if (!kmTrocaNum) return alert("Por favor, insira o KM da troca.");
    if (!fotoOleo) return alert("A foto do comprovante/etiqueta é obrigatória.");

    setLoading(true);
    try {
      const payload = {
        prefixo: vtr.Prefixo || vtr.PREFIXO,
        data_troca: dadosOleo.data_troca,
        km_troca: kmTrocaNum,
        foto: fotoOleo,
        militar_re: user?.re || '',
        militar_nome: `${user?.patente || ''} ${user?.nome || ''}`.trim()
      };
      const res = await gasApi.registrarTrocaOleo(payload);
      if (res.status === 'success') {
        alert("Troca de óleo registrada com sucesso!");
        onClose();
      } else { alert("Erro ao registrar: " + res.message); }
    } catch (e) { alert("Erro de conexão ao salvar."); } finally { setLoading(false); }
  };

  return (
    <div className="fixed inset-0 z-[100] bg-slate-900/95 backdrop-blur-md flex items-center justify-center p-4">
      <div className="bg-white w-full max-w-md rounded-[2.5rem] p-6 space-y-4 border-t-8 border-orange-500 shadow-2xl animate-in zoom-in-95 duration-200">
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
                  <span className="text-[10px] font-black text-slate-500 uppercase">Foto da Etiqueta / Recibo</span>
                </>
              )}
         <input type="file" accept="image/*" capture="environment" className="hidden" onChange={async (e) => {
  const file = e.target.files[0]; 
  if (!file) return;
  setUploading(true);
  try {
    // 1. Comprime o arquivo e força JPEG
    const compressedFile = await imageCompression(file, COMPRESSION_OPTIONS);
    
    // 2. Converte para Base64 de forma limpa
    const base64 = await imageCompression.getDataUrlFromFile(compressedFile);
    
    setFotos(p => [...p, base64]); 
    setUploading(false); 
  } catch (err) { 
    console.error("Erro no processamento da imagem:", err);
    alert("Erro ao processar foto. Tente novamente.");
    setUploading(false); 
  }
}} />
            </label>
          )}
        </div>
        <div className="flex gap-2 pt-2">
          <button onClick={onClose} className="flex-1 font-black text-slate-400 uppercase text-xs">Sair</button>
          <button onClick={handleSalvar} disabled={loading || uploading} className="flex-[2] bg-orange-500 text-white p-4 rounded-2xl font-black shadow-lg">
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
  const [reNaoEncontrado, setReNaoEncontrado] = useState({ motorista: false, comandante: false, patrulheiro: false });

  const [formData, setFormData] = useState({
    prefixo_vtr: '', placa_vtr: '', hodometro: '', videomonitoramento: '', 
    tipo_servico: '', servico_detalhe: '',
    motorista_re: '', motorista_nome: '', motorista_unidade: '',
    comandante_re: '', comandante_nome: '', comandante_unidade: '',
    patrulheiro_re: '', patrulheiro_nome: '', patrulheiro_unidade: '',
    termo_aceite: false
  });

  const [checklist, setChecklist] = useState({});

  const toStr = useCallback((v) => (v !== undefined && v !== null ? String(v) : ''), []);

  const vtrSelecionada = useMemo(() => 
    viaturas.find(v => toStr(v.Prefixo || v.PREFIXO) === toStr(formData.prefixo_vtr)), [formData.prefixo_vtr, viaturas, toStr]);

  const precisaTrocaOleo = useMemo(() => {
    if (!vtrSelecionada || tipoVistoria !== 'ENTRADA') return false;
    const kmTroca = Number(vtrSelecionada.ProximaTrocaOleo || vtrSelecionada.PROXIMA_TROCA || vtrSelecionada.PROXIMA_TROCA_OLEO) || 0;
    const kmAtual = Number(formData.hodometro) || 0;
    return kmAtual > 0 && kmTroca > 0 && (kmTroca - kmAtual <= 500);
  }, [vtrSelecionada, formData.hodometro, tipoVistoria]);

  const kmInvalido = useMemo(() => {
    const kmAt = Number(formData.hodometro);
    return tipoVistoria === 'SAÍDA' && kmAt > 0 && kmAt <= kmReferencia;
  }, [formData.hodometro, kmReferencia, tipoVistoria]);

  const isFormIncompleto = useMemo(() => {
    const servicosEsp = ['Operação', 'Outro', 'Patrulha Comunitária'];
    const servicoIncomp = !formData.tipo_servico || (servicosEsp.includes(formData.tipo_servico) && !formData.servico_detalhe);
    return !formData.prefixo_vtr || servicoIncomp || !formData.hodometro || !formData.motorista_nome || !formData.comandante_nome || kmInvalido;
  }, [formData, kmInvalido]);

  useEffect(() => {
    const itens = tipoVistoria === 'ENTRADA' ? GRUPOS_ENTRADA.flatMap(g => g.itens) : ITENS_SAIDA;
    setChecklist(itens.reduce((acc, i) => ({ ...acc, [i]: 'OK' }), {}));
  }, [tipoVistoria]);

  useEffect(() => {
    let isMounted = true;
    const sync = async () => {
      if (viaturas.length === 0) setLoading(true);
      try {
        const [resVtr, resMil] = await Promise.all([
          viaturas.length === 0 ? gasApi.getViaturas() : Promise.resolve({ status: 'success', data: viaturas }),
          gasApi.getEfetivoCompleto()
        ]);
        if (isMounted) {
          if (resVtr.status === 'success') setViaturas(resVtr.data);
          if (resMil.status === 'success') setEfetivoLocal(resMil.data);
        }
      } catch (e) { console.error(e); } finally { if (isMounted) setLoading(false); }
    };
    sync();
    return () => { isMounted = false; };
  }, [viaturas.length]);

  const handleMatriculaChange = (valor, cargo) => {
    const reLimpo = toStr(valor).replace(/\D/g, '');
    setFormData(p => ({ ...p, [`${cargo}_re`]: reLimpo }));
    if (reLimpo.length >= 4) {
      const reBusca = (reLimpo.length <= 6 && !reLimpo.startsWith("1000")) ? "1000" + reLimpo : reLimpo;
      const m = efetivoLocal.find(mil => toStr(mil.re) === reBusca || toStr(mil.re) === reLimpo);
      if (m) {
        setFormData(p => ({ ...p, [`${cargo}_re`]: toStr(m.re), [`${cargo}_nome`]: `${m.patente} ${m.nome}`, [`${cargo}_unidade`]: m.unidade || '1º BPM' }));
        setReNaoEncontrado(p => ({ ...p, [cargo]: false }));
      } else {
        setFormData(p => ({ ...p, [`${cargo}_nome`]: '', [`${cargo}_unidade`]: '' }));
        setReNaoEncontrado(p => ({ ...p, [cargo]: true }));
      }
    } else { setReNaoEncontrado(p => ({ ...p, [cargo]: false })); }
  };

  const handleVtrChange = (prefixo) => {
    const vtr = viaturas.find(v => toStr(v.Prefixo || v.PREFIXO) === toStr(prefixo));
    if (!vtr) return;
    const getV = (k) => vtr[k] || vtr[k.toUpperCase()] || '';
    const ultKM = getV('UltimoKM');
    setKmReferencia(Number(ultKM) || 0);

    if (tipoVistoria === 'SAÍDA') {
      setFormData(p => ({
        ...p, prefixo_vtr: toStr(vtr.Prefixo || vtr.PREFIXO), placa_vtr: toStr(vtr.Placa || vtr.PLACA),
        tipo_servico: toStr(getV('UltimoTipoServico')), servico_detalhe: toStr(getV('UltimoServicoDetalhe')),
        hodometro: toStr(ultKM), motorista_re: toStr(getV('UltimoMotoristaRE')), comandante_re: toStr(getV('UltimoComandanteRE')),
        patrulheiro_re: toStr(getV('UltimoPatrulheiroRE')), motorista_nome: toStr(getV('UltimoMotoristaNome')),
        comandante_nome: toStr(getV('UltimoComandanteNome')), patrulheiro_nome: toStr(getV('UltimoPatrulheiroNome')),
      }));
    } else {
      setFormData(p => ({
        ...p, prefixo_vtr: toStr(vtr.Prefixo || vtr.PREFIXO), placa_vtr: toStr(vtr.Placa || vtr.PLACA), hodometro: '',
        motorista_re: '', motorista_nome: '', motorista_unidade: '', comandante_re: '', comandante_nome: '', 
        comandante_unidade: '', patrulheiro_re: '', patrulheiro_nome: '', patrulheiro_unidade: ''
      }));
      setReNaoEncontrado({ motorista: false, comandante: false, patrulheiro: false });
    }
  };

  const handleFinalizar = async () => {
    if (Object.values(checklist).includes('FALHA') && fotos.length === 0) return alert("Fotos obrigatórias para avarias.");
    if (!window.confirm("Confirmar envio?")) return;
    
    setLoading(true);
    try {
      const falhas = Object.entries(checklist).filter(([_, s]) => s === 'FALHA').map(([i]) => i);
      const resumo = falhas.length === 0 ? "SEM ALTERAÇÕES" : tipoVistoria === 'ENTRADA' ? `FALHA EM: ${falhas.join(', ')}` : falhas.map(i => MAPA_FALHAS_SAIDA[i] || i).join(', ');
      
      const res = await gasApi.saveVistoria({ 
        ...formData, 
        tipo_vistoria: tipoVistoria, 
        checklist_resumo: resumo, 
        fotos_vistoria: fotos, 
        proteger_ocorrencia: protegerFotos, 
        militar_logado: `${user.patente} ${user.nome}`, 
        status_garageiro: "PENDENTE" 
      });

      if (res.status === 'success') { 
        alert("Vistoria enviada com sucesso!"); 
        onBack(); 
      } else { 
        alert("Erro no Servidor: " + res.message); 
      }
    } catch (e) { 
      console.error("Erro no envio da vistoria:", e);
      alert("Erro de conexão. Verifique sua internet e tente novamente."); 
    } finally { 
      setLoading(false); 
    }
  };

  const CardGuarnicao = ({ compacto = false }) => (
    <div className={`${compacto ? 'bg-slate-800 p-3 rounded-2xl' : 'bg-slate-900 p-5 rounded-3xl'} mb-4 border-b-4 border-blue-600 shadow-inner`}>
      <div className={`flex items-center gap-2 border-b border-white/10 ${compacto ? 'mb-2 pb-1' : 'mb-4 pb-2'}`}>
        <Users className="text-blue-400" size={compacto ? 14 : 18} />
        <span className={`${compacto ? 'text-[8px]' : 'text-[10px]'} font-black text-white tracking-widest uppercase`}>Guarnição Atual</span>
      </div>
      <div className="space-y-2">
        {[{ l: 'MOT', c: 'motorista' }, { l: 'CMD', c: 'comandante' }, { l: 'PTR', c: 'patrulheiro' }].map(m => (
          <div key={m.l} className="flex items-center">
            <span className={`${compacto ? 'text-[7px]' : 'text-[9px]'} font-black text-blue-500 w-8`}>{m.l}</span>
            <div className={`flex-1 ml-2 ${compacto ? 'h-6' : 'h-8'} flex items-center px-3 rounded-lg border ${formData[`${m.c}_nome`] ? 'bg-blue-900/30 border-blue-500/50' : 'bg-white/5 border-dashed border-white/20'}`}>
              <span className={`${compacto ? 'text-[8px]' : 'text-[10px]'} font-bold uppercase truncate ${formData[`${m.c}_nome`] ? 'text-white' : 'text-white/20 italic'}`}>
                {formData[`${m.c}_nome`] || `---`}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-50 pb-10 text-slate-900">
      <header className="bg-slate-900 text-white p-5 sticky top-0 z-50 border-b-4 border-blue-900">
        <div className="max-w-xl mx-auto flex items-center justify-between">
          <button onClick={onBack} className="p-2 bg-white/10 rounded-full"><ArrowLeft size={24}/></button>
          <div className="text-center">
            <h1 className="font-black text-[10px] tracking-widest opacity-50 uppercase">1º BPM - Rondon</h1>
            <p className="text-xs font-bold text-blue-400 uppercase">Vistoria de Viatura</p>
          </div>
          <div className="w-10" />
        </div>
      </header>

      <main className="max-w-xl mx-auto p-4 space-y-6">
        <div className="flex bg-slate-200 p-1 rounded-2xl shadow-inner">
          <button onClick={() => setTipoVistoria('ENTRADA')} className={`flex-1 py-3 rounded-xl font-black text-[10px] ${tipoVistoria === 'ENTRADA' ? 'bg-green-600 text-white shadow-lg' : 'text-slate-500'}`}>ENTRADA</button>
          <button onClick={() => setTipoVistoria('SAÍDA')} className={`flex-1 py-3 rounded-xl font-black text-[10px] ${tipoVistoria === 'SAÍDA' ? 'bg-orange-500 text-white shadow-lg' : 'text-slate-500'}`}>SAÍDA</button>
        </div>

        {step === 1 ? (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-300">
            <section className="bg-white rounded-[2.5rem] p-6 shadow-sm border border-slate-200 space-y-5">
              <CardGuarnicao />
              <div className="grid grid-cols-2 gap-3">
                <select className="vtr-input !py-4" value={formData.prefixo_vtr} onChange={(e) => handleVtrChange(e.target.value)}>
                  <option value="">SELECIONE A VTR</option>
                  {(tipoVistoria === 'ENTRADA' 
                    ? viaturas.filter(v => String(v.Status || v.STATUS).toUpperCase() === 'DISPONÍVEL') 
                    : viaturas.filter(v => String(v.Status || v.STATUS).toUpperCase() === 'EM SERVIÇO')
                  ).map(v => (
                    <option key={v.Prefixo || v.PREFIXO} value={v.Prefixo || v.PREFIXO}>{v.Prefixo || v.PREFIXO}</option>
                  ))}
                </select>
                <select className="vtr-input !py-4" value={formData.tipo_servico} onChange={(e) => setFormData({...formData, tipo_servico: e.target.value, servico_detalhe: ''})}>
                  <option value="">TIPO DE SERVIÇO</option>
                  {TIPOS_SERVICO.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>

              {['Operação', 'Outro', 'Patrulha Comunitária'].includes(formData.tipo_servico) && (
                <div className="animate-in zoom-in-95">
                  {formData.tipo_servico === 'Patrulha Comunitária' ? (
                    <select className="vtr-input !bg-blue-50" value={formData.servico_detalhe} onChange={(e) => setFormData({...formData, servico_detalhe: e.target.value})}>
                      <option value="">MODALIDADE</option>
                      {OPCOES_COMUNITARIA.map(o => <option key={o} value={o}>{o}</option>)}
                    </select>
                  ) : (
                    <input type="text" className="vtr-input !bg-blue-50 uppercase" placeholder="DETALHE DO SERVIÇO" value={formData.servico_detalhe} onChange={(e) => setFormData({...formData, servico_detalhe: e.target.value.toUpperCase()})} />
                  )}
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div className="relative">
                  <input type="number" className={`vtr-input w-full ${kmInvalido ? '!border-red-500 !bg-red-50' : ''}`} placeholder="KM" value={formData.hodometro} onChange={(e) => setFormData({...formData, hodometro: e.target.value})} />
                  {kmInvalido && <span className="absolute -bottom-4 left-2 text-[8px] text-red-600 font-bold uppercase">KM inválido!</span>}
                </div>
                <select className="vtr-input" value={formData.videomonitoramento} onChange={(e) => setFormData({...formData, videomonitoramento: e.target.value})}>
                  <option value="">VIDEOMONITORAMENTO</option>
                  <option value="OPERANTE">OPERANTE</option>
                  <option value="INOPERANTE">INOPERANTE</option>
                  <option value="INDISPONÍVEL">INDISPONÍVEL</option>
                </select>
              </div>

              {precisaTrocaOleo && (
                <button onClick={() => setModalOleoOpen(true)} className="w-full bg-orange-50 border-2 border-orange-500 p-4 rounded-2xl flex items-center justify-between group animate-pulse">
                  <div className="flex items-center gap-3">
                    <Wrench className="text-orange-500" size={20} />
                    <div className="text-left text-[10px] font-black text-orange-700 uppercase">Troca de Óleo Próxima ou Atrasada</div>
                  </div>
                  <Plus size={16} className="text-orange-500" />
                </button>
              )}

              <div className="space-y-4">
                {['motorista', 'comandante', 'patrulheiro'].map(cargo => (
                  <div key={cargo} className="space-y-2 p-2 rounded-2xl bg-slate-100/50">
                    <input type="tel" placeholder={`MATRÍCULA ${cargo.toUpperCase()}`} className="vtr-input !bg-white" value={formData[`${cargo}_re`]} onChange={(e) => handleMatriculaChange(e.target.value, cargo)} />
                    {reNaoEncontrado[cargo] && (
                      <div className="grid grid-cols-2 gap-2 animate-in slide-in-from-top-2">
                        <input type="text" placeholder="NOME GUERRA" className="vtr-input !bg-blue-50 !py-2 text-[10px]" value={formData[`${cargo}_nome`]} onChange={(e) => setFormData(p => ({ ...p, [`${cargo}_nome`]: e.target.value.toUpperCase() }))} />
                        <input type="text" placeholder="UNIDADE" className="vtr-input !bg-blue-50 !py-2 text-[10px]" value={formData[`${cargo}_unidade`]} onChange={(e) => setFormData(p => ({ ...p, [`${cargo}_unidade`]: e.target.value.toUpperCase() }))} />
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </section>
            <button onClick={() => setStep(2)} disabled={isFormIncompleto} className="btn-tatico w-full disabled:opacity-50 uppercase">Continuar <ChevronRight size={18}/></button>
          </div>
        ) : (
          <div className="space-y-6 animate-in slide-in-from-right-4 duration-300">
            <CardGuarnicao compacto={true} />
            <div onClick={() => setProtegerFotos(!protegerFotos)} className={`p-4 rounded-3xl border-2 flex items-center gap-4 cursor-pointer transition-all ${protegerFotos ? 'bg-blue-600 text-white border-blue-700' : 'bg-white border-slate-200 text-slate-400'}`}>
              {protegerFotos ? <Lock size={20} /> : <Unlock size={20} />}
              <span className="font-black text-[10px] uppercase">Proteger Imagens da Ocorrência</span>
            </div>

            <div className="space-y-4">
              {tipoVistoria === 'ENTRADA' ? GRUPOS_ENTRADA.map(grupo => (
                <div key={grupo.nome} className="bg-white rounded-3xl p-4 shadow-sm border border-slate-200">
                  <div className="flex items-center gap-2 mb-3 text-blue-700">
                    {grupo.icon} <span className="font-black text-[10px] uppercase">{grupo.nome}</span>
                  </div>
                  <div className="grid gap-2">
                    {grupo.itens.map(item => (
                      <div key={item} onClick={() => setChecklist(p => ({...p, [item]: p[item] === 'OK' ? 'FALHA' : 'OK'}))} className={`flex justify-between items-center p-3 rounded-xl border cursor-pointer ${checklist[item] === 'FALHA' ? 'border-red-500 bg-red-50' : 'bg-slate-50/50 border-slate-100'}`}>
                        <span className="text-[11px] font-bold uppercase">{item}</span>
                        <span className={`text-[9px] font-black px-2 py-1 rounded ${checklist[item] === 'OK' ? 'text-green-600' : 'bg-red-600 text-white'}`}>{checklist[item]}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )) : (
                <div className="bg-white rounded-3xl p-4 border border-slate-200 grid gap-2">
                  {ITENS_SAIDA.map(item => (
                    <div key={item} onClick={() => setChecklist(p => ({...p, [item]: p[item] === 'OK' ? 'FALHA' : 'OK'}))} className={`flex justify-between items-center p-3 rounded-xl border cursor-pointer ${checklist[item] === 'FALHA' ? 'border-red-500 bg-red-50' : 'bg-slate-50/50 border-slate-100'}`}>
                      <span className="text-[11px] font-bold uppercase">{item}</span>
                      <span className={`text-[9px] font-black px-2 py-1 rounded ${checklist[item] === 'OK' ? 'text-green-600' : 'bg-red-600 text-white'}`}>{checklist[item]}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className={`p-6 rounded-[2.5rem] border-2 bg-white ${Object.values(checklist).includes('FALHA') && fotos.length === 0 ? 'border-red-500' : 'border-slate-200'}`}>
              <p className="text-[9px] font-black text-slate-400 uppercase mb-3 text-center">Fotos da Vistoria (Máx 4)</p>
              <div className="grid grid-cols-4 gap-2">
                {fotos.map((f, i) => (
                  <div key={i} className="relative aspect-square rounded-2xl overflow-hidden border border-slate-200">
                    <img src={f} className="object-cover w-full h-full" alt="Vistoria" />
                    <button onClick={() => setFotos(p => p.filter((_, idx) => idx !== i))} className="absolute top-1 right-1 bg-red-600 text-white rounded-full p-1"><X size={10}/></button>
                  </div>
                ))}
                {fotos.length < 4 && (
                  <label className="aspect-square rounded-2xl border-2 border-dashed border-slate-300 flex items-center justify-center cursor-pointer bg-slate-50">
                    {uploading ? <Loader2 className="animate-spin text-blue-600" /> : <Plus className="text-slate-400" />}
                    <input type="file" accept="image/*" capture="environment" className="hidden" onChange={async (e) => {
                      const file = e.target.files[0]; 
                      if (!file) return;
                      setUploading(true);
                      try {
                        // Aplica compressão robusta antes de transformar em base64
                        const compressed = await imageCompression(file, COMPRESSION_OPTIONS);
                        const reader = new FileReader(); 
                        reader.readAsDataURL(compressed);
                        reader.onloadend = () => { 
                          setFotos(p => [...p, reader.result]); 
                          setUploading(false); 
                        };
                      } catch (err) { 
                        console.error("Erro no processamento da imagem:", err);
                        alert("Não foi possível processar esta foto.");
                        setUploading(false); 
                      }
                    }} />
                  </label>
                )}
              </div>
            </div>

            <label className="flex items-start gap-4 p-5 bg-white border-2 border-slate-200 rounded-3xl cursor-pointer">
              <input type="checkbox" className="w-6 h-6 rounded mt-1" checked={formData.termo_aceite} onChange={(e) => setFormData({...formData, termo_aceite: e.target.checked})} />
              <p className="text-[10px] font-black uppercase text-slate-600 leading-tight">
                EU, <span className="underline">{formData.motorista_nome || 'MOTORISTA'}</span>, {tipoVistoria === 'ENTRADA' ? 'ME RESPONSABILIZO PELA VIATURA' : 'REALIZO A ENTREGA DA VIATURA'} <span className="text-blue-600 font-black">{formData.prefixo_vtr}</span> CONFORME CHECKLIST ACIMA.
              </p>
            </label>

            <div className="flex gap-2">
              <button onClick={() => setStep(1)} className="flex-1 bg-white p-5 rounded-2xl font-black border-2 border-slate-200 uppercase text-xs">Voltar</button>
              <button onClick={handleFinalizar} disabled={!formData.termo_aceite || loading || (Object.values(checklist).includes('FALHA') && fotos.length === 0)} className="btn-tatico flex-[2] disabled:opacity-50 uppercase">
                {loading ? <Loader2 className="animate-spin mx-auto"/> : "Finalizar Envio"}
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
