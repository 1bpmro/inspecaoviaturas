import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '../lib/AuthContext';
import { gasApi } from '../api/gasClient';
import imageCompression from 'browser-image-compression';
import { 
  ArrowLeft, CheckCircle2, ShieldCheck, 
  ChevronRight, Save, Loader2, Camera, X, Plus, Video, VideoOff, 
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

  const formatarRE = (reRaw) => {
    const apenasNumeros = reRaw.replace(/\D/g, ''); 
    if (!apenasNumeros) return '';
    return apenasNumeros.length <= 6 ? `1000${apenasNumeros}` : apenasNumeros;
  };

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

  const handleVtrChange = (prefixo) => {
    const vtr = viaturas.find(v => v.Prefixo === prefixo);
    if (!vtr) return;
    setFormData(prev => ({ ...prev, prefixo_vtr: prefixo, placa_vtr: vtr.Placa || '' }));
  };

  const buscarMilitar = async (reRaw, cargo) => {
    const reLimpo = formatarRE(reRaw);
    if (reLimpo.length < 4) return;
    try {
      const res = await gasApi.buscarMilitar(reLimpo);
      if (res.status === 'success') {
        setFormData(prev => ({ 
          ...prev, 
          [`${cargo}_re`]: reLimpo,
          [`${cargo}_nome`]: `${res.patente} ${res.nome}`, 
          [`${cargo}_grad`]: res.patente 
        }));
        setIsNovoMilitar(prev => ({ ...prev, [cargo]: false }));
      } else {
        setFormData(prev => ({ ...prev, [`${cargo}_re`]: reLimpo, [`${cargo}_nome`]: '' }));
        setIsNovoMilitar(prev => ({ ...prev, [cargo]: true }));
      }
    } catch (e) { console.error(e); }
  };

  return (
    <div className="min-h-screen bg-[var(--bg-app)] pb-10 transition-colors">
      <header className="bg-slate-900 text-white p-5 sticky top-0 z-50 border-b-4 border-blue-900 shadow-xl">
        <div className="max-w-xl mx-auto flex items-center justify-between">
          <button onClick={onBack} className="p-2 bg-white/10 rounded-full hover:bg-white/20 transition-all">
            <ArrowLeft size={24}/>
          </button>
          <div className="text-center">
            <h1 className="font-black text-[10px] tracking-widest opacity-50 uppercase">1º BPM - Rondon</h1>
            <p className="text-xs font-bold text-blue-400 uppercase">INSPEÇÃO DE SERVIÇO</p>
          </div>
          <div className="w-10" />
        </div>
      </header>

      <main className="max-w-xl mx-auto p-4 space-y-6">
        
        {/* CARD DA GUARNIÇÃO E VIATURA (IDENTIFICAÇÃO RÁPIDA) */}
        {formData.prefixo_vtr && (
          <div className="bg-blue-600 rounded-3xl p-5 text-white shadow-lg border-b-4 border-blue-800 animate-in slide-in-from-top-4">
            <div className="flex justify-between items-start mb-4 border-b border-white/20 pb-3">
              <div className="flex items-center gap-3">
                <div className="bg-white/20 p-3 rounded-2xl"><Car size={24}/></div>
                <div>
                  <h2 className="text-xl font-black">{formData.prefixo_vtr}</h2>
                  <p className="text-[10px] font-bold opacity-70 uppercase tracking-wider">{formData.placa_vtr}</p>
                </div>
              </div>
              <div className="text-right">
                <span className={`px-3 py-1 rounded-full text-[10px] font-black ${tipoVistoria === 'ENTRADA' ? 'bg-green-500' : 'bg-orange-500'}`}>
                  {tipoVistoria}
                </span>
              </div>
            </div>
            
            <div className="grid grid-cols-1 gap-2">
              <div className="flex items-center gap-2 text-xs font-bold">
                <Users size={14} className="opacity-60"/>
                <span className="opacity-60">GUARNIÇÃO:</span>
                <span className="truncate">{formData.motorista_nome || '...'} / {formData.comandante_nome || '...'}</span>
              </div>
            </div>
          </div>
        )}

        {step === 1 && (
          <div className="space-y-6 animate-in fade-in duration-500">
            <div className="flex bg-slate-200 dark:bg-slate-800 p-1 rounded-2xl">
              <button onClick={() => setTipoVistoria('ENTRADA')} className={`flex-1 py-3 rounded-xl font-black text-[10px] transition-all ${tipoVistoria === 'ENTRADA' ? 'bg-green-600 text-white shadow-lg' : 'text-slate-500'}`}>ENTRADA</button>
              <button onClick={() => setTipoVistoria('SAÍDA')} className={`flex-1 py-3 rounded-xl font-black text-[10px] transition-all ${tipoVistoria === 'SAÍDA' ? 'bg-orange-500 text-white shadow-lg' : 'text-slate-500'}`}>SAÍDA</button>
            </div>

            <section className="bg-[var(--bg-card)] rounded-[2.5rem] p-6 shadow-sm border border-[var(--border-color)] space-y-5">
              <div className="flex items-center gap-2 border-b pb-4 border-[var(--border-color)]">
                <ShieldCheck className="text-blue-600" size={20}/>
                <h3 className="text-xs font-black uppercase text-[var(--text-main)]">Missão e Dados</h3>
              </div>
              
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

              <input type="number" className="vtr-input" placeholder="Hodômetro Atual" value={formData.hodometro} onChange={(e) => setFormData({...formData, hodometro: e.target.value})} />

              <div className="space-y-6 pt-4 border-t border-[var(--border-color)]">
                {['motorista', 'comandante', 'patrulheiro'].map(cargo => (
                  <div key={cargo} className="space-y-2">
                    <p className="text-[10px] font-black text-[var(--text-muted)] uppercase ml-2">{cargo}</p>
                    <input 
                      placeholder={`RE do ${cargo}`} 
                      className="vtr-input !bg-[var(--bg-app)]" 
                      value={formData[`${cargo}_re`]}
                      onChange={(e) => setFormData({...formData, [`${cargo}_re`]: e.target.value})}
                      onBlur={(e) => buscarMilitar(e.target.value, cargo)} 
                    />
                    {formData[`${cargo}_nome`] && (
                      <div className="p-3 bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400 text-[10px] font-black rounded-xl flex items-center gap-2 uppercase animate-in zoom-in-95">
                        <CheckCircle2 size={14}/> {formData[`${cargo}_nome`]}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </section>
            
            <button onClick={() => setStep(2)} disabled={!formData.prefixo_vtr || !formData.hodometro} className="btn-tatico w-full">
              PROSSEGUIR PARA CHECKLIST <ChevronRight size={20}/>
            </button>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-6 animate-in slide-in-from-right-4 duration-500">
            {/* TEXTO DE RESPONSABILIDADE (CHECKLIST) */}
            <div className="bg-orange-50 dark:bg-orange-900/10 border-2 border-orange-200 dark:border-orange-900/30 rounded-3xl p-5 flex gap-4">
              <ShieldAlert className="text-orange-600 shrink-0" size={24}/>
              <div className="space-y-1">
                <h4 className="text-[10px] font-black uppercase text-orange-800 dark:text-orange-400">Termo de Responsabilidade</h4>
                <p className="text-[11px] leading-tight font-bold text-orange-900 dark:text-orange-300 uppercase">
                  {tipoVistoria === 'ENTRADA' 
                    ? "Ao assumir a viatura, o motorista declara que conferiu todos os itens. Avarias não informadas serão de responsabilidade da guarnição atual."
                    : "Ao entregar a viatura, o motorista garante que o veículo está limpo e sem novos danos. Objetos deixados no interior são de responsabilidade da guarnição."}
                </p>
              </div>
            </div>

            <div className="grid gap-2">
              {itensAtuais.map(item => (
                <div 
                  key={item} 
                  onClick={() => setChecklist(prev => ({...prev, [item]: prev[item] === 'OK' ? 'FALHA' : 'OK'}))} 
                  className={`checklist-item-ok ${checklist[item] === 'FALHA' ? '!border-red-500 !bg-red-50 dark:!bg-red-900/20' : ''}`}
                >
                  <span className={`text-sm font-bold uppercase ${checklist[item] === 'OK' ? 'text-[var(--text-main)]' : 'text-red-700'}`}>{item}</span>
                  <div className={`px-3 py-1 rounded-lg text-[10px] font-black ${checklist[item] === 'OK' ? 'bg-green-100 text-green-700' : 'bg-red-600 text-white'}`}>{checklist[item]}</div>
                </div>
              ))}
            </div>

            <div className="bg-[var(--bg-card)] rounded-[2.5rem] p-6 border border-[var(--border-color)] space-y-4 shadow-sm">
              <h3 className="text-xs font-black uppercase flex items-center gap-2 text-[var(--text-main)]"><Camera size={18} className="text-blue-600" /> Registro Fotográfico</h3>
              <div className="grid grid-cols-4 gap-2">
                {fotos.map((foto, index) => (
                  <div key={index} className="relative aspect-square rounded-2xl overflow-hidden border-2 border-[var(--border-color)] shadow-sm">
                    <img src={foto} className="object-cover w-full h-full" />
                    <button onClick={() => setFotos(fotos.filter((_, i) => i !== index))} className="absolute top-1 right-1 bg-red-600 text-white rounded-full p-1 shadow-lg"><X size={12}/></button>
                  </div>
                ))}
                {fotos.length < 4 && (
                  <label className="aspect-square rounded-2xl border-2 border-dashed border-[var(--border-color)] flex flex-col items-center justify-center cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800 transition-all text-[var(--text-muted)]">
                    {uploading ? <Loader2 className="animate-spin" /> : <Plus size={24}/>}
                    <span className="text-[8px] font-black mt-1">FOTO</span>
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

            {/* CHECKBOX DE ACEITE FINAL */}
            <label className="flex items-center gap-3 p-5 bg-[var(--bg-card)] border-2 border-[var(--border-color)] rounded-3xl cursor-pointer active:scale-95 transition-all">
              <input 
                type="checkbox" 
                className="w-6 h-6 rounded-lg accent-blue-600"
                checked={formData.termo_aceite}
                onChange={(e) => setFormData({...formData, termo_aceite: e.target.checked})}
              />
              <span className="text-[10px] font-black uppercase text-[var(--text-main)] leading-tight">
                Confirmo que as informações acima são verídicas e assumo a responsabilidade técnica.
              </span>
            </label>

            <div className="flex gap-2">
              <button onClick={() => setStep(1)} className="flex-1 bg-[var(--bg-card)] text-[var(--text-main)] p-5 rounded-2xl font-black border-2 border-[var(--border-color)]">VOLTAR</button>
              <button 
                onClick={handleFinalizar} 
                disabled={!formData.termo_aceite || loading || (fotos.length === 0 && tipoVistoria === 'ENTRADA')} 
                className="btn-tatico flex-[2]"
              >
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
