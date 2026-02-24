import React, { useState, useEffect } from 'react';
import { useAuth } from '../lib/AuthContext';
import { gasApi } from '../api/gasClient';
import imageCompression from 'browser-image-compression';
import { 
  ArrowLeft, CheckCircle2, 
  ChevronRight, Loader2, Camera, X, Plus, 
  Car, Users, ShieldAlert, AlertTriangle
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

const Vistoria = ({ onBack }) => {
  const { user } = useAuth();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [viaturas, setViaturas] = useState([]);
  const [tipoVistoria, setTipoVistoria] = useState('ENTRADA');
  const [fotos, setFotos] = useState([]);
  const [formData, setFormData] = useState({
    prefixo_vtr: '', placa_vtr: '', hodometro: '', tipo_servico: '', unidade_externa: '',
    motorista_re: '', motorista_nome: '', comandante_re: '', comandante_nome: '',
    patrulheiro_re: '', patrulheiro_nome: '', termo_aceite: false
  });

  const [checklist, setChecklist] = useState({});
  const itensAtuais = tipoVistoria === 'ENTRADA' ? ITENS_ENTRADA : ITENS_SAIDA;

  // Lógica de Sinistro: Verifica se há algum item marcado como 'FALHA'
  const temAvaria = Object.values(checklist).includes('FALHA');

  useEffect(() => {
    const carregarDados = async () => {
      const res = await gasApi.getViaturas();
      if (res.status === 'success') setViaturas(res.data);
    };
    carregarDados();
  }, []);

  useEffect(() => {
    setChecklist(itensAtuais.reduce((acc, item) => ({ ...acc, [item]: 'OK' }), {}));
  }, [tipoVistoria, itensAtuais]);

  const formatarRE = (reRaw) => {
    const apenasNumeros = reRaw.replace(/\D/g, ''); 
    return apenasNumeros.length <= 6 ? `1000${apenasNumeros}` : apenasNumeros;
  };

  const handleVtrChange = (prefixo) => {
    const vtr = viaturas.find(v => v.Prefixo === prefixo);
    if (vtr) setFormData(prev => ({ ...prev, prefixo_vtr: prefixo, placa_vtr: vtr.Placa || '' }));
  };

  const buscarMilitar = async (reRaw, cargo) => {
    if (!reRaw) return;
    const reLimpo = formatarRE(reRaw);
    const res = await gasApi.buscarMilitar(reLimpo);
    if (res.status === 'success') {
      setFormData(prev => ({ ...prev, [`${cargo}_re`]: reLimpo, [`${cargo}_nome`]: `${res.patente} ${res.nome}` }));
    } else {
      setFormData(prev => ({ ...prev, [`${cargo}_re`]: reLimpo, [`${cargo}_nome`]: '' }));
    }
  };

  const handleFinalizar = async () => {
    // Validação: Se houver avaria, a foto torna-se obrigatória
    if (temAvaria && fotos.length === 0) {
      return alert("Atenção: Como você sinalizou uma FALHA/AVARIA, é obrigatório anexar pelo menos uma foto do problema.");
    }

    setLoading(true);
    try {
      const res = await gasApi.saveVistoria({
        ...formData,
        tipo_vistoria: tipoVistoria,
        checklist_resumo: Object.entries(checklist)
          .filter(([_, s]) => s === 'FALHA')
          .map(([i]) => i).join(', ') || "SEM ALTERAÇÕES",
        fotos_vistoria: fotos,
        militar_logado: `${user.patente} ${user.nome}`,
      });
      if (res.status === 'success') {
        alert("Vistoria salva com sucesso!");
        onBack();
      }
    } catch (e) {
      alert("Erro ao salvar. Verifique a conexão.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[var(--bg-app)] pb-10 transition-colors">
      <header className="bg-slate-900 text-white p-5 sticky top-0 z-50 border-b-4 border-blue-900 shadow-md">
        <div className="max-w-xl mx-auto flex items-center justify-between">
          <button onClick={onBack} className="p-2 bg-white/10 rounded-full active:scale-95 transition-transform"><ArrowLeft size={24}/></button>
          <div className="text-center">
            <h1 className="font-black text-[10px] tracking-widest opacity-50 uppercase">1º BPM - Rondon</h1>
            <p className="text-xs font-bold text-blue-400 uppercase">VISTORIA TÁTICA</p>
          </div>
          <div className="w-10" />
        </div>
      </header>

      <main className="max-w-xl mx-auto p-4 space-y-6">
        
        {/* CARD DA VTR */}
        {formData.prefixo_vtr && (
          <div className="bg-blue-600 rounded-3xl p-5 text-white shadow-lg border-b-4 border-blue-800 animate-in slide-in-from-top-4">
            <div className="flex justify-between items-center mb-3">
              <div className="flex items-center gap-3">
                <Car size={24}/>
                <div>
                  <h2 className="text-xl font-black leading-tight">{formData.prefixo_vtr}</h2>
                  <p className="text-[10px] font-bold opacity-70 uppercase">{formData.placa_vtr}</p>
                </div>
              </div>
              <span className={`px-3 py-1 rounded-full text-[10px] font-black ${tipoVistoria === 'ENTRADA' ? 'bg-green-500' : 'bg-orange-500'}`}>{tipoVistoria}</span>
            </div>
            <div className="text-[10px] font-bold opacity-90 flex items-center gap-2 border-t border-white/20 pt-2">
               <Users size={12}/> {formData.motorista_nome || '...'} / {formData.comandante_nome || '...'}
            </div>
          </div>
        )}

        {step === 1 && (
          <div className="space-y-6 animate-in fade-in">
            <div className="flex bg-slate-200 dark:bg-slate-800 p-1 rounded-2xl">
              <button onClick={() => setTipoVistoria('ENTRADA')} className={`flex-1 py-3 rounded-xl font-black text-[10px] transition-all ${tipoVistoria === 'ENTRADA' ? 'bg-green-600 text-white shadow-lg' : 'text-slate-500'}`}>ENTRADA</button>
              <button onClick={() => setTipoVistoria('SAÍDA')} className={`flex-1 py-3 rounded-xl font-black text-[10px] transition-all ${tipoVistoria === 'SAÍDA' ? 'bg-orange-500 text-white shadow-lg' : 'text-slate-500'}`}>SAÍDA</button>
            </div>

            <section className="bg-[var(--bg-card)] rounded-[2.5rem] p-6 shadow-sm border border-[var(--border-color)] space-y-5">
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

              {(formData.tipo_servico === 'Operação' || formData.tipo_servico === 'Outro') && (
                <input placeholder="Nome da Operação / Destino" className="vtr-input !bg-orange-50 dark:!bg-orange-900/10 border-orange-200" value={formData.unidade_externa} onChange={(e) => setFormData({...formData, unidade_externa: e.target.value})} />
              )}

              {formData.tipo_servico === 'Patrulha Comunitária' && (
                <select className="vtr-input !bg-blue-50 dark:!bg-blue-900/10 border-blue-200" value={formData.unidade_externa} onChange={(e) => setFormData({...formData, unidade_externa: e.target.value})}>
                  <option value="">Modalidade da Patrulha</option>
                  {SUB_PATRULHA.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              )}

              <input type="number" className="vtr-input" placeholder="Hodômetro Atual" value={formData.hodometro} onChange={(e) => setFormData({...formData, hodometro: e.target.value})} />

              {['motorista', 'comandante', 'patrulheiro'].map(cargo => (
                <div key={cargo} className="space-y-1">
                  <input placeholder={`RE ${cargo.toUpperCase()}`} className="vtr-input !bg-[var(--bg-app)]" onBlur={(e) => buscarMilitar(e.target.value, cargo)} />
                  {formData[`${cargo}_nome`] && <div className="p-2 text-[10px] font-black text-green-600 flex items-center gap-1 animate-in zoom-in-95"><CheckCircle2 size={12}/> {formData[`${cargo}_nome`]}</div>}
                </div>
              ))}
            </section>
            
            <button onClick={() => setStep(2)} disabled={!formData.prefixo_vtr || !formData.hodometro} className="btn-tatico w-full">PRÓXIMO PASSO <ChevronRight/></button>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-6 animate-in slide-in-from-right-4">
            <div className="bg-orange-50 dark:bg-orange-900/10 border-2 border-orange-200 rounded-3xl p-5 flex gap-4">
              <ShieldAlert className="text-orange-600 shrink-0" size={24}/>
              <p className="text-[11px] leading-tight font-bold text-orange-900 dark:text-orange-300 uppercase">
                {tipoVistoria === 'ENTRADA' 
                  ? "Verifique com atenção. Itens não relatados agora serão de sua responsabilidade posterior."
                  : "A viatura deve ser entregue limpa. Informe qualquer sinistro ocorrido no turno."}
              </p>
            </div>

            <div className="grid gap-2">
              {itensAtuais.map(item => (
                <div key={item} onClick={() => setChecklist(prev => ({...prev, [item]: prev[item] === 'OK' ? 'FALHA' : 'OK'}))} className={`checklist-item-ok transition-all ${checklist[item] === 'FALHA' ? '!border-red-500 !bg-red-50 dark:!bg-red-900/20' : ''}`}>
                  <span className={`text-sm font-bold uppercase ${checklist[item] === 'FALHA' ? 'text-red-700' : ''}`}>{item}</span>
                  <div className={`px-3 py-1 rounded-lg text-[10px] font-black ${checklist[item] === 'OK' ? 'bg-green-100 text-green-700' : 'bg-red-600 text-white'}`}>{checklist[item]}</div>
                </div>
              ))}
            </div>

            {/* SEÇÃO DE FOTOS: Dinâmica conforme necessidade */}
            <div className={`bg-[var(--bg-card)] rounded-[2.5rem] p-6 border-2 transition-all ${temAvaria ? 'border-red-500' : 'border-[var(--border-color)]'}`}>
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-xs font-black uppercase flex items-center gap-2">
                  <Camera size={18} className={temAvaria ? 'text-red-500' : 'text-blue-600'} /> 
                  Fotos {temAvaria && <span className="text-[9px] bg-red-600 text-white px-2 py-0.5 rounded-full animate-pulse">SINISTRO / AVARIA</span>}
                </h3>
                <span className="text-[10px] font-bold opacity-50">{fotos.length}/4</span>
              </div>
              
              <div className="grid grid-cols-4 gap-2">
                {fotos.map((foto, index) => (
                  <div key={index} className="relative aspect-square rounded-2xl overflow-hidden border-2 border-[var(--border-color)]">
                    <img src={foto} className="object-cover w-full h-full" />
                    <button onClick={() => setFotos(fotos.filter((_, i) => i !== index))} className="absolute top-1 right-1 bg-red-600 text-white rounded-full p-1 shadow-lg"><X size={10}/></button>
                  </div>
                ))}
                {fotos.length < 4 && (
                  <label className="aspect-square rounded-2xl border-2 border-dashed flex flex-col items-center justify-center cursor-pointer text-[var(--text-muted)] hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">
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
              {temAvaria && fotos.length === 0 && (
                <p className="mt-3 text-[9px] font-black text-red-600 flex items-center gap-1 uppercase italic"><AlertTriangle size={12}/> Foto obrigatória para itens em falha</p>
              )}
            </div>

            <label className="flex items-center gap-3 p-5 bg-[var(--bg-card)] border-2 border-[var(--border-color)] rounded-3xl cursor-pointer active:scale-[0.98] transition-transform">
              <input type="checkbox" className="w-6 h-6 rounded-lg accent-blue-600" checked={formData.termo_aceite} onChange={(e) => setFormData({...formData, termo_aceite: e.target.checked})} />
              <span className="text-[10px] font-black uppercase text-[var(--text-main)] leading-tight">Confirmo que as informações relatadas são verídicas.</span>
            </label>

            <div className="flex gap-2">
              <button onClick={() => setStep(1)} className="flex-1 bg-[var(--bg-card)] p-5 rounded-2xl font-black border-2 border-[var(--border-color)] text-[var(--text-main)]">VOLTAR</button>
              <button 
                onClick={handleFinalizar} 
                disabled={!formData.termo_aceite || loading || (temAvaria && fotos.length === 0)} 
                className={`btn-tatico flex-[2] ${(temAvaria && fotos.length === 0) ? 'opacity-50 grayscale' : ''}`}
              >
                {loading ? <Loader2 className="animate-spin mx-auto"/> : "FINALIZAR VISTORIA"}
              </button>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default Vistoria;
