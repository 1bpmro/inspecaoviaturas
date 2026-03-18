import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useAuth } from '../lib/AuthContext';
import { gasApi } from '../api/gasClient';

import { 
  Car, CheckCircle2, AlertTriangle, Clock, RefreshCw,
  Search, ShieldCheck, Lock, Unlock, Camera, User, X, 
  Inbox, Volume2, VolumeX, Wrench, ChevronRight, Droplets,
  Settings, tool
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
  
  const [conf, setConf] = useState({ 
    limpezaInterna: true, 
    limpezaExterna: true, 
    semPertences: true,
    motoristaCorreto: true,
    avariaDetectada: false, 
    confirmarTrocaOleo: false,
    motivoBaixa: '',
    obs: '' 
  });

  const previousIds = useRef([]);
  const audioRef = useRef(new Audio('https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3'));

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

  const getStatusViatura = (v) => {
    const kmAtual = Number(v.ULTIMOKM || 0);
    const kmTroca = Number(v.KM_TROCA_OLEO ?? v.KM_ULTIMATROCA ?? 0);
    const diff = kmAtual - kmTroca;
    if (diff >= 12000) return "BLOQUEADA";
    if (diff >= 9000) return "ATENCAO";
    return v.STATUS || "OK";
  };

  const processarVistoria = async (statusFinal, motivoOpcional = '') => {
    if (isSubmitting) return;
    setIsSubmitting(true);

    try {
      const payload = {
        status_vtr: statusFinal,
        responsavel_patio: user?.nome || "GARAGEIRO",
        detalhes_conferencia: {
          ...conf,
          motivoBaixa: motivoOpcional || conf.motivoBaixa,
          data: new Date().toISOString()
        }
      };

      // RESET DE ÓLEO: Se confirmado, envia o KM atual para atualizar a planilha
      if (conf.confirmarTrocaOleo) {
        payload.atualizar_km_oleo = true;
        payload.novo_km_oleo = selectedVtr.hodometro;
      }

      await gasApi.updateVistoriaStatus(selectedVtr.id, payload);
      
      setShowModal(false);
      setShowBaixaOptions(false);
      setConf({ 
        limpezaInterna: true, limpezaExterna: true, semPertences: true,
        motoristaCorreto: true, avariaDetectada: false, confirmarTrocaOleo: false,
        motivoBaixa: '', obs: '' 
      });
      carregarDados();
      alert(`Viatura ${selectedVtr.prefixo_vtr} atualizada com sucesso!`);
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
      <header className="bg-slate-900 text-white p-4 shadow-lg border-b-4 border-amber-500 flex justify-between items-center">
        <div className="flex items-center gap-3">
          <div className="bg-amber-500 p-2 rounded-xl text-slate-900"><ShieldCheck size={24} /></div>
          <div>
            <h1 className="font-black uppercase tracking-tighter text-lg">Controle de Pátio</h1>
            <p className="text-[10px] font-bold text-amber-500 uppercase">Fiscalização Ativa</p>
          </div>
        </div>
        <div className="flex gap-2">
          <button onClick={() => setSoundEnabled(!soundEnabled)} className={`p-2 rounded-xl ${soundEnabled ? 'bg-emerald-500' : 'bg-slate-800'}`}>
            {soundEnabled ? <Volume2 size={20} /> : <VolumeX size={20} />}
          </button>
          <button onClick={onBack} className="p-2 bg-slate-800 rounded-xl"><X size={20} /></button>
        </div>
      </header>

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
                      <span className="bg-blue-100 text-blue-700 px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest">Pátio</span>
                      <p className={`text-[10px] font-black mt-2 ${critico ? 'text-red-600' : 'text-slate-400'}`}>{espera} MIN</p>
                    </div>
                  </div>
                  <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 mb-6">
                    <p className="text-[9px] font-black text-slate-400 uppercase">Responsável</p>
                    <p className="text-sm font-bold text-slate-700 truncate uppercase">{v.motorista_nome}</p>
                    <p className="text-[9px] text-slate-500 mt-1 uppercase font-bold">{v.tipo_servico} • KM {v.hodometro}</p>
                  </div>
                  <button onClick={() => { setSelectedVtr(v); setShowModal(true); }} className="w-full bg-slate-900 text-white py-4 rounded-2xl font-black uppercase text-xs flex items-center justify-center gap-2 shadow-lg active:scale-95 transition-transform">
                    Abrir Conferência <ChevronRight size={16} />
                  </button>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="space-y-4">
            <div className="relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
              <input placeholder="FILTRAR FROTA..." className="w-full p-5 pl-12 bg-white border-2 border-slate-200 rounded-3xl font-black text-xs outline-none focus:border-amber-500" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value.toUpperCase())} />
            </div>
            <div className="bg-white rounded-[2rem] border border-slate-200 overflow-hidden shadow-sm">
              {viaturas.filter(v => v.PREFIXO?.includes(searchTerm)).map(v => (
                <div key={v.PREFIXO} className="p-4 border-b flex justify-between items-center hover:bg-slate-50 transition-colors">
                  <div>
                    <p className="font-black text-slate-800">{v.PREFIXO}</p>
                    <p className="text-[10px] text-slate-400 font-bold uppercase">{v.PLACA} | KM: {v.ULTIMOKM}</p>
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

      {showModal && selectedVtr && (
        <div className="fixed inset-0 bg-slate-900/90 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-lg rounded-[3rem] shadow-2xl overflow-hidden flex flex-col max-h-[95vh]">
            <div className="bg-slate-900 p-6 text-white flex justify-between items-center">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-amber-500 rounded-lg text-slate-900"><Car size={20}/></div>
                <h2 className="text-2xl font-black uppercase tracking-tighter">{selectedVtr.prefixo_vtr}</h2>
              </div>
              <button onClick={() => setShowModal(false)} className="p-2 bg-white/10 rounded-full hover:bg-white/20 transition-colors"><X size={20} /></button>
            </div>

            <div className="p-6 space-y-4 overflow-y-auto">
              <div className="bg-slate-50 p-4 rounded-3xl border-2 border-slate-100 flex items-center justify-between">
                <div>
                  <p className="text-[10px] font-black text-slate-400 uppercase">Motorista na Entrega</p>
                  <p className="text-sm font-bold text-slate-800 uppercase underline decoration-amber-500">{selectedVtr.motorista_nome}</p>
                </div>
                <button onClick={() => setConf({...conf, motoristaCorreto: !conf.motoristaCorreto})} className={`p-3 rounded-2xl transition-all ${conf.motoristaCorreto ? 'text-emerald-500' : 'text-red-500'}`}>
                  {conf.motoristaCorreto ? <CheckCircle2 size={32} /> : <AlertTriangle size={32} />}
                </button>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <CheckItem label="Interno Limpo" active={conf.limpezaInterna} onClick={() => setConf({...conf, limpezaInterna: !conf.limpezaInterna})} />
                <CheckItem label="Externo Limpo" active={conf.limpezaExterna} onClick={() => setConf({...conf, limpezaExterna: !conf.limpezaExterna})} />
                <CheckItem label="Sem Pertences" active={conf.semPertences} onClick={() => setConf({...conf, semPertences: !conf.semPertences})} />
                <CheckItem label="Sem Avarias" active={!conf.avariaDetectada} onClick={() => setConf({...conf, avariaDetectada: !conf.avariaDetectada})} danger icon={<AlertTriangle size={14}/>} />
                
                {/* BOTÃO DE CONFIRMAÇÃO DE ÓLEO */}
                <button onClick={() => setConf({...conf, confirmarTrocaOleo: !conf.confirmarTrocaOleo})} className={`col-span-2 p-4 rounded-2xl border-2 font-black text-[10px] uppercase transition-all flex items-center justify-center gap-3 ${conf.confirmarTrocaOleo ? 'bg-blue-600 border-blue-700 text-white shadow-lg' : 'bg-blue-50 border-blue-200 text-blue-400'}`}>
                  <Droplets size={18} className={conf.confirmarTrocaOleo ? "animate-bounce" : ""} />
                  CONFIRMAR TROCA DE ÓLEO (RESETAR KM)
                </button>
              </div>

              <textarea placeholder="OBSERVAÇÕES TÉCNICAS..." className="w-full p-4 bg-slate-50 border-2 border-slate-100 rounded-2xl text-xs font-bold uppercase min-h-[80px] outline-none focus:border-amber-500" value={conf.obs} onChange={(e) => setConf({...conf, obs: e.target.value})} />

              {!showBaixaOptions ? (
                <div className="grid grid-cols-2 gap-3 pt-4">
                  <button onClick={() => processarVistoria("LIBERADA")} className="bg-emerald-600 text-white py-5 rounded-3xl font-black uppercase text-[10px] shadow-lg flex flex-col items-center gap-1 active:scale-95 transition-all">
                    <CheckCircle2 size={20} /> Liberar Viatura
                  </button>
                  <button onClick={() => setShowBaixaOptions(true)} className="bg-red-600 text-white py-5 rounded-3xl font-black uppercase text-[10px] shadow-lg flex flex-col items-center gap-1 active:scale-95 transition-all">
                    <Wrench size={20} /> Baixar (Oficina)
                  </button>
                </div>
              ) : (
                <div className="bg-red-50 p-4 rounded-3xl border-2 border-red-200 space-y-3 animate-in slide-in-from-bottom-4">
                  <p className="text-[10px] font-black text-red-600 uppercase text-center">Selecione o Motivo da Baixa</p>
                  <div className="grid grid-cols-2 gap-2">
                    {['MECÂNICA', 'ELÉTRICA', 'PNEU', 'FUNILARIA', 'REVISÃO', 'OUTROS'].map(motivo => (
                      <button key={motivo} onClick={() => processarVistoria("MANUTENCAO", motivo)} className="bg-white border-2 border-red-100 p-3 rounded-xl text-[9px] font-black text-red-600 hover:bg-red-600 hover:text-white transition-colors">
                        {motivo}
                      </button>
                    ))}
                  </div>
                  <button onClick={() => setShowBaixaOptions(false)} className="w-full text-[9px] font-black text-slate-400 uppercase pt-2">Cancelar</button>
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
  <button onClick={onClick} className={`p-4 rounded-2xl border-2 font-black text-[9px] uppercase transition-all flex flex-col items-center gap-2 ${active ? 'bg-emerald-50 border-emerald-500 text-emerald-700' : danger ? 'bg-red-600 border-red-700 text-white animate-pulse shadow-lg' : 'bg-slate-50 border-slate-200 text-slate-400'}`}>
    {icon}
    {label}
    <span className="text-[11px]">{active ? 'OK' : danger ? 'ALERTA' : 'PENDENTE'}</span>
  </button>
);

export default GarageiroDashboard;
