import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../lib/AuthContext';
// Firebase
import { db, collection, query, where, onSnapshot, doc, updateDoc, serverTimestamp, getDocs } from '../lib/firebase';
import { photoService } from '../api/photoService';

import { 
  Car, CheckCircle2, AlertTriangle, Clock, RefreshCw,
  Search, ShieldCheck, Lock, Unlock, Camera, User, X, 
  AlertCircle, Inbox, Droplets, Eye, Volume2, VolumeX,
  Wrench, ChevronDown 
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
  const [lockData, setLockData] = useState({ id: '', prefixo: '', motivo: 'manutencao' });

  // 1. ESCUTA EM TEMPO REAL (REALTIME)
  useEffect(() => {
    // Escutar Vistorias Pendentes
    const qVistorias = query(
      collection(db, "vistorias"), 
      where("status_vtr", "==", "PENDENTE_GARAGEIRO")
    );

    const unsubVistorias = onSnapshot(qVistorias, (snapshot) => {
      const docs = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
      
      // Alerta sonoro se entrar nova vistoria
      if (soundEnabled && docs.length > vistorias.length) {
        audioRef.current.play().catch(() => {});
      }
      
      setVistorias(docs);
      setLoading(false);
    });

    // Escutar Frota Total
    const unsubFrota = onSnapshot(collection(db, "viaturas"), (snapshot) => {
      setViaturas(snapshot.docs.map(d => ({ id: d.id, ...d.data() })));
    });

    // Carregar Motoristas (Efetivo) - Uma vez basta
    const carregarEfetivo = async () => {
      const snap = await getDocs(collection(db, "usuarios"));
      setMotoristas(snap.docs.map(d => d.data()));
    };
    carregarEfetivo();

    return () => {
      unsubVistorias();
      unsubFrota();
    };
  }, [soundEnabled, vistorias.length]);

  // 2. FINALIZAR CONFERÊNCIA
  const finalizarConferencia = async () => {
    if (isSubmitting) return;
    if (!conf.motoristaConfirmado && !conf.novoMotoristaRE) return alert("Identifique o motorista.");
    if (conf.avaria && !fotoAvaria) return alert("Anexe a foto da avaria.");

    setIsSubmitting(true);
    try {
      let urlAvaria = "";
      if (fotoAvaria) {
        urlAvaria = await photoService.uploadFoto(fotoAvaria);
      }

      // 1. Atualiza a Vistoria para CONCLUÍDA
      const vistoriaRef = doc(db, "vistorias", selectedVtr.id);
      await updateDoc(vistoriaRef, {
        status_vtr: "CONCLUIDO",
        conferido_por: user.re,
        data_conferencia: serverTimestamp(),
        conferencia_detalhes: {
          limpeza: conf.limpezaInterna && conf.limpezaExterna ? "OK" : "SUJA",
          avaria_detectada: conf.avaria,
          foto_avaria: urlAvaria,
          obs_garageiro: conf.obs
        }
      });

      // 2. Atualiza o Status da Viatura na Coleção "viaturas"
      // Buscamos o documento da viatura pelo Prefixo
      const qVtr = query(collection(db, "viaturas"), where("prefixo", "==", selectedVtr.prefixo_vtr));
      const snapVtr = await getDocs(qVtr);
      
      if (!snapVtr.empty) {
        const vtrDocId = snapVtr.docs[0].id;
        await updateDoc(doc(db, "viaturas", vtrDocId), {
          status: conf.avaria ? "MANUTENÇÃO" : "DISPONÍVEL",
          ultimo_km: selectedVtr.hodometro,
          data_ultima_atualizacao: serverTimestamp()
        });
      }

      setShowModal(false);
      alert("Viatura liberada com sucesso!");
    } catch (e) {
      console.error(e);
      alert("Erro ao salvar conferência.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // 3. ALTERAR STATUS MANUAL (LOCK/UNLOCK)
  const toggleStatusVtr = async () => {
    setIsSubmitting(true);
    try {
      const vtrRef = doc(db, "viaturas", lockData.id);
      await updateDoc(vtrRef, {
        status: lockData.motivo === 'disponivel' ? 'DISPONÍVEL' : 'MANUTENÇÃO',
        atualizado_por: user.re,
        data_ultima_atualizacao: serverTimestamp()
      });
      setShowLockModal(false);
    } catch (e) {
      alert("Erro ao alterar status.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const calcularEspera = (ts) => {
    if (!ts) return 0;
    const data = ts.toDate ? ts.toDate() : new Date(ts);
    return Math.floor((new Date() - data) / 60000);
  };

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col">
      <header className="bg-slate-900 text-white p-4 shadow-xl border-b-4 border-amber-500">
        <div className="max-w-6xl mx-auto flex justify-between items-center">
          <div className="flex items-center gap-3">
            <button onClick={onBack} className="p-2 hover:bg-slate-800 rounded-lg"><X size={20} /></button>
            <div className="bg-amber-500 p-2 rounded-lg text-slate-900"><ShieldCheck size={24} /></div>
            <div>
              <h1 className="font-black uppercase tracking-tighter text-lg leading-none">Fiscalização de Pátio</h1>
              <p className="text-[10px] font-bold text-amber-500 uppercase tracking-widest">Tempo Real • Firebase</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => setSoundEnabled(!soundEnabled)} className={`p-2 rounded-xl transition-all ${soundEnabled ? 'bg-emerald-500 text-white' : 'bg-slate-800 text-slate-400'}`}>
              {soundEnabled ? <Volume2 size={20} /> : <VolumeX size={20} />}
            </button>
            {loading && <RefreshCw size={20} className="animate-spin text-amber-500" />}
          </div>
        </div>
      </header>

      {/* Navegação de Abas */}
      <nav className="bg-white border-b border-slate-200 sticky top-0 z-10 shadow-sm flex">
        <button onClick={() => setTab('pendentes')} className={`flex-1 p-4 text-xs font-black uppercase border-b-2 transition-all ${tab === 'pendentes' ? 'border-amber-500 text-amber-600 bg-amber-50/50' : 'border-transparent text-slate-400'}`}>
          <Clock size={16} className="inline mr-2"/> Pendentes ({vistorias.length})
        </button>
        <button onClick={() => setTab('frota')} className={`flex-1 p-4 text-xs font-black uppercase border-b-2 transition-all ${tab === 'frota' ? 'border-amber-500 text-amber-600 bg-amber-50/50' : 'border-transparent text-slate-400'}`}>
          <Car size={16} className="inline mr-2"/> Frota Total
        </button>
      </nav>

      <main className="p-4 max-w-6xl mx-auto w-full flex-1">
        {tab === 'pendentes' ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {vistorias.length === 0 ? (
              <div className="col-span-full py-20 flex flex-col items-center justify-center bg-white rounded-[2.5rem] border-2 border-dashed border-slate-200 text-center">
                <Inbox size={48} className="text-slate-200 mb-2" />
                <p className="text-slate-400 font-black uppercase text-xs tracking-widest">Pátio Limpo • Nenhuma pendência</p>
              </div>
            ) : vistorias.map((vtr) => (
              <div key={vtr.id} className="bg-white border-2 border-slate-200 rounded-[2.5rem] p-6 shadow-sm">
                <div className="flex justify-between items-start mb-4">
                  <span className="text-4xl font-black text-slate-900 tracking-tighter">{vtr.prefixo_vtr}</span>
                  <div className="text-right">
                    <span className="bg-blue-100 text-blue-700 px-3 py-1 rounded-full text-[9px] font-black uppercase">AGUARDANDO PÁTIO</span>
                    <p className="text-[10px] font-black mt-2 text-slate-400 uppercase tracking-tighter">{calcularEspera(vtr.data_hora)} MIN ESPERA</p>
                  </div>
                </div>
                <div className="flex items-center gap-2 mb-6 bg-slate-50 p-3 rounded-2xl border border-slate-100">
                  <User size={14} className="text-slate-400" />
                  <p className="text-[11px] font-bold text-slate-600 uppercase truncate">{vtr.motorista_nome}</p>
                </div>
                <button 
                  onClick={() => { setSelectedVtr(vtr); setShowModal(true); }}
                  className="w-full bg-slate-900 text-white py-4 rounded-2xl font-black uppercase text-xs shadow-lg active:scale-95 transition-transform"
                >
                  Iniciar Conferência
                </button>
              </div>
            ))}
          </div>
        ) : (
          <div className="space-y-4">
            <div className="relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
              <input 
                type="text" 
                placeholder="BUSCAR PREFIXO OU PLACA..." 
                className="w-full p-5 pl-12 bg-white border-2 border-slate-200 rounded-3xl font-black text-xs uppercase outline-none focus:border-amber-500"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <div className="bg-white rounded-[2rem] shadow-sm overflow-hidden border border-slate-200">
              <table className="w-full text-left text-xs md:text-sm">
                <tbody className="divide-y divide-slate-100 font-bold uppercase">
                  {viaturas.filter(v => v.prefixo.includes(searchTerm)).map((v) => (
                    <tr key={v.id} className="hover:bg-slate-50 transition-colors">
                      <td className="p-4">
                        <p className="font-black text-slate-800">{v.prefixo}</p>
                        <p className="text-[10px] text-slate-400">{v.placa}</p>
                      </td>
                      <td className="p-4">
                        <span className={`text-[9px] font-black px-3 py-1 rounded-full ${v.status === 'DISPONÍVEL' ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>
                          {v.status}
                        </span>
                      </td>
                      <td className="p-4 text-right">
                        <button 
                          onClick={() => {
                            setLockData({ id: v.id, prefixo: v.prefixo, motivo: v.status === 'DISPONÍVEL' ? 'manutencao' : 'disponivel' });
                            setShowLockModal(true);
                          }}
                          className="p-2 text-slate-400 hover:text-slate-900"
                        >
                          {v.status === 'DISPONÍVEL' ? <Unlock size={18} /> : <Lock size={18} />}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </main>

      {/* MODAL DE CONFERÊNCIA (SIMPLIFICADO) */}
      {showModal && selectedVtr && (
        <div className="fixed inset-0 bg-slate-900/90 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-lg rounded-[3rem] shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="bg-slate-900 p-6 text-white flex justify-between items-center">
              <h2 className="text-2xl font-black uppercase tracking-tighter">{selectedVtr.prefixo_vtr}</h2>
              <button onClick={() => setShowModal(false)} className="p-2 bg-white/10 rounded-full"><X size={20} /></button>
            </div>
            <div className="p-6 space-y-4 overflow-y-auto">
              <div className="bg-slate-50 p-4 rounded-3xl border-2 border-slate-100 text-center">
                <p className="text-[10px] font-black text-slate-400 uppercase mb-2">Motorista Identificado</p>
                <p className="text-lg font-black text-slate-800 uppercase underline decoration-amber-500">{selectedVtr.motorista_nome}</p>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <button onClick={() => setConf({...conf, limpezaInterna: !conf.limpezaInterna})} className={`p-4 rounded-2xl border-2 font-black text-[10px] uppercase ${conf.limpezaInterna ? 'bg-emerald-50 border-emerald-500 text-emerald-700' : 'bg-red-50 border-red-200'}`}>INTERIOR: {conf.limpezaInterna ? 'LIMPO' : 'SUJO'}</button>
                <button onClick={() => setConf({...conf, avaria: !conf.avaria})} className={`p-4 rounded-2xl border-2 font-black text-[10px] uppercase ${!conf.avaria ? 'bg-emerald-50 border-emerald-500 text-emerald-700' : 'bg-red-600 text-white animate-pulse'}`}>AVARIA: {conf.avaria ? 'SIM' : 'NÃO'}</button>
              </div>

              {conf.avaria && (
                <div className="bg-slate-900 p-4 rounded-3xl">
                   <input type="file" accept="image/*" capture="environment" className="hidden" id="cam-garage" onChange={(e) => {
                     const reader = new FileReader();
                     reader.onload = () => setFotoAvaria(reader.result);
                     reader.readAsDataURL(e.target.files[0]);
                   }} />
                   <label htmlFor="cam-garage" className="flex flex-col items-center gap-2 cursor-pointer">
                     {fotoAvaria ? <img src={fotoAvaria} className="h-32 rounded-xl" /> : <Camera className="text-amber-500" size={32} />}
                     <span className="text-white text-[10px] font-black uppercase">Fotografar Dano</span>
                   </label>
                </div>
              )}

              <button 
                onClick={finalizarConferencia}
                disabled={isSubmitting}
                className="w-full py-5 bg-slate-900 text-white rounded-[2rem] font-black uppercase text-xs shadow-2xl disabled:opacity-50"
              >
                {isSubmitting ? 'Salvando...' : 'Liberar Viatura'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL LOCK/UNLOCK */}
      {showLockModal && (
        <div className="fixed inset-0 bg-slate-900/80 z-[60] flex items-center justify-center p-4">
          <div className="bg-white p-8 rounded-[3rem] w-full max-w-xs text-center space-y-6">
            <div className={`w-16 h-16 mx-auto rounded-full flex items-center justify-center ${lockData.motivo === 'disponivel' ? 'bg-emerald-100 text-emerald-600' : 'bg-red-100 text-red-600'}`}>
               {lockData.motivo === 'disponivel' ? <Unlock /> : <Lock />}
            </div>
            <h3 className="font-black uppercase text-xl text-slate-800">{lockData.prefixo}</h3>
            <button onClick={toggleStatusVtr} className="w-full py-4 bg-slate-900 text-white rounded-2xl font-black uppercase text-xs">Confirmar Alteração</button>
            <button onClick={() => setShowLockModal(false)} className="text-slate-400 font-black uppercase text-[10px]">Cancelar</button>
          </div>
        </div>
      )}
    </div>
  );
};

export default GarageiroDashboard;
