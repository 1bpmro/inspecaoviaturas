import React, { useState, useEffect, useRef, useMemo } from "react";
import { useAuth } from "../lib/AuthContext";

import {
  db,
  collection,
  query,
  where,
  onSnapshot,
  doc,
  updateDoc,
  serverTimestamp
} from "../lib/firebase";

import {
  Car,
  Clock,
  ShieldCheck,
  Search,
  RefreshCw,
  Volume2,
  VolumeX,
  AlertTriangle,
  Wrench,
  CheckCircle
} from "lucide-react";

const GarageiroDashboard = ({ onBack }) => {

  const { user } = useAuth();

  const [tab, setTab] = useState("pendentes");

  const [vistorias, setVistorias] = useState([]);
  const [viaturas, setViaturas] = useState([]);

  const [loading, setLoading] = useState(true);

  const [searchTerm, setSearchTerm] = useState("");

  const [soundEnabled, setSoundEnabled] = useState(false);

  const previousCount = useRef(0);

  const audioRef = useRef(
    new Audio("https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3")
  );

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

    return () => {

      unsubVistorias();
      unsubFrota();

    };

  }, [soundEnabled]);

  const calcularEspera = (ts) => {

    if (!ts) return 0;

    const data = ts?.toDate ? ts.toDate() : new Date(ts);

    return Math.floor((new Date() - data) / 60000);

  };

  const estatisticas = useMemo(() => {

    const disponiveis = viaturas.filter(v => v.status === "DISPONÍVEL").length;
    const manutencao = viaturas.filter(v => v.status === "MANUTENÇÃO").length;

    const tempos = vistorias.map(v => calcularEspera(v.data_hora));

    const media =
      tempos.length > 0
        ? Math.round(tempos.reduce((a, b) => a + b, 0) / tempos.length)
        : 0;

    return {
      pendentes: vistorias.length,
      disponiveis,
      manutencao,
      tempoMedio: media
    };

  }, [vistorias, viaturas]);

  const filtroFrota = useMemo(() => {

    const termo = searchTerm.toUpperCase();

    return viaturas.filter(v => {

      const prefixo = (v.prefixo || "").toUpperCase();
      const placa = (v.placa || "").toUpperCase();
      const status = (v.status || "").toUpperCase();

      return (
        prefixo.includes(termo) ||
        placa.includes(termo) ||
        status.includes(termo)
      );

    });

  }, [viaturas, searchTerm]);

  return (

    <div className="min-h-screen bg-slate-100 flex flex-col">

      <header className="bg-slate-900 text-white p-4 border-b-4 border-amber-500">

        <div className="max-w-7xl mx-auto flex justify-between items-center">

          <div className="flex items-center gap-3">

            <div className="bg-amber-500 p-2 rounded-lg text-slate-900">
              <ShieldCheck size={24}/>
            </div>

            <div>

              <h1 className="font-black uppercase text-lg">
                Controle de Pátio
              </h1>

              <p className="text-xs text-amber-400">
                Monitoramento em tempo real
              </p>

            </div>

          </div>

          <div className="flex items-center gap-3">

            <button
              onClick={() => setSoundEnabled(!soundEnabled)}
              className={`p-2 rounded-lg ${
                soundEnabled ? "bg-emerald-500" : "bg-slate-800"
              }`}
            >
              {soundEnabled ? <Volume2 size={20}/> : <VolumeX size={20}/>}
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

      <section className="max-w-7xl mx-auto w-full p-4 grid grid-cols-2 md:grid-cols-4 gap-4">

        <div className="bg-white rounded-2xl p-4 shadow">
          <Clock className="text-amber-500"/>
          <p className="text-xs text-slate-400">Pendentes</p>
          <p className="text-2xl font-black">{estatisticas.pendentes}</p>
        </div>

        <div className="bg-white rounded-2xl p-4 shadow">
          <CheckCircle className="text-emerald-500"/>
          <p className="text-xs text-slate-400">Disponíveis</p>
          <p className="text-2xl font-black">{estatisticas.disponiveis}</p>
        </div>

        <div className="bg-white rounded-2xl p-4 shadow">
          <Wrench className="text-red-500"/>
          <p className="text-xs text-slate-400">Manutenção</p>
          <p className="text-2xl font-black">{estatisticas.manutencao}</p>
        </div>

        <div className="bg-white rounded-2xl p-4 shadow">
          <AlertTriangle className="text-orange-500"/>
          <p className="text-xs text-slate-400">Tempo médio</p>
          <p className="text-2xl font-black">
            {estatisticas.tempoMedio} min
          </p>
        </div>

      </section>

      <nav className="bg-white border-b flex">

        <button
          onClick={() => setTab("pendentes")}
          className={`flex-1 p-4 text-xs font-black uppercase ${
            tab === "pendentes"
              ? "text-amber-600"
              : "text-slate-400"
          }`}
        >
          Pendentes
        </button>

        <button
          onClick={() => setTab("frota")}
          className={`flex-1 p-4 text-xs font-black uppercase ${
            tab === "frota"
              ? "text-amber-600"
              : "text-slate-400"
          }`}
        >
          Frota
        </button>

      </nav>

      <main className="max-w-7xl mx-auto w-full p-4">

        {tab === "pendentes" ? (

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">

            {vistorias.map(v => {

              const espera = calcularEspera(v.data_hora);

              const alerta = espera > 10;

              return (

                <div
                  key={v.id}
                  className={`bg-white rounded-3xl p-6 border ${
                    alerta
                      ? "border-red-400 animate-pulse"
                      : "border-slate-200"
                  }`}
                >

                  <p className="text-3xl font-black">
                    {v.prefixo_vtr}
                  </p>

                  <p className="text-xs text-slate-400">

                    {v.motorista_nome}

                  </p>

                  <p className="text-xs mt-2 font-bold">

                    Espera: {espera} min

                  </p>

                </div>

              );

            })}

          </div>

        ) : (

          <div>

            <div className="relative mb-4">

              <Search
                className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                size={18}
              />

              <input
                type="text"
                placeholder="Buscar prefixo, placa ou status"
                className="w-full pl-10 p-3 border rounded-xl"
                value={searchTerm}
                onChange={(e) =>
                  setSearchTerm(e.target.value)
                }
              />

            </div>

            <div className="bg-white rounded-2xl overflow-hidden">

              <table className="w-full text-sm">

                <tbody>

                  {filtroFrota.map(v => (

                    <tr key={v.id} className="border-b">

                      <td className="p-3 font-bold">
                        {v.prefixo}
                      </td>

                      <td className="p-3 text-slate-500">
                        {v.placa}
                      </td>

                      <td className="p-3">
                        {v.status}
                      </td>

                    </tr>

                  ))}

                </tbody>

              </table>

            </div>

          </div>

        )}

      </main>

    </div>

  );

};

export default GarageiroDashboard;
