import React, { useState, useEffect } from 'react';
import { useAuth } from '../lib/AuthContext';
import { gasApi } from '../api/gasClient';
import imageCompression from 'browser-image-compression';
import { 
  ArrowLeft, CheckCircle2, ChevronRight, Loader2, Camera, X, Plus, 
  Car, Users, ShieldAlert, AlertTriangle, Lock, Unlock, UserPlus, Building2
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
const SUB_PAT_LISTA = ["Patrulha Escolar", "Base Móvel", "Patrulha Comercial"];

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
  
  const [formData, setFormData] = useState({
    prefixo_vtr: '', placa_vtr: '', hodometro: '', tipo_servico: '', unidade_externa: '',
    motorista_re: '', motorista_nome: '', motorista_unidade: '',
    comandante_re: '', comandante_nome: '', comandante_unidade: '',
    patrulheiro_re: '', patrulheiro_nome: '', patrulheiro_unidade: '',
    termo_aceite: false
  });

  const [checklist, setChecklist] = useState({});
  const itensAtuais = tipoVistoria === 'ENTRADA' ? ITENS_ENTRADA : ITENS_SAIDA;
  const temAvaria = Object.values(checklist).includes('FALHA');

  // Helper fundamental para evitar erro de .replace() em números vindos da planilha
  const toStr = (val) => (val !== undefined && val !== null ? String(val) : '');

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
      } catch (e) {
        console.error("Erro na sincronização inicial");
      } finally {
        setLoading(false);
      }
    };
    sincronizarDados();
  }, []);

  useEffect(() => {
    setChecklist(itensAtuais.reduce((acc, item) => ({ ...acc, [item]: 'OK' }), {}));
  }, [tipoVistoria, itensAtuais]);

  const buscarMilitarNoCache = (reRaw) => {
    let reString = toStr(reRaw).replace(/\D/g, '');
    if (!reString || reString.length < 4) return null;
    
    // Regra do 1000 Universal aplicada na busca
    if (reString.length > 0 && reString.length <= 6) reString = "1000" + reString;
    
    return efetivoLocal.find(m => toStr(m.re) === reString);
  };

  const handleMatriculaChange = (valor, cargo) => {
    // 1. Apenas limpa caracteres não numéricos, permitindo apagar livremente
    let reLimpo = toStr(valor).replace(/\D/g, '');
    
    // Atualiza o RE no estado imediatamente para o teclado não travar
    setFormData(prev => ({ ...prev, [`${cargo}_re`]: reLimpo }));

    // 2. Só tentamos buscar no cache ou aplicar regra se tiver uma quantidade mínima
    // Isso evita que o "1000" apareça logo no primeiro dígito digitado
    if (reLimpo.length >= 4) {
      let reParaBusca = reLimpo;
      
      // Se for um RE curto, preparamos a busca com o prefixo 1000
      if (reLimpo.length <= 6 && !reLimpo.startsWith("1000")) {
        reParaBusca = "1000" + reLimpo;
      }

      const militar = buscarMilitarNoCache(reParaBusca);

      if (militar) {
        setFormData(prev => ({
          ...prev,
          [`${cargo}_re`]: reParaBusca, // Aqui sim injetamos o 1000
          [`${cargo}_nome`]: `${militar.patente} ${militar.nome}`,
          [`${cargo}_unidade`]: militar.unidade || '1º BPM'
        }));
      } else {
        // Se não achou no cache, não forçamos o 1000 ainda para deixar o usuário digitar o RE externo completo
        setFormData(prev => ({ 
          ...prev, 
          [`${cargo}_nome`]: '', 
          [`${cargo}_unidade`]: '' 
        }));
      }
    } else {
      // Se o usuário apagou e tem menos de 4 dígitos, limpamos os campos de nome
      setFormData(prev => ({ 
        ...prev, 
        [`${cargo}_nome`]: '', 
        [`${cargo}_unidade`]: '' 
      }));
    }
  };

  const handleVtrChange = (prefixo) => {
    const vtr = viaturas.find(v => toStr(v.Prefixo) === toStr(prefixo));
    if (!vtr) return;

    if (tipoVistoria === 'SAÍDA') {
      setFormData(prev => ({
        ...prev,
        prefixo_vtr: toStr(vtr.Prefixo),
        placa_vtr: toStr(vtr.Placa),
        tipo_servico: toStr(vtr.UltimoTipoServico),
        motorista_re: toStr(vtr.UltimoMotoristaRE),
        motorista_nome: toStr(vtr.UltimoMotoristaNome),
        motorista_unidade: toStr(vtr.UltimoMotoristaUnidade) || '1º BPM',
        comandante_re: toStr(vtr.UltimoComandanteRE),
        comandante_nome: toStr(vtr.UltimoComandanteNome),
        comandante_unidade: toStr(vtr.UltimoComandanteUnidade) || '1º BPM',
        patrulheiro_re: toStr(vtr.UltimoPatrulheiroRE),
        patrulheiro_nome: toStr(vtr.UltimoPatrulheiroNome),
        patrulheiro_unidade: toStr(vtr.UltimoPatrulheiroUnidade) || '1º BPM',
        hodometro: toStr(vtr.UltimoKM)
      }));
    } else {
      setFormData(prev => ({ ...prev, prefixo_vtr: toStr(vtr.Prefixo), placa_vtr: toStr(vtr.Placa) }));
    }
  };

  const handleFinalizar = async () => {
    if (temAvaria && fotos.length === 0) return alert("Obrigatório foto para itens em FALHA.");
    setLoading(true);
    try {
      const res = await gasApi.saveVistoria({
        ...formData,
        tipo_vistoria: tipoVistoria,
        checklist_resumo: Object.entries(checklist).filter(([_, s]) => s === 'FALHA').map(([i]) => i).join(', ') || "SEM ALTERAÇÕES",
        fotos_vistoria: fotos,
        proteger_ocorrencia: protegerFotos,
        militar_logado: `${user.patente} ${user.nome}`,
      });
      if (res.status === 'success') { alert("Inspeção finalizada!"); onBack(); }
    } catch (e) { alert("Erro ao salvar."); } finally { setLoading(false); }
  };

  return (
    <div className="min-h-screen bg-[var(--bg-app)] pb-10">
      <header className="bg-slate-900 text-white p-5 sticky top-0 z-50 border-b-4 border-blue-900 shadow-md">
        <div className="max-w-xl mx-auto flex items-center justify-between">
          <button onClick={onBack} className="p-2 bg-white/10 rounded-full"><ArrowLeft size={24}/></button>
          <div className="text-center">
            <h1 className="font-black text-[10px] tracking-widest opacity-50 uppercase">1º BPM - Rondon</h1>
            <p className="text-xs font-bold text-blue-400 uppercase">INSPEÇÃO DE VIATURA</p>
          </div>
          <div className="w-10" />
        </div>
      </header>

      <main className="max-w-xl mx-auto p-4 space-y-6">
        <div className="flex bg-slate-200 dark:bg-slate-800 p-1 rounded-2xl">
          <button onClick={() => { setTipoVistoria('ENTRADA'); setFormData(f => ({...f, prefixo_vtr: ''})) }} className={`flex-1 py-3 rounded-xl font-black text-[10px] ${tipoVistoria === 'ENTRADA' ? 'bg-green-600 text-white shadow-lg' : 'text-slate-500'}`}>ENTRADA</button>
          <button onClick={() => { setTipoVistoria('SAÍDA'); setFormData(f => ({...f, prefixo_vtr: ''})) }} className={`flex-1 py-3 rounded-xl font-black text-[10px] ${tipoVistoria === 'SAÍDA' ? 'bg-orange-500 text-white shadow-lg' : 'text-slate-500'}`}>SAÍDA</button>
        </div>

        {step === 1 && (
          <div className="space-y-6 animate-in fade-in">
            {loading && <div className="flex items-center justify-center gap-2 text-blue-600 font-black text-[10px] animate-pulse"><Loader2 size={14} className="animate-spin"/> SINCRONIZANDO EFETIVO...</div>}
            
            <section className="bg-[var(--bg-card)] rounded-[2.5rem] p-6 shadow-sm border border-[var(--border-color)] space-y-5">
              
              {/* CARD DA GUARNIÇÃO TÁTICO */}
              <div className="bg-slate-900 rounded-3xl p-5 mb-4 shadow-2xl border-b-4 border-blue-600">
                <div className="flex items-center gap-2 mb-4 border-b border-white/10 pb-2">
                  <Users className="text-blue-400" size={18} />
                  <span className="text-[10px] font-black text-white tracking-widest uppercase">Formação da Guarnição</span>
                </div>
                <div className="space-y-3">
                  {[
                    { label: 'MOT', cargo: 'motorista' },
                    { label: 'CMD', cargo: 'comandante' },
                    { label: 'PTR', cargo: 'patrulheiro' }
                  ].map(m => (
                    <div key={m.label} className="flex items-center justify-between">
                      <span className="text-[9px] font-black text-blue-500 w-8">{m.label}</span>
                      <div className={`flex-1 ml-2 h-8 flex items-center px-3 rounded-lg border transition-colors ${formData[`${m.cargo}_nome`] ? 'bg-blue-900/30 border-blue-500/50' : 'bg-white/5 border-dashed border-white/20'}`}>
                        <span className={`text-[10px] font-bold uppercase truncate ${formData[`${m.cargo}_nome`] ? 'text-white' : 'text-white/20 italic'}`}>
                          {formData[`${m.cargo}_nome`] || `Aguardando ${m.cargo}...`}
                        </span>
                      </div>
                      {formData[`${m.cargo}_nome`] && <CheckCircle2 size={14} className="text-green-500 ml-2 animate-pulse" />}
                    </div>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <select className="vtr-input !py-4" value={formData.prefixo_vtr} onChange={(e) => handleVtrChange(e.target.value)}>
                  <option value="">VTR</option>
                  {viaturas.filter(v => tipoVistoria === 'SAÍDA' ? v.Status === 'EM SERVIÇO' : true).map(v => (
                    <option key={v.Prefixo} value={v.Prefixo}>{v.Prefixo}</option>
                  ))}
                </select>
                <select className="vtr-input !py-4" value={formData.tipo_servico} onChange={(e) => setFormData({...formData, tipo_servico: e.target.value, unidade_externa: ''})}>
                  <option value="">SERVIÇO</option>
                  {TIPOS_SERVICO.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>

              {(formData.tipo_servico === 'Operação' || formData.tipo_servico === 'Outro') && (
                <input placeholder="NOME DA OPERAÇÃO / DESTINO" className="vtr-input !bg-orange-50 dark:!bg-orange-900/10 border-orange-200 uppercase" value={formData.unidade_externa} onChange={(e) => setFormData({...formData, unidade_externa: e.target.value})} />
              )}

              {formData.tipo_servico === 'Patrulha Comunitária' && (
                <select className="vtr-input !bg-blue-50 dark:!bg-blue-900/10 border-blue-200" value={formData.unidade_externa} onChange={(e) => setFormData({...formData, unidade_externa: e.target.value})}>
                  <option value="">Modalidade da Patrulha</option>
                  {SUB_PAT_LISTA.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              )}

              <input type="number" className="vtr-input" placeholder="Hodômetro Atual" value={formData.hodometro} onChange={(e) => setFormData({...formData, hodometro: e.target.value})} />

              {['motorista', 'comandante', 'patrulheiro'].map(cargo => {
                const militar = buscarMilitarNoCache(formData[`${cargo}_re`]);
                const digitouOito = toStr(formData[`${cargo}_re`]).length >= 8;

                return (
                  <div key={cargo} className="space-y-1 pt-2">
                    <input 
                      placeholder={`MATRÍCULA ${cargo.toUpperCase()}`} 
                      className="vtr-input !bg-[var(--bg-app)]" 
                      value={formData[`${cargo}_re`]}
                      onChange={(e) => handleMatriculaChange(e.target.value, cargo)}
                    />
                    
                    {!militar && digitouOito && (
                      <div className="grid grid-cols-1 gap-2 p-3 bg-yellow-50 dark:bg-yellow-900/10 border border-yellow-200 rounded-2xl animate-in slide-in-from-top-2">
                        <div className="flex items-center gap-2">
                          <UserPlus size={14} className="text-yellow-600"/>
                          <input 
                            placeholder="GRADUAÇÃO E NOME DE GUERRA" 
                            className="bg-transparent border-none text-[10px] font-bold w-full focus:ring-0 uppercase"
                            value={formData[`${cargo}_nome`]}
                            onChange={(e) => setFormData({...formData, [`${cargo}_nome`]: e.target.value.toUpperCase()})}
                          />
                        </div>
                        <div className="flex items-center gap-2 border-t border-yellow-200 pt-2">
                          <Building2 size={14} className="text-yellow-600"/>
                          <input 
                            placeholder="UNIDADE (EXTERNA)" 
                            className="bg-transparent border-none text-[10px] font-bold w-full focus:ring-0 uppercase"
                            value={formData[`${cargo}_unidade`]}
                            onChange={(e) => setFormData({...formData, [`${cargo}_unidade`]: e.target.value.toUpperCase()})}
                          />
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </section>
            
            {/* BOTÃO COM TRAVA DE SEGURANÇA: VTR + MOTORISTA + COMANDANTE OBRIGATÓRIOS */}
            <button 
              onClick={() => setStep(2)} 
              disabled={!formData.prefixo_vtr || !formData.motorista_nome || !formData.comandante_nome} 
              className={`btn-tatico w-full uppercase transition-all flex items-center justify-center gap-2 ${(!formData.prefixo_vtr || !formData.motorista_nome || !formData.comandante_nome) ? 'opacity-30 grayscale cursor-not-allowed' : 'opacity-100'}`}
            >
              {(!formData.motorista_nome || !formData.comandante_nome) ? "Identifique a Guarnição" : "Itens de Inspeção"}
              <ChevronRight/>
            </button>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-6 animate-in slide-in-from-right-4">
            <div onClick={() => setProtegerFotos(!protegerFotos)} className={`p-5 rounded-3xl border-2 cursor-pointer transition-all flex items-center gap-4 ${protegerFotos ? 'bg-blue-600 border-blue-400 text-white shadow-lg' : 'bg-slate-100 border-slate-300 text-slate-600'}`}>
              {protegerFotos ? <Lock size={32} /> : <Unlock size={32} className="opacity-50" />}
              <div>
                <h4 className="font-black text-xs uppercase">Proteção de Dados</h4>
                <p className="text-[10px] font-medium leading-tight opacity-90">{protegerFotos ? "ESTA INSPEÇÃO NÃO SERÁ APAGADA PELO SISTEMA" : "Clique para salvar permanentemente (Ocorrências Graves)"}</p>
              </div>
            </div>

            <div className="grid gap-2">
              {itensAtuais.map(item => (
                <div key={item} onClick={() => setChecklist(prev => ({...prev, [item]: prev[item] === 'OK' ? 'FALHA' : 'OK'}))} className={`checklist-item-ok ${checklist[item] === 'FALHA' ? '!border-red-500 !bg-red-50' : ''}`}>
                  <span className="text-sm font-bold uppercase">{item}</span>
                  <div className={`px-3 py-1 rounded-lg text-[10px] font-black ${checklist[item] === 'OK' ? 'bg-green-100 text-green-700' : 'bg-red-600 text-white'}`}>{checklist[item]}</div>
                </div>
              ))}
            </div>

            <div className={`bg-[var(--bg-card)] rounded-[2.5rem] p-6 border-2 ${temAvaria ? 'border-red-500' : 'border-[var(--border-color)]'}`}>
              <div className="grid grid-cols-4 gap-2">
                {fotos.map((f, i) => (
                  <div key={i} className="relative aspect-square rounded-2xl overflow-hidden">
                    <img src={f} className="object-cover w-full h-full" alt="vistoria"/>
                    <button onClick={() => setFotos(fotos.filter((_, idx) => idx !== i))} className="absolute top-1 right-1 bg-red-600 text-white rounded-full p-1"><X size={10}/></button>
                  </div>
                ))}
                {fotos.length < 4 && (
                  <label className="aspect-square rounded-2xl border-2 border-dashed flex items-center justify-center cursor-pointer">
                    {uploading ? <Loader2 className="animate-spin" /> : <Plus />}
                    <input type="file" accept="image/*" capture="environment" className="hidden" onChange={async (e) => {
                      const file = e.target.files[0]; if (!file) return;
                      setUploading(true);
                      try {
                        const compressed = await imageCompression(file, { maxSizeMB: 0.5 });
                        const reader = new FileReader(); reader.readAsDataURL(compressed);
                        reader.onloadend = () => { setFotos(p => [...p, reader.result]); setUploading(false); };
                      } catch (err) { setUploading(false); }
                    }} />
                  </label>
                )}
              </div>
            </div>

            <label className="flex items-center gap-3 p-5 bg-[var(--bg-card)] border-2 border-[var(--border-color)] rounded-3xl cursor-pointer">
              <input type="checkbox" className="w-6 h-6 rounded-lg" checked={formData.termo_aceite} onChange={(e) => setFormData({...formData, termo_aceite: e.target.checked})} />
              <span className="text-[10px] font-black uppercase leading-tight">As informações relatadas são verídicas.</span>
            </label>

            <div className="flex gap-2">
              <button onClick={() => setStep(1)} className="flex-1 bg-[var(--bg-card)] p-5 rounded-2xl font-black border-2 border-[var(--border-color)]">VOLTAR</button>
              <button onClick={handleFinalizar} disabled={!formData.termo_aceite || loading} className="btn-tatico flex-[2]">{loading ? <Loader2 className="animate-spin mx-auto"/> : "FINALIZAR"}</button>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default Vistoria;
