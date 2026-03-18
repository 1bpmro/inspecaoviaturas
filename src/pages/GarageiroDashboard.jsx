import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useAuth } from '../lib/AuthContext';
import { gasApi } from '../api/gasClient'; // Mantendo sua API atual

import { 
  Car, CheckCircle2, AlertTriangle, Clock, RefreshCw,
  Search, ShieldCheck, Lock, Unlock, Camera, User, X, 
  Inbox, Volume2, VolumeX, Wrench, ChevronRight, Eye
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
  
  // Modais e Estados de Conferência
  const [showModal, setShowModal] = useState(false);
  const [selectedVtr, setSelectedVtr] = useState(null);
  const [conf, setConf] = useState({ 
    limpezaInterna: true, 
    limpezaExterna: true, 
    semPertences: true,
    motoristaCorreto: true,
    avariaDetectada: false, 
    obs: '' 
  });

  const previousIds = useRef([]);
  const audioRef = useRef(new Audio('https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3'));

  // 1. CARREGAMENTO DE DADOS (POLLING 15s)
  const carregarDados = async () => {
    try {
      const [resVistorias, resViaturas] = await Promise.all([
        gasApi.getVistoriasPendentes?.(),
        gasApi.getViaturas()
      ]);

      if (resVistorias?.data) {
        const novosIds = resVistorias.data.map(v => v.id);
        const temNovo = novosIds.some(id => !previousIds.current.includes(id));
        if (soundEnabled && temNovo) audioRef.current.play().catch(() => {});
        previousIds.current = novosIds;
        setVistorias(resVistorias.data);
      }
      if (resViaturas?.data) setViaturas(resViaturas.data);
    } catch (e) {
      console.error("Erro ao carregar:", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    carregarDados();
    const interval = setInterval(carregarDados, 15000);
    return () => clearInterval(interval);
  }, [soundEnabled]);

  // 2. LÓGICA DE STATUS (ÓLEO/BLOQUEIO)
  const getStatusViatura = (v) => {
    const kmAtual = Number(v.ULTIMOKM || 0);
    const kmTroca = Number(v.KM_TROCA_OLEO ?? v.KM_ULTIMATROCA ?? 0);
    const diff = kmAtual - kmTroca;
    if (diff >= 12000) return "BLOQUEADA";
    if (diff >= 9000) return "ATENCAO";
    return v.STATUS || "OK";
  };

  // 3. FINALIZAR CONFERÊNCIA (Ação do Botão Liberar/Baixar)
  const processarVistoria = async (statusFinal) => {
    if (isSubmitting) return;
    setIsSubmitting(true);

    try {
      await gasApi.updateVistoriaStatus(selectedVtr.id, {
        status_vtr: statusFinal,
        responsavel_patio: user?.nome || "GARAGEIRO",
        detalhes_conferencia: {
          ...conf,
          data: new Date().toISOString()
        }
      });
      
      setShowModal(false);
      carregarDados();
      alert(`Viatura ${selectedVtr.prefixo_vtr} processada como ${statusFinal}`);
    } catch (e) {
      alert("Erro ao salvar conferência.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const calcularEspera = (data) => {
    if (!data) return 0;
    return Math.floor((new Date() - new Date(data)) / 60000);
  };

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col font-sans">
      {/* HEADER TÁTICO */}
      <header className="bg-slate-900 text-white p-4 shadow-lg border-b-4 border-amber-500 flex justify-between items-center">
        <div className="flex items-center gap-3">
          <div className="bg-amber-500 p-2 rounded-xl text-slate-900"><ShieldCheck size={24} /></div>
          <div>
            <h1 className="font-black uppercase tracking-tighter text-lg">Controle de Pátio</h1>
            <p className="text-[10px] font-bold text-amber-500 uppercase">Monitoramento em Tempo Real</p>
          </div>
        </div>
        <div className="flex gap-2">
          <button onClick={() => setSoundEnabled(!soundEnabled)} className={`p-2 rounded-xl ${soundEnabled ? 'bg-emerald-500' : 'bg-slate-800'}`}>
            {soundEnabled ? <Volume2 size={20} /> : <VolumeX size={20} />}
          </button>
          <button onClick={onBack} className="p-2 bg-slate-800 rounded-xl"><X size={20} /></button>
        </div>
      </header>

      {/* TABS NAVEGAÇÃO */}
      <div className="flex bg-white shadow-sm sticky top-0 z-10">
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
            {vistorias.map(v => {
              const espera = calcularEspera(v.data_hora);
              const critico = espera > 20;
              return (
                <div key={v.id} className={`bg-white rounded-[2.5rem] border-2 p-6 shadow-sm transition-all ${critico ? "border-red-500 animate-pulse" : "border-slate-200"}`}>
                  <div className="flex justify-between items-start mb-4">
                    <h2 className="text-4xl font-black text-slate-900 tracking-tighter">{v.prefixo_vtr}</h2>
                    <div className="text-right">
                      <span className="bg-amber-100 text-amber-700 px-3 py-1 rounded-full text-[9px] font-black uppercase">Aguardando</span>
                      <p className={`text-[10px] font-black mt-2 ${critico ? 'text-red-600' : 'text-slate-400'}`}>{espera} MIN ESPERA</p>
                    </div>
                  </div>
                  
                  <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 mb-6">
                    <p className="text-[9px] font-black text-slate-400 uppercase">Motorista</p>
                    <p className="text-sm font-bold text-slate-700 truncate uppercase">{v.motorista_nome}</p>
                    <p className="text-[9px] text-slate-500 mt-1">{v.tipo_vistoria} • {v.tipo_servico}</p>
                  </div>

                  <button 
                    onClick={() => { setSelectedVtr(v); setShowModal(true); }}
                    className="w-full bg-slate-900 text-white py-4 rounded-2xl font-black uppercase text-xs flex items-center justify-center gap-2"
                  >
                    Conferir Entrega <ChevronRight size={16} />
                  </button>
                </div>
              );
            })}
          </div>
        ) : (
          /* LISTA DE FROTA - MANTENDO SEU FILTRO */
          <div className="space-y-4">
            <div className="relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
              <input 
                placeholder="BUSCAR PREFIXO OU PLACA..." 
                className="w-full p-5 pl-12 bg-white border-2 border-slate-200 rounded-3xl font-black text-xs outline-none focus:border-amber-500"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value.toUpperCase())}
              />
            </div>
            <div className="bg-white rounded-[2rem] border border-slate-200 overflow-hidden">
              {viaturas.filter(v => v.PREFIXO?.includes(searchTerm)).map(v => (
                <div key={v.PREFIXO} className="p-4 border-b flex justify-between items-center hover:bg-slate-50">
                  <div>
                    <p className="font-black text-slate-800">{v.PREFIXO}</p>
                    <p className="text-[10px] text-slate-400 uppercase">{v.PLACA} • KM: {v.ULTIMOKM}</p>
                  </div>
                  <span className={`text-[9px] font-black px-3 py-1 rounded-full ${getStatusViatura(v) === 'OK' ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>
                    {getStatusViatura(v)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>

      {/* MODAL DE CONFERÊNCIA DO GARAGEIRO (CHECKLIST PRÓPRIO) */}
      {showModal && selectedVtr && (
        <div className="fixed inset-0 bg-slate-900/90 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-lg rounded-[3rem] shadow-2xl overflow-hidden flex flex-col max-h-[95vh]">
            <div className="bg-slate-900 p-6 text-white flex justify-between items-center">
              <div>
                <h2 className="text-2xl font-black uppercase tracking-tighter">{selectedVtr.prefixo_vtr}</h2>
                <p className="text-[10px] text-amber-500 font-bold uppercase">Checklist do Pátio</p>
              </div>
              <button onClick={() => setShowModal(false)} className="p-2 bg-white/10 rounded-full"><X size={20} /></button>
            </div>

            <div className="p-6 space-y-4 overflow-y-auto">
              {/* Validação do Motorista */}
              <div className="bg-slate-50 p-4 rounded-3xl border-2 border-slate-100">
                <p className="text-[10px] font-black text-slate-400 uppercase mb-2">Motorista que está entregando:</p>
                <button 
                  onClick={() => setConf({...conf, motoristaCorreto: !conf.motoristaCorreto})}
                  className={`w-full p-4 rounded-2xl border-2 font-black text-xs flex items-center justify-between ${conf.motoristaCorreto ? 'bg-white border-emerald-500 text-emerald-700' : 'bg-red-50 border-red-500 text-red-700'}`}
                >
                  <span className="uppercase">{selectedVtr.motorista_nome}</span>
                  {conf.motoristaCorreto ? <CheckCircle2 size={18} /> : <AlertTriangle size={18} />}
                </button>
              </div>

              {/* Checklist Visual do Garageiro */}
              <div className="grid grid-cols-2 gap-2">
                <CheckItem label="Interno Limpo" active={conf.limpezaInterna} onClick={() => setConf({...conf, limpezaInterna: !conf.limpezaInterna})} />
                <CheckItem label="Externo Limpo" active={conf.limpezaExterna} onClick={() => setConf({...conf, limpezaExterna: !conf.limpezaExterna})} />
                <CheckItem label="Sem Pertences" active={conf.semPertences} onClick={() => setConf({...conf, semPertences: !conf.semPertences})} />
                <CheckItem label="Sem Avarias" active={!conf.avariaDetectada} onClick={() => setConf({...conf, avariaDetectada: !conf.avariaDetectada})} danger />
              </div>

              <textarea 
                placeholder="OBSERVAÇÕES DO GARAGEIRO..."
                className="w-full p-4 bg-slate-50 border-2 border-slate-100 rounded-2xl text-xs font-bold uppercase min-h-[80px] outline-none focus:border-amber-500"
                value={conf.obs}
                onChange={(e) => setConf({...conf, obs: e.target.value})}
              />

              <div className="grid grid-cols-2 gap-3 pt-4">
                <button 
                  onClick={() => processarVistoria("LIBERADA")}
                  className="bg-emerald-600 text-white py-5 rounded-3xl font-black uppercase text-[10px] shadow-lg flex flex-col items-center gap-1"
                >
                  <CheckCircle2 size={20} /> Liberar
                </button>
                <button 
                  onClick={() => processarVistoria("MANUTENCAO")}
                  className="bg-red-600 text-white py-5 rounded-3xl font-black uppercase text-[10px] shadow-lg flex flex-col items-center gap-1"
                >
                  <Wrench size={20} /> Baixar (Oficina)
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// Componente Auxiliar para o Checklist
const CheckItem = ({ label, active, onClick, danger = false }) => (
  <button 
    onClick={onClick}
    className={`p-4 rounded-2xl border-2 font-black text-[9px] uppercase transition-all flex flex-col items-center gap-2 ${
      active 
        ? 'bg-emerald-50 border-emerald-500 text-emerald-700' 
        : danger ? 'bg-red-600 border-red-700 text-white animate-pulse' : 'bg-slate-50 border-slate-200 text-slate-400'
    }`}
  >
    {label}
    <span className="text-[11px]">{active ? 'OK' : danger ? 'ALERTA' : 'PENDENTE'}</span>
  </button>
);

export default GarageiroDashboard;
