import React, { useState, useEffect } from 'react';
import { useAuth } from '../lib/AuthContext';
// Firebase
import { db, collection, query, where, getDocs, orderBy } from '../lib/firebase';
import { ArrowLeft, Clock, Calendar, Car, AlertCircle, CheckCircle2, Search } from 'lucide-react'; 

const HistoricoPessoal = ({ onBack }) => {
  const { user } = useAuth();
  const [vistorias, setVistorias] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const carregarMeuHistorico = async () => {
      if (!user?.re) return;
      
      setLoading(true);
      try {
        // Criamos uma consulta buscando onde o RE do usuário aparece em qualquer uma das 3 funções
        // Nota: No Firestore, para fazer "OR" em campos diferentes, as vezes é mais simples buscar por motorista
        // ou fazer consultas paralelas se o volume for gigante. Para o 1º BPM, buscaremos vistorias recentes.
        
        const vistoriasRef = collection(db, "vistorias");
        
        // Buscamos as vistorias onde o usuário logado era o motorista, comandante ou patrulheiro
        // Para simplificar e garantir performance, vamos buscar vistorias onde o 'motorista_re' é o dele
        // ou onde ele foi o autor (militar_logado).
        const q = query(
          vistoriasRef, 
          where("motorista_re", "==", String(user.re)),
          orderBy("createdAt", "desc")
        );

        const querySnapshot = await getDocs(q);
        const meusRegistros = [];
        
        querySnapshot.forEach((doc) => {
          const data = doc.data();
          // Convertemos o Timestamp do Firebase para Date do JS
          const dataFormatada = data.createdAt?.toDate() || new Date();
          
          meusRegistros.push({
            id: doc.id,
            ...data,
            data_vistoria: dataFormatada.toLocaleDateString('pt-BR'),
            hora_vistoria: dataFormatada.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
          });
        });

        setVistorias(meusRegistros);
      } catch (e) {
        console.error("Erro ao carregar histórico do Firebase:", e);
      } finally {
        setLoading(false);
      }
    };

    carregarMeuHistorico();
  }, [user.re]);

  return (
    <div className="min-h-screen bg-slate-50 pb-10">
      <header className="bg-slate-900 text-white p-5 sticky top-0 z-50 flex items-center gap-4 shadow-lg border-b-4 border-blue-600">
        <button onClick={onBack} className="p-2 hover:bg-white/10 rounded-full transition-colors">
          <ArrowLeft size={24} />
        </button>
        <div>
          <h1 className="font-black text-xs uppercase tracking-widest text-blue-400">Meu Histórico</h1>
          <p className="text-[10px] text-white font-bold uppercase">
            {user.patente} {user.nome} • RE {user.re}
          </p>
        </div>
      </header>

      <main className="p-4 max-w-xl mx-auto space-y-4">
        {loading ? (
          <div className="flex flex-col items-center py-20 text-slate-400">
            <div className="animate-spin mb-4 border-4 border-blue-600 border-t-transparent rounded-full w-8 h-8"></div>
            <p className="text-[10px] font-black uppercase tracking-widest">Acessando Nuvem Firebase...</p>
          </div>
        ) : vistorias.length === 0 ? (
          <div className="text-center py-20 bg-white rounded-[2.5rem] border-2 border-dashed border-slate-200 px-10">
            <Search size={40} className="mx-auto text-slate-200 mb-4" />
            <p className="text-slate-400 font-bold text-sm uppercase leading-tight">
              Nenhuma vistoria encontrada vinculada ao seu RE.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            <p className="text-[9px] font-black text-slate-400 uppercase ml-2">
              Mostrando os últimos {vistorias.length} registros
            </p>
            {vistorias.map((v) => (
              <div key={v.id} className="bg-white rounded-[2rem] p-5 shadow-sm border border-slate-200 flex flex-col gap-3 active:scale-[0.98] transition-transform">
                <div className="flex justify-between items-start">
                  <div className="flex items-center gap-3">
                    <div className={`p-3 rounded-2xl ${v.tipo_vistoria === 'ENTRADA' ? 'bg-emerald-100 text-emerald-700' : 'bg-orange-100 text-orange-700'}`}>
                      <Car size={20} />
                    </div>
                    <div>
                      <h3 className="font-black text-lg text-slate-800 leading-none">{v.prefixo_vtr}</h3>
                      <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-full ${v.tipo_vistoria === 'ENTRADA' ? 'bg-emerald-600 text-white' : 'bg-orange-500 text-white'}`}>
                        {v.tipo_vistoria}
                      </span>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="flex items-center gap-1 text-slate-600 font-bold text-[10px] uppercase justify-end">
                      <Calendar size={12} className="text-blue-500" /> {v.data_vistoria}
                    </div>
                    <div className="flex items-center gap-1 text-slate-400 font-bold text-[10px] uppercase justify-end">
                      <Clock size={12} /> {v.hora_vistoria}
                    </div>
                  </div>
                </div>

                <div className="bg-slate-50 rounded-2xl p-4 border border-slate-100">
                  <div className="flex items-center gap-2 mb-1">
                    {v.checklist_resumo?.includes("SEM ALTERAÇÕES") ? (
                      <CheckCircle2 size={14} className="text-emerald-600" />
                    ) : (
                      <AlertCircle size={14} className="text-red-600" />
                    )}
                    <span className="text-[10px] font-black uppercase text-slate-700 tracking-tighter">Estado da Viatura</span>
                  </div>
                  <p className="text-[10px] font-medium text-slate-500 leading-tight uppercase italic">
                    {v.checklist_resumo || "Relatório não disponível"}
                  </p>
                </div>

                <div className="flex justify-between items-center text-[9px] font-black text-slate-400 uppercase tracking-widest pt-1 border-t border-slate-50 mt-1">
                  <div className="flex flex-col">
                    <span className="text-slate-300 text-[8px]">HODÔMETRO</span>
                    <span className="text-slate-600">{v.hodometro} KM</span>
                  </div>
                  <div className="text-right flex flex-col items-end">
                    <span className="text-slate-300 text-[8px]">SERVIÇO</span>
                    <span className="text-blue-600">{v.tipo_servico}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
};

export default HistoricoPessoal;
