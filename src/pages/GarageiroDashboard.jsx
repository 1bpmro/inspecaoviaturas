import React, { useState, useEffect, useRef } from 'react';
import { gasApi } from '../api/gasClient';
import { useAuth } from '../lib/AuthContext';
import { 
  Car, CheckCircle2, Clock, RefreshCw,
  Search, ShieldCheck, Lock, Unlock, Camera, User, X, 
  AlertCircle, Inbox, Droplets, Eye, Check, Volume2, VolumeX,
  Wrench
} from 'lucide-react';

const GarageiroDashboard = ({ onBack }) => {
  const { user } = useAuth();
  const [tab, setTab] = useState('pendentes'); 
  const [vistorias, setVistorias] = useState([]);
  const [viaturas, setViaturas] = useState([]);
  const [motoristas, setMotoristas] = useState([]); 
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [soundEnabled, setSoundEnabled] = useState(false);
  
  const audioRef = useRef(new Audio('https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3'));
  const prevItemsCount = useRef(0);

  const [showModal, setShowModal] = useState(false);
  const [selectedVtr, setSelectedVtr] = useState(null);
  const [viewingPhoto, setViewingPhoto] = useState(null);
  
  const [conf, setConf] = useState({ 
    limpezaInterna: true, limpezaExterna: true, pertences: 'NÃO',
    detalhePertences: '', motoristaConfirmado: true, novoMotoristaRE: '',
    avaria: false, obs: '', oleoConfirmado: false
  });
  
  const [fotoAvaria, setFotoAvaria] = useState(null);
  const [showLockModal, setShowLockModal] = useState(false);
  const [lockData, setLockData] = useState({ prefixo: '', motivo: 'manutencao', detalhes: '', re_responsavel: '' });

  // --- RASTREADOR DE FOTO (DEBUG) ---
  useEffect(() => {
    if (viewingPhoto) {
      console.log("%c[RASTREADOR] Dados da Foto:", "color: #fbbf24; font-weight: bold; background: #000; padding: 2px 5px;");
      console.log("Início da string:", viewingPhoto.substring(0, 50));
    }
  }, [viewingPhoto]);

  const calcularEspera = (timestamp) => {
    if (!timestamp) return null;
    const dateObj = new Date(timestamp);
    const diff = Math.floor((new Date() - dateObj) / 60000);
    return diff >= 0 ? diff : 0;
  };

  const fetchData = async () => {
    setLoading(true);
    try {
      const [resVtr, resPend, resMot] = await Promise.all([
        gasApi.getViaturas(), 
        gasApi.getVistoriasPendentes(),
        gasApi.getEfetivoCompleto()
      ]);
      
      if (resVtr.status === 'success') setViaturas(resVtr.data);
      if (resPend.status === 'success') {
        if (soundEnabled && resPend.data.length > prevItemsCount.current) {
          audioRef.current.play().catch(() => {});
        }
        prevItemsCount.current = resPend.data.length;
        setVistorias(resPend.data);
      }
      if (resMot.status === 'success') setMotoristas(resMot.data);
    } catch (error) {
      console.error("Erro ao buscar dados:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 30000);
    return () => clearInterval(interval);
  }, [soundEnabled]);

  const finalizarConferencia = async () => {
    if (isSubmitting) return;

    if (selectedVtr.origem === "VISTORIA") {
      if (!conf.motoristaConfirmado && !conf.novoMotoristaRE) return alert("Selecione o motorista.");
      if (conf.pertences === 'SIM' && !conf.detalhePertences) return alert("Descreva os pertences.");
    }
    
    setIsSubmitting(true);
    const currentId = selectedVtr.rowId;

    try {
      const res = await gasApi.confirmarVistoriaGarageiro({
        origem: selectedVtr.origem,
        rowId: selectedVtr.rowId,
        id_vistoria: selectedVtr.id_sistema || selectedVtr.ID_SISTEMA,
        status_fisico: conf.avaria ? 'AVARIADA' : 'OK',
        limpeza: `INT: ${conf.limpezaInterna ? 'C' : 'NC'} | EXT: ${conf.limpezaExterna ? 'C' : 'NC'}`,
        pertences: conf.pertences === 'SIM' ? `SIM: ${conf.detalhePertences}` : 'NÃO',
        obs_garageiro: conf.obs,
        garageiro_re: user.re,
        foto_avaria: fotoAvaria,
        motorista_confirmado: conf.motoristaConfirmado,
        novo_motorista_re: conf.novoMotoristaRE,
        km_registro: selectedVtr.hodometro_oleo || selectedVtr.hodometro || selectedVtr.km 
      });

      if (res.status === 'success') {
        // REMOVE O CARD NA HORA
        setVistorias(prev => prev.filter(v => v.rowId !== currentId));
        setShowModal(false);
        setFotoAvaria(null);
        setConf({ 
          limpezaInterna: true, limpezaExterna: true, pertences: 'NÃO', 
          detalhePertences: '', motoristaConfirmado: true, novoMotoristaRE: '', 
          avaria: false, obs: '', oleoConfirmado: false 
        });
        setTimeout(fetchData, 1200);
      }
    } catch (e) {
      alert("Erro ao salvar.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const confirmarAlteracaoStatus = async () => {
    setIsSubmitting(true);
    try {
      let statusFinal = "DISPONÍVEL";
      if (lockData.motivo === 'manutencao') statusFinal = "MANUTENÇÃO";
      const res = await gasApi.alterarStatusViatura(lockData.prefixo, statusFinal, lockData);
      if (res.status === 'success') {
        setShowLockModal(false);
        fetchData();
      }
    } catch (e) { alert("Erro."); } finally { setIsSubmitting(false); }
  };

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col">
      <header className="bg-slate-900 text-white p-4 shadow-xl border-b-4 border-amber-500">
        <div className="max-w-6xl mx-auto flex justify-between items-center">
          <div className="flex items-center gap-3">
            <button onClick={onBack} className="p-2 hover:bg-slate-800 rounded-lg"><X size={20} /></button>
            <div className="bg-amber-500 p-2 rounded-lg text-slate-900"><ShieldCheck size={24} /></div>
            <div>
              <h1 className="font-black uppercase tracking-tighter text-lg leading-none">Pátio</h1>
            </div>
          </div>
          <button onClick={fetchData} className={`p-2 ${loading ? 'animate-spin text-amber-500' : ''}`}><RefreshCw size={20} /></button>
        </div>
      </header>

      <nav className="bg-white border-b border-slate-200">
        <div className="max-w-6xl mx-auto flex">
          <button onClick={() => setTab('pendentes')} className={`flex-1 p-4 text-xs font-black uppercase ${tab === 'pendentes' ? 'border-b-2 border-amber-500 text-amber-600' : 'text-slate-400'}`}>
            Conferência ({vistorias.length})
          </button>
          <button onClick={() => setTab('frota')} className={`flex-1 p-4 text-xs font-black uppercase ${tab === 'frota' ? 'border-b-2 border-amber-500 text-amber-600' : 'text-slate-400'}`}>
            Frota ({viaturas.length})
          </button>
        </div>
      </nav>

      <main className="p-4 max-w-6xl mx-auto w-full flex-1">
        {tab === 'pendentes' ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {vistorias.length === 0 ? (
              <div className="col-span-full py-20 flex flex-col items-center bg-white rounded-[2rem] border-2 border-dashed">
                <Inbox size={48} className="text-slate-200 mb-2" />
                <p className="text-slate-400 font-black uppercase text-xs">Pátio Limpo</p>
              </div>
            ) : vistorias.map((vtr, i) => (
              <div key={i} className="bg-white border-2 rounded-[2rem] p-5 shadow-sm">
                <div className="flex justify-between items-start mb-4">
                  <span className="text-3xl font-black text-slate-900 tracking-tighter">{vtr.prefixo_vtr || vtr.prefixo}</span>
                  <span className="bg-blue-100 text-blue-700 px-3 py-1 rounded-full text-[9px] font-black uppercase">Pátio</span>
                </div>
                <button 
                  onClick={() => { setSelectedVtr(vtr); setShowModal(true); }} 
                  className="w-full py-4 bg-slate-900 text-white rounded-2xl font-black uppercase text-xs shadow-lg"
                >
                  Abrir Vistoria
                </button>
              </div>
            ))}
          </div>
        ) : (
            <div className="space-y-4">
               <input 
                type="text" 
                placeholder="BUSCAR VTR..." 
                className="w-full p-4 bg-white border-2 rounded-3xl font-black text-xs uppercase"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
              <div className="bg-white rounded-[2rem] shadow-sm overflow-hidden border">
                <table className="w-full text-left text-xs">
                  <tbody>
                    {viaturas.filter(v => (v.Prefixo || v.prefixo || "").toLowerCase().includes(searchTerm.toLowerCase())).map((v, i) => (
                      <tr key={i} className="border-b">
                        <td className="p-4 font-black">{v.Prefixo || v.prefixo}</td>
                        <td className="p-4 text-right">
                          <button onClick={() => {
                            setLockData({ prefixo: v.Prefixo || v.prefixo, motivo: 'manutencao' });
                            setShowLockModal(true);
                          }} className="p-2 text-slate-400"><Lock size={18} /></button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
        )}
      </main>

      {/* MODAL DE CONFERÊNCIA */}
      {showModal && selectedVtr && (
        <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-lg rounded-[2.5rem] shadow-2xl flex flex-col max-h-[90vh]">
            <div className="bg-slate-900 p-6 text-white flex justify-between items-center">
              <h2 className="text-2xl font-black uppercase">{selectedVtr.prefixo_vtr || selectedVtr.prefixo}</h2>
              <button onClick={() => setShowModal(false)} className="p-2 hover:bg-white/10 rounded-full"><X size={24} /></button>
            </div>

            <div className="p-6 space-y-5 overflow-y-auto">
              {(selectedVtr.foto_evidencia || selectedVtr.foto_oleo || selectedVtr.foto) && (
                <div className="bg-amber-50 border-2 border-amber-200 rounded-3xl p-5 flex justify-between items-center">
                  <span className="text-[10px] font-black text-amber-800 uppercase">Comprovante de Óleo</span>
                  <button 
                    onClick={() => setViewingPhoto(selectedVtr.foto_evidencia || selectedVtr.foto_oleo || selectedVtr.foto)}
                    className="bg-white border-2 border-amber-200 p-3 rounded-xl text-amber-600"
                  >
                    <Eye size={24} />
                  </button>
                </div>
              )}

              <div className="bg-slate-50 p-4 rounded-3xl border-2">
                <p className="text-[10px] font-black text-slate-400 uppercase text-center mb-3">Conferir Limpeza</p>
                <div className="grid grid-cols-2 gap-3">
                  <button onClick={() => setConf({...conf, limpezaInterna: !conf.limpezaInterna})} className={`p-4 rounded-3xl border-2 font-black text-[10px] uppercase ${conf.limpezaInterna ? 'bg-emerald-50 border-emerald-500' : ''}`}>INT: {conf.limpezaInterna ? 'LIMPO' : 'SUJO'}</button>
                  <button onClick={() => setConf({...conf, limpezaExterna: !conf.limpezaExterna})} className={`p-4 rounded-3xl border-2 font-black text-[10px] uppercase ${conf.limpezaExterna ? 'bg-emerald-50 border-emerald-500' : ''}`}>EXT: {conf.limpezaExterna ? 'LIMPO' : 'SUJO'}</button>
                </div>
              </div>

              <button 
                onClick={finalizarConferencia}
                disabled={isSubmitting}
                className="w-full py-5 bg-slate-900 text-white rounded-[1.5rem] font-black uppercase text-xs"
              >
                {isSubmitting ? 'Processando...' : 'Finalizar Validação'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* VISUALIZADOR DE FOTO */}
      {viewingPhoto && (
        <div className="fixed inset-0 bg-black/95 z-[100] flex flex-col p-4">
          <button onClick={() => setViewingPhoto(null)} className="self-end text-white p-4"><X size={32} /></button>
          <div className="flex-1 flex items-center justify-center">
            <img 
              src={viewingPhoto.startsWith('data:') ? viewingPhoto : `data:image/jpeg;base64,${viewingPhoto}`} 
              className="max-w-full max-h-full object-contain rounded-2xl" 
              alt="Evidência" 
              onError={(e) => { e.target.src = "https://placehold.co/600x400?text=Erro+na+Foto"; }}
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default GarageiroDashboard;
