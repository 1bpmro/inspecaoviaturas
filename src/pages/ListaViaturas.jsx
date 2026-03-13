import React, { useState, useEffect } from 'react';
import { runGoogleScript } from '../api/gasClient'; // Ajusta o caminho conforme o teu projeto

const ListaViaturas = () => {
  const [viaturas, setViaturas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busca, setBusca] = useState('');

  useEffect(() => {
    carregarFrota();
  }, []);

  const carregarFrota = async () => {
    setLoading(true);
    try {
      const response = await runGoogleScript('buscarViaturas');
      if (response.status === 'success') {
        setViaturas(response.data);
      }
    } catch (error) {
      console.error("Erro ao carregar frota:", error);
    } finally {
      setLoading(false);
    }
  };

  // Filtro de busca por Prefixo ou Modelo
  const frotaFiltrada = viaturas.filter(vtr => 
    vtr.PREFIXO?.toString().toLowerCase().includes(busca.toLowerCase()) ||
    vtr.MODELO?.toString().toLowerCase().includes(busca.toLowerCase())
  );

  return (
    <div className="p-4 bg-gray-100 min-h-screen">
      <h2 className="text-2xl font-bold mb-4 text-blue-900">Frota 1º BPM</h2>
      
      {/* Campo de Busca */}
      <input 
        type="text"
        placeholder="Pesquisar VTR (Ex: 01)..."
        className="w-full p-3 rounded-lg border mb-4 shadow-sm"
        onChange={(e) => setBusca(e.target.value)}
      />

      {loading ? (
        <p className="text-center italic">A carregar viaturas...</p>
      ) : (
        <div className="grid gap-4">
          {frotaFiltrada.map((vtr, idx) => (
            <div key={idx} className="bg-white p-4 rounded-xl shadow-md border-l-8" 
                 style={{ borderLeftColor: vtr.STATUS === 'DISPONÍVEL' ? '#10b981' : '#ef4444' }}>
              
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="text-xl font-black text-gray-800">{vtr.PREFIXO}</h3>
                  <p className="text-sm text-gray-500">{vtr.MODELO} - {vtr.PLACA}</p>
                </div>
                <span className={`px-2 py-1 rounded text-xs font-bold ${vtr.STATUS === 'DISPONÍVEL' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                  {vtr.STATUS}
                </span>
              </div>

              <div className="mt-3 flex gap-4 text-sm border-t pt-2">
                <div>
                  <span className="text-gray-400 block uppercase text-[10px]">KM Atual</span>
                  <span className="font-mono font-bold">{vtr.ULTIMOKM}</span>
                </div>
                
                {/* Alerta de Óleo Visual */}
                {vtr.ALERTA_OLEO && (
                  <div className="bg-yellow-50 p-2 rounded border border-yellow-200 animate-pulse">
                    <span className="text-yellow-700 font-bold block text-[10px]">⚠️ ALERTA ÓLEO</span>
                    <span className="text-yellow-800 text-xs">{vtr.MOTIVO_OLEO}</span>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
      
      <button 
        onClick={carregarFrota}
        className="fixed bottom-6 right-6 bg-blue-900 text-white p-4 rounded-full shadow-2xl"
      >
        🔄
      </button>
    </div>
  );
};

export default ListaViaturas;
