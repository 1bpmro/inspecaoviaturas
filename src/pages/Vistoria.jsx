import React, { useState, useEffect } from 'react';
import { useAuth } from '../lib/AuthContext';
import { gasApi } from '../api/gasClient';
import { 
  ArrowLeft, CheckCircle2, ShieldCheck, 
  ChevronRight, Save, Loader2, X, AlertTriangle 
} from 'lucide-react';

const ITENS_ENTRADA = [
  "Documento da Viatura", "Estepe", "Chave de Roda", "Macaco", "Triângulo", "Extintor",
  "Nível de Água", "Porta Traseira", "Porta Dianteira", "Pneus", "Capô", "Cinto",
  "Paralama Dianteiro", "Paralama Traseiro", "Parachoque Dianteiro", "Parachoque Traseiro",
  "Lanternas", "Caçamba", "Vidros e Portas", "Retrovisor Externo", "Retrovisor Interno",
  "Maçanetas", "Para-brisas", "Sirene", "Giroscópio", "Rádio", "Painel de Instrumentos",
  "Bancos", "Forro Interno", "Tapetes", "Protetor Dianteiro", "Regulador dos Bancos"
];

const ITENS_SAIDA = [
  "Viatura Entregue Limpa", "Viatura em Condições de Uso", "Avarias Constatadas",
  "Limpeza Interna", "Limpeza Externa", "Pertences da Guarnição Retirados"
];

const Vistoria = ({ onBack }) => {
  const { user } = useAuth();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [viaturas, setViaturas] = useState([]);
  const [tipoVistoria, setTipoVistoria] = useState('ENTRADA');

  const [formData, setFormData] = useState({
    prefixo_vtr: '',
    hodometro: '',
    motorista_re: '', motorista_nome: '',
    comandante_re: '', comandante_nome: '',
    patrulheiro_re: '', patrulheiro_nome: '',
    observacoes: '',
    termo_aceite: false
  });

  const [checklist, setChecklist] = useState({});
  const itensAtuais = tipoVistoria === 'ENTRADA' ? ITENS_ENTRADA : ITENS_SAIDA;

  useEffect(() => {
    carregarViaturas();
    const novoChecklist = itensAtuais.reduce((acc, item) => ({ ...acc, [item]: 'OK' }), {});
    setChecklist(novoChecklist);
  }, [tipoVistoria]);

  const carregarViaturas = async () => {
    setLoading(true);
    try {
      const res = await gasApi.getViaturas(tipoVistoria === 'SAÍDA');
      if (res.status === 'success') setViaturas(res.data);
    } catch (e) { console.error(e); }
    setLoading(false);
  };

  const buscarMilitar = async (re, campo) => {
    if (re.length < 4) return;
    try {
      const res = await gasApi.buscarMilitar(re);
      if (res.status === 'success') {
        setFormData(prev => ({ 
          ...prev, 
          [`${campo}_nome`]: `${res.patente} ${res.nome}`,
          [`${campo}_re`]: re 
        }));
      }
    } catch (error) { console.error("Erro ao buscar militar:", error); }
  };

  const toggleChecklist = (item) => {
    setChecklist(prev => ({ ...prev, [item]: prev[item] === 'OK' ? 'FALHA' : 'OK' }));
  };

  const itensComFalha = Object.values(checklist).filter(v => v === 'FALHA').length;

  const handleFinalizar = async () => {
    setLoading(true);
    const payload = {
      ...formData,
      tipo_vistoria: tipoVistoria,
      checklist: JSON.stringify(checklist),
      houve_alteracoes: itensComFalha > 0 || formData.observacoes.length > 0,
      data_hora_sistema: new Date().toLocaleString('pt-BR')
    };
    
    const res = await gasApi.saveVistoria(payload);
    if (res.status === 'success') {
      alert("Registro finalizado com sucesso!");
      onBack();
    } else {
      alert("Erro ao salvar: " + res.message);
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-[var(--bg-app)] pb-20 transition-colors duration-500">
      {/* HEADER TÁTICO */}
      <header className="bg-slate-900 text-white p-5 shadow-2xl sticky top-0 z-50 border-b-4 border-blue-900">
        <div className="max-w-xl mx-auto flex items-center justify-between">
          <button onClick={onBack} className="p-2 hover:bg-slate-800 rounded-full transition-all active:scale-90">
            <ArrowLeft size={24} />
          </button>
          <div className="text-center">
            <h1 className="font-black text-[10px] tracking-[0.3em] uppercase opacity-50">1º BPM - RONDÔNIA</h1>
            <p className="text-xs font-black text-blue-400 uppercase tracking-widest">{tipoVistoria} DE SERVIÇO</p>
          </div>
          <div className="w-10" />
        </div>
      </header>

      <main className="max-w-xl mx-auto p-4 space-y-6">
        
        {/* PASSO 1: IDENTIFICAÇÃO */}
        {step === 1 && (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-6 duration-500">
            {/* SELETOR DE TIPO */}
            <div className="vtr-card p-1.5 flex bg-slate-200 dark:bg-slate-800 border-none shadow-inner">
              <button 
                onClick={() => setTipoVistoria('ENTRADA')}
                className={`flex-1 py-3 rounded-2xl font-black text-[10px] transition-all duration-300 ${tipoVistoria === 'ENTRADA' ? 'bg-green-600 text-white shadow-lg' : 'text-slate-500'}`}
              >ENTRADA</button>
              <button 
                onClick={() => setTipoVistoria('SAÍDA')}
                className={`flex-1 py-3 rounded-2xl font-black text-[10px] transition-all duration-300 ${tipoVistoria === 'SAÍDA' ? 'bg-orange-500 text-white shadow-lg' : 'text-slate-500'}`}
              >SAÍDA</button>
            </div>

            <section className="vtr-card p-6 space-y-6">
              <div className="flex items-center gap-2 border-b border-[var(--border-color)] pb-4">
                <ShieldCheck className="text-blue-600 dark:text-blue-400" size={20}/>
                <h3 className="text-xs font-black text-[var(--text-main)] uppercase tracking-tighter">Identificação do Serviço</h3>
              </div>
              
              <div className="grid gap-5">
                <div className="group">
                  <label className="text-[10px] font-black text-[var(--text-muted)] uppercase ml-1 mb-1 block">Selecione a Viatura</label>
                  <select 
                    className="vtr-input"
                    value={formData.prefixo_vtr}
                    onChange={(e) => setFormData({...formData, prefixo_vtr: e.target.value})}
                  >
                    <option value="">Aguardando seleção...</option>
                    {viaturas.map(v => <option key={v.Placa} value={v.Prefixo}>{v.Prefixo} - {v.Placa}</option>)}
                  </select>
                </div>

                <div className="group">
                  <label className="text-[10px] font-black text-[var(--text-muted)] uppercase ml-1 mb-1 block">Hodômetro (KM)</label>
                  <input 
                    type="number" 
                    className="vtr-input"
                    placeholder="000000"
                    onChange={(e) => setFormData({...formData, hodometro: e.target.value})}
                  />
                </div>
              </div>

              {tipoVistoria === 'ENTRADA' && (
                <div className="pt-2 space-y-4">
                   <h3 className="text-[9px] font-black text-[var(--text-muted)] uppercase tracking-[0.2em] flex items-center gap-2">
                     <div className="h-[1px] flex-1 bg-[var(--border-color)]"></div> 
                     Guarnição
                     <div className="h-[1px] flex-1 bg-[var(--border-color)]"></div>
                   </h3>
                   {['motorista', 'comandante', 'patrulheiro'].map(cargo => (
                     <div key={cargo} className="space-y-2">
                        <input 
                          placeholder={`RE do ${cargo}`}
                          className="vtr-input !py-3 !text-sm uppercase"
                          onBlur={(e) => buscarMilitar(e.target.value, cargo)}
                        />
                        {formData[`${cargo}_nome`] && (
                          <div className="p-3 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 text-[10px] font-black rounded-xl flex items-center gap-2 border border-blue-100 dark:border-blue-800 animate-in zoom-in-95">
                            <CheckCircle2 size={14}/> {formData[`${cargo}_nome`]}
                          </div>
                        )}
                     </div>
                   ))}
                </div>
              )}
            </section>

            <button 
              onClick={() => setStep(2)}
              disabled={!formData.prefixo_vtr || !formData.hodometro}
              className="btn-tatico w-full"
            >
              AVANÇAR PARA CHECKLIST <ChevronRight size={20}/>
            </button>
          </div>
        )}

        {/* PASSO 2: CHECKLIST */}
        {step === 2 && (
          <div className="space-y-4 animate-in slide-in-from-right duration-500">
            {/* PAINEL DE STATUS */}
            <div className="flex gap-3">
              <div className="flex-1 vtr-card p-4 text-center border-b-green-600">
                <p className="text-3xl font-black text-green-600">{itensAtuais.length - itensComFalha}</p>
                <p className="text-[9px] font-black text-slate-400 uppercase">Operacionais</p>
              </div>
              <div className="flex-1 vtr-card p-4 text-center border-b-red-600">
                <p className="text-3xl font-black text-red-500">{itensComFalha}</p>
                <p className="text-[9px] font-black text-slate-400 uppercase">Com Avaria</p>
              </div>
            </div>

            {/* LISTAGEM */}
            <div className="grid gap-2.5">
              {itensAtuais.map(item => (
                <div 
                  key={item}
                  onClick={() => toggleChecklist(item)}
                  className={checklist[item] === 'OK' ? 'checklist-item-ok' : 'checklist-item-falha'}
                >
                  <span className="text-sm font-bold tracking-tight uppercase">{item}</span>
                  <div className={`px-4 py-1.5 rounded-xl text-[10px] font-black uppercase transition-all ${checklist[item] === 'OK' ? 'bg-green-100 text-green-700' : 'bg-red-600 text-white shadow-lg'}`}>
                    {checklist[item]}
                  </div>
                </div>
              ))}
            </div>

            <section className="vtr-card p-6 space-y-5">
              <textarea 
                className="vtr-input !rounded-3xl text-sm"
                placeholder="Descreva aqui qualquer alteração ou observação..."
                rows="4"
                onChange={(e) => setFormData({...formData, observacoes: e.target.value})}
              />
              
              {/* TERMO DE RESPONSABILIDADE */}
              <div className={`p-5 rounded-[2rem] border-2 border-dashed transition-all duration-500 ${formData.termo_aceite ? 'bg-blue-50 dark:bg-blue-900/10 border-blue-400' : 'bg-slate-50 dark:bg-slate-800 border-slate-300'}`}>
                <label className="flex items-start gap-4 cursor-pointer">
                  <input 
                    type="checkbox" 
                    className="w-7 h-7 mt-1 rounded-xl border-2 border-slate-300 checked:bg-blue-600 transition-all" 
                    onChange={(e) => setFormData({...formData, termo_aceite: e.target.checked})}
                  />
                  <div className="text-[11px] leading-snug text-[var(--text-main)]">
                    <p className="font-black uppercase text-blue-800 dark:text-blue-400 mb-1 flex items-center gap-1">
                      <AlertTriangle size={12}/> Atenção ao Termo
                    </p>
                    <p className="font-medium">
                      EU, <span className="font-black text-blue-700 dark:text-blue-300">{formData.motorista_nome || user.nome}</span>, 
                      confirmo a conferência dos itens da <span className="font-black">VTR {formData.prefixo_vtr}</span> e assumo a responsabilidade cautelar.
                    </p>
                  </div>
                </label>
              </div>
            </section>

            <div className="flex gap-3">
               <button onClick={() => setStep(1)} className="bg-[var(--bg-card)] border-2 border-[var(--border-color)] text-[var(--text-muted)] p-5 rounded-3xl active:scale-90 transition-all shadow-lg">
                  <ArrowLeft size={24}/>
               </button>
               <button 
                onClick={handleFinalizar}
                disabled={!formData.termo_aceite || loading}
                className="btn-tatico flex-1 !bg-green-700 dark:!bg-green-600"
              >
                {loading ? <Loader2 className="animate-spin"/> : <><Save size={22}/> FINALIZAR REGISTRO</>}
              </button>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default Vistoria;
