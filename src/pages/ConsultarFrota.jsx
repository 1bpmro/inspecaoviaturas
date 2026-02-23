import React, { useState, useEffect } from 'react';
import { gasApi } from '../api/gasClient';
import { ArrowLeft, Car, Search, AlertCircle, CheckCircle2, Loader2 } from 'lucide-react';

const ConsultarFrota = ({ onBack }) => {
  const [viaturas, setViaturas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busca, setBusca] = useState('');

  useEffect(() => {
    const carregar = async () => {
      setLoading(true);
      const res = await gasApi.getViaturas(false);
      if (res.status === 'success') setViaturas(res.data);
      setLoading(false);
    };
    carregar();
  }, []);

  const frotaFiltrada = viaturas.filter(vtr => 
    vtr.Prefixo.toLowerCase().includes(busca.toLowerCase()) || 
    vtr.Placa.toLowerCase().includes(busca.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-[var(--bg-app)] pb-10 transition-all">
      {/* HEADER PADRONIZADO */}
      <header className="bg-slate-900 text-white p-5 shadow-2xl sticky top-0 z-50 border-b-4 border-blue-900">
        <div className="max-w-xl mx-auto flex items-center justify-between">
          <button onClick={onBack} className="p-2 hover:bg-slate-800 rounded-full transition-all active:scale-90">
            <ArrowLeft size={24} />
          </button>
          <div className="text-center">
            <h1 className="font-black text-[10px] tracking-[0.3em] uppercase opacity-50">1º BPM - Rondon</h1>
            <p className="text-xs font-black text-blue-400 uppercase tracking-widest">Status da Frota</p>
          </div>
          <div className="w-10" />
        </div>
      </header>

      <main className="max-w-xl mx-auto p-4 space-y-6">
        
        {/* BARRA DE BUSCA TÁTICA */}
        <div className="relative group">
          <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none">
            <Search className="text-slate-400 group-focus-within:text-blue-500 transition-colors" size={20} />
          </div>
          <input 
            type="text" 
            placeholder="Buscar por Prefixo ou Placa..." 
            className="vtr-input !pl-12 !rounded-2xl shadow-sm"
            onChange={(e) => setBusca(e.target.value)}
          />
        </div>

        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 text-slate-400">
            <Loader2 className="animate-spin mb-4" size={40} />
            <p className="font-black text-[10px] uppercase tracking-widest">Acessando Banco de Dados...</p>
          </div>
        ) : (
          <div className="grid gap-4 animate-in fade-in slide-in-from-bottom-4">
            {frotaFiltrada.map((vtr) => (
              <div key={vtr.Placa} className="vtr-card p-5 flex items-center justify-between group active:scale-[0.98] transition-all">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-slate-100 dark:bg-slate-800 rounded-2xl text-slate-600">
                    <Car size={24} />
                  </div>
                  <div>
                    <h3 className="font-black text-lg text-slate-800 tracking-tight leading-none">{vtr.Prefixo}</h3>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter mt-1">Placa: {vtr.Placa}</p>
                  </div>
                </div>

                <div className="text-right">
                  {vtr.Status === 'EM SERVIÇO' ? (
                    <div className="flex items-center justify-end gap-1.5 text-orange-600">
                      <span className="text-[10px] font-black uppercase">Em Serviço</span>
                      <AlertCircle size={16} />
                    </div>
                  ) : (
                    <div className="flex items-center justify-end gap-1.5 text-green-600">
                      <span className="text-[10px] font-black uppercase">Disponível</span>
                      <CheckCircle2 size={16} />
                    </div>
                  )}
                  <p className="text-[9px] font-medium text-slate-400 mt-1 italic">Visto em: {vtr.UltimaVistoria || 'N/A'}</p>
                </div>
              </div>
            ))}

            {frotaFiltrada.length === 0 && (
              <div className="text-center py-10 opacity-40">
                <p className="font-black text-xs uppercase">Nenhuma viatura encontrada</p>
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
};

export default ConsultarFrota;
