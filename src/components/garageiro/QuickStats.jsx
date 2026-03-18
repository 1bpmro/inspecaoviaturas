// QuickStats.jsx
export const QuickStats = ({ vistorias }) => {
  const stats = React.useMemo(() => {
    const total = vistorias.length;
    const agora = new Date();
    const tempos = vistorias.map(v => Math.floor((agora - new Date(v.data_hora)) / 60000));
    const media = total === 0 ? 0 : Math.floor(tempos.reduce((a, b) => a + b, 0) / total);
    const criticos = tempos.filter(t => t > 20).length;
    return { total, media, criticos };
  }, [vistorias]);

  return (
    <div className="grid grid-cols-3 gap-3 mb-6">
      <div className="bg-slate-800 p-3 rounded-2xl shadow-sm border-b-4 border-black/20 text-white">
        <p className="text-[8px] font-black uppercase opacity-60">Fila</p>
        <p className="text-xl font-black leading-none mt-1">{stats.total}</p>
      </div>
      <div className="bg-amber-500 p-3 rounded-2xl shadow-sm border-b-4 border-black/20 text-white">
        <p className="text-[8px] font-black uppercase opacity-60">T. Médio</p>
        <p className="text-xl font-black leading-none mt-1">{stats.media}m</p>
      </div>
      <div className={`p-3 rounded-2xl shadow-sm border-b-4 border-black/20 text-white transition-colors ${stats.criticos > 0 ? 'bg-red-600 animate-pulse' : 'bg-slate-400'}`}>
        <p className="text-[8px] font-black uppercase opacity-60">Críticos</p>
        <p className="text-xl font-black leading-none mt-1">{stats.criticos}</p>
      </div>
    </div>
  );
};

// CheckItem.jsx
export const CheckItem = ({ label, active, onClick, danger = false, icon }) => (
  <button onClick={onClick} className={`p-4 rounded-2xl border-2 font-black text-[8px] uppercase transition-all flex flex-col items-center gap-2 ${active ? 'bg-emerald-50 border-emerald-500 text-emerald-700' : danger ? 'bg-red-600 border-red-700 text-white shadow-lg' : 'bg-slate-50 border-slate-200 text-slate-400'}`}>
    {icon}
    {label}
    <span className="text-[10px] font-bold">{active ? 'OK' : danger ? 'ALERTA' : 'PENDENTE'}</span>
  </button>
);
