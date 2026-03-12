import React from 'react';
import { Droplets, CheckCircle2, ExternalLink, Clock, AlertCircle } from 'lucide-react';

const ManutencaoInbox = ({ pendencias = [], onAction }) => {
  return (
    <div className="bg-white rounded-[2.5rem] border border-slate-200 shadow-sm overflow-hidden h-full flex flex-col">
      {/* HEADER TÁTICO */}
      <div className="p-6 border-b border-slate-100 bg-slate-50/50 flex justify-between items-center">
        <div>
          <div className="flex items-center gap-2">
            <span className="relative flex h-2 w-2">
              {pendencias.length > 0 && (
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
              )}
              <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-600"></span>
            </span>
            <h3 className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Controle de Insumos</h3>
          </div>
          <p className="text-xs font-bold text-slate-800">Validação de Troca de Óleo</p>
        </div>
        <div className="p-2 bg-blue-100 text-blue-600 rounded-xl">
          <Droplets size={20} />
        </div>
      </div>

      {/* LISTA DE PENDÊNCIAS */}
      <div className="p-4 space-y-3 flex-1 overflow-y-auto max-h-[450px] scrollbar-hide">
        {pendencias.length > 0 ? (
          pendencias.map((item, i) => {
            // Tratamento seguro para as fotos
            const fotoUrl = item.Links_Fotos?.includes(' | ') 
              ? item.Links_Fotos.split(' | ')[0] 
              : item.Links_Fotos || item.fotos?.[0];

            return (
              <div 
                key={item.id || i} 
                className="p-4 bg-white rounded-2xl border border-slate-100 flex justify-between items-center group hover:shadow-md hover:border-blue-200 transition-all duration-300"
              >
                <div className="flex items-center gap-4">
                  {/* Avatar da VTR com lógica de cor baseada no KM (exemplo visual) */}
                  <div className="w-12 h-12 bg-slate-900 text-white rounded-2xl flex flex-col items-center justify-center shadow-lg border-b-4 border-blue-600">
                    <span className="text-[8px] font-black opacity-50 leading-none">VTR</span>
                    <span className="text-xs font-black italic">{item.prefixo_vtr?.split('-')[1] || '??'}</span>
                  </div>

                  <div>
                    <p className="text-sm font-black text-slate-800 leading-none mb-1">{item.prefixo_vtr}</p>
                    <div className="flex items-center gap-2">
                      <span className="text-[9px] font-bold bg-slate-100 px-2 py-0.5 rounded text-slate-500 uppercase">
                        RE {item.motorista_re || item.motorista_matricula}
                      </span>
                      <span className="flex items-center gap-1 text-[9px] font-black text-blue-600 uppercase">
                        <AlertCircle size={10} /> {item.hodometro} KM
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex gap-2">
                  {/* Botão Ver Comprovante */}
                  {fotoUrl && (
                    <a 
                      href={fotoUrl} 
                      target="_blank" 
                      rel="noreferrer"
                      className="p-3 bg-slate-50 text-slate-400 hover:text-blue-600 rounded-xl border border-slate-200 transition-all hover:bg-blue-50"
                      title="Ver Comprovante"
                    >
                      <ExternalLink size={18} />
                    </a>
                  )}

                  {/* Botão Aprovar e Baixar no Sistema */}
                  <button 
                    onClick={() => onAction('registrarManutencao', { 
                      id_origem: item.id,
                      prefixo: item.prefixo_vtr, 
                      tipo: 'TROCA_OLEO', 
                      km: Number(item.hodometro),
                      data: item.data_hora
                    })}
                    className="p-3 bg-emerald-500 text-white rounded-xl hover:bg-emerald-600 shadow-lg shadow-emerald-100 transition-all active:scale-95"
                    title="Validar Troca"
                  >
                    <CheckCircle2 size={18} />
                  </button>
                </div>
              </div>
            );
          })
        ) : (
          <div className="py-14 text-center border-2 border-dashed border-slate-50 rounded-[2.5rem]">
            <Clock className="mx-auto text-slate-200 mb-2" size={40} />
            <p className="text-[10px] font-black text-slate-300 uppercase tracking-widest italic">Pátio em dia</p>
            <p className="text-[9px] font-bold text-slate-200 uppercase">Aguardando novas trocas</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default ManutencaoInbox;
