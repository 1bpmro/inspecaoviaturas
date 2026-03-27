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

  // 🛡️ REGRA DE OURO: Só libera se o motorista estiver OK ou se um novo foi selecionado
  const podeLiberar = !isSubmitting && (conf.motoristaCorreto || (motoristaManual && motoristaManual.trim() !== ""));

  return (
    <div className="fixed inset-0 bg-slate-900/95 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-hidden animate-in fade-in duration-300">
      <div className="bg-white w-full max-w-lg rounded-[2.5rem] shadow-2xl overflow-hidden flex flex-col max-h-[95vh] animate-in zoom-in-95 duration-200">
        
        {/* HEADER - IDENTIDADE DA VIATURA */}
        <div className="bg-slate-900 p-6 text-white flex justify-between items-center border-b-4 border-amber-500 shadow-lg">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-amber-50 rounded-xl text-slate-900 shadow-inner">
              <Car size={24} className="fill-amber-500 text-amber-500" />
            </div>
            <div>
              <h2 className="text-2xl font-black uppercase tracking-tighter leading-none">
                {v.prefixo_vtr}
              </h2>
              <p className="text-[9px] font-bold text-amber-500 uppercase tracking-widest mt-1">
                Conferência de Pátio • {v.id}
              </p>
            </div>
          </div>
          <button 
            onClick={onClose} 
            className="p-3 bg-white/10 rounded-2xl hover:bg-red-500 transition-all active:scale-90"
          >
            <X size={20} />
          </button>
        </div>

        {/* BODY - SCROLLABLE */}
        <div className="p-6 space-y-5 overflow-y-auto custom-scrollbar">
          
          {/* SEÇÃO MOTORISTA - O CORAÇÃO DA VALIDAÇÃO */}
          <div className={`p-5 rounded-[2rem] border-2 transition-all duration-500 ${
            conf.motoristaCorreto ? 'bg-slate-50 border-slate-100' : 'bg-amber-50 border-amber-300 shadow-lg shadow-amber-500/10'
          }`}>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-4">
                <div className={`w-12 h-12 rounded-2xl border flex items-center justify-center transition-colors ${
                  conf.motoristaCorreto ? 'bg-white text-slate-300 border-slate-100' : 'bg-white text-amber-500 border-amber-200 shadow-inner'
                }`}>
                  <User size={24} />
                </div>
                <div>
                  <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">
                    Motorista Escalado
                  </p>
                  <p className={`text-sm font-black uppercase tracking-tight ${conf.motoristaCorreto ? 'text-slate-800' : 'text-slate-400 line-through'}`}>
                    {v.motorista_nome || 'NÃO INFORMADO'}
                  </p>
                </div>
              </div>

              <button 
                onClick={() => {
                   setConf({...conf, motoristaCorreto: !conf.motoristaCorreto});
                   if(conf.motoristaCorreto) setMotoristaManual(""); 
                }} 
                className={`p-4 rounded-2xl transition-all active:scale-90 flex flex-col items-center gap-1 ${
                  conf.motoristaCorreto 
                    ? 'text-emerald-500 bg-emerald-100/50' 
                    : 'text-white bg-amber-600 shadow-lg shadow-amber-600/30'
                }`}
              >
                {conf.motoristaCorreto ? <CheckCircle2 size={32} /> : <AlertTriangle size={32} />}
                <span className="text-[7px] font-black uppercase tracking-tighter">
                  {conf.motoristaCorreto ? 'CORRETO' : 'DIVERGENTE'}
                </span>
              </button>
            </div>

            {/* Injeção da Busca do Efetivo filtrado via Children */}
            {!conf.motoristaCorreto && (
              <div className="mt-2 animate-in slide-in-from-top-4 duration-300">
                {children}
                
                {/* Badge de Confirmação quando seleciona no select */}
                {motoristaManual && (
                  <div className="mt-3 p-3 bg-emerald-500 rounded-2xl flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/20">
                    <CheckCircle2 size={14} className="text-white" />
                    <span className="text-[10px] font-black text-white uppercase tracking-widest italic">
                      Identificado: {motoristaManual}
                    </span>
                  </div>
                )}
              </div>
            )}

            {v.foto && (
              <button 
                onClick={() => window.open(v.foto, '_blank')}
                className="mt-4 w-full py-4 bg-white border-2 border-dashed border-slate-200 rounded-2xl flex items-center justify-center gap-2 text-[10px] font-black text-slate-500 hover:border-amber-500 hover:text-amber-600 transition-all group"
              >
                <Camera size={16} className="group-hover:scale-110 transition-transform" /> 
                CONFERIR HODÔMETRO (FOTO)
              </button>
            )}
          </div>

          {/* DADOS TÉCNICOS: KM E ÓLEO */}
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 text-center">
              <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Hodômetro Informado</p>
              <p className="text-xl font-black text-slate-800 tabular-nums">
                {Number(v.hodometro || 0).toLocaleString()} <span className="text-[10px]">KM</span>
              </p>
            </div>

            <button 
              onClick={() => setConf({...conf, confirmarTrocaOleo: !conf.confirmarTrocaOleo})} 
              className={`rounded-2xl border-2 font-black text-[10px] flex flex-col items-center justify-center gap-1 transition-all p-3 ${
                conf.confirmarTrocaOleo 
                  ? 'bg-blue-600 border-blue-600 text-white shadow-lg shadow-blue-500/20' 
                  : 'bg-blue-50 border-blue-100 text-blue-400'
              }`}
            >
              <Droplets size={22} />
              {conf.confirmarTrocaOleo ? 'NÍVEL OK' : 'CONFERIR ÓLEO'}
            </button>
          </div>

          {/* CHECKLIST DE ESTADO FÍSICO */}
          <div className="grid grid-cols-2 gap-3">
            <CheckItem label="Limpeza Interna" active={conf.limpezaInterna} onClick={() => setConf({...conf, limpezaInterna: !conf.limpezaInterna})} />
            <CheckItem label="Limpeza Externa" active={conf.limpezaExterna} onClick={() => setConf({...conf, limpezaExterna: !conf.limpezaExterna})} />
            <CheckItem label="Sem Pertences" active={conf.semPertences} onClick={() => setConf({...conf, semPertences: !conf.semPertences})} />
            <CheckItem label="Estrutura OK" active={!conf.avariaDetectada} onClick={() => setConf({...conf, avariaDetectada: !conf.avariaDetectada})} danger />
          </div>

          {/* OBSERVAÇÕES */}
          <div className="relative">
            <textarea 
              placeholder="ESCREVA AQUI OBSERVAÇÕES OU AVARIAS..." 
              className="w-full p-5 bg-slate-50 border-2 border-slate-100 rounded-[2rem] text-[11px] font-bold uppercase focus:bg-white focus:border-amber-500 outline-none h-24 resize-none transition-all placeholder:text-slate-300"
              value={conf.obs} 
              onChange={(e) => setConf({...conf, obs: e.target.value})} 
            />
          </div>

          {/* AÇÕES DE RODAPÉ */}
          <div className="pt-2">
            {!showBaixa ? (
              <div className="grid grid-cols-2 gap-4 pb-4">
                <button 
                  disabled={!podeLiberar}
                  onClick={() => onConfirm("LIBERADA")} 
                  className={`py-6 rounded-[2rem] font-black text-[12px] tracking-widest transition-all uppercase shadow-xl ${
                    podeLiberar 
                      ? 'bg-emerald-600 text-white shadow-emerald-600/30 active:scale-95' 
                      : 'bg-slate-100 text-slate-300 cursor-not-allowed opacity-50'
                  }`}
                >
                  {isSubmitting ? 'PROCESSANDO...' : 'LIBERAR PÁTIO'}
                </button>

                <button 
                  disabled={isSubmitting}
                  onClick={() => setShowBaixa(true)} 
                  className="bg-slate-900 text-white py-6 rounded-[2rem] font-black text-[12px] tracking-widest active:scale-95 shadow-xl shadow-slate-900/30 uppercase"
                >
                  RETER / BAIXA
                </button>
              </div>
            ) : (
              <div className="bg-red-50 p-6 rounded-[2.5rem] border-2 border-red-100 animate-in slide-in-from-bottom-8 duration-300">
                <p className="text-[11px] font-black text-red-600 text-center mb-4 uppercase tracking-widest">Motivo da Retenção Técnica</p>
                <div className="grid grid-cols-2 gap-3">
                  {['MECÂNICA','ELÉTRICA','PNEU','FUNILARIA'].map(m => (
                    <button 
                      key={m}
                      onClick={() => onConfirm("MANUTENCAO", m)}
                      className="bg-white border-2 border-red-200 p-4 rounded-2xl text-[10px] font-black text-red-600 hover:bg-red-600 hover:text-white transition-all uppercase active:scale-90"
                    >
                      {m}
                    </button>
                  ))}
                  <button onClick={() => setShowBaixa(false)} className="col-span-2 text-[10px] font-black text-slate-400 py-3 uppercase underline underline-offset-4 decoration-2">
                    Voltar e Liberar
                  </button>
                </div>
              </div>
            )}
          </div>

        </div>
      </div>
    </div>
  );
};

export default VistoriaModal;
