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
        <button onClick={() => setTab('pendentes')} className={`flex-1 p-4 text-xs font-black uppercase border-b-2 transition-all ${tab === 'pendentes' ? 'border-amber-500 text-amber-600 bg-
