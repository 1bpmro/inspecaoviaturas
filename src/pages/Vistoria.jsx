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
  
  const [formData, setFormData] = useState({
    prefixo_vtr: '', placa_vtr: '', hodometro: '', videomonitoramento: '', 
    tipo_servico: '', unidade_externa: '',
    motorista_re: '', motorista_nome: '', motorista_unidade: '',
    comandante_re: '', comandante_nome: '', comandante_unidade: '',
    patrulheiro_re: '', patrulheiro_nome: '', patrulheiro_unidade: '',
    termo_aceite: false
  });

  const [checklist, setChecklist] = useState(() => {
    const itens = tipoVistoria === 'ENTRADA' ? ITENS_ENTRADA : ITENS_SAIDA;
    return itens.reduce((acc, item) => ({ ...acc, [item]: 'OK' }), {});
  });

  const temAvaria = Object.values(checklist).includes('FALHA');
  const toStr = (val) => (val !== undefined && val !== null ? String(val).trim() : '');

  // Lógica de limpeza de nomes (Evita CB PM CB PM NOME)
  const formatarNomeMilitar = (patente, nome) => {
    const p = toStr(patente).toUpperCase();
    let n = toStr(nome).toUpperCase();
    if (n.startsWith(p)) {
      return n; // Já contém a patente
    }
    return `${p} ${n}`.trim();
  };

  const formatarResumoChecklist = () => {
    const falhas = Object.entries(checklist).filter(([_, status]) => status === 'FALHA').map(([item]) => item);
    if (falhas.length === 0) return "SEM ALTERAÇÕES";
    if (tipoVistoria === 'ENTRADA') return `FALHA NOS SEGUINTES ITENS: (${falhas.join(', ')})`;
    return falhas.map(item => MAPA_FALHAS_SAIDA[item] || item).join(', ');
  };

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
    const novosItens = novoTipo === 'ENTRADA' ? ITENS_ENTRADA : ITENS_SAIDA;
    setChecklist(novosItens.reduce((acc, item) => ({ ...acc, [item]: 'OK' }), {}));
  };

  useEffect(() => {
    const sincronizarDados = async () => {
      if (viaturas.length === 0) setLoading(true); 
      try {
        const [resVtr, resMil] = await Promise.all([
          viaturas.length === 0 ? gasApi.getViaturas() : Promise.resolve({ status: 'success', data: viaturas }),
          gasApi.getEfetivoCompleto()
        ]);
        if (resVtr.status === 'success') setViaturas(resVtr.data);
        if (resMil.status === 'success') setEfetivoLocal(resMil.data);
      } catch (e) { 
        console.error("Erro na sincronização"); 
      } finally { 
        setLoading(false); 
      }
    };
    sincronizarDados();
  }, [frotaInicial]);

  const handleMatriculaChange = (valor, cargo) => {
    let reLimpo = toStr(valor).replace(/\D/g, '');
    setFormData(prev => ({ ...prev, [`${cargo}_re`]: reLimpo }));

    if (reLimpo.length >= 4) {
      const reBuscaCurto = reLimpo.padStart(6, '0');
      const reBuscaLongo = reLimpo.startsWith('1000') ? reLimpo : '1000' + reLimpo;

      const militar = efetivoLocal.find(m => 
        toStr(m.re) === reLimpo || toStr(m.re) === reBuscaCurto || toStr(m.re) === reBuscaLongo
      );

      if (militar) {
        setFormData(prev => ({
          ...prev,
          [`${cargo}_re`]: toStr(militar.re),
          [`${cargo}_nome`]: formatarNomeMilitar(militar.patente, militar.nome),
          [`${cargo}_unidade`]: militar.unidade || '1º BPM'
        }));
      } else {
        setFormData(prev => ({ ...prev, [`${cargo}_nome`]: '', [`${cargo}_unidade`]: '' }));
      }
    }
  };

  const handleVtrChange = (prefixo) => {
    const vtr = viaturas.find(v => toStr(v.Prefixo || v.PREFIXO) === toStr(prefixo));
    if (!vtr) return;
    
    const kmAnterior = Number(vtr.UltimoKM || vtr.ULTIMOKM) || 0;
    setKmReferencia(kmAnterior);

    if (tipoVistoria === 'SAÍDA') {
      setFormData(prev => ({
        ...prev,
        prefixo_vtr: toStr(vtr.Prefixo || vtr.PREFIXO),
        placa_vtr: toStr(vtr.Placa || vtr.PLACA),
        tipo_servico: toStr(vtr.UltimoTipoServico || ''),
        motorista_re: toStr(vtr.UltimoMotoristaRE || ''),
        motorista_nome: toStr(vtr.UltimoMotoristaNome || ''),
        motorista_unidade: toStr(vtr.UltimoMotoristaUnidade || '1º BPM'),
        comandante_re: toStr(vtr.UltimoComandanteRE || ''),
        comandante_nome: toStr(vtr.UltimoComandanteNome || ''),
        comandante_unidade: toStr(vtr.UltimoComandanteUnidade || '1º BPM'),
        patrulheiro_re: toStr(vtr.UltimoPatrulheiroRE || ''),
        patrulheiro_nome: toStr(vtr.UltimoPatrulheiroNome || ''),
        patrulheiro_unidade: toStr(vtr.UltimoPatrulheiroUnidade || '1º BPM'),
        hodometro: toStr(kmAnterior),
        videomonitoramento: toStr(vtr.UltimoVideoMonitoramento || '')
      }));
    } else {
      setFormData(prev => ({ 
        ...prev, 
        prefixo_vtr: toStr(vtr.Prefixo || vtr.PREFIXO), 
        placa_vtr: toStr(vtr.Placa || vtr.PLACA),
        hodometro: '' 
      }));
    }
  };

  const kmInvalido = tipoVistoria === 'SAÍDA' && Number(formData.hodometro) < kmReferencia;

  const handleFinalizar = async () => {
    if (temAvaria && fotos.length === 0) return alert("Obrigatório foto para itens em FALHA.");
    if (!window.confirm("Deseja finalizar o envio desta inspeção?")) return;
    
    setLoading(true);
    try {
      const payloadFinal = {
        ...formData,
        tipo_vistoria: tipoVistoria,
        checklist_resumo: formatarResumoChecklist(),
        Links_fotos: fotos, // Alinhado com a coluna do seu Sheets
        proteger_ocorrencia: protegerFotos,
        militar_logado: `${user.patente} ${user.nome}`,
        status_garageiro: "PENDENTE"
      };
      
      const res = await gasApi.saveVistoria(payloadFinal);
      if (res.status === 'success') { 
        alert("Inspeção enviada com sucesso!"); 
        onBack(); 
      } else {
        alert("Erro: " + res.message);
      }
    } catch (e) { 
      alert("Erro de conexão."); 
    } finally { 
      setLoading(false); 
    }
  };

  // Renderização e Retorno do Componente (Mantendo seu estilo visual)
  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 pb-10 text-slate-900 dark:text-white">
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
        {/* Toggle Entrada/Saída */}
        <div className="flex bg-slate-200 dark:bg-slate-800 p-1 rounded-2xl shadow-inner">
          <button onClick={() => handleTrocaTipo('ENTRADA')} className={`flex-1 py-3 rounded-xl font-black text-[10px] transition-all ${tipoVistoria === 'ENTRADA' ? 'bg-green-600 text-white shadow-lg' : 'text-slate-500'}`}>ENTRADA</button>
          <button onClick={() => handleTrocaTipo('SAÍDA')} className={`flex-1 py-3 rounded-xl font-black text-[10px] transition-all ${tipoVistoria === 'SAÍDA' ? 'bg-orange-500 text-white shadow-lg' : 'text-slate-500'}`}>SAÍDA</button>
        </div>

        {step === 1 ? (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4">
            <section className="bg-white dark:bg-slate-900 rounded-[2.5rem] p-6 shadow-sm border border-slate-200 dark:border-slate-800 space-y-5">
              
              {/* Card de Visualização da Guarnição */}
              <div className="bg-slate-900 rounded-3xl p-5 mb-4 shadow-2xl border-b-4 border-blue-600">
                <div className="flex items-center gap-2 mb-4 border-b border-white/10 pb-2">
                  <Users className="text-blue-400" size={18} />
                  <span className="text-[10px] font-black text-white tracking-widest uppercase">Guarnição Atual</span>
                </div>
                <div className="space-y-3">
                  {[{ label: 'MOT', cargo: 'motorista' }, { label: 'CMD', cargo: 'comandante' }, { label: 'PTR', cargo: 'patrulheiro' }].map(m => (
                    <div key={m.label} className="flex items-center justify-between">
                      <span className="text-[9px] font-black text-blue-500 w-8">{m.label}</span>
                      <div className={`flex-1 ml-2 h-8 flex items-center px-3 rounded-lg border transition-colors ${formData[`${m.cargo}_nome`] ? 'bg-blue-900/30 border-blue-500/50' : 'bg-white/5 border-dashed border-white/20'}`}>
                        <span className={`text-[10px] font-bold uppercase truncate ${formData[`${m.cargo}_nome`] ? 'text-white' : 'text-white/20 italic'}`}>
                          {formData[`${m.cargo}_nome`] || `---`}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Seleção de VTR e Serviço */}
              <div className="grid grid-cols-2 gap-3">
                <select className="vtr-input !py-4" value={formData.prefixo_vtr} onChange={(e) => handleVtrChange(e.target.value)}>
                  <option value="">VTR</option>
                  {viaturas.filter(v => tipoVistoria === 'SAÍDA' ? (v.Status === 'EM SERVIÇO' || v.STATUS === 'EM SERVIÇO') : true).map(v => (
                    <option key={v.Prefixo || v.PREFIXO} value={v.Prefixo || v.PREFIXO}>{v.Prefixo || v.PREFIXO}</option>
                  ))}
                </select>
                <select className="vtr-input !py-4" value={formData.tipo_servico} onChange={(e) => setFormData({...formData, tipo_servico: e.target.value, unidade_externa: ''})}>
                  <option value="">SERVIÇO</option>
                  {TIPOS_SERVICO.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>

              {/* Hodômetro e Monitoramento */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <input type="number" className={`vtr-input ${kmInvalido ? '!border-red-500 !bg-red-50 text-red-900' : ''}`} placeholder="KM" value={formData.hodometro} onChange={(e) => setFormData({...formData, hodometro: e.target.value})} />
                </div>
                <select className="vtr-input" value={formData.videomonitoramento} onChange={(e) => setFormData({...formData, videomonitoramento: e.target.value})}>
                  <option value="">MONITORAMENTO</option>
                  <option value="OPERANTE">OPERANTE</option>
                  <option value="INOPERANTE">INOPERANTE</option>
                  <option value="NÃO POSSUI">NÃO POSSUI</option>
                </select>
              </div>
              {kmInvalido && <p className="text-[9px] font-black text-red-600 flex items-center gap-1 animate-pulse ml-2"><AlertTriangle size={10}/> KM ABAIXO DO REGISTRO ANTERIOR ({kmReferencia})</p>}

              {/* Inputs de Matrícula */}
              {['motorista', 'comandante', 'patrulheiro'].map(cargo => (
                <div key={cargo} className="space-y-2">
                  <input 
                    placeholder={`MATRÍCULA ${cargo.toUpperCase()}`} 
                    className="vtr-input" 
                    value={formData[`${cargo}_re`]} 
                    onChange={(e) => handleMatriculaChange(e.target.value, cargo)} 
                  />
                  {formData[`${cargo}_re`].length >= 4 && !efetivoLocal.some(m => toStr(m.re).includes(formData[`${cargo}_re`])) && (
                    <div className="p-3 bg-blue-50 dark:bg-blue-900/10 border border-blue-200 rounded-2xl space-y-2">
                      <input placeholder="NOME COMPLETO" className="vtr-input !bg-white text-xs" value={formData[`${cargo}_nome`]} onChange={(e) => setFormData({...formData, [`${cargo}_nome`]: e.target.value.toUpperCase()})} />
                      <input placeholder="UNIDADE" className="vtr-input !bg-white text-xs" value={formData[`${cargo}_unidade`]} onChange={(e) => setFormData({...formData, [`${cargo}_unidade`]: e.target.value.toUpperCase()})} />
                    </div>
                  )}
                </div>
              ))}
            </section>
            
            <button 
              onClick={() => setStep(2)} 
              disabled={!formData.prefixo_vtr || !formData.motorista_nome || !formData.hodometro || kmInvalido} 
              className="btn-tatico w-full disabled:opacity-30"
            >
              PRÓXIMO <ChevronRight size={18}/>
            </button>
          </div>
        ) : (
          <div className="space-y-6 animate-in slide-in-from-right-4">
            {/* Checklist e Fotos */}
            <div className="grid gap-2">
              {(tipoVistoria === 'ENTRADA' ? ITENS_ENTRADA : ITENS_SAIDA).map(item => (
                <div key={item} onClick={() => setChecklist(prev => ({...prev, [item]: prev[item] === 'OK' ? 'FALHA' : 'OK'}))} className={`flex justify-between items-center p-4 bg-white dark:bg-slate-900 rounded-2xl border-2 transition-all cursor-pointer ${checklist[item] === 'FALHA' ? 'border-red-500 bg-red-50' : 'border-slate-100 dark:border-slate-800'}`}>
                  <span className="text-xs font-bold uppercase">{item}</span>
                  <div className={`px-3 py-1 rounded-lg text-[9px] font-black ${checklist[item] === 'OK' ? 'bg-green-100 text-green-700' : 'bg-red-600 text-white'}`}>{checklist[item]}</div>
                </div>
              ))}
            </div>

            {/* Upload de Fotos */}
            <div className={`p-6 rounded-[2.5rem] bg-white dark:bg-slate-900 border-2 ${temAvaria && fotos.length === 0 ? 'border-red-500' : 'border-slate-200 dark:border-slate-800'}`}>
              <p className="text-[10px] font-black mb-3 uppercase text-slate-400">Fotos da Vistoria {temAvaria && <span className="text-red-500">(Obrigatório)</span>}</p>
              <div className="grid grid-cols-4 gap-2">
                {fotos.map((f, i) => (
                  <div key={i} className="relative aspect-square rounded-xl overflow-hidden shadow-md">
                    <img src={f} className="object-cover w-full h-full" alt="vistoria"/>
                    <button onClick={() => setFotos(fotos.filter((_, idx) => idx !== i))} className="absolute top-1 right-1 bg-red-600 text-white rounded-full p-1"><X size={10}/></button>
                  </div>
                ))}
                {fotos.length < 4 && (
                  <label className="aspect-square rounded-xl border-2 border-dashed border-slate-300 flex items-center justify-center cursor-pointer">
                    {uploading ? <Loader2 className="animate-spin" /> : <Plus />}
                    <input type="file" accept="image/*" capture="environment" className="hidden" onChange={async (e) => {
                      const file = e.target.files[0]; if (!file) return;
                      setUploading(true);
                      try {
                        const compressed = await imageCompression(file, { maxSizeMB: 0.3, maxWidthOrHeight: 1024 });
                        const reader = new FileReader();
                        reader.readAsDataURL(compressed);
                        reader.onloadend = () => { setFotos(p => [...p, reader.result]); setUploading(false); };
                      } catch (err) { setUploading(false); }
                    }} />
                  </label>
                )}
              </div>
            </div>

            {/* Termo de Aceite */}
            <label className="flex items-start gap-4 p-5 bg-white dark:bg-slate-900 rounded-3xl border-2 border-slate-200 dark:border-slate-800 cursor-pointer">
              <input type="checkbox" className="w-6 h-6 mt-1 text-blue-600" checked={formData.termo_aceite} onChange={(e) => setFormData({...formData, termo_aceite: e.target.checked})} />
              <p className="text-[10px] font-black uppercase text-slate-500">
                Eu, <span className="text-slate-900 dark:text-white underline">{formData.motorista_nome}</span>, declaro que as informações acima são verdadeiras e condizem com o estado real da viatura.
              </p>
            </label>

            <div className="flex gap-2">
              <button onClick={() => setStep(1)} className="flex-1 bg-white p-5 rounded-2xl font-black border-2 border-slate-200 uppercase text-xs">Voltar</button>
              <button onClick={handleFinalizar} disabled={!formData.termo_aceite || loading || (temAvaria && fotos.length === 0)} className="btn-tatico flex-[2] disabled:opacity-30">
                {loading ? <Loader2 className="animate-spin mx-auto"/> : "FINALIZAR ENVIO"}
              </button>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default Vistoria;
