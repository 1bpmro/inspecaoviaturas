import React from 'react';
import { X, ShieldCheck, Navigation, Calendar, User } from 'lucide-react';

const FichaViaturaModal = ({ vtr, onClose }) => {
  if (!vtr) return null;

  // Função ultra-resiliente para buscar dados das abas PAINEL ou PATRIMONIO
  const getDado = (campo) => {
    const c = campo.toUpperCase();
    // Tenta: comandante_nome -> COMANDANTE -> comandante
    return vtr[`${campo}_nome`] || vtr[c] || vtr[campo] || "NÃO INFORMADO";
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-300">
      <div className="w-full max-w-md bg-white rounded-[3rem] shadow-2xl overflow-hidden animate-in slide-in-from-bottom-10 duration-500">
        
        {/* Header */}
        <div className="bg-slate-900 p-6 text-white relative">
          <button onClick={onClose} className="absolute right-6 top-6 p-2 bg-slate-800 rounded-full text-slate-400 hover:text-white transition-colors">
            <X size={20} />
          </button>
          <div className="flex items-center gap-4">
            <div className="bg-amber-500 p-3 rounded-2xl text-slate-900 shadow-lg shadow-amber-500/20">
              <ShieldCheck size={28} />
            </div>
            <div>
              <h2 className="font-black text-2xl tracking-tighter uppercase leading-none">
                {vtr.PREFIXO || vtr.Prefixo || "VTR"}
              </h2>
              <p className="text-[10px] font-bold text-amber-500 uppercase tracking-[0.2em] mt-1 italic">
                {vtr.STATUS || vtr.Status || 'EM OPERAÇÃO'}
              </p>
            </div>
          </div>
        </div>

        {/* Guarnição - Lendo da Aba PAINEL */}
        <div className="p-6 space-y-3 bg-slate-50">
          <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-2">Equipe em Serviço (Painel)</label>
          
          {[
            { label: 'Comandante', key: 'comandante', color: 'bg-slate-100 text-slate-400', tag: 'CMT' },
            { label: 'Motorista', key: 'motorista', color: 'bg-emerald-50 text-emerald-600', tag: 'MOT' },
            { label: 'Patrulheiro', key: 'patrulheiro', color: 'bg-blue-50 text-blue-600', tag: 'PAT' }
          ].map((item) => (
            <div key={item.key} className="flex items-center gap-4 p-4 bg-white border-2 border-slate-100 rounded-[1.5rem] shadow-sm">
              <div className={`w-10 h-10 rounded-full ${item.color} flex items-center justify-center font-black text-xs`}>
                {item.tag}
              </div>
              <div className="flex-1">
                <p className="text-[9px] font-black text-slate-400 uppercase">{item.label}</p>
                <p className="font-bold text-slate-800 uppercase leading-tight">
                  {getDado(item.key)}
                </p>
              </div>
            </div>
          ))}
          
          {/* Rodapé de Informações Técnicas */}
          <div className="grid grid-cols-2 gap-3 mt-4">
             <div className="bg-slate-200 p-3 rounded-2xl text-center flex flex-col justify-center border border-slate-300/50">
                <div className="flex items-center justify-center gap-1 mb-1">
                  <Navigation size={10} className="text-slate-500" />
                  <p className="text-[8px] font-black text-slate-500 uppercase">HODÔMETRO</p>
                </div>
                <p className="font-black text-slate-700">
                  {vtr.ULTIMOKM || vtr.UltimoKM || '0'} KM
                </p>
             </div>
             <div className="bg-slate-200 p-3 rounded-2xl text-center flex flex-col justify-center border border-slate-300/50">
                <div className="flex items-center justify-center gap-1 mb-1">
                  <Calendar size={10} className="text-slate-500" />
                  <p className="text-[8px] font-black text-slate-500 uppercase">ÚLT. SINC</p>
                </div>
                <p className="font-black text-slate-700">
                  {vtr.DATA_HORA ? new Date(vtr.DATA_HORA).toLocaleDateString('pt-BR') : '--/--'}
                </p>
             </div>
          </div>
        </div>

        <div className="p-4 bg-white">
          <button 
            onClick={onClose} 
            className="w-full p-4 bg-slate-900 text-white rounded-3xl font-black text-xs uppercase tracking-widest active:scale-95 transition-all shadow-lg"
          >
            FECHAR FICHA
          </button>
        </div>
      </div>
    </div>
  );
};

export default FichaViaturaModal;
