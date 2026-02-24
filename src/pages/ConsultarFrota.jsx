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
      try {
        // Chamada sem argumentos para pegar a frota completa
        const res = await gasApi.getViaturas(); 
        if (res.status === 'success') {
          setViaturas(res.data);
        }
      } catch (error) {
        console.error("Erro ao carregar frota:", error);
      } finally {
        setLoading(false);
      }
    };
    carregar();
  }, []);

  // Filtro inteligente (busca em tempo real)
  const frotaFiltrada = viaturas.filter(vtr => 
    (vtr.Prefixo && vtr.Prefixo.toString().toLowerCase().includes(busca.toLowerCase())) || 
    (vtr.Placa && vtr.Placa.toString().toLowerCase().includes(busca.toLowerCase()))
  );

  return (
    <div className="min-h-screen bg-slate-50 pb-10 transition-all">
      {/* HEADER PADRONIZADO 1º BPM */}
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
            className="w-full pl-12 pr-4 py-4 bg-white border border-slate-200 rounded-2xl shadow-sm focus:ring-2 focus:ring-blue-500 outline-none transition-all font-bold text-slate-700"
            onChange={(e) => setBusca(e.target.value)}
          />
        </div>

        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 text-slate-400">
            <Loader2 className="animate-spin mb-4" size={40} />
            <p className="font-black text-[10px] uppercase tracking-widest">Acessando Banco de Dados...</p>
          </div>
        ) : (
          <div className="grid gap-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {frotaFiltrada.map((vtr) => (
              <div key={vtr.Placa} className="bg-white p-5 rounded-3xl flex items-center justify-between shadow-sm border border-slate-100 group active:scale-[0.98] transition-all">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-slate-100 rounded-2xl text-slate-600 group-hover:bg-blue-50 group-hover:text-blue-600 transition-colors">
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
                      <span className="text-[10px] font-black uppercase tracking-tighter">Em Serviço</span>
                      <AlertCircle size={16} />
                    </div>
                  ) : (
                    <div className="flex items-center justify-end gap-1.5 text-green-600">
                      <span className="text-[10px] font-black uppercase tracking-tighter">Disponível</span>
                      <CheckCircle2 size={16} />
                    </div>
                  )}
                  {/* Campo de data vindo da planilha de Patrimônio */}
                  <p className="text-[9px] font-medium text-slate-400 mt-1 italic">
                    Visto em: {vtr.UltimaVistoria || 'N/A'}
                  </p>
                </div>
              </div>
            ))}

            {frotaFiltrada.length === 0 && (
              <div className="text-center py-20 opacity-40">
                <Car className="mx-auto mb-2 text-slate-300" size={48} />
                <p className="font-black text-xs uppercase tracking-widest">Nenhuma viatura encontrada</p>
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
};

export default ConsultarFrota;
