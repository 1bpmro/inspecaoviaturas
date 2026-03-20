import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { useAuth } from '../lib/AuthContext';
import { gasApi } from '../api/gasClient';
import { 
  X, Search, ShieldCheck, Volume2, VolumeX, RefreshCw  
} from 'lucide-react';

// Componentes Modulares
import QuickStats from '../components/garageiro/QuickStats';
import ViaturaRow from '../components/garageiro/ViaturaRow';
import VistoriaCard from '../components/garageiro/VistoriaCard';
import VistoriaModal from '../components/garageiro/VistoriaModal';

/**
 * UTILS: Normalização Profissional
 * Remove acentos, espaços extras e padroniza para UPPERCASE.
 */
const normalizar = (s) => 
  (s || "")
    .toString()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, "") // Blindagem extra: remove todos os espaços internos/externos
    .trim()
    .toUpperCase();

// FILTRO ESTRITO: Apenas o que está aguardando ação do pátio
const STATUS_PERMITIDO = "AGUARDANDO";

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
  
  // Estado para correção manual do motorista (Bug: Responsável não informado)
  const [motoristaManual, setMotoristaManual] = useState("");

  const submittingRef = useRef(false);
  const previousIds = useRef([]);
  const audioRef = useRef(null);
  const soundRef = useRef(false);

  const [conf, setConf] = useState({ 
    limpezaInterna: true, limpezaExterna: true, semPertences: true,
    motoristaCorreto: true, avariaDetectada: false, confirmarTrocaOleo: false,
    obs: '' 
  });

  useEffect(() => {
    soundRef.current = soundEnabled;
  }, [soundEnabled]);

  useEffect(() => {
    audioRef.current = new Audio('https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3');
  }, []);

  const carregarDados = useCallback(async () => {
    if (!gasApi?.getVistoriasPendentes || !gasApi?.getViaturas) return;

    try {
      const [resVistorias, resViaturas] = await Promise.all([
        gasApi.getVistoriasPendentes(),
        gasApi.getViaturas()
      ]);

      if (resVistorias?.data) {
        // FILTRO ESTRITO: Só entra o que for exatamente AGUARDANDO (independente da aba de origem)
        const vistoriasFiltradas = resVistorias.data.filter(v => {
          const statusGeral = normalizar(v.status_vtr || v.status);
          return statusGeral === STATUS_PERMITIDO;
        });
        
        const novosIds = vistoriasFiltradas.map(v => v.id);
        const temNovo = novosIds.some(id => !previousIds.current.includes(id));
        
        if (soundRef.current && temNovo && audioRef.current) {
          audioRef.current.play().catch(() => {});
        }
        
        previousIds.current = novosIds;
        setVistorias(vistoriasFiltradas);
      }

      if (resViaturas?.data) {
        setViaturas(resViaturas.data);
      }

    } catch (e) {
      console.error("[GARAGEIRO_SYNC_ERROR]", e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    carregarDados();
    const interval = setInterval(carregarDados, 15000);
    return () => clearInterval(interval);
  }, [carregarDados]);

  const toggleSound = () => {
    const next = !soundEnabled;
    setSoundEnabled(next);
    if (next && audioRef.current) {
      audioRef.current.play().catch(() => {});
    }
  };

  const getStatusViatura = (v) => {
    const kmAtual = Number(v?.ULTIMOKM || 0);
    const kmTroca = Number(v?.KM_TROCA_OLEO ?? v?.KM_ULTIMATROCA ?? 0);
    const diff = Math.max(0, kmAtual - kmTroca);
    
    if (diff >= 12000) return "BLOQUEADA";
    if (diff >= 9000) return "ATENÇÃO ÓLEO";

    const statusBase = normalizar(v?.STATUS || "OK");
    if (["MANUTENCAO", "OFICINA"].includes(statusBase)) return "MANUTENÇÃO";
    return "OK";
  };

  const processarVistoria = async (statusFinal, motivoOpcional = '') => {
    if (submittingRef.current || !selectedVtr) return;
    
    // Validação de motorista manual
    if (!conf.motoristaCorreto && !motoristaManual.trim()) {
      alert("Por favor, informe o nome do motorista real.");
      return;
    }

    submittingRef.current = true;
    setIsSubmitting(true);

    try {
      const payload = {
        id_vistoria: selectedVtr.id,
        prefixo: selectedVtr.prefixo_vtr,
        status_vtr: statusFinal,
        garageiro_re: `${user?.re || '000'} - ${user?.nome || 'SISTEMA'}`,
        // Se o motorista não for o do sistema, envia o nome manual corrigido
        motorista_real: conf.motoristaCorreto ? (selectedVtr.motorista_nome || "NÃO INFORMADO") : motoristaManual.toUpperCase(),
        status_fisico: conf.avariaDetectada ? 'AVARIADA' : 'OK',
        limpeza: (!conf.limpezaInterna || !conf.limpezaExterna) ? 'CRÍTICA' : 'OK',
        obs_garageiro: (motivoOpcional || conf.obs).toUpperCase(),
        confirmar_oleo: conf.confirmarTrocaOleo,
        km_registro: selectedVtr?.hodometro || 0,
        data_vistoria: selectedVtr?.data_hora
      };

      const idRemover = selectedVtr.id;
      setVistorias(prev => prev.filter(v => v.id !== idRemover));
      
      await gasApi.confirmarVistoriaGarageiro(payload);
      
      setShowModal(false);
      setShowBaixaOptions(false);
      setSelectedVtr(null);
      setMotoristaManual("");
      setConf({ 
        limpezaInterna: true, limpezaExterna: true, semPertences: true,
        motoristaCorreto: true, avariaDetectada: false, confirmarTrocaOleo: false,
        obs: '' 
      });
      
      carregarDados();
    } catch (e) {
      alert("Erro no processamento. A lista será recarregada.");
      carregarDados();
    } finally {
      submittingRef.current = false;
      setIsSubmitting(false);
    }
  };

  const viaturasFiltradas = useMemo(() => {
    const term = searchTerm.toUpperCase();
    return viaturas.filter(v => (v?.PREFIXO || "").toString().includes(term));
  }, [viaturas, searchTerm]);

  if (loading && vistorias.length === 0) {
    return (
      <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center text-white p-6 text-center">
        <RefreshCw className="animate-spin text-amber-500 mb-4" size={40} />
        <p className="font-black text-[10px] tracking-[0.2em] uppercase">Sincronizando Pátio 1º BPM...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col font-sans select-none">
      
      <header className="bg-slate-900 text-white p-4 shadow-lg border-b-4 border-amber-500 flex justify-between items-center sticky top-0 z-30">
        <div className="flex items-center gap-3">
          <div className="bg-amber-500 p-2 rounded-xl text-slate-900"><ShieldCheck size={24} /></div>
          <div>
            <h1 className="font-black uppercase tracking-tighter text-lg leading-none">Controle de Pátio</h1>
            <p className="text-[9px] font-bold text-amber-500 uppercase tracking-widest mt-1">Status em Tempo Real</p>
          </div>
        </div>
        <div className="flex gap-2">
          <button onClick={toggleSound} className={`p-2 rounded-xl transition-all active:scale-90 ${soundEnabled ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/20' : 'bg-slate-800 text-slate-400'}`}>
            {soundEnabled ? <Volume2 size={20} /> : <VolumeX size={20} />}
          </button>
          <button onClick={onBack} className="p-2 bg-slate-800 rounded-xl hover:bg-red-600 transition-colors"><X size={20} /></button>
        </div>
      </header>

      <div className="flex bg-white shadow-sm sticky top-[72px] z-20 border-b border-slate-200">
        <button onClick={() => setTab('pendentes')} className={`flex-1 p-4 text-[10px] font-black uppercase border-b-4 ${tab === 'pendentes' ? 'border-amber-500 text-amber-600' : 'border-transparent text-slate-400'}`}>
          Pendentes ({vistorias.length})
        </button>
        <button onClick={() => setTab('frota')} className={`flex-1 p-4 text-[10px] font-black uppercase border-b-4 ${tab === 'frota' ? 'border-amber-500 text-amber-600' : 'border-transparent text-slate-400'}`}>
          Frota Total
        </button>
      </div>

      <main className="p-4 flex-1 overflow-y-auto pb-20">
        <QuickStats vistorias={vistorias} />

        {tab === 'pendentes' ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {vistorias.length === 0 ? (
              <div className="col-span-full flex flex-col items-center justify-center p-20 text-slate-300">
                <ShieldCheck size={64} className="mb-4 opacity-10" />
                <p className="font-black uppercase text-[10px] tracking-[0.3em]">Pátio em conformidade</p>
              </div>
            ) : (
              vistorias.map(v => (
                <VistoriaCard 
                  key={v.id} 
                  v={v} 
                  onAnalisar={() => { setSelectedVtr(v); setShowModal(true); }} 
                />
              ))
            )}
          </div>
        ) : (
          <div className="space-y-4">
            <div className="relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
              <input 
                placeholder="BUSCAR PREFIXO..." 
                className="w-full p-5 pl-12 bg-white border-2 border-slate-200 rounded-3xl font-black text-xs outline-none focus:border-amber-500 transition-all shadow-sm" 
                value={searchTerm} 
                onChange={(e) => setSearchTerm(e.target.value.toUpperCase())} 
              />
            </div>
            <div className="bg-white rounded-[2.5rem] border border-slate-200 overflow-hidden shadow-sm">
              {viaturasFiltradas.length > 0 ? (
                viaturasFiltradas.map(vtr => (
                  <ViaturaRow key={vtr.PREFIXO} v={vtr} getStatus={getStatusViatura} />
                ))
              ) : (
                <p className="p-10 text-center text-[10px] font-black text-slate-400 uppercase tracking-widest">Nenhuma viatura encontrada</p>
              )}
            </div>
          </div>
        )}
      </main>

      {showModal && selectedVtr && (
        <VistoriaModal 
          v={selectedVtr}
          conf={conf}
          setConf={setConf}
          isSubmitting={isSubmitting}
          showBaixa={showBaixaOptions}
          setShowBaixa={setShowBaixaOptions}
          onClose={() => { setShowModal(false); setShowBaixaOptions(false); setSelectedVtr(null); setMotoristaManual(""); }}
          onConfirm={processarVistoria}
        >
          {/* O Modal injeta este input caso o motorista esteja incorreto */}
          {!conf.motoristaCorreto && (
            <div className="mt-4 animate-in fade-in slide-in-from-top-2">
               <label className="text-[10px] font-black text-amber-600 ml-2 uppercase">Identificação do Motorista Real</label>
               <input
                 placeholder="NOME COMPLETO OU RE"
                 className="w-full p-4 mt-1 bg-amber-50 border-2 border-amber-200 rounded-2xl font-bold text-sm outline-none focus:border-amber-500 uppercase"
                 value={motoristaManual}
                 onChange={(e) => setMotoristaManual(e.target.value)}
               />
            </div>
          )}
        </VistoriaModal>
      )}
    </div>
  );
};

export default GarageiroDashboard;
