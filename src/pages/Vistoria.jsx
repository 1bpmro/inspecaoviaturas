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

  // Inicialização do Checklist
  const [checklist, setChecklist] = useState(() => {
    const todosItens = tipoVistoria === 'ENTRADA' 
      ? GRUPOS_ENTRADA.flatMap(g => g.itens) 
      : ITENS_SAIDA;
    return todosItens.reduce((acc, item) => ({ ...acc, [item]: 'OK' }), {});
  });

  const temAvaria = useMemo(() => Object.values(checklist).includes('FALHA'), [checklist]);
  const toStr = (val) => (val !== undefined && val !== null ? String(val) : '');

  // Sincronização de Dados
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
    const novosItens = novoTipo === 'ENTRADA' ? GRUPOS_ENTRADA.flatMap(g => g.itens) : ITENS_SAIDA;
    setChecklist(novosItens.reduce((acc, item) => ({ ...acc, [item]: 'OK' }), {}));
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

    const kmAnterior = Number(vtr.UltimoKM) || 0;
    setKmReferencia(kmAnterior);

    if (tipoVistoria === 'SAÍDA') {
      // Mapeamento robusto dos dados da última guarnição
      const novosDados = {
        ...formData,
        prefixo_vtr: toStr(vtr.Prefixo),
        placa_vtr: toStr(vtr.Placa),
        tipo_servico: toStr(vtr.UltimoTipoServico || vtr.TipoServico || ''),
        hodometro: toStr(vtr.UltimoKM || vtr.KM || ''),
        videomonitoramento: toStr(vtr.UltimoVideoMonitoramento || vtr.VideoMonitoramento || ''),
        
        // MOTORISTA
        motorista_re: toStr(vtr.UltimoMotoristaRE || vtr.MotoristaRE || ''),
        motorista_nome: toStr(vtr.UltimoMotoristaNome || vtr.MotoristaNome || vtr.Motorista || ''),
        motorista_unidade: toStr(vtr.UltimoMotoristaUnidade || vtr.MotoristaUnidade || '1º BPM'),

        // COMANDANTE
        comandante_re: toStr(vtr.UltimoComandanteRE || vtr.ComandanteRE || ''),
        comandante_nome: toStr(vtr.UltimoComandanteNome || vtr.ComandanteNome || vtr.Comandante || ''),
        comandante_unidade: toStr(vtr.UltimoComandanteUnidade || vtr.ComandanteUnidade || '1º BPM'),

        // PATRULHEIRO
        patrulheiro_re: toStr(vtr.UltimoPatrulheiroRE || vtr.PatrulheiroRE || ''),
        patrulheiro_nome: toStr(vtr.UltimoPatrulheiroNome || vtr.PatrulheiroNome || vtr.Patrulheiro || ''),
        patrulheiro_unidade: toStr(vtr.UltimoPatrulheiroUnidade || vtr.PatrulheiroUnidade || '1º BPM'),
      };

      setFormData(novosDados);

      // Sincroniza os nomes caso o RE venha mas o nome esteja desatualizado
      ['motorista', 'comandante', 'patrulheiro'].forEach(cargo => {
        const re = novosDados[`${cargo}_re`];
        if (re && !novosDados[`${cargo}_nome`]) {
          handleMatriculaChange(re, cargo);
        }
      });

    } else {
      // Na ENTRADA, apenas prefixo e placa
      setFormData(prev => ({ ...prev, prefixo_vtr: toStr(vtr.Prefixo), placa_vtr: toStr(vtr.Placa) }));
    }
  };

  const kmInvalido = tipoVistoria === 'SAÍDA' && Number(formData.hodometro) <= kmReferencia;

  const handleFinalizar = async () => {
    if (temAvaria && fotos.length === 0) return alert("ERRO: É obrigatório tirar fotos das avarias/falhas constatadas.");
    if (!window.confirm("Deseja finalizar e enviar esta inspeção?")) return;

    setLoading(true);
    try {
      const falhas = Object.entries(checklist).filter(([_, status]) => status === 'FALHA').map(([item]) => item);
      let resumo = falhas.length === 0 ? "SEM ALTERAÇÕES" : 
                   tipoVistoria === 'ENTRADA' ? `FALHA EM: ${falhas.join(', ')}` :
                   falhas.map(item => MAPA_FALHAS_SAIDA[item] || item).join(', ');

      const payloadFinal = {
        ...formData,
        tipo_vistoria: tipoVistoria,
        checklist_resumo: resumo,
        fotos_vistoria: fotos,
        proteger_ocorrencia: protegerFotos,
        militar_logado: `${user.patente} ${user.nome}`,
        status_garageiro: "PENDENTE"
      };

      const res = await gasApi.saveVistoria(payloadFinal);
      if (res.status === 'success') { 
        alert("Inspeção enviada com sucesso!"); 
        onBack(); 
      } else { alert("Erro: " + res.message); }
    } catch (e) { alert("Erro de conexão. Verifique o sinal da internet."); }
    finally { setLoading(false); }
  };

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
        {/* Toggle Tipo */}
        <div className="flex bg-slate-200 p-1 rounded-2xl shadow-inner">
          <button onClick={() => handleTrocaTipo('ENTRADA')} className={`flex-1 py-3 rounded-xl font-black text-[10px] transition-all ${tipoVistoria === 'ENTRADA' ? 'bg-green-600 text-white shadow-lg' : 'text-slate-500'}`}>ENTRADA (ASSUMIR)</button>
          <button onClick={() => handleTrocaTipo('SAÍDA')} className={`flex-1 py-3 rounded-xl font-black text-[10px] transition-all ${tipoVistoria === 'SAÍDA' ? 'bg-orange-500 text-white shadow-lg' : 'text-slate-500'}`}>SAÍDA (ENTREGAR)</button>
        </div>

        {step === 1 ? (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4">
            <section className="bg-white rounded-[2.5rem] p-6 shadow-sm border border-slate-200 space-y-5">
              {/* Card Guarnição */}
              <div className="bg-slate-900 rounded-3xl p-5 mb-4 border-b-4 border-blue-600">
                <div className="flex items-center gap-2 mb-4 border-b border-white/10 pb-2">
                  <Users className="text-blue-400" size={18} />
                  <span className="text-[10px] font-black text-white tracking-widest uppercase">Guarnição</span>
                </div>
                <div className="space-y-3">
                  {[{ label: 'MOT', cargo: 'motorista' }, { label: 'CMD', cargo: 'comandante' }, { label: 'PTR', cargo: 'patrulheiro' }].map(m => (
                    <div key={m.label} className="flex items-center">
                      <span className="text-[9px] font-black text-blue-500 w-8">{m.label}</span>
                      <div className={`flex-1 ml-2 h-8 flex items-center px-3 rounded-lg border ${formData[`${m.cargo}_nome`] ? 'bg-blue-900/30 border-blue-500/50' : 'bg-white/5 border-dashed border-white/20'}`}>
                        <span className={`text-[10px] font-bold uppercase truncate ${formData[`${m.cargo}_nome`] ? 'text-white' : 'text-white/20 italic'}`}>
                          {formData[`${m.cargo}_nome`] || `---`}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Inputs Principais */}
              <div className="grid grid-cols-2 gap-3">
                <select className="vtr-input !py-4" value={formData.prefixo_vtr} onChange={(e) => handleVtrChange(e.target.value)}>
                  <option value="">VTR</option>
                  {viaturas.map(v => <option key={v.Prefixo} value={v.Prefixo}>{v.Prefixo}</option>)}
                </select>
                <select className="vtr-input !py-4" value={formData.tipo_servico} onChange={(e) => setFormData({...formData, tipo_servico: e.target.value, unidade_externa: ''})}>
                  <option value="">SERVIÇO</option>
                  {TIPOS_SERVICO.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <span className="text-[9px] font-black text-slate-400 ml-2 uppercase">Hodômetro</span>
                  <input type="number" className={`vtr-input ${kmInvalido ? '!border-red-500 !bg-red-50' : ''}`} placeholder="KM" value={formData.hodometro} onChange={(e) => setFormData({...formData, hodometro: e.target.value})} />
                </div>
                <div className="space-y-1">
                  <span className="text-[9px] font-black text-slate-400 ml-2 uppercase">Câmeras</span>
                  <select className="vtr-input" value={formData.videomonitoramento} onChange={(e) => setFormData({...formData, videomonitoramento: e.target.value})}>
                    <option value="">STATUS</option>
                    <option value="OPERANTE">OPERANTE</option>
                    <option value="INOPERANTE">INOPERANTE</option>
                    <option value="NÃO POSSUI">NÃO POSSUI</option>
                  </select>
                </div>
              </div>

              {/* Busca de Militares */}
              {['motorista', 'comandante', 'patrulheiro'].map(cargo => (
                <div key={cargo} className="space-y-1">
                  <input 
                    placeholder={`MATRÍCULA ${cargo.toUpperCase()}`} 
                    className="vtr-input !bg-slate-50" 
                    value={formData[`${cargo}_re`]} 
                    onChange={(e) => handleMatriculaChange(e.target.value, cargo)}
                  />
                  {formData[`${cargo}_re`].length >= 4 && !formData[`${cargo}_nome`] && (
                    <div className="p-3 bg-blue-50 border border-blue-200 rounded-2xl">
                      <p className="text-[8px] font-black text-blue-600 mb-2 uppercase">Militar não encontrado (Preencha manual)</p>
                      <input placeholder="PATENTE E NOME" className="w-full bg-transparent border-b border-blue-200 text-[10px] font-bold uppercase mb-2 outline-none" onChange={(e) => setFormData({...formData, [`${cargo}_nome`]: e.target.value.toUpperCase()})} />
                      <input placeholder="UNIDADE" className="w-full bg-transparent text-[10px] font-bold uppercase outline-none" onChange={(e) => setFormData({...formData, [`${cargo}_unidade`]: e.target.value.toUpperCase()})} />
                    </div>
                  )}
                </div>
              ))}
            </section>
            
            <button onClick={() => setStep(2)} disabled={!formData.prefixo_vtr || !formData.motorista_nome || !formData.hodometro || kmInvalido} className="btn-tatico w-full">
              PRÓXIMO: CHECKLIST <ChevronRight size={18}/>
            </button>
          </div>
        ) : (
          <div className="space-y-6 animate-in slide-in-from-right-4">
            {/* Proteção de Dados */}
            <div onClick={() => setProtegerFotos(!protegerFotos)} className={`p-4 rounded-3xl border-2 transition-all flex items-center gap-4 ${protegerFotos ? 'bg-blue-600 border-blue-400 text-white' : 'bg-white border-slate-200'}`}>
              {protegerFotos ? <Lock size={24} /> : <Unlock size={24} className="opacity-30" />}
              <div className="text-left">
                <h4 className="font-black text-[10px] uppercase">Proteção de Imagens</h4>
                <p className="text-[9px] opacity-80">Marcar como evidência (não apagar automaticamente)</p>
              </div>
            </div>

            {/* Checklist Agrupado */}
            <div className="space-y-4">
              {tipoVistoria === 'ENTRADA' ? (
                GRUPOS_ENTRADA.map(grupo => (
                  <div key={grupo.nome} className="bg-white rounded-3xl p-4 shadow-sm border border-slate-200">
                    <div className="flex items-center gap-2 mb-3 text-blue-700">
                      {grupo.icon}
                      <span className="font-black text-[10px] uppercase tracking-wider">{grupo.nome}</span>
                    </div>
                    <div className="grid gap-2">
                      {grupo.itens.map(item => (
                        <div key={item} onClick={() => setChecklist(prev => ({...prev, [item]: prev[item] === 'OK' ? 'FALHA' : 'OK'}))} className={`flex justify-between items-center p-3 rounded-xl border transition-all ${checklist[item] === 'FALHA' ? 'border-red-500 bg-red-50' : 'border-slate-100 bg-slate-50/50'}`}>
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

            {/* Fotos e Envio */}
            <div className={`p-6 rounded-[2.5rem] border-2 bg-white ${temAvaria && fotos.length === 0 ? 'border-red-500 animate-pulse' : 'border-slate-200'}`}>
              <p className="text-[10px] font-black mb-3 uppercase text-slate-400 text-center">Fotos da Vistoria {temAvaria && <span className="text-red-600">(Obrigatório)</span>}</p>
              <div className="grid grid-cols-4 gap-2">
                {fotos.map((f, i) => (
                  <div key={i} className="relative aspect-square rounded-2xl overflow-hidden border border-slate-200 shadow-sm">
                    <img src={f} className="object-cover w-full h-full" alt="vtr"/>
                    <button onClick={() => setFotos(p => p.filter((_, idx) => idx !== i))} className="absolute top-1 right-1 bg-red-600 text-white rounded-full p-1"><X size={10}/></button>
                  </div>
                ))}
                {fotos.length < 4 && (
                  <label className="aspect-square rounded-2xl border-2 border-dashed border-slate-300 flex items-center justify-center cursor-pointer bg-slate-50">
                    {uploading ? <Loader2 className="animate-spin text-blue-600" /> : <Plus className="text-slate-400" />}
                    <input type="file" accept="image/*" capture="environment" className="hidden" onChange={async (e) => {
                      const file = e.target.files[0]; if (!file) return;
                      setUploading(true);
                      try {
                        const compressed = await imageCompression(file, { maxSizeMB: 0.2, maxWidthOrHeight: 1000, useWebWorker: true });
                        const reader = new FileReader(); reader.readAsDataURL(compressed);
                        reader.onloadend = () => { setFotos(p => [...p, reader.result]); setUploading(false); };
                      } catch (err) { setUploading(false); }
                    }} />
                  </label>
                )}
              </div>
            </div>

            {/* Termo e Botões */}
            <label className="flex items-start gap-4 p-5 bg-white border-2 border-slate-200 rounded-3xl cursor-pointer">
              <input type="checkbox" className="w-6 h-6 rounded text-blue-600 mt-1" checked={formData.termo_aceite} onChange={(e) => setFormData({...formData, termo_aceite: e.target.checked})} />
              <p className="text-[9px] font-black uppercase text-slate-500 leading-tight text-left">
                Eu, <span className="text-slate-900 underline">{formData.motorista_nome || 'MOTORISTA'}</span>, declaro que as informações acima são verdadeiras e assumo a responsabilidade pela viatura.
              </p>
            </label>

            <div className="flex gap-2">
              <button onClick={() => setStep(1)} className="flex-1 bg-white p-5 rounded-2xl font-black border-2 border-slate-200">VOLTAR</button>
              <button onClick={handleFinalizar} disabled={!formData.termo_aceite || loading || (temAvaria && fotos.length === 0)} className="btn-tatico flex-[2] disabled:opacity-30">
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
