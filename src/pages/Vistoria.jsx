import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '../lib/AuthContext';
import { gasApi } from '../api/gasClient';
import imageCompression from 'browser-image-compression';
import { 
  ArrowLeft, CheckCircle2, ShieldCheck, 
  ChevronRight, Save, Loader2, Camera, X, Plus, Video, VideoOff
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
  "Limpeza Interna", "Limpeza Extrena", "Pertences da Guarnição Retirados"
];

const TIPOS_SERVICO = ["Patrulhamento Ordinário", "Operação", "Força Tática", "Patrulha Comunitária", "Patrulhamento Rural", "Outro"];
const SUB_PATRULHA = ["Patrulha Escolar", "Base Móvel", "Patrulha Comercial"];
const GRADUACOES = ["SD PM", "CB PM", "3º SGT PM", "2º SGT PM", "1º SGT PM", "SUB TEN PM", "ASP OF PM" ,"2º TEN PM", "1º TEN PM", "CAP PM", "MAJ PM", "TEN CEL PM", "CEL PM"];

const Vistoria = ({ onBack }) => {
  const { user, logout } = useAuth();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [viaturas, setViaturas] = useState([]);
  const [tipoVistoria, setTipoVistoria] = useState('ENTRADA');
  const [fotos, setFotos] = useState([]);
  const timeoutRef = useRef(null);

  const [isNovoMilitar, setIsNovoMilitar] = useState({ motorista: false, comandante: false, patrulheiro: false });

  const [formData, setFormData] = useState({
    prefixo_vtr: '', placa_vtr: '', hodometro: '', tipo_servico: '', unidade_externa: '',
    video_monitoramento: 'NÃO POSSUI', video_status: '',
    motorista_re: '', motorista_nome: '', motorista_grad: '', motorista_nome_cru: '',
    comandante_re: '', comandante_nome: '', comandante_grad: '', comandante_nome_cru: '',
    patrulheiro_re: '', patrulheiro_nome: '', patrulheiro_grad: '', patrulheiro_nome_cru: '',
    observacoes: '', termo_aceite: false
  });

  const [checklist, setChecklist] = useState({});
  const itensAtuais = tipoVistoria === 'ENTRADA' ? ITENS_ENTRADA : ITENS_SAIDA;

  // --- HIGIENIZAÇÃO DE RE ---
  const formatarRE = (reRaw) => {
    const apenasNumeros = reRaw.replace(/\D/g, ''); 
    if (!apenasNumeros) return '';
    return apenasNumeros.length <= 6 ? `1000${apenasNumeros}` : apenasNumeros;
  };

  const resetTimer = useCallback(() => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => { alert("Sessão encerrada."); logout(); }, 600000); 
  }, [logout]);

  useEffect(() => {
    window.addEventListener('touchstart', resetTimer);
    resetTimer();
    return () => window.removeEventListener('touchstart', resetTimer);
  }, [resetTimer]);

  useEffect(() => {
    const carregarDados = async () => {
      const cache = localStorage.getItem('frota_cache');
      if (cache) setViaturas(JSON.parse(cache));
      const res = await gasApi.getViaturas();
      if (res.status === 'success') {
        setViaturas(res.data);
        localStorage.setItem('frota_cache', JSON.stringify(res.data));
      }
    };
    carregarDados();
  }, []);

  useEffect(() => {
    setChecklist(itensAtuais.reduce((acc, item) => ({ ...acc, [item]: 'OK' }), {}));
  }, [tipoVistoria, itensAtuais]);

  const handleVtrChange = (prefixo) => {
    const vtr = viaturas.find(v => v.Prefixo === prefixo);
    if (!vtr) return;
    const base = { ...formData, prefixo_vtr: prefixo, placa_vtr: vtr.Placa || '' };
    if (tipoVistoria === 'SAÍDA') {
      setFormData({
        ...base,
        motorista_re: vtr.UltimoMotoristaRE || '', motorista_nome: vtr.UltimoMotoristaNome || '',
        comandante_re: vtr.UltimoComandanteRE || '', comandante_nome: vtr.UltimoComandanteNome || '',
        patrulheiro_re: vtr.UltimoPatrulheiroRE || '', patrulheiro_nome: vtr.UltimoPatrulheiroNome || '',
        tipo_servico: vtr.UltimoTipoServico || ''
      });
    } else { setFormData(base); }
  };

  const buscarMilitar = async (reRaw, cargo) => {
    const reLimpo = formatarRE(reRaw);
    if (reLimpo.length < 4) return;
    
    setFormData(prev => ({ ...prev, [`${cargo}_re`]: reLimpo }));

    try {
      const res = await gasApi.buscarMilitar(reLimpo);
      if (res.status === 'success') {
        setFormData(prev => ({ 
          ...prev, 
          [`${cargo}_nome`]: `${res.patente} ${res.nome}`, 
          [`${cargo}_nome_cru`]: res.nome, 
          [`${cargo}_grad`]: res.patente 
        }));
        setIsNovoMilitar(prev => ({ ...prev, [cargo]: false }));
      } else {
        setIsNovoMilitar(prev => ({ ...prev, [cargo]: true }));
        setFormData(prev => ({ ...prev, [`${cargo}_nome`]: '' }));
      }
    } catch (e) { console.error(e); }
  };

  const handleFinalizar = async () => {
    if (fotos.length === 0 && tipoVistoria === 'ENTRADA') return alert("Foto obrigatória na entrada.");
    setLoading(true);
    const finalData = { ...formData };
    ['motorista', 'comandante', 'patrulheiro'].forEach(c => {
      if (isNovoMilitar[c]) finalData[`${c}_nome`] = `${formData[`${c}_grad`]} ${formData[`${c}_nome_cru`]}`.toUpperCase();
    });

    try {
      const res = await gasApi.saveVistoria({
        ...finalData,
        tipo_vistoria: tipoVistoria,
        checklist_resumo: Object.entries(checklist).filter(([_, s]) => s === 'FALHA').map(([i]) => i).join(', ') || "SEM ALTERAÇÕES",
        fotos_vistoria: fotos, 
        militar_logado: `${user.patente} ${user.nome}`,
      });
      if (res.status === 'success') { alert("Sucesso!"); onBack(); }
    } catch (error) { alert("Erro de conexão."); } finally { setLoading(false); }
  };

  return (
    <div className="min-h-screen bg-slate-50 pb-10 font-sans text-slate-900">
      <header className="bg-slate-900 text-white p-5 shadow-2xl sticky top-0 z-50 border-b-4 border-blue-900">
        <div className="max-w-xl mx-auto flex items-center justify-between">
          <button onClick={onBack} className="p-2 hover:bg-slate-800 rounded-full"><ArrowLeft size={24}/></button>
          <div className="text-center">
            <h1 className="font-black text-[10px] tracking-widest opacity-50 uppercase">1º BPM - Rondon</h1>
            <p className="text-xs font-bold text-blue-400 uppercase">{tipoVistoria} DE SERVIÇO</p>
          </div>
          <div className="w-10" />
        </div>
      </header>

      <main className="max-w-xl mx-auto p-4 space-y-6">
        {step === 1 && (
          <div className="space-y-6 animate-in slide-in-from-bottom-4 duration-500">
            <div className="flex bg-slate-200 p-1 rounded-2xl">
              <button onClick={() => setTipoVistoria('ENTRADA')} className={`flex-1 py-3 rounded-xl font-black text-[10px] transition-all ${tipoVistoria === 'ENTRADA' ? 'bg-green-600 text-white shadow-lg' : 'text-slate-500'}`}>ENTRADA</button>
              <button onClick={() => setTipoVistoria('SAÍDA')} className={`flex-1 py-3 rounded-xl font-black text-[10px] transition-all ${tipoVistoria === 'SAÍDA' ? 'bg-orange-500 text-white shadow-lg' : 'text-slate-500'}`}>SAÍDA</button>
            </div>

            <section className="bg-white rounded-3xl p-6 shadow-sm border border-slate-100 space-y-5">
              <div className="flex items-center gap-2 border-b pb-4 border-slate-100">
                <ShieldCheck className="text-blue-600" size={20}/>
                <h3 className="text-xs font-black uppercase">Missão e Guarnição</h3>
              </div>
              
              <div className="grid grid-cols-2 gap-3">
                <select className="p-4 bg-slate-50 rounded-xl border font-bold text-sm" value={formData.prefixo_vtr} onChange={(e) => handleVtrChange(e.target.value)}>
                  <option value="">VTR</option>
                  {viaturas.map(v => <option key={v.Prefixo} value={v.Prefixo}>{v.Prefixo}</option>)}
                </select>

                <select className="p-4 bg-slate-50 rounded-xl border font-bold text-sm" value={formData.tipo_servico} onChange={(e) => {
                  setFormData({...formData, tipo_servico: e.target.value, unidade_externa: ''});
                }}>
                  <option value="">SERVIÇO</option>
                  {TIPOS_SERVICO.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>

              {(formData.tipo_servico === 'Operação' || formData.tipo_servico === 'Outro') && (
                <input 
                  placeholder="Nome da Operação / Destino"
                  className="w-full p-4 bg-orange-50 border-orange-200 rounded-xl text-sm font-bold animate-in zoom-in-95"
                  value={formData.unidade_externa}
                  onChange={(e) => setFormData({...formData, unidade_externa: e.target.value})}
                />
              )}

              {formData.tipo_servico === 'Patrulha Comunitária' && (
                <select 
                  className="w-full p-4 bg-blue-50 border-blue-200 rounded-xl text-sm font-bold animate-in zoom-in-95"
                  value={formData.unidade_externa}
                  onChange={(e) => setFormData({...formData, unidade_externa: e.target.value})}
                >
                  <option value="">Selecione a Modalidade</option>
                  {SUB_PATRULHA.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              )}

              <input type="number" className="w-full p-4 bg-slate-50 rounded-xl border font-bold" placeholder="Hodômetro" value={formData.hodometro} onChange={(e) => setFormData({...formData, hodometro: e.target.value})} />

              <div className="bg-slate-50 p-4 rounded-2xl border space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-black uppercase text-slate-500">Videomonitoramento</span>
                  <select 
                    className="p-2 rounded-lg border text-xs font-bold"
                    value={formData.video_monitoramento}
                    onChange={(e) => setFormData({...formData, video_monitoramento: e.target.value, video_status: e.target.value === 'POSSUI' ? 'FUNCIONAL' : ''})}
                  >
                    <option value="NÃO POSSUI">NÃO POSSUI</option>
                    <option value="POSSUI">POSSUI</option>
                  </select>
                </div>
                {formData.video_monitoramento === 'POSSUI' && (
                  <div className="flex gap-2">
                    <button onClick={() => setFormData({...formData, video_status: 'FUNCIONAL'})} className={`flex-1 p-2 rounded-lg text-[10px] font-black border ${formData.video_status === 'FUNCIONAL' ? 'bg-green-600 text-white' : 'bg-white'}`}>FUNCIONAL</button>
                    <button onClick={() => setFormData({...formData, video_status: 'COM DEFEITO'})} className={`flex-1 p-2 rounded-lg text-[10px] font-black border ${formData.video_status === 'COM DEFEITO' ? 'bg-red-600 text-white' : 'bg-white'}`}>COM DEFEITO</button>
                  </div>
                )}
              </div>

              <div className="space-y-6 pt-4 border-t">
                {['motorista', 'comandante', 'patrulheiro'].map(cargo => (
                  <div key={cargo} className="space-y-2">
                    <p className="text-[10px] font-black text-slate-400 uppercase">{cargo}</p>
                    <input 
                      placeholder={`RE do ${cargo}`} 
                      className="w-full p-4 bg-slate-50 rounded-xl border text-sm font-bold" 
                      value={formData[`${cargo}_re`]}
                      onChange={(e) => setFormData({...formData, [`${cargo}_re`]: e.target.value})}
                      onBlur={(e) => buscarMilitar(e.target.value, cargo)} 
                    />
                    {isNovoMilitar[cargo] && (
                      <div className="grid grid-cols-3 gap-2">
                        <select className="p-3 bg-blue-50 rounded-xl text-xs font-bold border-blue-200" onChange={(e) => setFormData({...formData, [`${cargo}_grad`]: e.target.value})}>
                          <option value="">Grad.</option>
                          {GRADUACOES.map(g => <option key={g} value={g}>{g}</option>)}
                        </select>
                        <input placeholder="Nome de Guerra" className="col-span-2 p-3 bg-blue-50 rounded-xl text-xs font-bold border-blue-200" onChange={(e) => setFormData({...formData, [`${cargo}_nome_cru`]: e.target.value})} />
                      </div>
                    )}
                    {!isNovoMilitar[cargo] && formData[`${cargo}_nome`] && (
                      <div className="p-3 bg-green-50 text-green-700 text-[10px] font-black rounded-xl flex items-center gap-2 uppercase"><CheckCircle2 size={14}/> {formData[`${cargo}_nome`]}</div>
                    )}
                  </div>
                ))}
              </div>
            </section>
            <button onClick={() => setStep(2)} disabled={!formData.prefixo_vtr || !formData.hodometro} className="w-full bg-slate-900 text-white p-5 rounded-2xl font-black flex items-center justify-center gap-2 disabled:opacity-50">PRÓXIMO PASSO <ChevronRight size={20}/></button>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-4">
             <div className="grid gap-2">
              {itensAtuais.map(item => (
                <div key={item} onClick={() => setChecklist(prev => ({...prev, [item]: prev[item] === 'OK' ? 'FALHA' : 'OK'}))} className={`p-4 rounded-2xl flex justify-between items-center border ${checklist[item] === 'OK' ? 'bg-white' : 'bg-red-50 border-red-200'}`}>
                  <span className={`text-sm font-bold uppercase ${checklist[item] === 'OK' ? 'text-slate-700' : 'text-red-700'}`}>{item}</span>
                  <div className={`px-3 py-1 rounded-lg text-[10px] font-black ${checklist[item] === 'OK' ? 'bg-green-100 text-green-700' : 'bg-red-600 text-white'}`}>{checklist[item]}</div>
                </div>
              ))}
            </div>
            <div className="bg-white rounded-3xl p-6 shadow-sm space-y-4">
              <h3 className="text-xs font-black uppercase flex items-center gap-2"><Camera size={18} className="text-blue-600" /> Fotos Obrigatórias</h3>
              <div className="grid grid-cols-4 gap-2">
                {fotos.map((foto, index) => (
                  <div key={index} className="relative aspect-square rounded-xl overflow-hidden border-2"><img src={foto} className="object-cover w-full h-full" /></div>
                ))}
                {fotos.length < 4 && (
                  <label className="aspect-square rounded-xl border-2 border-dashed flex items-center justify-center cursor-pointer">
                    {uploading ? <Loader2 className="animate-spin" /> : <Plus />}
                    <input type="file" accept="image/*" capture="environment" className="hidden" onChange={(e) => {
                      const file = e.target.files[0];
                      if (file) {
                        setUploading(true);
                        imageCompression(file, { maxSizeMB: 0.5 }).then(compressed => {
                          const reader = new FileReader();
                          reader.readAsDataURL(compressed);
                          reader.onloadend = () => { setFotos(prev => [...prev, reader.result]); setUploading(false); };
                        });
                      }
                    }} />
                  </label>
                )}
              </div>
            </div>
            <button onClick={handleFinalizar} disabled={!formData.termo_aceite || loading} className="w-full bg-blue-700 text-white p-5 rounded-2xl font-black shadow-lg">
              {loading ? <Loader2 className="animate-spin mx-auto"/> : "FINALIZAR"}
            </button>
          </div>
        )}
      </main>
    </div>
  );
};

export default Vistoria;
