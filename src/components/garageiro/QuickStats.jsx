// QuickStats.jsx
import React, { useMemo } from 'react';
import { Timer, AlertCircle, Inbox } from 'lucide-react';

const QuickStats = ({ vistorias = [] }) => {
  // Memoizamos os cálculos para não reprocessar a cada renderização irrelevante
  const stats = useMemo(() => {
    const total = vistorias.length;
    const agora = new Date();
    
    // Calcula a diferença em minutos para cada vistoria na fila
    const tempos = vistorias.map(v => {
      const dataVistoria = new Date(v.data_hora);
      return Math.max(0, Math.floor((agora - dataVistoria) / 60000));
    });

    const media = total === 0 
      ? 0 
      : Math.floor(tempos.reduce((a, b) => a + b, 0) / total);
    
    // Define como "crítico" qualquer espera acima de 20 minutos
    const criticos = tempos.filter(t => t > 20).length;

    return { total, media, criticos };
  }, [vistorias]);

  return (
    <div className="grid grid-cols-3 gap-3 mb-6">
      {/* Card: Total na Fila */}
      <StatCard 
        label="Fila Atual" 
        value={stats.total} 
        icon={<Inbox size={14} />}
        color="bg-slate-800"
      />

      {/* Card: Tempo Médio de Espera */}
      <StatCard 
        label="Espera Média" 
        value={`${stats.media}m`} 
        icon={<Timer size={14} />}
        color="bg-amber-500"
      />

      {/* Card: Casos Críticos (Acima de 20 min) */}
      <StatCard 
        label="Críticos" 
        value={stats.criticos} 
        icon={<AlertCircle size={14} />}
        color={stats.criticos > 0 ? "bg-red-600 animate-pulse" : "bg-slate-400"}
        danger={stats.criticos > 0}
      />
    </div>
  );
};

// Sub-componente interno para manter o código DRY (Don't Repeat Yourself)
const StatCard = ({ label, value, icon, color, danger }) => (
  <div className={`${color} p-3 rounded-2xl shadow-md border-b-4 border-black/20 text-white transition-all`}>
    <div className="flex items-center gap-1 opacity-70 mb-1">
      {icon}
      <p className="text-[8px] font-black uppercase tracking-widest leading-none">
        {label}
      </p>
    </div>
    <p className="text-xl font-black leading-none tracking-tighter">
      {value}
    </p>
    {danger && (
      <p className="text-[7px] font-bold uppercase mt-1 opacity-90">Atenção!</p>
    )}
  </div>
);

export default QuickStats;
