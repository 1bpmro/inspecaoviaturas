import React, { useState, useEffect } from 'react';
import { gasApi } from '../api/gasClient';
import { ArrowLeft, RefreshCw, CheckCircle2, AlertTriangle, Clock } from 'lucide-react';

const Garageiro = ({ onBack }) => {
  const [pendentes, setPendentes] = useState([]);
  const [loading, setLoading] = useState(true);

  const carregarVistorias = async () => {
    setLoading(true);
    const res = await gasApi.getVistoriasPendentes();
    if (res.status === 'success') setPendentes(res.data);
    setLoading(false);
  };

  useEffect(() => { carregarVistorias(); }, []);

  const confirmarEntrada = async (row, prefixo) => {
    if (!confirm(`Confirmar entrada da VTR ${prefixo} no pátio?`)) return;
    
    const res = await gasApi.confirmarVistoriaGarageiro({
      row: row,
      data_confirmacao: new Date().toLocaleString('pt-BR')
    });

    if (res.status === 'success') {
      alert("Entrada validada com sucesso!");
      carregarVistorias();
    }
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="bg-amber-600 text-white p-4 flex items-center gap-4 shadow-lg">
        <button onClick={onBack} className="p-2 hover:bg-amber-700 rounded-full transition-colors">
          <ArrowLeft size={24} />
        </button>
        <h1 className="font-black uppercase tracking-tight text-lg">Controle de Pátio</h1>
        <button onClick={carregarVistorias} className="ml-auto p-2">
          <RefreshCw size={20} className={loading ? 'animate-spin' : ''} />
        </button>
      </div>

      <main className="p-4 max-w-2xl mx-auto">
        <div className="mb-6">
          <h2 className="text-slate-800 font-bold flex items-center gap-2 text-sm uppercase tracking-wider">
            <Clock size={16} className="text-amber-600" /> Vistorias aguardando conferência
          </h2>
        </div>

        {loading ? (
          <div className="text-center py-20 text-slate-400">Carregando dados...</div>
        ) : pendentes.length === 0 ? (
          <div className="text-center py-20 bg-white rounded-3xl border-2 border-dashed border-slate-200 text-slate-400">
            Nenhuma VTR aguardando entrada.
          </div>
        ) : (
          <div className="space-y-3">
            {pendentes.map((item, index) => (
              <div key={index} className="bg-white p-4 rounded-2xl shadow-sm border border-slate-200 flex flex-col gap-3">
                <div className="flex justify-between items-start">
                  <div>
                    <span className="text-2xl font-black text-slate-900">{item.prefixo_vtr}</span>
                    <p className="text-xs font-bold text-slate-500 uppercase">{item.odometro_entrada} KM • Nível: {item.combustivel_entrada}</p>
                  </div>
                  <div className="text-right">
                    <span className="text-[10px] bg-blue-100 text-blue-700 px-2 py-1 rounded-md font-bold uppercase">Entrada</span>
                    <p className="text-[10px] text-slate-400 mt-1">{item.patente_motorista} {item.nome_motorista}</p>
                  </div>
                </div>

                {item.houve_alteracoes === "Sim" && (
                  <div className="flex items-center gap-2 bg-red-50 text-red-700 p-2 rounded-lg text-xs font-bold">
                    <AlertTriangle size={14} /> POSSUI ALTERAÇÕES REGISTRADAS
                  </div>
                )}

                <button 
                  onClick={() => confirmarEntrada(item.row, item.prefixo_vtr)}
                  className="w-full py-3 bg-emerald-600 text-white rounded-xl font-black uppercase text-xs flex items-center justify-center gap-2 hover:bg-emerald-700 transition-all active:scale-95"
                >
                  <CheckCircle2 size={18} /> Validar Chegada no Pátio
                </button>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
};

export default Garageiro;
