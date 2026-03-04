import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../lib/AuthContext';
import { gasApi } from '../api/gasClient';
import imageCompression from 'browser-image-compression';
import { 
  ArrowLeft, ChevronRight, Loader2, X, Plus, 
  Users, AlertTriangle, Lock, Unlock, Car, Shield, Tool
} from 'lucide-react';

// --- CONFIGURAÇÃO DE GRUPOS ---
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
    icon: <Tool size={16} />,
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

  const [checklist, setChecklist] = useState({});

  useEffect(() => {
    const todosItens = tipoVistoria === 'ENTRADA' 
      ? GRUPOS_ENTRADA.flatMap(g => g.itens) 
      : ITENS_SAIDA;
    setChecklist(todosItens.reduce((acc, item) => ({ ...acc, [item]: 'OK' }), {}));
  }, [tipoVistoria]);

  const temAvaria = useMemo(() => Object.values(checklist).includes('FALHA'), [checklist]);
  const toStr = (val) => (val !== undefined && val !== null ? String(val) : '');

  // Validação de campos obrigatórios (Patrulheiro é opcional)
  const isFormIncompleto = !formData.prefixo_vtr || 
                           !formData.tipo_servico || 
                           !formData.hodometro || 
                           !formData.motorista_nome || 
                           !formData.comandante_nome ||
                           kmInvalido;

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
      } catch (e) { console.error("Erro na sincronização"); }
      finally { setLoading(false); }
    };
    sincronizarDados();
  }, [frotaInicial, viaturas.length]);

  const handleTrocaTipo = (novoTipo) => {
    if (formData.prefixo_vtr && !window.confirm("Mudar o tipo limpará os dados atuais. Continuar?")) return;
    setTipoVistoria(novoTipo);
    setStep(1);
    setFotos([]);
    setFormData({
      prefixo_vtr: '', placa_vtr: '', hodometro: '', videomonitoramento: '', tipo_servico: '', unidade_externa: '',
      motorista_re: '', motorista_nome: '', motorista_unidade: '',
      comandante_re: '', comandante_nome: '', comandante_unidade: '',
      patrulheiro_re: '', patrulheiro_nome: '', patrulheiro_unidade: '',
      termo_aceite: false
    });
  };

  const handleMatriculaChange = (valor, cargo) => {
    let reLimpo = toStr(valor).replace(/\D/g, '');
    setFormData(prev => ({ ...prev, [`${cargo}_re`]: reLimpo }));
    if (reLimpo.length >= 4) {
      let reParaBusca = (reLimpo.length <= 6 && !reLimpo.startsWith("1000")) ? "1000" + reLimpo : reLimpo;
      const militar = efetivoLocal.find(m => toStr(m.re) === reParaBusca || toStr(m.re) === reLimpo);
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
    }
  };

  const handleVtrChange = (prefixo) => {
    const vtr = viaturas.find(v => toStr(v.Prefixo) === toStr(prefixo));
    if (!vtr) return;
    setKmReferencia(Number(vtr.UltimoKM) || 0);
    const novosDados = {
      ...formData,
      prefixo_vtr: toStr(vtr.Prefixo),
      placa_vtr: toStr(vtr.Placa),
      tipo_servico: tipoVistoria === 'SAÍDA' ? toStr(vtr.UltimoTipoServico || '') : formData.tipo_servico,
      hodometro: tipoVistoria === 'SAÍDA' ? toStr(vtr.UltimoKM || '') : formData.hodometro,
      motorista_re: tipoVistoria === 'SAÍDA' ? toStr(vtr.UltimoMotoristaRE || '') : formData.motorista_re,
      motorista_nome: tipoVistoria === 'SAÍDA' ? toStr(vtr.UltimoMotoristaNome || '') : formData.motorista_nome,
      comandante_re: tipoVistoria === 'SAÍDA' ? toStr(vtr.UltimoComandanteRE || '') : formData.comandante_re,
      comandante_nome: tipoVistoria === 'SAÍDA' ? toStr(vtr.UltimoComandanteNome || '') : formData.comandante_nome,
      patrulheiro_re: tipoVistoria === 'SAÍDA' ? toStr(vtr.UltimoPatrulheiroRE || '') : formData.patrulheiro_re,
      patrulheiro_nome: tipoVistoria === 'SAÍDA' ? toStr(vtr.UltimoPatrulheiroNome || '') : formData.patrulheiro_nome,
    };
    setFormData(novosDados);
    if (tipoVistoria === 'SAÍDA') {
      ['motorista', 'comandante', 'patrulheiro'].forEach(c => {
        if (novosDados[`${c}_re`] && !novosDados[`${c}_nome`]) handleMatriculaChange(novosDados[`${c}_re`], c);
      });
    }
  };

  const kmInvalido = tipoVistoria === 'SAÍDA' && Number(formData.hodometro) <= kmReferencia;

  const handleFinalizar = async () => {
    if (temAvaria && fotos.length === 0) return alert("ERRO: É obrigatório tirar fotos das avarias.");
    if (!window.confirm("Deseja finalizar o envio?")) return;
    setLoading(true);
    try {
      const falhas = Object.entries(checklist).filter(([_, s]) => s === 'FALHA').map(([i]) => i);
      let resumo = falhas.length === 0 ? "SEM ALTERAÇÕES" : 
                   tipoVistoria === 'ENTRADA' ? `FALHA EM: ${falhas.join(', ')}` :
                   falhas.map(item => MAPA_FALHAS_SAIDA[item] || item).join(', ');

      const res = await gasApi.saveVistoria({
        ...formData,
        tipo_vistoria: tipoVistoria,
        checklist_resumo: resumo,
        fotos_vistoria: fotos,
        proteger_ocorrencia: protegerFotos,
        militar_logado: `${user.patente} ${user.nome}`,
        status_garageiro: "PENDENTE"
      });
      if (res.status === 'success') { alert("Sucesso!"); onBack(); } 
      else { alert("Erro: " + res.message); }
    } catch (e) { alert("Erro de conexão."); }
    finally { setLoading(false); }
  };

  // Componente Reutilizável de Card de Guarnição (usado nos dois steps)
  const CardGuarnicao = ({ compacto = false }) => (
    <div className={`${compacto ? 'bg-slate-800 p-3 rounded-2xl' : 'bg-slate-900 p-5 rounded-3xl'} mb-4 border-b-4 border-blue-600`}>
      <div className={`flex items-center gap-2 border-b border-white/10 ${compacto ? 'mb-2 pb-1' : 'mb-4 pb-2'}`}>
        <Users className="text-blue-400" size={compacto ? 14 : 18} />
        <span className={`${compacto ? 'text-[8px]' : 'text-[10px]'} font-black text-white tracking-widest uppercase`}>Guarnição Atual</span>
      </div>
      <div className="space-y-2">
        {[{ label: 'MOT', cargo: 'motorista' }, { label: 'CMD', cargo: 'comandante' }, { label: 'PTR', cargo: 'patrulheiro' }].map(m => (
          <div key={m.label} className="flex items-center">
            <span className={`${compacto ? 'text-[7px]' : 'text-[9px]'} font-black text-blue-500 w-8`}>{m.label}</span>
            <div className={`flex-1 ml-2 ${compacto ? 'h-6' : 'h-8'} flex items-center px-3 rounded-lg border ${formData[`${m.cargo}_nome`] ? 'bg-blue-900/30 border-blue-500/50' : 'bg-white/5 border-dashed border-white/20'}`}>
              <span className={`${compacto ? 'text-[8px]' : 'text-[10px]'} font-bold uppercase truncate ${formData[`${m.cargo}_nome`] ? 'text-white' : 'text-white/20 italic'}`}>
                {formData[`${m.cargo}_nome`] || `---`}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-50 pb-10 text-slate-900">
      <header className="bg-slate-900 text-white p-5 sticky top-0 z-50 border-b-4 border-blue-900 shadow-md">
        <div className="max-w-xl mx-auto flex items-center justify-between">
          <button onClick={onBack} className="p-2 bg-white/10 rounded-full hover:bg-white/20"><ArrowLeft size={24}/></button>
          <div className="text-center">
            <h1 className="font-black text-[10px] tracking-widest opacity-50 uppercase">1º BPM - Rondon</h1>
            <p className="text-xs font-bold text-blue-400 uppercase">VISTORIA DE VIATURA</p>
          </div>
          <div className="w-10" />
        </div>
      </header>

      <main className="max-w-xl mx-auto p-4 space-y-6">
        <div className="flex bg-slate-200 p-1 rounded-2xl shadow-inner">
          <button onClick={() => handleTrocaTipo('ENTRADA')} className={`flex-1 py-3 rounded-xl font-black text-[10px] transition-all ${tipoVistoria === 'ENTRADA' ? 'bg-green-600 text-white shadow-lg' : 'text-slate-500'}`}>ENTRADA (ASSUMIR)</button>
          <button onClick={() => handleTrocaTipo('SAÍDA')} className={`flex-1 py-3 rounded-xl font-black text-[10px] transition-all ${tipoVistoria === 'SAÍDA' ? 'bg-orange-500 text-white shadow-lg' : 'text-slate-500'}`}>SAÍDA (ENTREGAR)</button>
        </div>

        {step === 1 ? (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4">
            <section className="bg-white rounded-[2.5rem] p-6 shadow-sm border border-slate-200 space-y-5">
              <CardGuarnicao />
              
              <div className="grid grid-cols-2 gap-3">
                <select className="vtr-input !py-4" value={formData.prefixo_vtr} onChange={(e) => handleVtrChange(e.target.value)}>
                  <option value="">VTR</option>
                  {viaturas.map(v => <option key={v.Prefixo} value={v.Prefixo}>{v.Prefixo}</option>)}
                </select>
                <select className="vtr-input !py-4" value={formData.tipo_servico} onChange={(e) => setFormData({...formData, tipo_servico: e.target.value})}>
                  <option value="">SERVIÇO</option>
                  {TIPOS_SERVICO.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <input type="number" className={`vtr-input ${kmInvalido ? '!border-red-500 !bg-red-50' : ''}`} placeholder="KM ATUAL" value={formData.hodometro} onChange={(e) => setFormData({...formData, hodometro: e.target.value})} />
                <select className="vtr-input" value={formData.videomonitoramento} onChange={(e) => setFormData({...formData, videomonitoramento: e.target.value})}>
                  <option value="">CÂMERAS</option>
                  <option value="OPERANTE">OPERANTE</option>
                  <option value="INOPERANTE">INOPERANTE</option>
                </select>
              </div>

              {['motorista', 'comandante', 'patrulheiro'].map(cargo => (
                <div key={cargo}>
                  <input 
                    placeholder={`MATRÍCULA ${cargo === 'patrulheiro' ? cargo.toUpperCase() + ' (OPCIONAL)' : cargo.toUpperCase()}`}
                    className="vtr-input !bg-slate-50" 
                    value={formData[`${cargo}_re`]} 
                    onChange={(e) => handleMatriculaChange(e.target.value, cargo)}
                  />
                </div>
              ))}
            </section>
            
            <button 
              onClick={() => setStep(2)} 
              disabled={isFormIncompleto} 
              className="btn-tatico w-full disabled:opacity-50 disabled:grayscale"
            >
              PRÓXIMO: CHECKLIST <ChevronRight size={18}/>
            </button>
          </div>
        ) : (
          <div className="space-y-6 animate-in slide-in-from-right-4">
            {/* Card de Guarnição repetido aqui no Step 2 */}
            <CardGuarnicao compacto={true} />

            <div onClick={() => setProtegerFotos(!protegerFotos)} className={`p-4 rounded-3xl border-2 transition-all flex items-center gap-4 ${protegerFotos ? 'bg-blue-600 border-blue-400 text-white' : 'bg-white border-slate-200'}`}>
              {protegerFotos ? <Lock size={20} /> : <Unlock size={20} className="opacity-30" />}
              <span className="font-black text-[10px] uppercase">Proteger Imagens (Evidência)</span>
            </div>

            <div className="space-y-4">
              {tipoVistoria === 'ENTRADA' ? (
                GRUPOS_ENTRADA.map(grupo => (
                  <div key={grupo.nome} className="bg-white rounded-3xl p-4 shadow-sm border border-slate-200">
                    <div className="flex items-center gap-2 mb-3 text-blue-700">
                      {grupo.icon} <span className="font-black text-[10px] uppercase">{grupo.nome}</span>
                    </div>
                    <div className="grid gap-2">
                      {grupo.itens.map(item => (
                        <div key={item} onClick={() => setChecklist(prev => ({...prev, [item]: prev[item] === 'OK' ? 'FALHA' : 'OK'}))} className={`flex justify-between items-center p-3 rounded-xl border ${checklist[item] === 'FALHA' ? 'border-red-500 bg-red-50' : 'bg-slate-50/50'}`}>
                          <span className="text-[11px] font-bold uppercase">{item}</span>
                          <span className={`text-[9px] font-black px-2 py-1 rounded ${checklist[item] === 'OK' ? 'text-green-600' : 'bg-red-600 text-white'}`}>{checklist[item]}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                ))
              ) : (
                <div className="bg-white rounded-3xl p-4 border border-slate-200 grid gap-2">
                  {ITENS_SAIDA.map(item => (
                    <div key={item} onClick={() => setChecklist(prev => ({...prev, [item]: prev[item] === 'OK' ? 'FALHA' : 'OK'}))} className={`flex justify-between items-center p-3 rounded-xl border ${checklist[item] === 'FALHA' ? 'border-red-500 bg-red-50' : 'border-slate-100'}`}>
                      <span className="text-[11px] font-bold uppercase">{item}</span>
                      <span className={`text-[9px] font-black px-2 py-1 rounded ${checklist[item] === 'OK' ? 'text-green-600' : 'bg-red-600 text-white'}`}>{checklist[item]}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className={`p-6 rounded-[2.5rem] border-2 bg-white ${temAvaria && fotos.length === 0 ? 'border-red-500 animate-pulse' : 'border-slate-200'}`}>
              <div className="grid grid-cols-4 gap-2">
                {fotos.map((f, i) => (
                  <div key={i} className="relative aspect-square rounded-2xl overflow-hidden border border-slate-200"><img src={f} className="object-cover w-full h-full"/><button onClick={() => setFotos(p => p.filter((_, idx) => idx !== i))} className="absolute top-1 right-1 bg-red-600 text-white rounded-full p-1"><X size={10}/></button></div>
                ))}
                {fotos.length < 4 && (
                  <label className="aspect-square rounded-2xl border-2 border-dashed border-slate-300 flex items-center justify-center cursor-pointer bg-slate-50">
                    {uploading ? <Loader2 className="animate-spin text-blue-600" /> : <Plus className="text-slate-400" />}
                    <input type="file" accept="image/*" capture="environment" className="hidden" onChange={async (e) => {
                      const file = e.target.files[0]; if (!file) return;
                      setUploading(true);
                      try {
                        const compressed = await imageCompression(file, { maxSizeMB: 0.2, maxWidthOrHeight: 1000 });
                        const reader = new FileReader(); reader.readAsDataURL(compressed);
                        reader.onloadend = () => { setFotos(p => [...p, reader.result]); setUploading(false); };
                      } catch (err) { setUploading(false); }
                    }} />
                  </label>
                )}
              </div>
            </div>

            <label className="flex items-start gap-4 p-5 bg-white border-2 border-slate-200 rounded-3xl cursor-pointer">
              <input type="checkbox" className="w-6 h-6 rounded text-blue-600 mt-1" checked={formData.termo_aceite} onChange={(e) => setFormData({...formData, termo_aceite: e.target.checked})} />
              <p className="text-[9px] font-black uppercase text-slate-500 leading-tight">
                Eu, <span className="text-slate-900 underline">{formData.motorista_nome || 'MOTORISTA'}</span>, declaro que as informações acima são verdadeiras.
              </p>
            </label>

            <div className="flex gap-2">
              <button onClick={() => setStep(1)} className="flex-1 bg-white p-5 rounded-2xl font-black border-2 border-slate-200">VOLTAR</button>
              <button onClick={handleFinalizar} disabled={!formData.termo_aceite || loading || (temAvaria && fotos.length === 0)} className="btn-tatico flex-[2]">
                {loading ? <Loader2 className="animate-spin mx-auto"/> : "FINALIZAR"}
              </button>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default Vistoria;
