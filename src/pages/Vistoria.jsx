import React, { useState, useEffect } from 'react';
import { useAuth } from '../lib/AuthContext';
import { gasApi } from '../api/gasClient';
import imageCompression from 'browser-image-compression';
import { 
  ArrowLeft, CheckCircle2, ChevronRight, Loader2, Camera, X, Plus, 
  Car, Users, ShieldAlert, AlertTriangle, Lock, Unlock
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
const SUB_PATRULHA = ["Patrulha Escolar", "Base Móvel", "Patrulha Comercial"];

const Vistoria = ({ onBack }) => {
  const { user } = useAuth();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [viaturas, setViaturas] = useState([]);
  const [tipoVistoria, setTipoVistoria] = useState('ENTRADA');
  const [fotos, setFotos] = useState([]);
  const [protegerFotos, setProtegerFotos] = useState(false); // Nova flag de proteção
  const [formData, setFormData] = useState({
    prefixo_vtr: '', placa_vtr: '', hodometro: '', tipo_servico: '', unidade_externa: '',
    motorista_re: '', motorista_nome: '', comandante_re: '', comandante_nome: '',
    patrulheiro_re: '', patrulheiro_nome: '', termo_aceite: false
  });

  const [checklist, setChecklist] = useState({});
  const itensAtuais = tipoVistoria === 'ENTRADA' ? ITENS_ENTRADA : ITENS_SAIDA;
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

  const formatarMatricula = (matRaw) => {
    const apenasNumeros = matRaw.replace(/\D/g, ''); 
    return apenasNumeros.length <= 6 ? `1000${apenasNumeros}` : apenasNumeros;
  };

  const handleVtrChange = (prefixo) => {
    const vtr = viaturas.find(v => v.Prefixo === prefixo);
    if (!vtr) return;

    if (tipoVistoria === 'SAÍDA') {
      // Auto-preenchimento inteligente na Saída
      setFormData(prev => ({
        ...prev,
        prefixo_vtr: prefixo,
        placa_vtr: vtr.Placa || '',
        tipo_servico: vtr.UltimoTipoServico || '',
        motorista_re: vtr.UltimoMotoristaRE || '',
        motorista_nome: vtr.UltimoMotoristaNome || '',
        comandante_re: vtr.UltimoComandanteRE || '',
        comandante_nome: vtr.UltimoComandanteNome || '',
        patrulheiro_re: vtr.UltimoPatrulheiroRE || '',
        patrulheiro_nome: vtr.UltimoPatrulheiroNome || '',
        hodometro: vtr.UltimoKM || ''
      }));
    } else {
      setFormData(prev => ({ ...prev, prefixo_vtr: prefixo, placa_vtr: vtr.Placa || '' }));
    }
  };

  const buscarMilitar = async (matRaw, cargo) => {
    if (!matRaw) return;
    const matLimpa = formatarMatricula(matRaw);
    const res = await gasApi.buscarMilitar(matLimpa);
    if (res.status === 'success') {
      setFormData(prev => ({ ...prev, [`${cargo}_re`]: matLimpa, [`${cargo}_nome`]: `${res.patente} ${res.nome}` }));
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
        proteger_ocorrencia: protegerFotos, // Envia flag para o GAS
        militar_logado: `${user.patente} ${user.nome}`,
      });
      if (res.status === 'success') {
        alert("Inspeção finalizada com sucesso!");
        onBack();
      }
    } catch (e) {
      alert("Erro ao conectar com o servidor.");
    } finally {
      setLoading(false);
    }
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
        
        {/* Toggle Entrada/Saída */}
        <div className="flex bg-slate-200 dark:bg-slate-800 p-1 rounded-2xl">
          <button onClick={() => { setTipoVistoria('ENTRADA'); setFormData(f => ({...f, prefixo_vtr: ''})) }} className={`flex-1 py-3 rounded-xl font-black text-[10px] ${tipoVistoria === 'ENTRADA' ? 'bg-green-600 text-white shadow-lg' : 'text-slate-500'}`}>ENTRADA</button>
          <button onClick={() => { setTipoVistoria('SAÍDA'); setFormData(f => ({...f, prefixo_vtr: ''})) }} className={`flex-1 py-3 rounded-xl font-black text-[10px] ${tipoVistoria === 'SAÍDA' ? 'bg-orange-500 text-white shadow-lg' : 'text-slate-500'}`}>SAÍDA</button>
        </div>

        {step === 1 && (
          <div className="space-y-6 animate-in fade-in">
            <section className="bg-[var(--bg-card)] rounded-[2.5rem] p-6 shadow-sm border border-[var(--border-color)] space-y-5">
              <div className="grid grid-cols-2 gap-3">
                <select className="vtr-input !py-4" value={formData.prefixo_vtr} onChange={(e) => handleVtrChange(e.target.value)}>
                  <option value="">VTR</option>
                  {viaturas.filter(v => tipoVistoria === 'SAÍDA' ? v.Status === 'EM SERVIÇO' : true).map(v => (
                    <option key={v.Prefixo} value={v.Prefixo}>{v.Prefixo}</option>
                  ))}
                </select>
                <select className="vtr-input !py-4" value={formData.tipo_servico} onChange={(e) => setFormData({...formData, tipo_servico: e.target.value})}>
                  <option value="">SERVIÇO</option>
                  {TIPOS_SERVICO.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>

              <input type="number" className="vtr-input" placeholder="Hodômetro" value={formData.hodometro} onChange={(e) => setFormData({...formData, hodometro: e.target.value})} />

              {['motorista', 'comandante', 'patrulheiro'].map(cargo => (
                <div key={cargo} className="space-y-1">
                  <input 
                    placeholder={`MATRÍCULA ${cargo.toUpperCase()}`} 
                    className="vtr-input !bg-[var(--bg-app)]" 
                    value={formData[`${cargo}_re`]}
                    onChange={(e) => setFormData({...formData, [`${cargo}_re`]: e.target.value})}
                    onBlur={(e) => buscarMilitar(e.target.value, cargo)} 
                  />
                  {formData[`${cargo}_nome`] && <div className="p-2 text-[10px] font-black text-green-600 flex items-center gap-1"><CheckCircle2 size={12}/> {formData[`${cargo}_nome`]}</div>}
                </div>
              ))}
            </section>
            <button onClick={() => setStep(2)} disabled={!formData.prefixo_vtr} className="btn-tatico w-full uppercase">Itens de Inspeção <ChevronRight/></button>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-6 animate-in slide-in-from-right-4">
            {/* Pop-up / Alerta de Proteção de Ocorrência */}
            {(temAvaria || tipoVistoria === 'SAÍDA') && (
              <div 
                onClick={() => setProtegerFotos(!protegerFotos)}
                className={`p-5 rounded-3xl border-2 cursor-pointer transition-all flex items-center gap-4 ${protegerFotos ? 'bg-blue-600 border-blue-400 text-white shadow-lg' : 'bg-slate-100 border-slate-300 text-slate-600'}`}
              >
                {protegerFotos ? <Lock size={32} /> : <Unlock size={32} className="opacity-50" />}
                <div>
                  <h4 className="font-black text-xs uppercase">Proteção de Ocorrência</h4>
                  <p className="text-[10px] font-medium leading-tight opacity-90">
                    {protegerFotos 
                      ? "ATIVADO: Esta inspeção e fotos JAMAIS serão apagadas pelo sistema." 
                      : "Clique aqui para impedir que estas fotos sejam apagadas após 180 dias."}
                  </p>
                </div>
              </div>
            )}

            <div className="grid gap-2">
              {itensAtuais.map(item => (
                <div key={item} onClick={() => setChecklist(prev => ({...prev, [item]: prev[item] === 'OK' ? 'FALHA' : 'OK'}))} className={`checklist-item-ok ${checklist[item] === 'FALHA' ? '!border-red-500 !bg-red-50' : ''}`}>
                  <span className="text-sm font-bold uppercase">{item}</span>
                  <div className={`px-3 py-1 rounded-lg text-[10px] font-black ${checklist[item] === 'OK' ? 'bg-green-100 text-green-700' : 'bg-red-600 text-white'}`}>{checklist[item]}</div>
                </div>
              ))}
            </div>

            {/* Seção de Fotos */}
            <div className={`bg-[var(--bg-card)] rounded-[2.5rem] p-6 border-2 ${temAvaria ? 'border-red-500' : 'border-[var(--border-color)]'}`}>
              <div className="grid grid-cols-4 gap-2">
                {fotos.map((f, i) => (
                  <div key={i} className="relative aspect-square rounded-2xl overflow-hidden"><img src={f} className="object-cover w-full h-full"/><button onClick={() => setFotos(fotos.filter((_, idx) => idx !== i))} className="absolute top-1 right-1 bg-red-600 text-white rounded-full p-1"><X size={10}/></button></div>
                ))}
                {fotos.length < 4 && (
                  <label className="aspect-square rounded-2xl border-2 border-dashed flex items-center justify-center cursor-pointer">
                    {uploading ? <Loader2 className="animate-spin" /> : <Plus />}
                    <input type="file" accept="image/*" capture="environment" className="hidden" onChange={async (e) => {
                      const file = e.target.files[0]; if (!file) return;
                      setUploading(true);
                      const compressed = await imageCompression(file, { maxSizeMB: 0.5 });
                      const reader = new FileReader(); reader.readAsDataURL(compressed);
                      reader.onloadend = () => { setFotos(p => [...p, reader.result]); setUploading(false); };
                    }} />
                  </label>
                )}
              </div>
            </div>

            <label className="flex items-center gap-3 p-5 bg-[var(--bg-card)] border-2 border-[var(--border-color)] rounded-3xl cursor-pointer">
              <input type="checkbox" className="w-6 h-6 rounded-lg" checked={formData.termo_aceite} onChange={(e) => setFormData({...formData, termo_aceite: e.target.checked})} />
              <span className="text-[10px] font-black uppercase leading-tight">As informações relatadas são verídicas e conferidas.</span>
            </label>

            <div className="flex gap-2">
              <button onClick={() => setStep(1)} className="flex-1 bg-[var(--bg-card)] p-5 rounded-2xl font-black border-2 border-[var(--border-color)]">VOLTAR</button>
              <button onClick={handleFinalizar} disabled={!formData.termo_aceite || loading} className="btn-tatico flex-[2]">
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
