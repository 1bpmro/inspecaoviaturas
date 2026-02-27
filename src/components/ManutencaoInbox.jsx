import React from 'react';
import { Droplets, CheckCircle2, ExternalLink, Clock } from 'lucide-react';

const ManutencaoInbox = ({ pendencias, onAction }) => {
  return (
    <div className="bg-white rounded-[2.5rem] border border-slate-200 shadow-sm overflow-hidden h-full">
      <div className="p-6 border-b border-slate-100 bg-slate-50/50 flex justify-between items-center">
        <div>
          <h3 className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Validação de Manutenção</h3>
          <p className="text-xs font-bold text-slate-800">Comprovantes de Óleo Pendentes</p>
        </div>
        <Droplets className="text-blue-500" size={20} />
      </div>

      <div className="p-4 space-y-3 max-h-[400px] overflow-y-auto">
        {pendencias.length > 0 ? pendencias.map((item, i) => (
          <div key={i} className="p-4 bg-slate-50 rounded-2xl border border-slate-100 flex justify-between items-center group hover:border-blue-200 transition-all">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-blue-600 text-white rounded-xl flex items-center justify-center font-black">
                {item.prefixo_vtr?.slice(-2)}
              </div>
              <div>
                <p className="text-sm font-black text-slate-800">{item.prefixo_vtr}</p>
                <p className="text-[9px] font-bold text-slate-400 uppercase">RE: {item.motorista_matricula} • KM: {item.hodometro}</p>
              </div>
            </div>

            <div className="flex gap-2">
              {/* Se houver link de foto no seu campo Links_Fotos do GAS */}
              <a 
                href={item.Links_Fotos?.split(' | ')[0]} 
                target="_blank" 
                rel="noreferrer"
                className="p-2 bg-white text-slate-400 hover:text-blue-600 rounded-lg border border-slate-200 transition-all"
              >
                <ExternalLink size={16} />
              </a>
              <button 
                onClick={() => onAction('registrarManutencao', { 
                  prefixo: item.prefixo_vtr, 
                  tipo: 'TROCA_OLEO', 
                  km: item.hodometro,
                  descricao: 'Troca validada via painel ADM',
                  responsavel_re: 'ADMIN' 
                })}
                className="p-2 bg-emerald-500 text-white rounded-lg hover:bg-emerald-600 shadow-lg shadow-emerald-100 transition-all"
              >
                <CheckCircle2 size={16} />
              </button>
            </div>
          </div>
        )) : (
          <div className="py-10 text-center space-y-2">
            <Clock className="mx-auto text-slate-200" size={32} />
            <p className="text-[10px] font-bold text-slate-400 uppercase italic">Nenhuma validação pendente</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default ManutencaoInbox;
