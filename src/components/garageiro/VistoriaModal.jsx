import React from 'react';
import { 
  X, Car, Camera, CheckCircle2, AlertTriangle, 
  Droplets, User 
} from 'lucide-react';
import { CheckItem } from './GarageiroComponents';

const VistoriaModal = ({ 
  v, 
  conf, 
  setConf, 
  isSubmitting, 
  showBaixa, 
  setShowBaixa, 
  onClose, 
  onConfirm,
  motoristaManual,        
  setMotoristaManual,     
  children 
}) => {
  if (!v) return null;

  // Regra de validação para o botão Liberar
  const podeLiberar = !isSubmitting && (conf.motoristaCorreto || (motoristaManual && motoristaManual.trim() !== ""));

  return (
    <div className="fixed inset-0 bg-slate-900/95 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-hidden">
      <div className="bg-white w-full max-w-lg rounded-[2.5rem] shadow-2xl overflow-hidden flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-200">
        
        {/* HEADER */}
        <div className="bg-slate-900 p-6 text-white flex justify-between items-center border-b-4 border-amber-500">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-amber-500 rounded-lg text-slate-900 shadow-lg">
              <Car size={20}/>
            </div>
            <div>
              <h2 className="text-2xl font-black uppercase tracking-tighter leading-none">
                {v.prefixo_vtr}
              </h2>
              <p className="text-[8px] font-bold text-amber-500 uppercase tracking-widest mt-1">
                Conferência de Pátio
              </p>
            </div>
          </div>
          <button 
            onClick={onClose} 
            className="p-2 bg-white/10 rounded-full hover:bg-red-500 transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* BODY */}
        <div className="p-6 space-y-4 overflow-y-auto">
          
          {/* SEÇÃO MOTORISTA INTELIGENTE */}
          <div className={`p-4 rounded-3xl border transition-all duration-300 ${
            conf.motoristaCorreto ? 'bg-slate-50 border-slate-200' : 'bg-amber-50 border-amber-200'
          }`}>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-2xl border flex items-center justify-center ${
                  conf.motoristaCorreto ? 'bg-white text-slate-400' : 'bg-white text-amber-500'
                }`}>
                  <User size={20} />
                </div>
                <div>
                  <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest">
                    Motorista Escalado
                  </p>
                  <p className={`text-xs font-black uppercase ${conf.motoristaCorreto ? 'text-slate-800' : 'text-slate-400 line-through'}`}>
                    {v.motorista_nome || 'NÃO INFORMADO'}
                  </p>
                </div>
              </div>

              <button 
                onClick={() => {
                   setConf({...conf, motoristaCorreto: !conf.motoristaCorreto});
                   if(conf.motoristaCorreto) setMotoristaManual(""); // Limpa se estiver desmarcando
                }} 
                className={`p-3 rounded-2xl transition-all active:scale-90 ${
                  conf.motoristaCorreto 
                    ? 'text-emerald-500 bg-emerald-100/50 shadow-sm' 
                    : 'text-white bg-amber-500 shadow-lg shadow-amber-500/30'
                }`}
              >
                {conf.motoristaCorreto 
                  ? <CheckCircle2 size={28} /> 
                  : <AlertTriangle size={28} />
                }
              </button>
            </div>

            {/* Injeção do Campo de Busca + Dropdown via Children */}
            {!conf.motoristaCorreto && (
              <div className="mt-2 animate-in slide-in-from-top-2">
                {children}
                {motoristaManual && (
                  <div className="mt-2 p-2 bg-emerald-500 rounded-xl flex items-center justify-center gap-2">
                    <CheckCircle2 size={12} className="text-white" />
                    <span className="text-[9px] font-black text-white uppercase italic">Militar Selecionado</span>
                  </div>
                )}
              </div>
            )}

            {/* FOTO DO HODÔMETRO */}
            {v.foto && (
              <button 
                onClick={() => window.open(v.foto, '_blank')}
                className="mt-3 w-full py-3 bg-white border-2 border-dashed border-slate-200 rounded-2xl flex items-center justify-center gap-2 text-[9px] font-black text-slate-500 hover:bg-slate-50 transition-colors"
              >
                <Camera size={14} /> CONFERIR FOTO DO HODÔMETRO
              </button>
            )}
          </div>

          {/* KM */}
          <div className="bg-white border rounded-2xl p-3 text-center shadow-sm">
            <p className="text-[9px] font-black text-slate-400 uppercase">Km no Registro</p>
            <p className="text-lg font-black text-slate-800">
              {Number(v.hodometro || 0).toLocaleString()} km
            </p>
          </div>

          {/* CHECKLIST */}
          <div className="grid grid-cols-2 gap-2">
            <CheckItem label="Interno OK" active={conf.limpezaInterna} onClick={() => setConf({...conf, limpezaInterna: !conf.limpezaInterna})} />
            <CheckItem label="Externo OK" active={conf.limpezaExterna} onClick={() => setConf({...conf, limpezaExterna: !conf.limpezaExterna})} />
            <CheckItem label="Sem Objetos" active={conf.semPertences} onClick={() => setConf({...conf, semPertences: !conf.semPertences})} />
            <CheckItem label="Sem Avarias" active={!conf.avariaDetectada} onClick={() => setConf({...conf, avariaDetectada: !conf.avariaDetectada})} danger />
          </div>

          {/* ÓLEO */}
          <button 
            onClick={() => setConf({...conf, confirmarTrocaOleo: !conf.confirmarTrocaOleo})} 
            className={`w-full p-4 rounded-2xl border-2 font-black text-[10px] flex justify-center gap-3 transition-all ${
              conf.confirmarTrocaOleo 
                ? 'bg-blue-600 border-blue-600 text-white shadow-lg shadow-blue-500/20' 
                : 'bg-blue-50 border-blue-100 text-blue-400'
            }`}
          >
            <Droplets size={18} />
            {conf.confirmarTrocaOleo ? 'NÍVEL DE ÓLEO VALIDADO' : 'CONFIRMAR NÍVEL DE ÓLEO'}
          </button>

          {/* OBS */}
          <textarea 
            placeholder="OBSERVAÇÕES DO PÁTIO..." 
            className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl text-[10px] font-bold uppercase focus:bg-white focus:border-amber-500 outline-none h-20 resize-none"
            value={conf.obs} 
            onChange={(e) => setConf({...conf, obs: e.target.value})} 
          />

          {/* AÇÕES FINAIS */}
          {!showBaixa ? (
            <div className="grid grid-cols-2 gap-3 pb-2">
              <button 
                disabled={!podeLiberar}
                onClick={() => onConfirm("LIBERADA")} 
                className={`py-5 rounded-3xl font-black text-[11px] tracking-widest transition-all ${
                  podeLiberar 
                    ? 'bg-emerald-600 text-white shadow-xl shadow-emerald-600/20 active:scale-95' 
                    : 'bg-slate-200 text-slate-400 cursor-not-allowed'
                }`}
              >
                {isSubmitting ? 'ENVIANDO...' : 'LIBERAR PÁTIO'}
              </button>

              <button 
                disabled={isSubmitting}
                onClick={() => setShowBaixa(true)} 
                className="bg-slate-900 text-white py-5 rounded-3xl font-black text-[11px] tracking-widest active:scale-95 shadow-xl shadow-slate-900/20"
              >
                RETER VTR
              </button>
            </div>
          ) : (
            <div className="bg-red-50 p-4 rounded-3xl border-2 border-red-100 animate-in slide-in-from-bottom-4">
              <p className="text-[10px] font-black text-red-600 text-center mb-3 uppercase">Motivo da Retenção / Baixa</p>
              <div className="grid grid-cols-2 gap-2">
                {['MECÂNICA','ELÉTRICA','PNEU','FUNILARIA'].map(m => (
                  <button 
                    key={m}
                    onClick={() => onConfirm("MANUTENCAO", m)}
                    className="bg-white border-2 border-red-200 p-3 rounded-xl text-[10px] font-black text-red-600 hover:bg-red-600 hover:text-white transition-all uppercase"
                  >
                    {m}
                  </button>
                ))}
                <button onClick={() => setShowBaixa(false)} className="col-span-2 text-[9px] font-black text-slate-400 py-2 uppercase underline">Cancelar</button>
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
};

export default VistoriaModal;
