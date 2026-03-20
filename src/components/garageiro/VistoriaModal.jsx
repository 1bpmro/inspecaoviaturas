import React from 'react';
import { 
  X, Car, Camera, CheckCircle2, AlertTriangle, 
  Droplets, Wrench, User 
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
  motoristaManual,        // ✅ ADD
  setMotoristaManual,     // ✅ ADD
  children // ✅ AGORA SUPORTA INJEÇÃO EXTERNA
}) => {
  if (!v) return null;

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
          
          {/* MOTORISTA */}
          <div className="bg-slate-50 p-4 rounded-3xl border border-slate-200 shadow-sm">
            <div className="flex items-center justify-between mb-3">
              
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-white border flex items-center justify-center text-slate-400">
                  <User size={20} />
                </div>
                <div>
                  <p className="text-[8px] font-black text-slate-400 uppercase">
                    Motorista Responsável
                  </p>
                  <p className="text-xs font-black text-slate-800 uppercase">
                    {v.motorista_nome || 'NÃO INFORMADO'}
                  </p>
                </div>
              </div>

              <button 
                onClick={() => setConf({...conf, motoristaCorreto: !conf.motoristaCorreto})} 
                className={`p-3 rounded-2xl transition-all ${
                  conf.motoristaCorreto 
                    ? 'text-emerald-500 bg-emerald-50' 
                    : 'text-red-500 bg-red-50'
                }`}
              >
                {conf.motoristaCorreto 
                  ? <CheckCircle2 size={32} /> 
                  : <AlertTriangle size={32} />
                }
              </button>
            </div>

            {/* 🔥 INPUT AUTOMÁTICO SE MOTORISTA INCORRETO */}
            {!conf.motoristaCorreto && (
              <input
                placeholder="DIGITAR MOTORISTA REAL"
                className="w-full p-3 bg-white border-2 border-red-200 rounded-xl font-bold text-xs uppercase outline-none focus:border-red-500"
                value={motoristaManual}
                onChange={(e) => setMotoristaManual(e.target.value)}
              />
            )}

            {/* FOTO */}
            {v.foto && (
              <button 
                onClick={() => window.open(v.foto, '_blank')}
                className="mt-3 w-full py-3 bg-white border-2 border-dashed border-amber-200 rounded-2xl flex items-center justify-center gap-2 text-[9px] font-black text-amber-600 hover:bg-amber-50"
              >
                <Camera size={14} /> VER HODÔMETRO
              </button>
            )}
          </div>

          {/* KM */}
          <div className="bg-white border rounded-2xl p-3 text-center shadow-sm">
            <p className="text-[9px] font-black text-slate-400 uppercase">Hodômetro</p>
            <p className="text-lg font-black text-slate-800">
              {Number(v.hodometro || 0).toLocaleString()} km
            </p>
          </div>

          {/* CHECKLIST */}
          <div className="grid grid-cols-2 gap-2">
            <CheckItem 
              label="Interno OK" 
              active={conf.limpezaInterna} 
              onClick={() => setConf({...conf, limpezaInterna: !conf.limpezaInterna})} 
            />
            <CheckItem 
              label="Externo OK" 
              active={conf.limpezaExterna} 
              onClick={() => setConf({...conf, limpezaExterna: !conf.limpezaExterna})} 
            />
            <CheckItem 
              label="Sem Objetos" 
              active={conf.semPertences} 
              onClick={() => setConf({...conf, semPertences: !conf.semPertences})} 
            />
            <CheckItem 
              label="Sem Avarias" 
              active={!conf.avariaDetectada} 
              onClick={() => setConf({...conf, avariaDetectada: !conf.avariaDetectada})} 
              danger 
            />
          </div>

          {/* ÓLEO */}
          <button 
            onClick={() => setConf({...conf, confirmarTrocaOleo: !conf.confirmarTrocaOleo})} 
            className={`w-full p-4 rounded-2xl border-2 font-black text-[10px] flex justify-center gap-3 ${
              conf.confirmarTrocaOleo 
                ? 'bg-blue-600 text-white' 
                : 'bg-blue-50 text-blue-400'
            }`}
          >
            <Droplets size={18} />
            {conf.confirmarTrocaOleo ? 'ÓLEO OK' : 'VALIDAR ÓLEO'}
          </button>

          {/* OBS */}
          <textarea 
            placeholder="OBSERVAÇÕES..." 
            className="w-full p-4 bg-slate-50 border rounded-2xl text-[10px] font-bold uppercase"
            value={conf.obs} 
            onChange={(e) => setConf({...conf, obs: e.target.value})} 
          />

          {/* 👇 SUPORTE A CHILDREN (CASO QUEIRA USAR EXTERNO) */}
          {children}

          {/* AÇÕES */}
          {!showBaixa ? (
            <div className="grid grid-cols-2 gap-3">
              <button 
                disabled={
                  isSubmitting || 
                  (!conf.motoristaCorreto && !motoristaManual?.trim())
  }
                onClick={() => onConfirm("LIBERADA")} 
                className="bg-emerald-600 text-white py-5 rounded-3xl font-black text-[10px]"
              >
                LIBERAR
              </button>

              <button 
                disabled={isSubmitting}
                onClick={() => setShowBaixa(true)} 
                className="bg-slate-900 text-white py-5 rounded-3xl font-black text-[10px]"
              >
                BAIXAR
              </button>
            </div>
          ) : (
            <div className="space-y-2">
              {['MECÂNICA','ELÉTRICA','PNEU','FUNILARIA'].map(m => (
                <button 
                  key={m}
                  onClick={() => onConfirm("MANUTENCAO", m)}
                  className="w-full bg-red-100 p-3 rounded-xl text-xs font-black"
                >
                  {m}
                </button>
              ))}
            </div>
          )}

        </div>
      </div>
    </div>
  );
};

export default VistoriaModal;
