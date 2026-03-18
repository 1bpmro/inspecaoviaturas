import React from 'react';
import { 
  X, Car, Camera, CheckCircle2, AlertTriangle, 
  Droplets, Wrench, ChevronRight, User 
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
  onConfirm 
}) => {
  if (!v) return null;

  return (
    <div className="fixed inset-0 bg-slate-900/95 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-hidden">
      <div className="bg-white w-full max-w-lg rounded-[2.5rem] shadow-2xl overflow-hidden flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-200">
        
        {/* HEADER: Identificação da Viatura */}
        <div className="bg-slate-900 p-6 text-white flex justify-between items-center border-b-4 border-amber-500">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-amber-500 rounded-lg text-slate-900 shadow-lg">
              <Car size={20}/>
            </div>
            <div>
              <h2 className="text-2xl font-black uppercase tracking-tighter leading-none">{v.prefixo_vtr}</h2>
              <p className="text-[8px] font-bold text-amber-500 uppercase tracking-widest mt-1">Conferência de Pátio</p>
            </div>
          </div>
          <button 
            onClick={onClose} 
            className="p-2 bg-white/10 rounded-full hover:bg-red-500 transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* BODY: Scrollable */}
        <div className="p-6 space-y-4 overflow-y-auto">
          
          {/* SEÇÃO 1: Motorista e Foto */}
          <div className="bg-slate-50 p-4 rounded-3xl border border-slate-200 shadow-sm">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-white border border-slate-200 flex items-center justify-center text-slate-400">
                  <User size={20} />
                </div>
                <div>
                  <p className="text-[8px] font-black text-slate-400 uppercase tracking-tighter">Motorista Responsável</p>
                  <p className="text-xs font-black text-slate-800 uppercase leading-none">{v.motorista_nome || 'NÃO IDENTIFICADO'}</p>
                </div>
              </div>
              
              <button 
                onClick={() => setConf({...conf, motoristaCorreto: !conf.motoristaCorreto})} 
                className={`p-3 rounded-2xl transition-all active:scale-90 ${conf.motoristaCorreto ? 'text-emerald-500 bg-emerald-50' : 'text-red-500 bg-red-50'}`}
              >
                {conf.motoristaCorreto ? <CheckCircle2 size={32} /> : <AlertTriangle size={32} />}
              </button>
            </div>

            {v.foto && (
              <button 
                onClick={() => window.open(v.foto, '_blank')}
                className="w-full py-3 bg-white border-2 border-dashed border-amber-200 rounded-2xl flex items-center justify-center gap-2 text-[9px] font-black text-amber-600 hover:bg-amber-50 transition-all active:scale-95"
              >
                <Camera size={14} /> VER COMPROVANTE (HODÔMETRO)
              </button>
            )}
          </div>

          {/* SEÇÃO 2: Grid de Checklist */}
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
              label="Objetos/Lixo" 
              active={conf.semPertences} 
              onClick={() => setConf({...conf, semPertences: !conf.semPertences})} 
            />
            <CheckItem 
              label="Sem Avarias" 
              active={!conf.avariaDetectada} 
              onClick={() => setConf({...conf, avariaDetectada: !conf.avariaDetectada})} 
              danger 
              icon={<AlertTriangle size={14}/>} 
            />
          </div>

          {/* SEÇÃO 3: Lógica de Óleo (Destaque Azul) */}
          <button 
            onClick={() => setConf({...conf, confirmarTrocaOleo: !conf.confirmarTrocaOleo})} 
            className={`w-full p-4 rounded-2xl border-2 font-black text-[10px] flex items-center justify-center gap-3 transition-all ${
              conf.confirmarTrocaOleo 
              ? 'bg-blue-600 border-blue-700 text-white shadow-lg' 
              : 'bg-blue-50 border-blue-100 text-blue-400'
            }`}
          >
            <Droplets size={18} className={conf.confirmarTrocaOleo ? "animate-bounce" : ""} />
            {conf.confirmarTrocaOleo ? 'TROCA DE ÓLEO VALIDADA' : 'VALIDAR TROCA DE ÓLEO'}
          </button>

          <textarea 
            placeholder="OBSERVAÇÕES DE RECEBIMENTO..." 
            className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl text-[10px] font-bold uppercase min-h-[80px] outline-none focus:border-amber-500 transition-all" 
            value={conf.obs} 
            onChange={(e) => setConf({...conf, obs: e.target.value})} 
          />

          {/* FOOTER: Ações Finais */}
          {!showBaixa ? (
            <div className="grid grid-cols-2 gap-3 pt-2">
              <button 
                disabled={isSubmitting}
                onClick={() => onConfirm("LIBERADA")} 
                className={`bg-emerald-600 text-white py-5 rounded-3xl font-black uppercase text-[10px] shadow-lg flex flex-col items-center gap-1 active:scale-95 transition-all ${isSubmitting ? 'opacity-50 grayscale' : ''}`}
              >
                <CheckCircle2 size={20} /> 
                {isSubmitting ? 'SALVANDO...' : 'Liberar Vtr'}
              </button>

              <button 
                disabled={isSubmitting}
                onClick={() => setShowBaixa(true)} 
                className={`bg-slate-900 text-white py-5 rounded-3xl font-black uppercase text-[10px] shadow-lg flex flex-col items-center gap-1 active:scale-95 transition-all ${isSubmitting ? 'opacity-50 grayscale' : ''}`}
              >
                <Wrench size={20} /> 
                Baixar Oficina
              </button>
            </div>
          ) : (
            <div className="bg-red-50 p-4 rounded-[2rem] border-2 border-red-200 space-y-3 animate-in fade-in slide-in-from-bottom-2">
              <p className="text-[9px] font-black text-red-600 uppercase text-center tracking-widest">Selecione o Motivo da Baixa</p>
              <div className="grid grid-cols-2 gap-2">
                {['MECÂNICA', 'ELÉTRICA', 'PNEU', 'FUNILARIA', 'REVISÃO', 'LIMPEZA'].map(motivo => (
                  <button 
                    key={motivo} 
                    onClick={() => onConfirm("MANUTENCAO", motivo)} 
                    className="bg-white border border-red-100 p-3 rounded-xl text-[9px] font-black text-red-600 hover:bg-red-600 hover:text-white transition-all active:scale-95 shadow-sm"
                  >
                    {motivo}
                  </button>
                ))}
              </div>
              <button 
                onClick={() => setShowBaixa(false)} 
                className="w-full text-[9px] font-black text-slate-400 uppercase pt-2 hover:text-slate-600"
              >
                Voltar
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default VistoriaModal;
