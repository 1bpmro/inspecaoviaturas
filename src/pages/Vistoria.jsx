import React, { useState, useEffect } from 'react';
import { useAuth } from '../lib/AuthContext';
import { gasApi } from '../api/gasClient';
import imageCompression from 'browser-image-compression';
import { 
  ArrowLeft, ChevronRight, Loader2, X, Plus, 
  Users, AlertTriangle, Lock, Unlock
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

const TIPOS_SERVICO = ["Patrulhamento Ordinário", "Operação", "Força Tática", "Patrulha Comunitária", "Patrulhamento Rural", "Outro"];

const Vistoria = ({ onBack }) => {
  const { user } = useAuth();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  
  const [viaturas, setViaturas] = useState([]);
  const [efetivoLocal, setEfetivoLocal] = useState([]);
  
  const [tipoVistoria, setTipoVistoria] = useState('ENTRADA');
  const [fotos, setFotos] = useState([]);
  const [protegerFotos, setProtegerFotos] = useState(false);
  const [kmReferencia, setKmReferencia] = useState(0);
  
  // NOMES DE CHAVES AJUSTADOS PARA BATER COM O Código.gs
  const [formData, setFormData] = useState({
    prefixo_vtr: '', 
    placa_vtr: '', 
    hodometro: '', 
    videomonitoramento: '', 
    tipo_servico: '', 
    unidade_externa: '',
    motorista_re: '', motorista_nome: '', motorista_unidade: '',
    comandante_re: '', comandante_nome: '', comandante_unidade: '',
    patrulheiro_re: '', patrulheiro_nome: '', patrulheiro_unidade: '',
    termo_aceite: false
  });

  const [checklist, setChecklist] = useState({});
  const itensAtuais = tipoVistoria === 'ENTRADA' ? ITENS_ENTRADA : ITENS_SAIDA;
  const temAvaria = Object.values(checklist).includes('FALHA');

  const toStr = (val) => (val !== undefined && val !== null ? String(val) : '');

  const handleTrocaTipo = (novoTipo) => {
    setTipoVistoria(novoTipo);
    setKmReferencia(0);
    setFormData({
      prefixo_vtr: '', placa_vtr: '', hodometro: '', videomonitoramento: '', tipo_servico: '', unidade_externa: '',
      motorista_re: '', motorista_nome: '', motorista_unidade: '',
      comandante_re: '', comandante_nome: '', comandante_unidade: '',
      patrulheiro_re: '', patrulheiro_nome: '', patrulheiro_unidade: '',
      termo_aceite: false
    });
    setFotos([]);
    setStep(1);
  };

  useEffect(() => {
    const sincronizarDados = async () => {
      setLoading(true);
      try {
        const [resVtr, resMil] = await Promise.all([
          gasApi.getViaturas(),
          gasApi.getEfetivoCompleto()
        ]);
        if (resVtr.status === 'success') setViaturas(resVtr.data);
        if (resMil.status === 'success') setEfetivoLocal(resMil.data);
      } catch (e) { console.error("Erro na sincronização"); } 
      finally { setLoading(false); }
    };
    sincronizarDados();
  }, []);

  useEffect(() => {
    setChecklist(itensAtuais.reduce((acc, item) => ({ ...acc, [item]: 'OK' }), {}));
  }, [tipoVistoria, itensAtuais]);

  const buscarMilitarNoCache = (reRaw) => {
    let reString = toStr(reRaw).replace(/\D/g, '');
    if (!reString || reString.length < 4) return null;
    if (reString.length > 0 && reString.length <= 6 && !reString.startsWith("1000")) {
        const comMil = "1000" + reString;
        const militar = efetivoLocal.find(m => toStr(m.re) === comMil);
        if (militar) return militar;
    }
    return efetivoLocal.find(m => toStr(m.re) === reString);
  };

  const handleMatriculaChange = (valor, cargo) => {
    let reLimpo = toStr(valor).replace(/\D/g, '');
    setFormData(prev => ({ ...prev, [`${cargo}_re`]: reLimpo }));

    if (reLimpo.length >= 4) {
      let reParaBusca = (reLimpo.length <= 6 && !reLimpo.startsWith("1000")) ? "1000" + reLimpo : reLimpo;
      const militar = buscarMilitarNoCache(reParaBusca);
      if (militar) {
        setFormData(prev => ({
          ...prev,
          [`${cargo}_re`]: toStr(militar.re),
          [`${cargo}_nome`]: `${militar.patente} ${militar.nome}`,
          [`${cargo}_unidade`]: militar.unidade || '1º BPM'
        }));
      } else {
        setFormData(prev => ({ ...prev, [`${cargo}_nome`]: '', [`${cargo}_unidade`]: '' }));
      }
    } else {
      setFormData(prev => ({ ...prev, [`${cargo}_nome`]: '', [`${cargo}_unidade`]: '' }));
    }
  };

  const handleMatriculaBlur = (cargo) => {
    const reAtual = toStr(formData[`${cargo}_re`]);
    if (reAtual.length > 0 && reAtual.length <= 6 && !reAtual.startsWith("1000")) {
      setFormData(prev => ({ ...prev, [`${cargo}_re`]: "1000" + reAtual }));
    }
  };

  const handleVtrChange = (prefixo) => {
    const vtr = viaturas.find(v => toStr(v.Prefixo) === toStr(prefixo));
    if (!vtr) return;

    const kmAnterior = Number(vtr.UltimoKM) || 0;
    setKmReferencia(kmAnterior);

    if (tipoVistoria === 'SAÍDA') {
      setFormData(prev => ({
        ...prev,
        prefixo_vtr: toStr(vtr.Prefixo),
        placa_vtr: toStr(vtr.Placa),
        tipo_servico: toStr(vtr.UltimoTipoServico) || '',
        motorista_re: toStr(vtr.UltimoMotoristaRE),
        motorista_nome: toStr(vtr.UltimoMotoristaNome),
        motorista_unidade: toStr(vtr.UltimoMotoristaUnidade) || '1º BPM',
        comandante_re: toStr(vtr.UltimoComandanteRE),
        comandante_nome: toStr(vtr.UltimoComandanteNome),
        comandante_unidade: toStr(vtr.UltimoComandanteUnidade) || '1º BPM',
        patrulheiro_re: toStr(vtr.UltimoPatrulheiroRE),
        patrulheiro_nome: toStr(vtr.UltimoPatrulheiroNome),
        patrulheiro_unidade: toStr(vtr.UltimoPatrulheiroUnidade) || '1º BPM',
        hodometro: toStr(vtr.UltimoKM),
        videomonitoramento: toStr(vtr.UltimoVideoMonitoramento || '')
      }));
    } else {
      setFormData(prev => ({ 
        ...prev, 
        prefixo_vtr: toStr(vtr.Prefixo), 
        placa_vtr: toStr(vtr.Placa) 
      }));
    }
  };

  const kmInvalido = tipoVistoria === 'SAÍDA' && Number(formData.hodometro) <= kmReferencia;

  const handleFinalizar = async () => {
    if (temAvaria && fotos.length === 0) return alert("Obrigatório foto para itens em FALHA.");
    setLoading(true);
    try {
      const payloadFinal = {
        ...formData,
        tipo_vistoria: tipoVistoria,
        checklist_resumo: Object.entries(checklist)
          .filter(([_, s]) => s === 'FALHA')
          .map(([i]) => i).join(', ') || "SEM ALTERAÇÕES",
        fotos_vistoria: fotos,
        proteger_ocorrencia: protegerFotos,
        militar_logado: `${user.patente} ${user.nome}`,
        status_garageiro: "PENDENTE"
      };

      const res = await gasApi.saveVistoria(payloadFinal);
      
      if (res.status === 'success') { 
        alert("Inspeção finalizada com sucesso!"); 
        onBack(); 
      } else {
        alert("Erro no servidor: " + res.message);
      }
    } catch (e) { 
      alert("Erro de conexão com o servidor."); 
    } finally { 
      setLoading(false); 
    }
  };

  return (
    <div className="min-h-screen bg-[var(--bg-app)] pb-10 text-slate-900 dark:text-white">
      <header className="bg-slate-900 text-white p-5 sticky top-0 z-50 border-b-4 border-blue-900 shadow-md">
        <div className="max-w-xl mx-auto flex items-center justify-between">
          <button onClick={onBack} className="p-2 bg-white/10 rounded-full hover:bg-white/20 transition-colors"><ArrowLeft size={24}/></button>
          <div className="text-center">
            <h1 className="font-black text-[10px] tracking-widest opacity-50 uppercase">1º BPM - Rondon</h1>
            <p className="text-xs font-bold text-blue-400 uppercase">INSPEÇÃO DE VIATURA</p>
          </div>
          <div className="w-10" />
        </div>
      </header>

      <main className="max-w-xl mx-auto p-4 space-y-6">
        <div className="flex bg-slate-200 dark:bg-slate-800 p-1 rounded-2xl shadow-inner">
          <button onClick={() => handleTrocaTipo('ENTRADA')} className={`flex-1 py-3 rounded-xl font-black text-[10px] transition-all ${tipoVistoria === 'ENTRADA' ? 'bg-green-600 text-white shadow-lg scale-[1.02]' : 'text-slate-500'}`}>ENTRADA</button>
          <button onClick={() => handleTrocaTipo('SAÍDA')} className={`flex-1 py-3 rounded-xl font-black text-[10px] transition-all ${tipoVistoria === 'SAÍDA' ? 'bg-orange-500 text-white shadow-lg scale-[1.02]' : 'text-slate-500'}`}>SAÍDA</button>
        </div>

        {step === 1 && (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4">
            <section className="bg-[var(--bg-card)] rounded-[2.5rem] p-6 shadow-sm border border-[var(--border-color)] space-y-5">
              
              <div className="bg-slate-900 rounded-3xl p-5 mb-4 shadow-2xl border-b-4 border-blue-600">
                <div className="flex items-center gap-2 mb-4 border-b border-white/10 pb-2">
                  <Users className="text-blue-400" size={18} />
                  <span className="text-[10px] font-black text-white tracking-widest uppercase">Formação da Guarnição</span>
                </div>
                <div className="space-y-3">
                  {[{ label: 'MOT', cargo: 'motorista' }, { label: 'CMD', cargo: 'comandante' }, { label: 'PTR', cargo: 'patrulheiro' }].map(m => (
                    <div key={m.label} className="flex items-center justify-between">
                      <span className="text-[9px] font-black text-blue-500 w-8">{m.label}</span>
                      <div className={`flex-1 ml-2 h-8 flex items-center px-3 rounded-lg border transition-colors ${formData[`${m.cargo}_nome`] ? 'bg-blue-900/30 border-blue-500/50' : 'bg-white/5 border-dashed border-white/20'}`}>
                        <span className={`text-[10px] font-bold uppercase truncate ${formData[`${m.cargo}_nome`] ? 'text-white' : 'text-white/20 italic'}`}>
                          {formData[`${m.cargo}_nome`] || `Aguardando ${m.cargo}...`}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <select className="vtr-input !py-4" value={formData.prefixo_vtr} onChange={(e) => handleVtrChange(e.target.value)}>
                  <option value="">VTR</option>
                  {viaturas.filter(v => tipoVistoria === 'SAÍDA' ? v.Status === 'EM SERVIÇO' : (v.Status === 'Operacional' || v.Status === 'DISPONÍVEL' || v.Status === 'MANUTENÇÃO')).map(v => (
                    <option key={v.Prefixo} value={v.Prefixo}>{v.Prefixo}</option>
                  ))}
                </select>
                <select className="vtr-input !py-4" value={formData.tipo_servico} onChange={(e) => setFormData({...formData, tipo_servico: e.target.value, unidade_externa: ''})}>
                  <option value="">SERVIÇO</option>
                  {TIPOS_SERVICO.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>

              {/* CAMPOS DINÂMICOS - ALINHADOS COM O CABEÇALHO DO SCRIPT */}
              {(formData.tipo_servico === 'Operação' || formData.tipo_servico === 'Outro') && (
                <div className="animate-in slide-in-from-top-2">
                   <input 
                    placeholder={formData.tipo_servico === 'Operação' ? "NOME DA OPERAÇÃO" : "DESCREVA O SERVIÇO"} 
                    className="vtr-input w-full !border-blue-500 !bg-blue-50/10" 
                    value={formData.unidade_externa} 
                    onChange={(e) => setFormData({...formData, unidade_externa: e.target.value.toUpperCase()})} 
                  />
                </div>
              )}

              {formData.tipo_servico === 'Patrulha Comunitária' && (
                <div className="animate-in slide-in-from-top-2">
                  <select 
                    className="vtr-input w-full !border-blue-500 !bg-blue-50/10" 
                    value={formData.unidade_externa} 
                    onChange={(e) => setFormData({...formData, unidade_externa: e.target.value})}
                  >
                    <option value="">MODALIDADE COMUNITÁRIA</option>
                    <option value="Patrulha Comercial">Patrulha Comercial</option>
                    <option value="Patrulha Escolar">Patrulha Escolar</option>
                    <option value="Base Móvel">Base Móvel</option>
                  </select>
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <span className="text-[9px] font-black text-slate-400 ml-2 uppercase">Hodômetro</span>
                  <input 
                    type="number" 
                    className={`vtr-input ${kmInvalido ? '!border-red-500 !bg-red-50 text-red-900' : ''}`} 
                    placeholder="KM ATUAL" 
                    value={formData.hodometro} 
                    onChange={(e) => setFormData({...formData, hodometro: e.target.value})} 
                  />
                </div>
                <div className="space-y-1">
                  <span className="text-[9px] font-black text-slate-400 ml-2 uppercase">Monitoramento</span>
                  <select className="vtr-input text-[10px]" value={formData.videomonitoramento} onChange={(e) => setFormData({...formData, videomonitoramento: e.target.value})}>
                    <option value="">SELECIONE</option>
                    <option value="OPERANTE">OPERANTE</option>
                    <option value="INOPERANTE">INOPERANTE</option>
                    <option value="NÃO POSSUI">NÃO POSSUI</option>
                  </select>
                </div>
              </div>
              
              {kmInvalido && (
                <p className="text-[9px] font-black text-red-600 flex items-center gap-1 animate-pulse ml-2">
                  <AlertTriangle size={10}/> KM DEVE SER MAIOR QUE O DE ENTRADA ({kmReferencia})
                </p>
              )}

              {['motorista', 'comandante', 'patrulheiro'].map(cargo => (
                <div key={cargo} className="space-y-1">
                  <input 
                    placeholder={`MATRÍCULA ${cargo.toUpperCase()}`} 
                    className="vtr-input !bg-[var(--bg-app)]" 
                    value={formData[`${cargo}_re`]}
                    onChange={(e) => handleMatriculaChange(e.target.value, cargo)}
                    onBlur={() => handleMatriculaBlur(cargo)}
                  />
                  {/* Cadastro de Militar Externo */}
                  {formData[`${cargo}_re`].length >= 4 && !buscarMilitarNoCache(formData[`${cargo}_re`]) && (
                    <div className="grid grid-cols-1 gap-2 p-3 bg-blue-50 dark:bg-blue-900/10 border border-blue-200 rounded-2xl animate-in zoom-in-95">
                      <p className="text-[8px] font-black text-blue-600 uppercase">Militar Externo/Novo</p>
                      <input placeholder="PATENTE E NOME (EX: CB PM ALFA)" className="bg-transparent border-none text-[10px] font-bold w-full uppercase focus:ring-0" value={formData[`${cargo}_nome`]} onChange={(e) => setFormData({...formData, [`${cargo}_nome`]: e.target.value.toUpperCase()})} />
                      <input placeholder="UNIDADE (EX: BPFRON)" className="bg-transparent border-none text-[10px] font-bold w-full uppercase border-t border-blue-200 pt-2 focus:ring-0" value={formData[`${cargo}_unidade`]} onChange={(e) => setFormData({...formData, [`${cargo}_unidade`]: e.target.value.toUpperCase()})} />
                    </div>
                  )}
                </div>
              ))}
            </section>
            
            <button 
              onClick={() => setStep(2)} 
              disabled={!formData.prefixo_vtr || !formData.motorista_nome || !formData.comandante_nome || !formData.hodometro || !formData.videomonitoramento || kmInvalido} 
              className={`btn-tatico w-full uppercase flex items-center justify-center gap-2 transition-all ${(!formData.prefixo_vtr || !formData.motorista_nome || !formData.comandante_nome || !formData.hodometro || !formData.videomonitoramento || kmInvalido) ? 'opacity-30 grayscale cursor-not-allowed' : 'opacity-100'}`}
            >
              PRÓXIMO <ChevronRight size={18}/>
            </button>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-6 animate-in slide-in-from-right-4">
             <div onClick={() => setProtegerFotos(!protegerFotos)} className={`p-5 rounded-3xl border-2 cursor-pointer transition-all flex items-center gap-4 ${protegerFotos ? 'bg-blue-600 border-blue-400 text-white shadow-lg' : 'bg-slate-100 dark:bg-slate-800 border-slate-300 dark:border-slate-700 text-slate-600'}`}>
              {protegerFotos ? <Lock size={32} /> : <Unlock size={32} className="opacity-50" />}
              <div>
                <h4 className={`font-black text-xs uppercase ${protegerFotos ? 'text-white' : 'text-slate-500'}`}>Proteção de Dados</h4>
                <p className="text-[10px] font-medium leading-tight opacity-90">Impedir limpeza automática (Ocorrências Graves)</p>
              </div>
            </div>

             <div className="grid gap-2">
              {itensAtuais.map(item => (
                <div key={item} onClick={() => setChecklist(prev => ({...prev, [item]: prev[item] === 'OK' ? 'FALHA' : 'OK'}))} className={`checklist-item-ok cursor-pointer transition-colors ${checklist[item] === 'FALHA' ? '!border-red-500 !bg-red-50 dark:!bg-red-900/20' : ''}`}>
                  <span className="text-sm font-bold uppercase">{item}</span>
                  <div className={`px-3 py-1 rounded-lg text-[10px] font-black transition-colors ${checklist[item] === 'OK' ? 'bg-green-100 text-green-700' : 'bg-red-600 text-white'}`}>{checklist[item]}</div>
                </div>
              ))}
            </div>

            <div className={`bg-[var(--bg-card)] rounded-[2.5rem] p-6 border-2 transition-colors ${temAvaria && fotos.length === 0 ? 'border-red-500 bg-red-50/50 animate-pulse' : 'border-[var(--border-color)]'}`}>
              <p className="text-[10px] font-black mb-3 uppercase text-slate-400">Registros Fotográficos {temAvaria && <span className="text-red-600">(Obrigatório em Falhas)</span>}</p>
              <div className="grid grid-cols-4 gap-2">
                {fotos.map((f, i) => (
                  <div key={i} className="relative aspect-square rounded-2xl overflow-hidden shadow-md">
                    <img src={f} className="object-cover w-full h-full" alt="vistoria"/>
                    <button onClick={() => setFotos(fotos.filter((_, idx) => idx !== i))} className="absolute top-1 right-1 bg-red-600 text-white rounded-full p-1"><X size={10}/></button>
                  </div>
                ))}
                {fotos.length < 4 && (
                  <label className="aspect-square rounded-2xl border-2 border-dashed border-slate-300 dark:border-slate-700 flex items-center justify-center cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">
                    {uploading ? <Loader2 className="animate-spin text-blue-600" /> : <Plus className="text-slate-400" />}
                    <input type="file" accept="image/*" capture="environment" className="hidden" onChange={async (e) => {
                      const file = e.target.files[0]; if (!file) return;
                      setUploading(true);
                      try {
                        const compressed = await imageCompression(file, { maxSizeMB: 0.5, maxWidthOrHeight: 1280 });
                        const reader = new FileReader(); reader.readAsDataURL(compressed);
                        reader.onloadend = () => { setFotos(p => [...p, reader.result]); setUploading(false); };
                      } catch (err) { setUploading(false); }
                    }} />
                  </label>
                )}
              </div>
            </div>

            <label className="flex items-center gap-3 p-5 bg-[var(--bg-card)] border-2 border-[var(--border-color)] rounded-3xl cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">
              <input type="checkbox" className="w-6 h-6 rounded-lg text-blue-600" checked={formData.termo_aceite} onChange={(e) => setFormData({...formData, termo_aceite: e.target.checked})} />
              <span className="text-[10px] font-black uppercase leading-tight text-slate-500">Confirmo que as informações relatadas são verídicas e condizem com o estado real da viatura.</span>
            </label>

            <div className="flex gap-2">
              <button onClick={() => setStep(1)} className="flex-1 bg-[var(--bg-card)] p-5 rounded-2xl font-black border-2 border-[var(--border-color)] hover:bg-slate-100 transition-colors">VOLTAR</button>
              <button onClick={handleFinalizar} disabled={!formData.termo_aceite || loading || (temAvaria && fotos.length === 0)} className={`btn-tatico flex-[2] ${(loading || !formData.termo_aceite || (temAvaria && fotos.length === 0)) ? 'opacity-30 cursor-not-allowed' : ''}`}>
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
