const FichaViaturaModal = ({ vtr, onClose }) => {
  if (!vtr) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-300">
      <div className="w-full max-w-md bg-white rounded-[3rem] shadow-2xl overflow-hidden animate-in slide-in-from-bottom-10 duration-500">
        
        <div className="bg-slate-900 p-6 text-white relative">
          <button onClick={onClose} className="absolute right-6 top-6 p-2 bg-slate-800 rounded-full text-slate-400 hover:text-white transition-colors">
            <X size={20} />
          </button>
          <div className="flex items-center gap-4">
            <div className="bg-amber-500 p-3 rounded-2xl text-slate-900 shadow-lg shadow-amber-500/20">
              <ShieldCheck size={28} />
            </div>
            <div>
              <h2 className="font-black text-2xl tracking-tighter uppercase leading-none">{vtr.PREFIXO}</h2>
              <p className="text-[10px] font-bold text-amber-500 uppercase tracking-[0.2em] mt-1 italic">
                {vtr.STATUS || 'EM OPERAÇÃO'}
              </p>
            </div>
          </div>
        </div>

        <div className="p-6 space-y-4 bg-slate-50">
          <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-2">Composição da Guarnição</label>
          
          {/* Card Comandante */}
          <div className="flex items-center gap-4 p-4 bg-white border-2 border-slate-100 rounded-[1.5rem] shadow-sm">
            <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-400 font-black text-xs">CMT</div>
            <div>
              <p className="text-[9px] font-black text-slate-400 uppercase">Comandante</p>
              <p className="font-bold text-slate-800 uppercase">{vtr.comandante_nome || "NÃO INFORMADO"}</p>
            </div>
          </div>

          {/* Card Motorista */}
          <div className="flex items-center gap-4 p-4 bg-white border-2 border-slate-100 rounded-[1.5rem] shadow-sm">
            <div className="w-10 h-10 rounded-full bg-emerald-50 flex items-center justify-center text-emerald-600 font-black text-xs">MOT</div>
            <div>
              <p className="text-[9px] font-black text-slate-400 uppercase">Motorista</p>
              <p className="font-bold text-slate-800 uppercase">{vtr.motorista_nome || "NÃO INFORMADO"}</p>
            </div>
          </div>

          {/* Card Patrulheiro */}
          <div className="flex items-center gap-4 p-4 bg-white border-2 border-slate-100 rounded-[1.5rem] shadow-sm">
            <div className="w-10 h-10 rounded-full bg-blue-50 flex items-center justify-center text-blue-600 font-black text-xs">PAT</div>
            <div>
              <p className="text-[9px] font-black text-slate-400 uppercase">Patrulheiro</p>
              <p className="font-bold text-slate-800 uppercase">{vtr.patrulheiro_nome || "NÃO INFORMADO"}</p>
            </div>
          </div>
          
          <div className="grid grid-cols-2 gap-3 mt-4">
             <div className="bg-slate-200 p-3 rounded-2xl text-center">
                <p className="text-[8px] font-black text-slate-500 uppercase">HODÔMETRO</p>
                <p className="font-black text-slate-700">{vtr.ULTIMOKM} KM</p>
             </div>
             <div className="bg-slate-200 p-3 rounded-2xl text-center">
                <p className="text-[8px] font-black text-slate-500 uppercase">ÚLT. VISTORIA</p>
                <p className="font-black text-slate-700">{vtr.DATA_HORA ? new Date(vtr.DATA_HORA).toLocaleDateString() : '--/--'}</p>
             </div>
          </div>
        </div>

        <div className="p-4 bg-white text-center">
          <button onClick={onClose} className="w-full p-4 bg-slate-900 text-white rounded-3xl font-black text-xs uppercase tracking-widest active:scale-95 transition-all">
            FECHAR FICHA
          </button>
        </div>
      </div>
    </div>
  );
};
