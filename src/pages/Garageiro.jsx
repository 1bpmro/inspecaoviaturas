import React, { useState, useEffect } from 'react';
import { gasApi } from '../api/gasClient';
import { useAuth } from '../lib/AuthContext';
import { ArrowLeft, RefreshCw, CheckCircle2, AlertTriangle, Clock, User } from 'lucide-react';

const Garageiro = ({ onBack }) => {
  const [pendentes, setPendentes] = useState([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth(); // Pegamos o RE do garageiro logado

  const carregarVistorias = async () => {
    setLoading(true);
    try {
      const res = await gasApi.getVistoriasPendentes();
      // O GAS retorna os dados em res.data
      if (res.status === 'success') {
        setPendentes(res.data);
      }
    } catch (error) {
      console.error("Erro ao carregar pátio:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    carregarVistorias();
  }, []);

  const confirmarEntrada = async (rowId, prefixo) => {
    if (!confirm(`Confirmar entrada da VTR ${prefixo} no pátio?`)) return;
    
    setLoading(true);
    const res = await gasApi.confirmarVistoriaGarageiro({
      rowId: rowId, // ID da linha na planilha
      garageiro_re: user.re, // Enviamos quem está validando
      data_confirmacao: new Date().toLocaleString('pt-BR')
    });

    if (res.status === 'success') {
      alert(`VTR ${prefixo} validada com sucesso!`);
      carregarVistorias();
    } else {
      alert("Erro ao validar: " + res.message);
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50">
      {/* CABEÇALHO ESTILO MILITAR (AMBER PARA ATENÇÃO) */}
      <div className="bg-amber-600 text-white p-4 flex items-center gap-4 shadow-lg sticky top-0 z-50">
        <button onClick={onBack} className="p-2 hover:bg-amber-700 rounded-full transition-colors active:scale-90">
          <ArrowLeft size={24} />
        </button>
        <div className="flex flex-col">
          <h1 className="font-black uppercase tracking-tight text-lg leading-none">Controle de Pátio</h1>
          <span className="text-[10px] font-bold opacity-80 uppercase tracking-widest">1º BPM - Rondon</span>
        </div>
        <button 
          onClick={carregarVistorias} 
          className="ml-auto p-2 bg-amber-700 rounded-xl active:scale-90 transition-all"
        >
          <RefreshCw size={20} className={loading ? 'animate-spin' : ''} />
        </button>
      </div>

      <main className="p-4 max-w-2xl mx-auto">
        <div className="mb-6 flex justify-between items-end">
          <div>
            <h2 className="text-slate-800 font-black flex items-center gap-2 text-sm uppercase tracking-wider">
              <Clock size={16} className="text-amber-600" /> Fila de Espera
            </h2>
            <p className="text-[10px] text-slate-500 font-bold uppercase">Aguardando conferência física</p>
          </div>
          <span className="text-[10px] bg-slate-200 text-slate-600 px-2 py-1 rounded-full font-black">
            {pendentes.length} VTR(S)
          </span>
        </div>

        {loading && pendentes.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-slate-400 gap-3">
            <RefreshCw size={40} className="animate-spin opacity-20" />
            <span className="font-bold text-xs uppercase tracking-widest">Sincronizando pátio...</span>
          </div>
        ) : pendentes.length === 0 ? (
          <div className="text-center py-20 bg-white rounded-[2.5rem] border-4 border-dashed border-slate-200 text-slate-400">
            <CheckCircle2 size={48} className="mx-auto mb-3 opacity-10" />
            <p className="font-black uppercase text-xs tracking-widest">Pátio Limpo</p>
            <p className="text-[10px] mt-1 font-bold">Nenhuma vistoria pendente de validação.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {pendentes.map((item, index) => (
              <div 
                key={index} 
                className="bg-white p-5 rounded-[2rem] shadow-sm border-2 border-slate-200 flex flex-col gap-4 animate-in fade-in slide-in-from-bottom-4 duration-300"
              >
                <div className="flex justify-between items-start">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-3xl font-black text-slate-900 tracking-tighter">{item.prefixo_vtr}</span>
                      <span className="text-[10px] bg-blue-600 text-white px-2 py-0.5 rounded-full font-black uppercase">
                        {item.tipo_vistoria}
                      </span>
                    </div>
                    <p className="text-[10px] font-black text-slate-500 uppercase mt-1">
                      Odômetro: <span className="text-slate-900">{item.hodometro} KM</span>
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-[10px] text-slate-400 font-bold uppercase">Motorista</p>
                    <p className="text-xs font-black text-slate-700 uppercase tracking-tighter">
                      {item.motorista_nome}
                    </p>
                  </div>
                </div>

                {/* Se o resumo do checklist contiver algo que indique avaria */}
                {(item.checklist_resumo && item.checklist_resumo.toLowerCase().includes("avaria")) && (
                  <div className="flex items-center gap-2 bg-red-50 text-red-700 p-3 rounded-2xl text-[10px] font-black border border-red-100">
                    <AlertTriangle size={16} /> POSSUI ALTERAÇÕES REGISTRADAS NO CHECKLIST
                  </div>
                )}

                <div className="bg-slate-50 p-3 rounded-2xl">
                   <p className="text-[9px] font-black text-slate-400 uppercase mb-1">Resumo da Vistoria:</p>
                   <p className="text-[11px] text-slate-600 italic leading-tight">"{item.checklist_resumo || 'Sem observações'}"</p>
                </div>

                <button 
                  onClick={() => confirmarEntrada(item.rowId, item.prefixo_vtr)}
                  disabled={loading}
                  className="w-full py-4 bg-emerald-600 text-white rounded-2xl font-black uppercase text-xs flex items-center justify-center gap-2 hover:bg-emerald-700 transition-all active:scale-95 shadow-lg shadow-emerald-100 disabled:opacity-50"
                >
                  <CheckCircle2 size={18} /> Validar Chegada e Liberar
                </button>
              </div>
            ))}
          </div>
        )}
      </main>

      <footer className="mt-8 mb-8 flex flex-col items-center gap-1 opacity-40">
        <User size={16} className="text-slate-500" />
        <p className="text-[9px] font-black uppercase tracking-widest text-slate-500">
          Operador: {user?.patente} {user?.nome}
        </p>
      </footer>
    </div>
  );
};

export default Garageiro;
