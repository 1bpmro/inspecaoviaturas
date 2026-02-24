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

const TIPOS_SERVICO = ["POG", "FORÇA TÁTICA", "TRÂNSITO", "ADM", "OUTROS"];

const Vistoria = ({ onBack }) => {
  const { user, logout } = useAuth();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [viaturas, setViaturas] = useState([]);
  const [tipoVistoria, setTipoVistoria] = useState('ENTRADA');
  const [fotos, setFotos] = useState([]);
  const timeoutRef = useRef(null);

  const [formData, setFormData] = useState({
    prefixo_vtr: '', hodometro: '', tipo_servico: '',
    motorista_re: '', motorista_nome: '',
    comandante_re: '', comandante_nome: '',
    patrulheiro_re: '', patrulheiro_nome: '',
    observacoes: '', termo_aceite: false
  });

  const [checklist, setChecklist] = useState({});
  const itensAtuais = tipoVistoria === 'ENTRADA' ? ITENS_ENTRADA : ITENS_SAIDA;

  // --- 1. AUTO-LOGOUT POR INATIVIDADE (10 MIN) ---
  const resetTimer = useCallback(() => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => {
      alert("Sessão encerrada por inatividade para sua segurança.");
      logout();
    }, 300000); // 10 min
  }, [logout]);

  useEffect(() => {
    window.addEventListener('mousemove', resetTimer);
    window.addEventListener('keypress', resetTimer);
    window.addEventListener('touchstart', resetTimer);
    resetTimer();
    return () => {
      window.removeEventListener('mousemove', resetTimer);
      window.removeEventListener('keypress', resetTimer);
      window.removeEventListener('touchstart', resetTimer);
    };
  }, [resetTimer]);

  // --- 2. CARREGAMENTO COM CACHE E FILTRO DE 12H ---
  useEffect(() => {
    const carregarDados = async () => {
      // Tenta carregar do cache primeiro para ser instantâneo
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

  // Reset do checklist quando muda o tipo
  useEffect(() => {
    const novoChecklist = itensAtuais.reduce((acc, item) => ({ ...acc, [item]: 'OK' }), {});
    setChecklist(novoChecklist);
  }, [tipoVistoria, itensAtuais]);

  // --- 3. LOGICA DE SELEÇÃO DE VTR (PREENCHIMENTO DE GU) ---
  const handleVtrChange = (prefixo) => {
    const vtr = viaturas.find(v => v.Prefixo === prefixo);
    if (!vtr) return;

    if (tipoVistoria === 'SAÍDA') {
      // Se for saída, tenta trazer a GU que deu entrada
      setFormData(prev => ({
        ...prev,
        prefixo_vtr: prefixo,
        motorista_re: vtr.UltimoMotoristaRE || '',
        motorista_nome: vtr.UltimoMotoristaNome || '',
        comandante_re: vtr.UltimoComandanteRE || '',
        comandante_nome: vtr.UltimoComandanteNome || '',
        patrulheiro_re: vtr.UltimoPatrulheiroRE || '',
        patrulheiro_nome: vtr.UltimoPatrulheiroNome || '',
        tipo_servico: vtr.UltimoTipoServico || ''
      }));
    } else {
      setFormData(prev => ({ ...prev, prefixo_vtr: prefixo }));
    }
  };

  const buscarMilitar = async (re, campo) => {
    if (re.length < 4) return;
    try {
      const res = await gasApi.buscarMilitar(re);
      if (res.status === 'success') {
        setFormData(prev => ({ 
          ...prev, 
          [`${campo}_nome`]: `${res.patente} ${res.nome}`,
          [`${campo}_re`]: re 
        }));
      } else {
        alert("RE não encontrado no sistema!");
        setFormData(prev => ({ ...prev, [`${campo}_nome`]: '', [`${campo}_re`]: '' }));
      }
    } catch (e) { console.error(e); }
  };

  // --- 4. VALIDAÇÕES ANTES DE IR PRO STEP 2 ---
  const handleProximo = () => {
    if (!formData.motorista_nome) return alert("RE do Motorista não validado!");
    if (!formData.tipo_servico) return alert("Selecione o Tipo de Serviço!");

    const vtr = viaturas.find(v => v.Prefixo === formData.prefixo_vtr);
    
    // Validação de Hodômetro
    if (tipoVistoria === 'SAÍDA' && vtr) {
      if (Number(formData.hodometro) < Number(vtr.UltimoKM)) {
        return alert(`HODÔMETRO INVÁLIDO! O KM de saída não pode ser menor que o de entrada (${vtr.UltimoKM}).`);
      }
    }

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

  const itensComFalha = Object.values(checklist).filter(v => v === 'FALHA').length;

  const handleFinalizar = async () => {
    if (fotos.length === 0 && (itensComFalha > 0 || tipoVistoria === 'ENTRADA')) {
      alert("Atenção: Registro fotográfico obrigatório.");
      return;
    }

    setLoading(true);
    const resumoFalhas = Object.entries(checklist)
      .filter(([_, status]) => status === 'FALHA')
      .map(([item]) => item).join(', ');

    const payload = {
      ...formData,
      tipo_vistoria: tipoVistoria,
      checklist_resumo: resumoFalhas || "SEM ALTERAÇÕES",
      fotos_vistoria: fotos, 
      militar_logado: `${user.patente} ${user.nome} (RE ${user.re})`,
      data_hora_local: new Date().toLocaleString('pt-BR')
    };

    try {
      const res = await gasApi.saveVistoria(payload);
      if (res.status === 'success') {
        alert("Vistoria finalizada com sucesso!");
        onBack();
      } else { alert("Erro ao salvar: " + res.message); }
    } catch (error) { alert("Erro de conexão."); } 
    finally { setLoading(false); }
  };

  // --- FILTRO DE VIATURAS PARA SAÍDA (Somente com entrada há mais de 12h ou abertas) ---
  const viaturasFiltradas = tipoVistoria === 'SAÍDA' 
    ? viaturas.filter(v => v.Status === 'EM SERVIÇO') 
    : viaturas;

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
                <h3 className="text-xs font-black uppercase">Dados da Viatura e Serviço</h3>
              </div>
              
              <div className="space-y-4">
                <select className="w-full p-4 bg-slate-50 rounded-xl border font-bold" value={formData.prefixo_vtr} onChange={(e) => handleVtrChange(e.target.value)}>
                  <option value="">Selecione a VTR</option>
                  {viaturasFiltradas.map(v => <option key={v.Placa} value={v.Prefixo}>{v.Prefixo} - {v.Placa}</option>)}
                </select>

                <select className="w-full p-4 bg-slate-50 rounded-xl border font-bold" value={formData.tipo_servico} onChange={(e) => setFormData({...formData, tipo_servico: e.target.value})}>
                  <option value="">Tipo de Serviço</option>
                  {TIPOS_SERVICO.map(t => <option key={t} value={t}>{t}</option>)}
                </select>

                <input type="number" className="w-full p-4 bg-slate-50 rounded-xl border font-bold" placeholder="Hodômetro Atual" value={formData.hodometro} onChange={(e) => setFormData({...formData, hodometro: e.target.value})} />
              </div>

              <div className="space-y-4 pt-4 border-t border-slate-50">
                {['motorista', 'comandante', 'patrulheiro'].map(cargo => (
                  <div key={cargo}>
                    <div className="relative">
                       <input 
                        placeholder={`RE do ${cargo}`} 
                        className="w-full p-4 bg-slate-50 rounded-xl border text-sm font-bold uppercase" 
                        value={formData[`${cargo}_re`]}
                        onChange={(e) => setFormData({...formData, [`${cargo}_re`]: e.target.value})}
                        onBlur={(e) => buscarMilitar(e.target.value, cargo)} 
                      />
                      {formData[`${cargo}_nome`] && <CheckCircle2 size={16} className="absolute right-4 top-4 text-green-600" />}
                    </div>
                    {formData[`${cargo}_nome`] && (
                      <div className="mt-2 p-2 px-4 bg-blue-50 text-blue-700 text-[10px] font-black rounded-lg uppercase animate-in zoom-in-95">
                        {formData[`${cargo}_nome`]}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </section>

            <button onClick={handleProximo} disabled={!formData.prefixo_vtr || !formData.hodometro} className="w-full bg-slate-900 text-white p-5 rounded-2xl font-black flex items-center justify-center gap-2 disabled:opacity-50">
              CONFERIR ITENS <ChevronRight size={20}/>
            </button>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-4 animate-in slide-in-from-right duration-500">
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-white p-4 rounded-2xl text-center border-b-4 border-green-500 shadow-sm">
                <p className="text-2xl font-black text-green-600">{itensAtuais.length - itensComFalha}</p>
                <p className="text-[9px] font-black text-slate-400 uppercase">Integridade OK</p>
              </div>
              <div className="bg-white p-4 rounded-2xl text-center border-b-4 border-red-500 shadow-sm">
                <p className="text-2xl font-black text-red-600">{itensComFalha}</p>
                <p className="text-[9px] font-black text-slate-400 uppercase">Avarias</p>
              </div>
            </div>

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
              <h3 className="text-xs font-black uppercase flex items-center gap-2 text-slate-700">
                <Camera size={18} className="text-blue-600" /> Fotos Obrigatórias (Máx 4)
              </h3>
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
              <textarea className="w-full p-4 bg-slate-50 rounded-2xl border text-sm" placeholder="Observações adicionais..." rows="3" onChange={(e) => setFormData({...formData, observacoes: e.target.value})} />
              
              <div className={`p-5 rounded-2xl border-2 border-dashed transition-all ${formData.termo_aceite ? 'bg-blue-50 border-blue-400' : 'bg-orange-50 border-orange-300'}`}>
                <label className="flex items-start gap-4 cursor-pointer">
                  <input type="checkbox" className="w-6 h-6 rounded-lg mt-1" checked={formData.termo_aceite} onChange={(e) => setFormData({...formData, termo_aceite: e.target.checked})} />
                  <p className="text-[11px] font-bold text-slate-700 leading-tight">
                    Eu, <span className="text-blue-700">{formData.motorista_nome || "MILITAR"}</span>, confirmo que realizei a inspeção física da <span className="text-blue-700">{formData.prefixo_vtr}</span>, e esta se encontra conforme relatado nesta inspeção.
                  </p>
                </label>
              </div>

              <button onClick={handleFinalizar} disabled={!formData.termo_aceite || loading} className="w-full bg-blue-700 text-white p-5 rounded-2xl font-black flex items-center justify-center gap-2 shadow-lg disabled:opacity-50">
                {loading ? <Loader2 className="animate-spin"/> : <><Save size={20}/> FINALIZAR {tipoVistoria}</>}
              </button>
            </section>
          </div>
        )}
      </main>
    </div>
  );
};

export default Vistoria;
