import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '../lib/AuthContext';
import { gasApi } from '../api/gasClient';
import imageCompression from 'browser-image-compression';
import { 
  ArrowLeft, CheckCircle2, ShieldCheck, 
  ChevronRight, Save, Loader2, Camera, X, Plus, AlertTriangle
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

const TIPOS_SERVICO = ["POG", "OPERAÇÃO", "FORÇA TÁTICA", "TRÂNSITO", "ADM", "OUTROS"];
const GRADUACOES = ["SD PM", "CB PM", "3º SGT PM", "2º SGT PM", "1º SGT PM", "SUB TEN PM", "TEN PM", "CAP PM", "MAJ PM"];

const Vistoria = ({ onBack }) => {
  const { user, logout } = useAuth();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [viaturas, setViaturas] = useState([]);
  const [tipoVistoria, setTipoVistoria] = useState('ENTRADA');
  const [fotos, setFotos] = useState([]);
  const timeoutRef = useRef(null);

  const [isNovoMilitar, setIsNovoMilitar] = useState({
    motorista: false, comandante: false, patrulheiro: false
  });

  const [formData, setFormData] = useState({
    prefixo_vtr: '', placa_vtr: '', hodometro: '', tipo_servico: '', unidade_externa: '',
    motorista_re: '', motorista_nome: '', motorista_grad: '', motorista_nome_cru: '',
    comandante_re: '', comandante_nome: '', comandante_grad: '', comandante_nome_cru: '',
    patrulheiro_re: '', patrulheiro_nome: '', patrulheiro_grad: '', patrulheiro_nome_cru: '',
    observacoes: '', termo_aceite: false
  });

  const [checklist, setChecklist] = useState({});
  const itensAtuais = tipoVistoria === 'ENTRADA' ? ITENS_ENTRADA : ITENS_SAIDA;

  // --- 1. AUTO-LOGOUT ---
  const resetTimer = useCallback(() => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => {
      alert("Sessão encerrada por inatividade.");
      logout();
    }, 600000); 
  }, [logout]);

  useEffect(() => {
    window.addEventListener('touchstart', resetTimer);
    resetTimer();
    return () => window.removeEventListener('touchstart', resetTimer);
  }, [resetTimer]);

  // --- 2. CARREGAMENTO DE DADOS ---
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
    const novoChecklist = itensAtuais.reduce((acc, item) => ({ ...acc, [item]: 'OK' }), {});
    setChecklist(novoChecklist);
  }, [tipoVistoria, itensAtuais]);

  // --- 3. SELEÇÃO DE VTR ---
  const handleVtrChange = (prefixo) => {
    const vtr = viaturas.find(v => v.Prefixo === prefixo);
    if (!vtr) return;

    const baseData = {
      ...formData,
      prefixo_vtr: prefixo,
      placa_vtr: vtr.Placa || ''
    };

    if (tipoVistoria === 'SAÍDA') {
      setFormData({
        ...baseData,
        motorista_re: vtr.UltimoMotoristaRE || '',
        motorista_nome: vtr.UltimoMotoristaNome || '',
        comandante_re: vtr.UltimoComandanteRE || '',
        comandante_nome: vtr.UltimoComandanteNome || '',
        patrulheiro_re: vtr.UltimoPatrulheiroRE || '',
        patrulheiro_nome: vtr.UltimoPatrulheiroNome || '',
        tipo_servico: vtr.UltimoTipoServico || ''
      });
    } else {
      setFormData(baseData);
    }
  };

  const buscarMilitar = async (re, cargo) => {
    if (re.length < 4) return;
    try {
      const res = await gasApi.buscarMilitar(re);
      if (res.status === 'success') {
        setFormData(prev => ({ 
          ...prev, 
          [`${cargo}_nome`]: `${res.patente} ${res.nome}`,
          [`${cargo}_nome_cru`]: res.nome,
          [`${cargo}_grad`]: res.patente,
          [`${cargo}_re`]: re 
        }));
        setIsNovoMilitar(prev => ({ ...prev, [cargo]: false }));
      } else {
        setIsNovoMilitar(prev => ({ ...prev, [cargo]: true }));
        setFormData(prev => ({ ...prev, [`${cargo}_nome`]: '', [`${cargo}_re`]: re }));
      }
    } catch (e) { console.error(e); }
  };

  const handleProximo = () => {
    if (!formData.motorista_nome && !isNovoMilitar.motorista) return alert("Valide o RE do Motorista!");
    if (!formData.tipo_servico) return alert("Selecione o Tipo de Serviço!");
    setStep(2);
  };

  const handleCapturePhoto = async (event) => {
    const imageFile = event.target.files[0];
    if (!imageFile) return;
    setUploading(true);
    try {
      const options = { maxSizeMB: 0.5, maxWidthOrHeight: 1024, useWebWorker: true };
      const compressedFile = await imageCompression(imageFile, options);
      const reader = new FileReader();
      reader.readAsDataURL(compressedFile);
      reader.onloadend = () => {
        setFotos(prev => [...prev, reader.result]);
        setUploading(false);
      };
    } catch (error) { setUploading(false); }
  };

  const handleFinalizar = async () => {
    if (fotos.length === 0 && tipoVistoria === 'ENTRADA') return alert("Foto obrigatória na entrada.");
    setLoading(true);
    
    // Ajuste final dos nomes caso sejam novos militares
    const finalData = { ...formData };
    ['motorista', 'comandante', 'patrulheiro'].forEach(c => {
      if (isNovoMilitar[c]) {
        finalData[`${c}_nome`] = `${formData[`${c}_grad`]} ${formData[`${c}_nome_cru`]}`.toUpperCase();
      }
    });

    const payload = {
      ...finalData,
      tipo_vistoria: tipoVistoria,
      checklist_resumo: Object.entries(checklist).filter(([_, s]) => s === 'FALHA').map(([i]) => i).join(', ') || "SEM ALTERAÇÕES",
      fotos_vistoria: fotos, 
      militar_logado: `${user.patente} ${user.nome}`,
    };

    try {
      const res = await gasApi.saveVistoria(payload);
      if (res.status === 'success') {
        alert("Sucesso!");
        onBack();
      }
    } catch (error) { alert("Erro de conexão."); } 
    finally { setLoading(false); }
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

                <select className="p-4 bg-slate-50 rounded-xl border font-bold text-sm" value={formData.tipo_servico} onChange={(e) => setFormData({...formData, tipo_servico: e.target.value})}>
                  <option value="">SERVIÇO</option>
                  {TIPOS_SERVICO.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>

              {formData.tipo_servico === 'OPERAÇÃO' && (
                <input 
                  placeholder="Unidade/Batalhão Externo? (Ex: BPCHOQUE)"
                  className="w-full p-4 bg-orange-50 border-orange-200 rounded-xl text-sm font-bold animate-in zoom-in-95"
                  value={formData.unidade_externa}
                  onChange={(e) => setFormData({...formData, unidade_externa: e.target.value})}
                />
              )}

              <input type="number" className="w-full p-4 bg-slate-50 rounded-xl border font-bold" placeholder="Hodômetro" value={formData.hodometro} onChange={(e) => setFormData({...formData, hodometro: e.target.value})} />

              <div className="space-y-6 pt-4 border-t border-slate-50">
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
                      <div className="grid grid-cols-3 gap-2 animate-in slide-in-from-top-2">
                        <select 
                          className="p-3 bg-blue-50 border-blue-200 rounded-xl text-xs font-bold"
                          onChange={(e) => setFormData({...formData, [`${cargo}_grad`]: e.target.value})}
                        >
                          <option value="">Grad.</option>
                          {GRADUACOES.map(g => <option key={g} value={g}>{g}</option>)}
                        </select>
                        <input 
                          placeholder="Nome de Guerra" 
                          className="col-span-2 p-3 bg-blue-50 border-blue-200 rounded-xl text-xs font-bold"
                          onChange={(e) => setFormData({...formData, [`${cargo}_nome_cru`]: e.target.value})}
                        />
                      </div>
                    )}

                    {!isNovoMilitar[cargo] && formData[`${cargo}_nome`] && (
                      <div className="p-3 bg-green-50 text-green-700 text-[10px] font-black rounded-xl flex items-center gap-2 uppercase">
                        <CheckCircle2 size={14}/> {formData[`${cargo}_nome`]}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </section>

            <button onClick={handleProximo} disabled={!formData.prefixo_vtr || !formData.hodometro} className="w-full bg-slate-900 text-white p-5 rounded-2xl font-black flex items-center justify-center gap-2 disabled:opacity-50">
              PRÓXIMO PASSO <ChevronRight size={20}/>
            </button>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-4 animate-in slide-in-from-right duration-500">
             <div className="grid gap-2">
              {itensAtuais.map(item => (
                <div key={item} onClick={() => setChecklist(prev => ({...prev, [item]: prev[item] === 'OK' ? 'FALHA' : 'OK'}))} 
                  className={`p-4 rounded-2xl flex justify-between items-center cursor-pointer transition-all border ${checklist[item] === 'OK' ? 'bg-white border-slate-100' : 'bg-red-50 border-red-200'}`}>
                  <span className={`text-sm font-bold uppercase ${checklist[item] === 'OK' ? 'text-slate-700' : 'text-red-700'}`}>{item}</span>
                  <div className={`px-3 py-1 rounded-lg text-[10px] font-black ${checklist[item] === 'OK' ? 'bg-green-100 text-green-700' : 'bg-red-600 text-white'}`}>{checklist[item]}</div>
                </div>
              ))}
            </div>

            <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-100 space-y-4">
              <h3 className="text-xs font-black uppercase flex items-center gap-2"><Camera size={18} className="text-blue-600" /> Fotos Obrigatórias</h3>
              <div className="grid grid-cols-4 gap-2">
                {fotos.map((foto, index) => (
                  <div key={index} className="relative aspect-square rounded-xl overflow-hidden border-2 border-slate-200">
                    <img src={foto} className="object-cover w-full h-full" alt="evidencia" />
                    <button onClick={() => setFotos(fotos.filter((_, i) => i !== index))} className="absolute top-1 right-1 bg-red-600 text-white rounded-full p-1"><X size={10}/></button>
                  </div>
                ))}
                {fotos.length < 4 && (
                  <label className="aspect-square rounded-xl border-2 border-dashed border-slate-300 flex flex-col items-center justify-center text-slate-400 hover:bg-blue-50 cursor-pointer">
                    {uploading ? <Loader2 className="animate-spin" size={20} /> : <Plus size={24} />}
                    <input type="file" accept="image/*" capture="environment" className="hidden" onChange={handleCapturePhoto} />
                  </label>
                )}
              </div>
            </div>

            <section className="bg-white rounded-3xl p-6 shadow-sm border border-slate-100 space-y-4">
              <div className={`p-5 rounded-2xl border-2 border-dashed transition-all ${formData.termo_aceite ? 'bg-blue-50 border-blue-400' : 'bg-orange-50 border-orange-300'}`}>
                <label className="flex items-start gap-4 cursor-pointer">
                  <input type="checkbox" className="w-6 h-6 rounded-lg mt-1" checked={formData.termo_aceite} onChange={(e) => setFormData({...formData, termo_aceite: e.target.checked})} />
                  <p className="text-[11px] font-bold text-slate-700 leading-tight">
                    Eu confirmo que realizei a inspeção física e as informações são verídicas.
                  </p>
                </label>
              </div>

              <button onClick={handleFinalizar} disabled={!formData.termo_aceite || loading} className="w-full bg-blue-700 text-white p-5 rounded-2xl font-black flex items-center justify-center gap-2 shadow-lg disabled:opacity-50">
                {loading ? <Loader2 className="animate-spin"/> : <><Save size={20}/> FINALIZAR</>}
              </button>
            </section>
          </div>
        )}
      </main>
    </div>
  );
};

export default Vistoria;
