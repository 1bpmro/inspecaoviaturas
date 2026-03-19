// src/components/garageiro/GarageiroComponents.jsx
import React from 'react';

export const CheckItem = ({ label, active, onClick, danger = false, icon }) => (
  <button 
    onClick={onClick} 
    className={`p-4 rounded-2xl border-2 font-black text-[8px] uppercase transition-all flex flex-col items-center gap-2 ${
      active 
        ? 'bg-emerald-50 border-emerald-500 text-emerald-700' 
        : danger 
          ? 'bg-red-600 border-red-700 text-white shadow-lg' 
          : 'bg-slate-50 border-slate-200 text-slate-400'
    }`}
  >
    {icon}
    {label}
    <span className="text-[10px]">{active ? 'OK' : danger ? 'ALERTA' : 'PENDENTE'}</span>
  </button>
);
