import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../lib/AuthContext';

import {
  db,
  collection,
  query,
  where,
  onSnapshot,
  doc,
  updateDoc,
  serverTimestamp,
  getDocs
} from '../lib/firebase';

import { photoService } from '../api/photoService';

import {
  Car,
  CheckCircle2,
  AlertTriangle,
  Clock,
  RefreshCw,
  Search,
  ShieldCheck,
  Lock,
  Unlock,
  Camera,
  User,
  X,
  Inbox,
  Volume2,
  VolumeX
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

  const previousCount = useRef(0);

  const audioRef = useRef(
    new Audio('https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3')
  );

  const [showModal, setShowModal] = useState(false);
  const [selectedVtr, setSelectedVtr] = useState(null);

  const [fotoAvaria, setFotoAvaria] = useState(null);

  const [conf, setConf] = useState({
    limpezaInterna: true,
    limpezaExterna: true,
    avaria: false,
    obs: ''
  });

  const [showLockModal, setShowLockModal] = useState(false);
  const [lockData, setLockData] = useState({
    id: '',
    prefixo: '',
    motivo: 'manutencao'
  });

  useEffect(() => {

    const qVistorias = query(
      collection(db, "vistorias"),
      where("status_vtr", "==", "PENDENTE_GARAGEIRO")
    );

    const unsubVistorias = onSnapshot(qVistorias, (snapshot) => {

      const docs = snapshot.docs.map(d => ({
        id: d.id,
        ...d.data()
      }));

      if (soundEnabled && docs.length > previousCount.current) {
        audioRef.current.play().catch(() => {});
      }

      previousCount.current = docs.length;

      setVistorias(docs);
      setLoading(false);

    });

    const unsubFrota = onSnapshot(
      collection(db, "viaturas"),
      (snapshot) => {

        const lista = snapshot.docs.map(d => ({
          id: d.id,
          ...d.data()
        }));

        setViaturas(lista);

      }
    );

    const carregarEfetivo = async () => {

      const snap = await getDocs(collection(db, "usuarios"));

      const lista = snap.docs.map(d => d.data());

      setMotoristas(lista);

    };

    carregarEfetivo();

    return () => {

      unsubVistorias();
      unsubFrota();

    };

  }, [soundEnabled]);

  const finalizarConferencia = async () => {

    if (!selectedVtr) return;

    if (conf.avaria && !fotoAvaria) {
      alert("Anexe a foto da avaria.");
      return;
    }

    setIsSubmitting(true);

    try {

      let urlAvaria = "";

      if (fotoAvaria) {
        urlAvaria = await photoService.uploadFoto(fotoAvaria);
      }

      const vistoriaRef = doc(db, "vistorias", selectedVtr.id);

      await updateDoc(vistoriaRef, {
        status_vtr: "CONCLUIDO",
        conferido_por: user?.re || "DESCONHECIDO",
        data_conferencia: serverTimestamp(),
        conferencia_detalhes: {
          limpeza:
            conf.limpezaInterna && conf.limpezaExterna
              ? "OK"
              : "SUJA",
          avaria_detectada: conf.avaria,
          foto_avaria: urlAvaria,
          obs_garageiro: conf.obs
        }
      });

      const qVtr = query(
        collection(db, "viaturas"),
        where("prefixo", "==", selectedVtr.prefixo_vtr)
      );

      const snapVtr = await getDocs(qVtr);

      if (!snapVtr.empty) {

        const vtrDocId = snapVtr.docs[0].id;

        await updateDoc(
          doc(db, "viaturas", vtrDocId),
          {
            status: conf.avaria
              ? "MANUTENÇÃO"
              : "DISPONÍVEL",
            ultimo_km: selectedVtr.hodometro || 0,
            data_ultima_atualizacao: serverTimestamp()
          }
        );

      }

      setShowModal(false);
      setSelectedVtr(null);
      setFotoAvaria(null);

      alert("Viatura liberada com sucesso!");

    } catch (e) {

      console.error(e);
      alert("Erro ao salvar conferência.");

    }

    setIsSubmitting(false);

  };

  const toggleStatusVtr = async () => {

    if (!lockData.id) return;

    setIsSubmitting(true);

    try {

      const vtrRef = doc(db, "viaturas", lockData.id);

      await updateDoc(vtrRef, {

        status:
          lockData.motivo === 'disponivel'
            ? 'DISPONÍVEL'
            : 'MANUTENÇÃO',

        atualizado_por: user?.re || "DESCONHECIDO",

        data_ultima_atualizacao: serverTimestamp()

      });

      setShowLockModal(false);

    } catch (e) {

      console.error(e);
      alert("Erro ao alterar status.");

    }

    setIsSubmitting(false);

  };

  const calcularEspera = (ts) => {

    if (!ts) return 0;

    const data = ts?.toDate
      ? ts.toDate()
      : new Date(ts);

    return Math.floor((new Date() - data) / 60000);

  };

  const filtroFrota = viaturas.filter((v) => {

    const termo = searchTerm.toUpperCase();

    const prefixo = (v.prefixo || "").toUpperCase();
    const placa = (v.placa || "").toUpperCase();

    return prefixo.includes(termo) || placa.includes(termo);

  });

  return (

    <div className="min-h-screen bg-slate-100 flex flex-col">

      <header className="bg-slate-900 text-white p-4 shadow-xl border-b-4 border-amber-500">

        <div className="max-w-6xl mx-auto flex justify-between items-center">

          <div className="flex items-center gap-3">

            <button
              onClick={onBack}
              className="p-2 hover:bg-slate-800 rounded-lg"
            >
              <X size={20}/>
            </button>

            <div className="bg-amber-500 p-2 rounded-lg text-slate-900">
              <ShieldCheck size={24}/>
            </div>

            <h1 className="font-black uppercase tracking-tighter text-lg">
              Fiscalização de Pátio
            </h1>

          </div>

          <div className="flex items-center gap-2">

            <button
              onClick={() => setSoundEnabled(!soundEnabled)}
              className={`p-2 rounded-xl ${
                soundEnabled
                  ? 'bg-emerald-500'
                  : 'bg-slate-800'
              }`}
            >

              {soundEnabled
                ? <Volume2 size={20}/>
                : <VolumeX size={20}/>}

            </button>

            {loading && (
              <RefreshCw
                size={20}
                className="animate-spin text-amber-500"
              />
            )}

          </div>

        </div>

      </header>

      <nav className="bg-white border-b flex">

        <button
          onClick={() => setTab('pendentes')}
          className={`flex-1 p-4 text-xs font-black uppercase ${
            tab === 'pendentes'
              ? 'text-amber-600'
              : 'text-slate-400'
          }`}
        >

          <Clock size={16} className="inline mr-2"/>

          Pendentes ({vistorias.length})

        </button>

        <button
          onClick={() => setTab('frota')}
          className={`flex-1 p-4 text-xs font-black uppercase ${
            tab === 'frota'
              ? 'text-amber-600'
              : 'text-slate-400'
          }`}
        >

          <Car size={16} className="inline mr-2"/>

          Frota Total

        </button>

      </nav>

      <main className="p-4 max-w-6xl mx-auto w-full flex-1">

        {tab === 'pendentes' ? (

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">

            {vistorias.length === 0 && (

              <div className="col-span-full py-20 flex flex-col items-center bg-white rounded-3xl">

                <Inbox size={48} className="text-slate-200 mb-2"/>

                <p className="text-slate-400 font-black uppercase text-xs">

                  Nenhuma pendência

                </p>

              </div>

            )}

            {vistorias.map((vtr) => (

              <div
                key={vtr.id}
                className="bg-white border rounded-3xl p-6"
              >

                <div className="flex justify-between mb-4">

                  <span className="text-4xl font-black">

                    {vtr.prefixo_vtr}

                  </span>

                  <span className="text-xs font-bold text-slate-400">

                    {calcularEspera(vtr.data_hora)} MIN

                  </span>

                </div>

                <div className="flex items-center gap-2 mb-6">

                  <User size={14}/>

                  <p className="text-xs font-bold truncate">

                    {vtr.motorista_nome}

                  </p>

                </div>

                <button
                  onClick={() => {

                    setSelectedVtr(vtr);
                    setShowModal(true);

                  }}
                  className="w-full bg-slate-900 text-white py-3 rounded-xl"
                >

                  Iniciar Conferência

                </button>

              </div>

            ))}

          </div>

        ) : (

          <div>

            <input
              type="text"
              placeholder="BUSCAR PREFIXO OU PLACA"
              className="w-full p-4 border rounded-xl mb-4"
              value={searchTerm}
              onChange={(e) =>
                setSearchTerm(e.target.value)
              }
            />

            <table className="w-full bg-white rounded-xl overflow-hidden">

              <tbody>

                {filtroFrota.map((v) => (

                  <tr key={v.id} className="border-b">

                    <td className="p-4">

                      <b>{v.prefixo}</b>

                      <div className="text-xs text-slate-400">

                        {v.placa}

                      </div>

                    </td>

                    <td className="p-4">

                      {v.status}

                    </td>

                    <td className="p-4 text-right">

                      <button
                        onClick={() => {

                          setLockData({
                            id: v.id,
                            prefixo: v.prefixo,
                            motivo:
                              v.status === 'DISPONÍVEL'
                                ? 'manutencao'
                                : 'disponivel'
                          });

                          setShowLockModal(true);

                        }}
                      >

                        {v.status === 'DISPONÍVEL'
                          ? <Unlock size={18}/>
                          : <Lock size={18}/>}

                      </button>

                    </td>

                  </tr>

                ))}

              </tbody>

            </table>

          </div>

        )}

      </main>

    </div>

  );

};

export default GarageiroDashboard;
