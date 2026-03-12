import React, { useState, useEffect } from 'react';
// Firebase
import { db, collection, onSnapshot, query, orderBy } from '../lib/firebase';
import { ArrowLeft, Car, Search, AlertCircle, CheckCircle2, Loader2, Gauge } from 'lucide-react';

const ConsultarFrota = ({ onBack }) => {
  const [viaturas, setViaturas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busca, setBusca] = useState('');

  useEffect(() => {
    // Escuta a coleção "viaturas" em tempo real
    // Ordenamos pelo prefixo para facilitar a leitura
    const q = query(collection(db, "viaturas"), orderBy("prefixo", "asc"));

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const listaViaturas = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setViaturas(listaViaturas);
      setLoading(false);
    }, (error) => {
      console.error("Erro ao escutar frota:", error);
      setLoading(false);
    });

    return () => unsubscribe(); // Limpa a escuta ao fechar a página
  }, []);

  // Filtro de busca (Prefixo ou Placa)
  const frotaFiltrada = viaturas.filter(vtr => {
    const termo = busca.toLowerCase();
    return (
      vtr.prefixo?.toLowerCase().includes(termo) || 
      vtr.placa?.toLowerCase().includes(termo)
    );
  });

  return (
    <div className="min-h-screen bg-slate-50 pb-10">
      {/* HEADER ESTILO TÁTICO */}
      <header className="bg-slate-900 text-white p-5 shadow-2xl sticky top-0 z-50 border-b-4 border-blue-600">
        <div className="max-w-xl mx-auto flex items-center justify-between">
          <button onClick={onBack} className="p-2 hover:bg-white/10 rounded-full transition-all">
            <ArrowLeft size={24} />
          </button>
          <div className="text-center">
            <h1 className="font-black text-[10px] tracking-[0.2em] uppercase text-blue-400">1º BPM - Rondon</h1>
            <p className="text-xs font-black uppercase tracking-widest">Painel da Frota</p>
          </div>
          <div className="w-10 flex justify-end">
             <div className={`w-2 h-2 rounded-full animate-pulse ${loading ? 'bg-slate-500' : 'bg-emerald-500'}`} />
          </div>
        </div>
      </header>

      <main className="max-w-xl mx-auto p-4 space-y-4">
        
        {/* BUSCA */}
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
          <input 
            type="text" 
            placeholder="PREFIXO OU PLACA..." 
            className="w-full pl-12 pr-4 py-4 bg-white border-2 border-slate-100 rounded-[2rem] shadow-sm outline-none focus:border-blue-500 transition-all font-bold text-xs uppercase"
            onChange={(e) => setBusca(e.target.value)}
          />
        </div>

        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 text-slate-400">
            <Loader2 className="animate-spin mb-4 text-blue-600" size={32} />
            <p className="font-black text-[9px] uppercase tracking-[0.3em]">Sincronizando Frota...</p>
          </div>
        ) : (
          <div className="space-y-3">
            {frotaFiltrada.map((vtr) => {
              const status = (vtr.status || "DESCONHECIDO").toUpperCase();
              const isDisponivel = status === "DISPONÍVEL" || status === "OK";
              const isManutencao = status.includes("MANUTEN");

              return (
                <div key={vtr.id} className="bg-white p-4 rounded-[2.5rem] flex items-center justify-between shadow-sm border border-slate-100 active:scale-[0.98] transition-all">
                  <div className="flex items-center gap-4">
                    <div className={`p-4 rounded-3xl transition-colors ${isDisponivel ? 'bg-emerald-50 text-emerald-600' : 'bg-slate-100 text-slate-400'}`}>
                      <Car size={26} />
                    </div>
                    <div>
                      <h3 className="font-black text-xl text-slate-800 leading-none">{vtr.prefixo}</h3>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">{vtr.placa}</span>
                        <span className="text-slate-200 text-[10px]">|</span>
                        <div className="flex items-center gap-1 text-slate-500 font-bold text-[9px]">
                          <Gauge size={10} /> {vtr.ultimo_km || '---'} KM
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="text-right">
                    <div className={`flex items-center justify-end gap-1.5 font-black text-[10px] uppercase ${
                      isDisponivel ? 'text-emerald-600' : isManutencao ? 'text-red-600' : 'text-orange-500'
                    }`}>
                      <span>{status}</span>
                      {isDisponivel ? <CheckCircle2 size={14} /> : <AlertCircle size={14} />}
                    </div>
                    <p className="text-[8px] font-bold text-slate-300 mt-1 uppercase">
                      Atualizado há: {vtr.data_ultima_atualizacao ? 'Recém' : 'N/A'}
                    </p>
                  </div>
                </div>
              );
            })}

            {frotaFiltrada.length === 0 && (
              <div className="text-center py-20 bg-white rounded-[3rem] border-2 border-dashed border-slate-200">
                <Car className="mx-auto mb-2 text-slate-200" size={48} />
                <p className="font-black text-[10px] text-slate-400 uppercase tracking-widest">Nenhuma viatura na lista</p>
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
};

export default ConsultarFrota;
