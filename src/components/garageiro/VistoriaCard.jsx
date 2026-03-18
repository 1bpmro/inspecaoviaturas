import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { useAuth } from '../lib/AuthContext';
import { gasApi } from '../api/gasClient';
import { 
  Car, CheckCircle2, AlertTriangle, Search, ShieldCheck, Camera, X, 
  Inbox, Volume2, VolumeX, Wrench, ChevronRight, Droplets, RefreshCw, Lock
} from 'lucide-react';
import { QuickStats, CheckItem } from './GarageiroComponents'; // Importe os pequenos aqui

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
  
  const submittingRef = useRef(false);
  const activeRef = useRef(true);
  const previousIds = useRef([]);
  const audioRef = useRef(null);
  const lastSoundTime = useRef(0);

  const [conf, setConf] = useState({ 
    limpezaInterna: true, limpezaExterna: true, semPertences: true,
    motoristaCorreto: true, avariaDetectada: false, confirmarTrocaOleo: false,
    motivoBaixa: '', obs: '' 
  });

  useEffect(() => {
    audioRef.current = new Audio('https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3');
    return () => { activeRef.current = false; };
  }, []);

  // Lógica de Status (Óleo e Manutenção)
  const getStatusViatura = useCallback((v) => {
    const kmAtual = Number(v.ULTIMOKM || 0);
    const kmTroca = Number(v.KM_TROCA_OLEO ?? v.KM_ULTIMATROCA ?? 0);
    const diff = Math.max(0, kmAtual - kmTroca);
    
    if (diff >= 12000) return "BLOQUEADA";
    if (diff >= 9000) return "ATENÇÃO ÓLEO";
    const statusBase = (v.STATUS || "OK").toUpperCase();
    if (["MANUTENÇÃO", "MANUTENCAO", "OFICINA"].includes(statusBase)) return "MANUTENÇÃO";
    if (statusBase === "INATIVA") return "INATIVA";
    return "OK";
  }, []);

  // 🧩 FIX DO ERRO: Carregar dados com retry se API não estiver pronta
  const carregarDados = useCallback(async () => {
    if (!gasApi.getVistoriasPendentes) return false;

    try {
      const [resVistorias, resViaturas] = await Promise.all([
        gasApi.getVistoriasPendentes(),
        gasApi.getViaturas()
      ]);

      if (resVistorias?.data) {
        const pátio = resVistorias.data.filter(v => 
          ["AGUARDANDO", "PÁTIO", "PENDENTE"].includes((v.status_vtr || v.status || "").toUpperCase())
        );
        
        const novosIds = pátio.map(v => v.id);
        const temNovo = novosIds.some(id => !previousIds.current.includes(id));
        
        if (soundEnabled && temNovo && Date.now() - lastSoundTime.current > 10000) {
          audioRef.current?.play().catch(() => {});
          lastSoundTime.current = Date.now();
        }
        previousIds.current = novosIds;
        setVistorias(pátio);
      }
      if (resViaturas?.data) setViaturas(resViaturas.data);
      return true;
    } catch (e) {
      console.error("Erro na sincronização:", e);
      return false;
    } finally {
      setLoading(false);
    }
  }, [soundEnabled]);

  // 🧩 Long Polling Inteligente
  useEffect(() => {
    const loop = async () => {
      while (activeRef.current) {
        const sucesso = await carregarDados();
        await new Promise(r => setTimeout(r, sucesso ? 7000 : 15000));
      }
    };
    loop();
  }, [carregarDados]);

  const toggleSound = () => {
    setSoundEnabled(!soundEnabled);
    if (!soundEnabled && audioRef.current) audioRef.current.play().catch(() => {});
  };

  const processarVistoria = async (statusFinal, motivoOpcional = '') => {
    if (submittingRef.current || !selectedVtr) return;
    submittingRef.current = true;
    setIsSubmitting(true);

    const targetVtr = selectedVtr;

    try {
      // UPDATE OTIMISTA (UX Instantânea)
      setVistorias(prev => prev.filter(v => v.id !== targetVtr.id));
      setViaturas(prev => prev.map(v => v.PREFIXO === targetVtr.prefixo_vtr ? { ...v, STATUS: statusFinal } : v));
      
      const payload = {
        id_vistoria: targetVtr.id,
        prefixo: targetVtr.prefixo_vtr,
        status_vtr: statusFinal,
        garageiro_re: `${user?.re || '000'} - ${user?.nome || 'SISTEMA'}`,
        status_fisico: conf.avariaDetectada ? 'AVARIADA' : 'OK',
        limpeza: (!conf.limpezaInterna || !conf.limpezaExterna) ? 'CRÍTICA' : 'OK',
        obs_garageiro: (motivoOpcional || conf.obs).toUpperCase(),
        confirmar_oleo: conf.confirmarTrocaOleo,
        km_registro: targetVtr.hodometro || 0,
        data_vistoria: targetVtr.data_hora
      };

      setShowModal(false);
      await gasApi.confirmarVistoriaGarageiro(payload);
      
      setConf({ 
        limpezaInterna: true, limpezaExterna: true, semPertences: true,
        motoristaCorreto: true, avariaDetectada: false, confirmarTrocaOleo: false,
        motivoBaixa: '', obs: '' 
      });
    } catch (e) {
      alert("Erro ao salvar. Recarregando...");
      carregarDados();
    } finally {
      submittingRef.current = false;
      setIsSubmitting(false);
      setShowBaixaOptions(false);
    }
  };

  const viaturasFiltradas = useMemo(() => {
    const term = searchTerm.toUpperCase();
    return viaturas.filter(v => (v.PREFIXO || "").toString().includes(term));
  }, [viaturas, searchTerm]);

  if (loading && vistorias.length === 0) {
    return (
      <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center text-white p-6 text-center">
        <RefreshCw className="animate-spin text-amber-500 mb-4" size={40} />
        <p className="font-black text-[10px] tracking-[0.2em] uppercase">Sincronizando com Google Apps Script...</p>
        <p className="text-slate-500 text-[9px] mt-2">Se demorar, verifique sua conexão ou se o script está publicado.</p>
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
          <button onClick={toggleSound} className={`p-2 rounded-xl transition-all ${soundEnabled ? 'bg-emerald-500' : 'bg-slate-800'}`}>
            {soundEnabled ? <Volume2 size={20} /> : <VolumeX size={20} />}
          </button>
          <button onClick={onBack} className="p-2 bg-slate-800 rounded-xl hover:bg-red-600"><X size={20} /></button>
        </div>
      </header>

      <div className="flex bg-white shadow-sm sticky top-0 z-10 border-b border-slate-200">
        <TabBtn active={tab==='pendentes'} label={`Pendentes (${vistorias.length})`} onClick={()=>setTab('pendentes')} />
        <TabBtn active={tab==='frota'} label="Frota Total" onClick={()=>setTab('frota')} />
      </div>

      <main className="p-4 flex-1 overflow-y-auto">
        {tab === 'pendentes' ? (
          <>
            <QuickStats vistorias={vistorias} />
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {vistorias.length === 0 ? (
                <EmptyState />
              ) : vistorias.map(v => (
                <VistoriaCard 
                  key={v.id} 
                  v={v} 
                  onAnalisar={() => { setSelectedVtr(v); setShowModal(true); }} 
                />
              ))}
            </div>
          </>
        ) : (
          <FrotaView 
            searchTerm={searchTerm} 
            setSearchTerm={setSearchTerm} 
            viaturas={viaturasFiltradas} 
            getStatus={getStatusViatura} 
          />
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
          onClose={() => setShowModal(false)}
          onConfirm={processarVistoria}
        />
      )}
    </div>
  );
};

// --- SUBCOMPONENTES DE APOIO ---

const TabBtn = ({ active, label, onClick }) => (
  <button onClick={onClick} className={`flex-1 p-4 text-[10px] font-black uppercase transition-all border-b-4 ${active ? 'border-amber-500 text-amber-600' : 'border-transparent text-slate-400'}`}>
    {label}
  </button>
);

const EmptyState = () => (
  <div className="col-span-full flex flex-col items-center justify-center p-20 text-slate-300">
    <Inbox size={64} className="mb-4 opacity-10" />
    <p className="font-black uppercase text-[10px] tracking-[0.3em]">Pátio em conformidade</p>
  </div>
);

const VistoriaCard = ({ v, onAnalisar }) => {
  const esperaMin = Math.floor((new Date() - new Date(v.data_hora)) / 60000);
  const corEspera = esperaMin > 30 ? "bg-red-600 animate-pulse text-white" : esperaMin > 15 ? "bg-amber-500 text-slate-900" : "bg-emerald-100 text-emerald-700";

  return (
    <div className="bg-white rounded-[2rem] border-2 border-slate-200 p-6 shadow-sm hover:border-amber-400 transition-all">
      <div className="flex justify-between items-start mb-4">
        <h2 className="text-4xl font-black text-slate-900 tracking-tighter">{v.prefixo_vtr}</h2>
        <span className={`px-3 py-1 rounded-full text-[9px] font-black uppercase shadow-sm ${corEspera}`}>
          {esperaMin} MIN
        </span>
      </div>
      <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 mb-6">
        <p className="text-[9px] font-black text-slate-400 uppercase">Responsável</p>
        <p className="text-sm font-bold text-slate-700 truncate uppercase">{v.motorista_nome || "NÃO INFORMADO"}</p>
      </div>
      <button onClick={onAnalisar} className="w-full bg-slate-900 text-white py-4 rounded-2xl font-black uppercase text-[10px] flex items-center justify-center gap-2 active:scale-95 shadow-md">
        Analisar <ChevronRight size={14} />
      </button>
    </div>
  );
};

const FrotaView = ({ searchTerm, setSearchTerm, viaturas, getStatus }) => (
  <div className="space-y-4">
    <div className="relative">
      <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
      <input placeholder="PESQUISAR PREFIXO..." className="w-full p-5 pl-12 bg-white border-2 border-slate-200 rounded-3xl font-black text-xs outline-none focus:border-amber-500" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value.toUpperCase())} />
    </div>
    <div className="bg-white rounded-[2rem] border border-slate-200 overflow-hidden">
      {viaturas.map(v => {
        const status = getStatus(v);
        const isBlocked = status === "BLOQUEADA";
        return (
          <div key={v.PREFIXO} className={`p-4 border-b flex justify-between items-center ${isBlocked ? 'bg-red-50/50' : 'hover:bg-slate-50'}`}>
            <div className={isBlocked ? 'opacity-40 grayscale' : ''}>
              <div className="flex items-center gap-2 font-black text-slate-800 tracking-tight">
                {v.PREFIXO} {isBlocked && <Lock size={12} className="text-red-600" />}
              </div>
              <p className="text-[9px] text-slate-400 font-bold uppercase">{v.PLACA} • KM {v.ULTIMOKM}</p>
            </div>
            <span className={`text-[8px] font-black px-3 py-1 rounded-full ${status === 'OK' ? 'bg-emerald-100 text-emerald-700' : status === 'MANUTENÇÃO' ? 'bg-red-600 text-white' : 'bg-amber-100 text-amber-700'}`}>
              {status}
            </span>
          </div>
        );
      })}
    </div>
  </div>
);

const VistoriaModal = ({ v, conf, setConf, isSubmitting, showBaixa, setShowBaixa, onClose, onConfirm }) => (
  <div className="fixed inset-0 bg-slate-900/95 backdrop-blur-sm z-50 flex items-center justify-center p-4">
    <div className="bg-white w-full max-w-lg rounded-[2.5rem] shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
      <div className="bg-slate-900 p-6 text-white flex justify-between items-center">
        <h2 className="text-2xl font-black uppercase tracking-tighter">{v.prefixo_vtr}</h2>
        <button onClick={onClose} className="p-2 bg-white/10 rounded-full"><X size={20} /></button>
      </div>

      <div className="p-6 space-y-4 overflow-y-auto">
        <div className="bg-slate-50 p-4 rounded-3xl border">
          <div className="flex items-center justify-between mb-3">
             <p className="text-xs font-bold text-slate-800 uppercase">{v.motorista_nome}</p>
             <button onClick={() => setConf({...conf, motoristaCorreto: !conf.motoristaCorreto})} className={`p-3 rounded-2xl ${conf.motoristaCorreto ? 'text-emerald-500' : 'text-red-500'}`}>
               <CheckCircle2 size={32} />
             </button>
          </div>
          {v.foto && (
            <button onClick={() => window.open(v.foto, '_blank')} className="w-full py-3 bg-white border border-amber-200 rounded-2xl flex items-center justify-center gap-2 text-[9px] font-black text-amber-600">
              <Camera size={14} /> VER COMPROVANTE
            </button>
          )}
        </div>

        <div className="grid grid-cols-2 gap-2">
          <CheckItem label="Limpo Interno" active={conf.limpezaInterna} onClick={() => setConf({...conf, limpezaInterna: !conf.limpezaInterna})} />
          <CheckItem label="Limpo Externo" active={conf.limpezaExterna} onClick={() => setConf({...conf, limpezaExterna: !conf.limpezaExterna})} />
          <CheckItem label="Sem Pertences" active={conf.semPertences} onClick={() => setConf({...conf, semPertences: !conf.semPertences})} />
          <CheckItem label="Sem Avarias" active={!conf.avariaDetectada} onClick={() => setConf({...conf, avariaDetectada: !conf.avariaDetectada})} danger icon={<AlertTriangle size={14}/>} />
        </div>

        <button 
          onClick={() => setConf({...conf, confirmarTrocaOleo: !conf.confirmarTrocaOleo})} 
          className={`w-full p-4 rounded-2xl border-2 font-black text-[10px] flex items-center justify-center gap-3 ${conf.confirmarTrocaOleo ? 'bg-blue-600 border-blue-700 text-white' : 'bg-blue-50 border-blue-200 text-blue-400'}`}
        >
          <Droplets size={18} /> CONFIRMAR REVISÃO/ÓLEO
        </button>

        <textarea placeholder="OBSERVAÇÕES..." className="w-full p-4 bg-slate-50 border rounded-2xl text-[10px] font-bold uppercase min-h-[70px]" value={conf.obs} onChange={(e) => setConf({...conf, obs: e.target.value})} />

        {!showBaixa ? (
          <div className="grid grid-cols-2 gap-3 pt-2">
            <button disabled={isSubmitting} onClick={() => onConfirm("LIBERADA")} className="bg-emerald-600 text-white py-5 rounded-3xl font-black uppercase text-[10px] shadow-lg flex flex-col items-center gap-1 active:scale-95 transition-all">
              <CheckCircle2 size={20} /> {isSubmitting ? 'SALVANDO...' : 'Liberar Pátio'}
            </button>
            <button disabled={isSubmitting} onClick={() => setShowBaixa(true)} className="bg-slate-900 text-white py-5 rounded-3xl font-black uppercase text-[10px] shadow-lg flex flex-col items-center gap-1">
              <Wrench size={20} /> Baixar Oficina
            </button>
          </div>
        ) : (
          <div className="bg-red-50 p-4 rounded-3xl border-2 border-red-200 space-y-3">
            <div className="grid grid-cols-2 gap-2">
              {['MECÂNICA', 'ELÉTRICA', 'PNEU', 'FUNILARIA', 'REVISÃO', 'LIMPEZA'].map(motivo => (
                <button key={motivo} onClick={() => onConfirm("MANUTENCAO", motivo)} className="bg-white border p-3 rounded-xl text-[9px] font-black text-red-600 active:scale-95">
                  {motivo}
                </button>
              ))}
            </div>
            <button onClick={() => setShowBaixa(false)} className="w-full text-[9px] font-black text-slate-400 uppercase pt-2">Cancelar</button>
          </div>
        )}
      </div>
    </div>
  </div>
);

export default GarageiroDashboard;
