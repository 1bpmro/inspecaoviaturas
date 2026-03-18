import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { useAuth } from '../lib/AuthContext';
import { gasApi } from '../api/gasClient';
import { 
  Car, CheckCircle2, AlertTriangle, Search, ShieldCheck, Camera, X, 
  Inbox, Volume2, VolumeX, Wrench, ChevronRight, Droplets, RefreshCw
} from 'lucide-react';

const GarageiroDashboard = ({ onBack }) => {
  const { user } = useAuth();
  const [tab, setTab] = useState('pendentes'); 
  const [vistorias, setVistorias] = useState([]);
  const [viaturas, setViaturas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [soundEnabled, setSoundEnabled] = useState(false);
  
  const [showModal, setShowModal] = useState(false);
  const [selectedVtr, setSelectedVtr] = useState(null);
  const [showBaixaOptions, setShowBaixaOptions] = useState(false);
  
  const submittingRef = useRef(false); // BLINDAGEM 5: Contra Double-Click real
  const previousIds = useRef([]);
  const audioRef = useRef(null);

  const [conf, setConf] = useState({ 
    limpezaInterna: true, limpezaExterna: true, semPertences: true,
    motoristaCorreto: true, avariaDetectada: false, confirmarTrocaOleo: false,
    motivoBaixa: '', obs: '' 
  });

  useEffect(() => {
    audioRef.current = new Audio('https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3');
  }, []);

  const carregarDados = useCallback(async () => {
    // BLINDAGEM 4: Checagem de API
    if (!gasApi.getVistoriasPendentes || !gasApi.getViaturas) {
      console.error("API do Google Apps Script não carregada.");
      return;
    }

    try {
      const [resVistorias, resViaturas] = await Promise.all([
        gasApi.getVistoriasPendentes(),
        gasApi.getViaturas()
      ]);

      if (resVistorias?.data) {
        const vistoriasAguardando = resVistorias.data.filter(v => 
          ["AGUARDANDO", "PÁTIO", "PENDENTE"].includes((v.status_vtr || v.status || "").toUpperCase())
        );
        
        const novosIds = vistoriasAguardando.map(v => v.id);
        const temNovo = novosIds.some(id => !previousIds.current.includes(id));
        
        if (soundEnabled && temNovo && audioRef.current) {
          audioRef.current.play().catch(() => {});
        }
        previousIds.current = novosIds;
        setVistorias(vistoriasAguardando);
      }
      if (resViaturas?.data) setViaturas(resViaturas.data);
    } catch (e) {
      console.error("Erro na sincronização:", e);
    } finally {
      setLoading(false);
    }
  }, [soundEnabled]);

  useEffect(() => {
    carregarDados();
    const interval = setInterval(carregarDados, 15000);
    return () => clearInterval(interval);
  }, [carregarDados]);

  // BLINDAGEM 3: Play on Toggle (Mobile Fix)
  const toggleSound = () => {
    const nextState = !soundEnabled;
    setSoundEnabled(nextState);
    if (nextState && audioRef.current) {
      audioRef.current.play().catch(() => {});
    }
  };

  // OTIMIZAÇÃO 1 & 2: Lógica de Status e Blindagem de Óleo
  const getStatusViatura = (v) => {
    const kmAtual = Number(v.ULTIMOKM || 0);
    const kmTroca = Number(v.KM_TROCA_OLEO ?? v.KM_ULTIMATROCA ?? 0);
    const diff = Math.max(0, kmAtual - kmTroca); // Blindagem contra KM negativo
    
    if (diff >= 12000) return "BLOQUEADA";
    if (diff >= 9000) return "ATENÇÃO ÓLEO";

    const statusBase = (v.STATUS || "OK").toUpperCase();
    if (["MANUTENÇÃO", "MANUTENCAO", "OFICINA"].includes(statusBase)) return "MANUTENÇÃO";
    if (statusBase === "INATIVA") return "INATIVA";
    
    return "OK";
  };

  const processarVistoria = async (statusFinal, motivoOpcional = '') => {
    // BLINDAGEM 5: Prevenção de concorrência com Ref
    if (submittingRef.current || !selectedVtr) return;
    submittingRef.current = true;
    setIsSubmitting(true);

    try {
      const payload = {
        id_vistoria: selectedVtr.id,
        prefixo: selectedVtr.prefixo_vtr,
        status_vtr: statusFinal,
        garageiro_re: `${user?.re || '000'} - ${user?.nome || 'SISTEMA'}`,
        status_fisico: conf.avariaDetectada ? 'AVARIADA' : 'OK',
        limpeza: (!conf.limpezaInterna || !conf.limpezaExterna) ? 'CRÍTICA' : 'OK',
        obs_garageiro: (motivoOpcional || conf.obs).toUpperCase(),
        confirmar_oleo: conf.confirmarTrocaOleo,
        km_registro: selectedVtr.hodometro || 0,
        data_vistoria: selectedVtr.data_hora
      };

      // OTIMIZAÇÃO 6: Update Otimista (Remove da lista antes do GAS responder)
      const idRemover = selectedVtr.id;
      setVistorias(prev => prev.filter(v => v.id !== idRemover));
      
      await gasApi.confirmarVistoriaGarageiro(payload);
      
      setShowModal(false);
      setShowBaixaOptions(false);
      setConf({ 
        limpezaInterna: true, limpezaExterna: true, semPertences: true,
        motoristaCorreto: true, avariaDetectada: false, confirmarTrocaOleo: false,
        motivoBaixa: '', obs: '' 
      });
      
      // Carrega dados em background para atualizar a aba "Frota"
      carregarDados();

    } catch (e) {
      alert("Erro no processamento. A lista será recarregada.");
      carregarDados(); // Re-sincroniza se falhar
    } finally {
      submittingRef.current = false;
      setIsSubmitting(false);
    }
  };

  const viaturasFiltradas = useMemo(() => {
    const term = searchTerm.toUpperCase();
    return viaturas.filter(v => (v.PREFIXO || "").toString().includes(term));
  }, [viaturas, searchTerm]);

  // OTIMIZAÇÃO 7: Status de Espera Visual
  const getNivelEspera = (data) => {
    const min = Math.floor((new Date() - new Date(data)) / 60000);
    if (min > 30) return { label: `${min} MIN`, classe: "bg-red-600 animate-pulse", text: "text-white" };
    if (min > 15) return { label: `${min} MIN`, classe: "bg-amber-500", text: "text-slate-900" };
    return { label: `${min} MIN`, classe: "bg-emerald-100", text: "text-emerald-700" };
  };

  if (loading && vistorias.length === 0) {
    return (
      <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center text-white">
        <RefreshCw className="animate-spin text-amber-500 mb-4" size={40} />
        <p className="font-black text-[10px] tracking-[0.2em]">SINCRONIZANDO PÁTIO</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col font-sans select-none">
      <header className="bg-slate-900 text-white p-4 shadow-lg border-b-4 border-amber-500 flex justify-between items-center">
        <div className="flex items-center gap-3">
          <div className="bg-amber-500 p-2 rounded-xl text-slate-900"><ShieldCheck size={24} /></div>
          <div>
            <h1 className="font-black uppercase tracking-tighter text-lg leading-none">Controle de Pátio</h1>
            <p className="text-[9px] font-bold text-amber-500 uppercase tracking-widest mt-1">Status em Tempo Real</p>
          </div>
        </div>
        <div className="flex gap-2">
          <button onClick={toggleSound} className={`p-2 rounded-xl transition-all active:scale-90 ${soundEnabled ? 'bg-emerald-500' : 'bg-slate-800'}`}>
            {soundEnabled ? <Volume2 size={20} /> : <VolumeX size={20} />}
          </button>
          <button onClick={onBack} className="p-2 bg-slate-800 rounded-xl hover:bg-red-600 transition-colors"><X size={20} /></button>
        </div>
      </header>

      <div className="flex bg-white shadow-sm sticky top-0 z-10 border-b border-slate-200">
        <button onClick={() => setTab('pendentes')} className={`flex-1 p-4 text-[10px] font-black uppercase transition-all border-b-4 ${tab === 'pendentes' ? 'border-amber-500 text-amber-600' : 'border-transparent text-slate-400'}`}>
          Pendentes ({vistorias.length})
        </button>
        <button onClick={() => setTab('frota')} className={`flex-1 p-4 text-[10px] font-black uppercase transition-all border-b-4 ${tab === 'frota' ? 'border-amber-500 text-amber-600' : 'border-transparent text-slate-400'}`}>
          Frota Total
        </button>
      </div>

      <main className="p-4 flex-1 overflow-y-auto">
        {tab === 'pendentes' ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {vistorias.length === 0 ? (
              <div className="col-span-full flex flex-col items-center justify-center p-20 text-slate-300">
                <Inbox size={64} className="mb-4 opacity-10" />
                <p className="font-black uppercase text-[10px] tracking-[0.3em]">Pátio em conformidade</p>
              </div>
            ) : vistorias.map(v => {
              const espera = getNivelEspera(v.data_hora);
              return (
                <div key={v.id} className="bg-white rounded-[2rem] border-2 border-slate-200 p-6 shadow-sm hover:border-amber-400 transition-all">
                  <div className="flex justify-between items-start mb-4">
                    <h2 className="text-4xl font-black text-slate-900 tracking-tighter">{v.prefixo_vtr}</h2>
                    <span className={`px-3 py-1 rounded-full text-[9px] font-black uppercase shadow-sm ${espera.classe} ${espera.text}`}>
                      {espera.label}
                    </span>
                  </div>
                  <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 mb-6">
                    <p className="text-[9px] font-black text-slate-400 uppercase">Responsável pela Entrega</p>
                    <p className="text-sm font-bold text-slate-700 truncate uppercase">{v.motorista_nome || "NÃO INFORMADO"}</p>
                    <div className="flex justify-between mt-2 border-t border-slate-200 pt-2">
                       <span className="text-[9px] text-slate-500 font-bold uppercase">{v.tipo_servico}</span>
                       <span className="text-[9px] text-slate-900 font-black">KM {v.hodometro}</span>
                    </div>
                  </div>
                  <button 
                    onClick={() => { setSelectedVtr(v); setShowModal(true); }} 
                    className="w-full bg-slate-900 text-white py-4 rounded-2xl font-black uppercase text-[10px] flex items-center justify-center gap-2 active:scale-95 transition-all shadow-md"
                  >
                    Analisar Viatura <ChevronRight size={14} />
                  </button>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="space-y-4">
            <div className="relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
              <input placeholder="PESQUISAR PREFIXO..." className="w-full p-5 pl-12 bg-white border-2 border-slate-200 rounded-3xl font-black text-xs outline-none focus:border-amber-500" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value.toUpperCase())} />
            </div>
            <div className="bg-white rounded-[2rem] border border-slate-200 overflow-hidden shadow-sm">
              {viaturasFiltradas.map(v => {
                const status = getStatusViatura(v);
                return (
                  <div key={v.PREFIXO} className="p-4 border-b last:border-0 flex justify-between items-center hover:bg-slate-50 transition-colors">
                    <div>
                      <p className="font-black text-slate-800 tracking-tight">{v.PREFIXO}</p>
                      <p className="text-[9px] text-slate-400 font-bold uppercase">{v.PLACA} • KM: {v.ULTIMOKM}</p>
                    </div>
                    <span className={`text-[8px] font-black px-3 py-1 rounded-full shadow-sm ${
                      status === 'OK' ? 'bg-emerald-100 text-emerald-700' : 
                      status === 'MANUTENÇÃO' ? 'bg-red-600 text-white' : 'bg-amber-100 text-amber-700'
                    }`}>
                      {status}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </main>

      {showModal && selectedVtr && (
        <div className="fixed inset-0 bg-slate-900/95 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-hidden">
          <div className="bg-white w-full max-w-lg rounded-[2.5rem] shadow-2xl overflow-hidden flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-200">
            <div className="bg-slate-900 p-6 text-white flex justify-between items-center">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-amber-500 rounded-lg text-slate-900"><Car size={20}/></div>
                <h2 className="text-2xl font-black uppercase tracking-tighter">{selectedVtr.prefixo_vtr}</h2>
              </div>
              <button onClick={() => setShowModal(false)} className="p-2 bg-white/10 rounded-full hover:bg-red-500 transition-colors"><X size={20} /></button>
            </div>

            <div className="p-6 space-y-4 overflow-y-auto">
              <div className="bg-slate-50 p-4 rounded-3xl border border-slate-200">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-full bg-amber-100 flex items-center justify-center text-amber-600"><RefreshCw size={14}/></div>
                    <div>
                      <p className="text-[8px] font-black text-slate-400 uppercase">Motorista Logado</p>
                      <p className="text-xs font-bold text-slate-800 uppercase">{selectedVtr.motorista_nome}</p>
                    </div>
                  </div>
                  <button onClick={() => setConf({...conf, motoristaCorreto: !conf.motoristaCorreto})} className={`p-3 rounded-2xl transition-all ${conf.motoristaCorreto ? 'text-emerald-500' : 'text-red-500'}`}>
                    {conf.motoristaCorreto ? <CheckCircle2 size={32} /> : <AlertTriangle size={32} />}
                  </button>
                </div>

                {selectedVtr.foto && (
                  <button 
                    onClick={() => window.open(selectedVtr.foto, '_blank')}
                    className="w-full py-3 bg-white border border-amber-200 rounded-2xl flex items-center justify-center gap-2 text-[9px] font-black text-amber-600 hover:bg-amber-50 transition-all"
                  >
                    <Camera size={14} /> VER FOTO DO HODÔMETRO / COMPROVANTE
                  </button>
                )}
              </div>

              <div className="grid grid-cols-2 gap-2">
                <CheckItem label="Interno OK" active={conf.limpezaInterna} onClick={() => setConf({...conf, limpezaInterna: !conf.limpezaInterna})} />
                <CheckItem label="Externo OK" active={conf.limpezaExterna} onClick={() => setConf({...conf, limpezaExterna: !conf.limpezaExterna})} />
                <CheckItem label="Sem Objetos" active={conf.semPertences} onClick={() => setConf({...conf, semPertences: !conf.semPertences})} />
                <CheckItem label="Sem Avarias" active={!conf.avariaDetectada} onClick={() => setConf({...conf, avariaDetectada: !conf.avariaDetectada})} danger icon={<AlertTriangle size={14}/>} />
                
                <button 
                  onClick={() => setConf({...conf, confirmarTrocaOleo: !conf.confirmarTrocaOleo})} 
                  className={`col-span-2 p-4 rounded-2xl border-2 font-black text-[10px] uppercase transition-all flex items-center justify-center gap-3 ${conf.confirmarTrocaOleo ? 'bg-blue-600 border-blue-700 text-white shadow-lg' : 'bg-blue-50 border-blue-200 text-blue-400'}`}
                >
                  <Droplets size={18} className={conf.confirmarTrocaOleo ? "animate-bounce" : ""} />
                  VALIDAR TROCA DE ÓLEO
                </button>
              </div>

              <textarea 
                placeholder="NOTAS DE CONFERÊNCIA..." 
                className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl text-[10px] font-bold uppercase min-h-[70px] outline-none focus:border-amber-500" 
                value={conf.obs} 
                onChange={(e) => setConf({...conf, obs: e.target.value})} 
              />

              {!showBaixaOptions ? (
                <div className="grid grid-cols-2 gap-3 pt-2">
                  <button 
                    disabled={isSubmitting}
                    onClick={() => processarVistoria("LIBERADA")} 
                    className={`bg-emerald-600 text-white py-5 rounded-3xl font-black uppercase text-[10px] shadow-lg flex flex-col items-center gap-1 active:scale-95 transition-all ${isSubmitting ? 'opacity-50 grayscale cursor-not-allowed' : ''}`}
                  >
                    <CheckCircle2 size={20} /> {isSubmitting ? 'ENVIANDO...' : 'Liberar Vtr'}
                  </button>
                  <button 
                    disabled={isSubmitting}
                    onClick={() => setShowBaixaOptions(true)} 
                    className={`bg-slate-900 text-white py-5 rounded-3xl font-black uppercase text-[10px] shadow-lg flex flex-col items-center gap-1 active:scale-95 transition-all ${isSubmitting ? 'opacity-50 grayscale cursor-not-allowed' : ''}`}
                  >
                    <Wrench size={20} /> Baixar (Oficina)
                  </button>
                </div>
              ) : (
                <div className="bg-red-50 p-4 rounded-3xl border-2 border-red-200 space-y-3 animate-in fade-in slide-in-from-bottom-2">
                  <p className="text-[9px] font-black text-red-600 uppercase text-center">Destino da Manutenção</p>
                  <div className="grid grid-cols-2 gap-2">
                    {['MECÂNICA', 'ELÉTRICA', 'PNEU', 'FUNILARIA', 'REVISÃO', 'LIMPEZA'].map(motivo => (
                      <button key={motivo} onClick={() => processarVistoria("MANUTENCAO", motivo)} className="bg-white border border-red-100 p-3 rounded-xl text-[9px] font-black text-red-600 hover:bg-red-600 hover:text-white transition-all active:scale-95">
                        {motivo}
                      </button>
                    ))}
                  </div>
                  <button onClick={() => setShowBaixaOptions(false)} className="w-full text-[9px] font-black text-slate-400 uppercase pt-2">Voltar</button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const CheckItem = ({ label, active, onClick, danger = false, icon }) => (
  <button onClick={onClick} className={`p-4 rounded-2xl border-2 font-black text-[8px] uppercase transition-all flex flex-col items-center gap-2 ${active ? 'bg-emerald-50 border-emerald-500 text-emerald-700' : danger ? 'bg-red-600 border-red-700 text-white shadow-lg' : 'bg-slate-50 border-slate-200 text-slate-400'}`}>
    {icon}
    {label}
    <span className="text-[10px]">{active ? 'OK' : danger ? 'ALERTA' : 'PENDENTE'}</span>
  </button>
);

export default GarageiroDashboard;
