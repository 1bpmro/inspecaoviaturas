import React, { useState, useEffect, useRef, useMemo } from "react";
import { useAuth } from "../lib/AuthContext";
import { gasApi } from "../api/gasClient";

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

  const previousIds = useRef([]);
  const audioRef = useRef(
    new Audio("https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3")
  );

  // 🔄 CARREGAMENTO PRINCIPAL (API)
  const carregarDados = async () => {
    try {
      setLoading(true);

      const [resVistorias, resViaturas] = await Promise.all([
        gasApi.getVistoriasPendentes?.(),
        gasApi.getViaturas()
      ]);

      if (resVistorias?.data) {
        const novosIds = resVistorias.data.map(v => v.id);
        const temNovo = novosIds.some(id => !previousIds.current.includes(id));

        if (soundEnabled && temNovo) {
          audioRef.current.play().catch(() => {});
        }

        previousIds.current = novosIds;
        setVistorias(resVistorias.data);
      }

      if (resViaturas?.data) {
        setViaturas(resViaturas.data);
      }

    } catch (e) {
      console.error("Erro ao carregar dados:", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    carregarDados();

    const interval = setInterval(carregarDados, 15000); // 🔄 polling 15s
    return () => clearInterval(interval);
  }, [soundEnabled]);

  // 🛢️ STATUS REAL DA VIATURA (REGRA NOVA)
  const getStatusViatura = (v) => {
    const kmAtual = Number(v.ULTIMOKM || 0);
    const kmTroca = Number(v.KM_TROCA_OLEO ?? v.KM_ULTIMATROCA ?? 0);
    const diff = kmAtual - kmTroca;

    if (diff >= 12000) return "BLOQUEADA";
    if (diff >= 9000) return "ATENCAO";
    return "OK";
  };

  const calcularEspera = (data) => {
    if (!data) return 0;
    const d = new Date(data);
    return Math.floor((new Date() - d) / 60000);
  };

  // 📊 ESTATÍSTICAS
  const estatisticas = useMemo(() => {
    const bloqueadas = viaturas.filter(v => getStatusViatura(v) === "BLOQUEADA").length;
    const atencao = viaturas.filter(v => getStatusViatura(v) === "ATENCAO").length;

    const tempos = vistorias.map(v => calcularEspera(v.data_hora));
    const media = tempos.length
      ? Math.round(tempos.reduce((a, b) => a + b, 0) / tempos.length)
      : 0;

    return {
      pendentes: vistorias.length,
      bloqueadas,
      atencao,
      tempoMedio: media
    };
  }, [vistorias, viaturas]);

  // 🔎 FILTRO
  const filtroFrota = useMemo(() => {
    const termo = searchTerm.toUpperCase();

    return viaturas.filter(v => {
      const prefixo = (v.PREFIXO ?? "").toUpperCase();
      const placa = (v.PLACA ?? "").toUpperCase();
      const status = getStatusViatura(v);

      return (
        prefixo.includes(termo) ||
        placa.includes(termo) ||
        status.includes(termo)
      );
    });
  }, [viaturas, searchTerm]);

  // 🧰 AÇÕES DO GARAGEIRO
  const atualizarStatus = async (id, status) => {
    try {
      await gasApi.updateVistoriaStatus(id, {
        status_vtr: status,
        responsavel: user?.nome || "GARAGEIRO",
        data: new Date().toISOString()
      });

      carregarDados();
    } catch (e) {
      alert("Erro ao atualizar status");
    }
  };

  return (
    <div className="min-h-screen bg-slate-100">

      {/* HEADER */}
      <header className="bg-slate-900 text-white p-4 flex justify-between items-center">
        <div className="flex items-center gap-3">
          <ShieldCheck />
          <h1 className="font-black">Controle de Pátio</h1>
        </div>

        <div className="flex gap-2">
          <button onClick={() => setSoundEnabled(!soundEnabled)}>
            {soundEnabled ? <Volume2 /> : <VolumeX />}
          </button>

          {loading && <RefreshCw className="animate-spin" />}
        </div>
      </header>

      {/* CARDS */}
      <div className="p-4 grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card title="Pendentes" value={estatisticas.pendentes} icon={<Clock />} />
        <Card title="Bloqueadas" value={estatisticas.bloqueadas} icon={<AlertTriangle />} />
        <Card title="Atenção" value={estatisticas.atencao} icon={<Wrench />} />
        <Card title="Tempo médio" value={`${estatisticas.tempoMedio} min`} icon={<Clock />} />
      </div>

      {/* TABS */}
      <div className="flex bg-white">
        <button onClick={() => setTab("pendentes")} className="flex-1 p-3">Pendentes</button>
        <button onClick={() => setTab("frota")} className="flex-1 p-3">Frota</button>
      </div>

      <div className="p-4">

        {/* 🔴 PENDENTES */}
        {tab === "pendentes" && (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {vistorias
              .sort((a, b) => calcularEspera(b.data_hora) - calcularEspera(a.data_hora))
              .map(v => {
                const espera = calcularEspera(v.data_hora);
                const critico = espera > 20;

                return (
                  <div key={v.id} className={`bg-white p-4 rounded-xl border ${critico ? "border-red-500" : ""}`}>
                    
                    <h2 className="text-2xl font-black">{v.prefixo_vtr}</h2>

                    <p className="text-xs">{v.tipo_vistoria}</p>
                    <p className="text-xs">{v.tipo_servico}</p>
                    <p className="text-xs">KM: {v.hodometro}</p>

                    <p className="text-xs font-bold mt-2">
                      ⏱ {espera} min
                    </p>

                    {critico && (
                      <p className="text-red-500 text-xs font-bold">CRÍTICO</p>
                    )}

                    <div className="flex gap-2 mt-3">
                      <button
                        onClick={() => atualizarStatus(v.id, "LIBERADA")}
                        className="bg-green-500 text-white px-2 py-1 text-xs rounded"
                      >
                        Liberar
                      </button>

                      <button
                        onClick={() => atualizarStatus(v.id, "MANUTENCAO")}
                        className="bg-red-500 text-white px-2 py-1 text-xs rounded"
                      >
                        Manutenção
                      </button>
                    </div>

                  </div>
                );
              })}
          </div>
        )}

        {/* 🚓 FROTA */}
        {tab === "frota" && (
          <div>

            <input
              placeholder="Buscar..."
              className="w-full p-2 mb-4 border rounded"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />

            <div className="bg-white rounded-xl">
              {filtroFrota.map(v => {
                const status = getStatusViatura(v);

                return (
                  <div key={v.PREFIXO} className="p-3 border-b flex justify-between">
                    <div>
                      <p className="font-bold">{v.PREFIXO}</p>
                      <p className="text-xs">{v.PLACA}</p>
                    </div>

                    <div className="text-xs font-bold">
                      {status === "BLOQUEADA" && "🚨 BLOQUEADA"}
                      {status === "ATENCAO" && "🟡 ATENÇÃO"}
                      {status === "OK" && "🟢 OK"}
                    </div>
                  </div>
                );
              })}
            </div>

          </div>
        )}

      </div>
    </div>
  );
};

const Card = ({ title, value, icon }) => (
  <div className="bg-white p-4 rounded-xl shadow">
    {icon}
    <p className="text-xs">{title}</p>
    <p className="text-xl font-black">{value}</p>
  </div>
);

export default GarageiroDashboard;
