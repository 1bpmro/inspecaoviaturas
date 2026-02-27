import React, { useState, useEffect } from 'react';
import { useAuth } from '../lib/AuthContext';
import { gasApi } from '../api/gasClient';
import { ArrowLeft, Clock, Calendar, Car, AlertCircle, CheckCircle2 } from 'lucide-react';

const HistoricoPessoal = ({ onBack }) => {
  const { user } = useAuth();
  const [vistorias, setVistorias] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const carregarMeuHistorico = async () => {
      try {
        // Buscamos todas as vistorias (o filtro de segurança é feito aqui ou no GAS)
        const res = await gasApi.getVistorias();
        if (res.status === 'success') {
          // Filtra vistorias onde o RE do usuário logado participou
          const minhas = res.data.filter(v => 
            String(v.motorista_re) === String(user.re) || 
            String(v.comandante_re) === String(user.re) || 
            String(v.patrulheiro_re) === String(user.re)
          );
          setVistorias(minhas);
        }
      } catch (e) {
        console.error("Erro ao carregar histórico");
      } finally {
        setLoading(false);
      }
    };
    carregarMeuHistorico();
  }, [user.re]);

  return (
    <div className="min-h-screen bg-slate-50 pb-10">
      <header className="bg-slate-900 text-white p-5 sticky top-0 z-50 flex items-center gap-4">
        <button onClick={onBack} className="p-2 hover:bg-white/10 rounded-full transition-colors">
          <ArrowLeft size={24} />
        </button>
        <div>
          <h1 className="font-black text-xs uppercase tracking-widest">Meu Histórico</h1>
          <p className="text-[10px] text-blue-400 font-bold uppercase">Registros de {user.patente} {user.nome}</p>
        </div>
      </header>

      <main className="p-4 max-w-xl mx-auto space-y-4">
        {loading ? (
          <div className="flex flex-col items-center py-20 text-slate-400">
            <div className="animate-spin mb-4 border-4 border-blue-600 border-t-transparent rounded-full w-8 h-8"></div>
            <p className="text-[10px] font-black uppercase tracking-widest">Consultando Arquivos...</p>
          </div>
        ) : vistorias.length === 0 ? (
          <div className="text-center py-20 bg-white rounded-[2rem] border-2 border-dashed border-slate-200">
            <p className="text-slate-400 font-bold text-sm uppercase">Nenhum registro encontrado.</p>
          </div>
        ) : (
          vistorias.map((v, i) => (
            <div key={i} className="bg-white rounded-3xl p-5 shadow-sm border border-slate-200 flex flex-col gap-3">
              <div className="flex justify-between items-start">
                <div className="flex items-center gap-3">
                  <div className={`p-3 rounded-2xl ${v.tipo_vistoria === 'ENTRADA' ? 'bg-green-100 text-green-700' : 'bg-orange-100 text-orange-700'}`}>
                    <Car size={20} />
                  </div>
                  <div>
                    <h3 className="font-black text-lg text-slate-800 leading-none">{v.prefixo_vtr}</h3>
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">{v.tipo_vistoria}</span>
                  </div>
                </div>
                <div className="text-right">
                  <div className="flex items-center gap-1 text-slate-500 font-bold text-[10px] uppercase">
                    <Calendar size={12} /> {v.data_vistoria}
                  </div>
                  <div className="flex items-center gap-1 text-slate-400 font-bold text-[10px] uppercase justify-end">
                    <Clock size={12} /> {v.hora_vistoria}
                  </div>
                </div>
              </div>

              <div className="bg-slate-50 rounded-2xl p-3 border border-slate-100">
                <div className="flex items-center gap-2 mb-1">
                  {v.checklist_resumo === "SEM ALTERAÇÕES" ? (
                    <CheckCircle2 size={14} className="text-green-600" />
                  ) : (
                    <AlertCircle size={14} className="text-red-600" />
                  )}
                  <span className="text-[10px] font-black uppercase text-slate-700">Status do Checklist</span>
                </div>
                <p className="text-[10px] font-medium text-slate-500 leading-tight uppercase">
                  {v.checklist_resumo}
                </p>
              </div>

              <div className="flex justify-between items-center text-[9px] font-black text-slate-400 uppercase tracking-widest">
                <span>KM: {v.hodometro}</span>
                <span className="bg-slate-200 px-2 py-1 rounded-md text-slate-600">
                  {v.tipo_servico}
                </p>
              </div>
            </div>
          ))
        )}
      </main>
    </div>
  );
};

export default HistoricoPessoal;
