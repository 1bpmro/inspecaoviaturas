import React, { useState, useEffect } from 'react';
import { useAuth } from '../lib/AuthContext';
import { gasApi } from '../api/gasClient';
import { 
  ArrowLeft, CheckCircle2, ShieldCheck, 
  ChevronRight, Save, Loader2, X 
} from 'lucide-react';

// Listas de itens conforme seu fluxo
const ITENS_ENTRADA = [
  "Documento da Viatura", "Estepe", "Chave de Roda", "Macaco", "Triângulo", "Extintor",
  "Nível de Água", "Porta Traseira", "Porta Dianteira", "Pneus", "Capô", "Cinto",
  "Paralama Dianteiro", "Paralama Traseiro", "Parachoque Dianteiro", "Parachoque Traseiro",
  "Lanternas", "Caçamba", "Vidros e Portas", "Retrovisor Externo", "Retrovisor Interno",
  "Maçanetas", "Para-brisas", "Sirene", "Giroscópio", "Rádio", "Painel de Instrumentos",
  "Bancos", "Forro Interno", "Tapetes", "Protetor Dianteiro", "Regulador dos Bancos"
];

const ITENS_SAIDA = [
  "Viatura Entregue Limpa",
  "Viatura em Condições de Uso",
  "Avarias Constatadas",
  "Limpeza Interna",
  "Limpeza Externa",
  "Pertences da Guarnição Retirados"
];

const Vistoria = ({ onBack }) => {
  const { user } = useAuth();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [viaturas, setViaturas] = useState([]);
  const [tipoVistoria, setTipoVistoria] = useState('ENTRADA');

  // Dados do formulário
  const [formData, setFormData] = useState({
    prefixo_vtr: '',
    hodometro: '',
    motorista_re: '', motorista_nome: '',
    comandante_re: '', comandante_nome: '',
    patrulheiro_re: '', patrulheiro_nome: '',
    observacoes: '',
    termo_aceite: false
  });

  // Checklist dinâmico
  const [checklist, setChecklist] = useState({});

  // Define itens atuais
  const itensAtuais = tipoVistoria === 'ENTRADA' ? ITENS_ENTRADA : ITENS_SAIDA;

  // Efeito para carregar vtrs e resetar checklist ao mudar tipo
  useEffect(() => {
    carregarViaturas();
    const novoChecklist = itensAtuais.reduce((acc, item) => ({ ...acc, [item]: 'OK' }), {});
    setChecklist(novoChecklist);
  }, [tipoVistoria]);

  const carregarViaturas = async () => {
    setLoading(true);
    const res = await gasApi.getViaturas(tipoVistoria === 'SAÍDA');
    if (res.status === 'success') setViaturas(res.data);
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
    } catch (error) {
      console.error("Erro ao buscar militar:", error);
    }
  };

  const toggleChecklist = (item) => {
    setChecklist(prev => ({
      ...prev,
      [item]: prev[item] === 'OK' ? 'FALHA' : 'OK'
    }));
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
    <div className="min-h-screen bg-[#F1F5F9] pb-10">
      {/* Header Fixo */}
      <div className="bg-[#1E3A8A] text-white p-4 shadow-lg sticky top-0 z-50 flex items-center justify-between">
        <button onClick={onBack} className="p-1 hover:bg-blue-800 rounded-full transition-colors">
          <ArrowLeft />
        </button>
        <span className="font-bold uppercase text-xs tracking-widest">{tipoVistoria} DE SERVIÇO</span>
        <div className="w-8" />
      </div>

      <div className="max-w-xl mx-auto p-4 space-y-4">
        
        {/* PASSO 1: IDENTIFICAÇÃO */}
        {step === 1 && (
          <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* Seletor de Tipo */}
            <div className="bg-white rounded-2xl shadow-sm border overflow-hidden flex p-1">
              <button 
                onClick={() => setTipoVistoria('ENTRADA')}
                className={`flex-1 py-3 rounded-xl font-black text-[10px] transition-all ${tipoVistoria === 'ENTRADA' ? 'bg-green-600 text-white shadow-md' : 'text-slate-400'}`}
              >ENTRADA</button>
              <button 
                onClick={() => setTipoVistoria('SAÍDA')}
                className={`flex-1 py-3 rounded-xl font-black text-[10px] transition-all ${tipoVistoria === 'SAÍDA' ? 'bg-orange-500 text-white shadow-md' : 'text-slate-400'}`}
              >SAÍDA</button>
            </div>

            <section className="bg-white p-6 rounded-3xl shadow-sm border space-y-5">
              <div className="flex items-center gap-2 border-b pb-4">
                <ShieldCheck className="text-blue-600" size={18}/>
                <h3 className="text-xs font-black text-slate-800 uppercase tracking-tight">Dados Iniciais</h3>
              </div>
              
              <div className="grid gap-4">
                <div>
                  <label className="text-[10px] font-black text-slate-400 uppercase ml-1">Viatura</label>
                  <select 
                    className="w-full mt-1 p-4 bg-slate-50 border-2 border-slate-100 rounded-2xl font-bold text-slate-700 outline-none focus:border-blue-500 transition-all"
                    value={formData.prefixo_vtr}
                    onChange={(e) => setFormData({...formData, prefixo_vtr: e.target.value})}
                  >
                    <option value="">Selecione...</option>
                    {viaturas.map(v => <option key={v.Placa} value={v.Prefixo}>{v.Prefixo} - {v.Placa}</option>)}
                  </select>
                </div>

                <div>
                  <label className="text-[10px] font-black text-slate-400 uppercase ml-1">Hodômetro Atual</label>
                  <input 
                    type="number" 
                    className="w-full mt-1 p-4 bg-slate-50 border-2 border-slate-100 rounded-2xl font-bold outline-none focus:border-blue-500 transition-all"
                    placeholder="Ex: 125430"
                    onChange={(e) => setFormData({...formData, hodometro: e.target.value})}
                  />
                </div>
              </div>

              {/* Guarnição: Apenas na Entrada */}
              {tipoVistoria === 'ENTRADA' && (
                <div className="pt-4 space-y-4">
                   <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest border-t pt-4">Composição da Guarnição</h3>
                   {['motorista', 'comandante', 'patrulheiro'].map(cargo => (
                     <div key={cargo} className="space-y-2">
                        <input 
                          placeholder={`Matrícula do ${cargo}`}
                          className="w-full p-4 bg-slate-50 border-2 border-slate-100 rounded-2xl text-sm font-bold uppercase"
                          onBlur={(e) => buscarMilitar(e.target.value, cargo)}
                        />
                        {formData[`${cargo}_nome`] && (
                          <div className="p-3 bg-green-50 text-green-700 text-[11px] font-black rounded-xl flex items-center gap-2 border border-green-100">
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
              className="w-full bg-slate-900 text-white py-5 rounded-3xl font-black flex items-center justify-center gap-2 shadow-xl active:scale-95 transition-all disabled:opacity-30"
            >
              PRÓXIMO PASSO <ChevronRight size={18}/>
            </button>
          </div>
        )}

        {/* PASSO 2: CHECKLIST */}
        {step === 2 && (
          <div className="space-y-4 animate-in slide-in-from-right duration-500">
            {/* Resumo visual do Checklist */}
            <div className="bg-white p-5 rounded-3xl shadow-sm border flex justify-around items-center">
              <div className="text-center">
                <p className="text-3xl font-black text-green-600">{itensAtuais.length - itensComFalha}</p>
                <p className="text-[9px] font-black text-slate-400 uppercase">Itens OK</p>
              </div>
              <div className="h-10 w-[1px] bg-slate-100"></div>
              <div className="text-center">
                <p className="text-3xl font-black text-red-500">{itensComFalha}</p>
                <p className="text-[9px] font-black text-slate-400 uppercase">Com Falha</p>
              </div>
            </div>

            {/* Lista de itens */}
            <div className="grid gap-2">
              {itensAtuais.map(item => (
                <div 
                  key={item}
                  onClick={() => toggleChecklist(item)}
                  className={`p-4 rounded-2xl border-2 transition-all flex justify-between items-center cursor-pointer active:scale-[0.98] ${checklist[item] === 'OK' ? 'bg-white border-slate-100' : 'bg-red-50 border-red-200'}`}
                >
                  <span className={`text-sm font-bold ${checklist[item] === 'OK' ? 'text-slate-700' : 'text-red-700'}`}>{item}</span>
                  <div className={`px-4 py-1.5 rounded-xl text-[10px] font-black uppercase ${checklist[item] === 'OK' ? 'bg-green-100 text-green-700' : 'bg-red-600 text-white shadow-md'}`}>
                    {checklist[item]}
                  </div>
                </div>
              ))}
            </div>

            <section className="bg-white p-5 rounded-3xl border space-y-4 shadow-sm">
              <textarea 
                className="w-full p-4 bg-slate-50 border-2 border-slate-100 rounded-2xl text-sm outline-none focus:border-blue-500"
                placeholder="Observações ou detalhes de avarias..."
                rows="3"
                onChange={(e) => setFormData({...formData, observacoes: e.target.value})}
              />
              
              {/* Termo Dinâmico */}
              <div className={`p-5 rounded-2xl border-2 border-dashed transition-all ${formData.termo_aceite ? 'bg-blue-50 border-blue-200' : 'bg-slate-50 border-slate-200'}`}>
                <label className="flex items-start gap-4 cursor-pointer">
                  <div className="relative flex items-center">
                    <input 
                      type="checkbox" 
                      className="w-6 h-6 rounded-lg border-2 border-slate-300 checked:bg-blue-600 transition-all" 
                      onChange={(e) => setFormData({...formData, termo_aceite: e.target.checked})}
                    />
                  </div>
                  <div className="text-[11px] leading-tight text-slate-600">
                    <p className="font-black uppercase text-blue-900 mb-1">
                      {tipoVistoria === 'ENTRADA' ? 'Termo de Responsabilidade' : 'Termo de Entrega'}
                    </p>
                    <p>
                      EU, <span className="text-blue-700 font-black uppercase">{formData.motorista_nome || user.nome}</span>, 
                      declaro estar {tipoVistoria === 'ENTRADA' ? 'RECEBENDO' : 'ENTREGANDO'} a viatura 
                      <span className="text-blue-700 font-black"> {formData.prefixo_vtr}</span> nas condições descritas e me responsabilizo pelo material.
                    </p>
                    <p className="mt-2 text-[9px] text-slate-400 font-bold uppercase italic tracking-tighter">
                      Data/Hora: {new Date().toLocaleString('pt-BR')}
                    </p>
                  </div>
                </label>
              </div>
            </section>

            <div className="flex gap-2">
               <button onClick={() => setStep(1)} className="bg-white border-2 border-slate-200 text-slate-400 p-5 rounded-3xl active:scale-95 transition-all">
                  <ArrowLeft size={20}/>
               </button>
               <button 
                onClick={handleFinalizar}
                disabled={!formData.termo_aceite || loading}
                className="flex-1 bg-green-600 text-white py-5 rounded-3xl font-black shadow-xl flex items-center justify-center gap-3 active:scale-95 transition-all disabled:opacity-30 disabled:grayscale"
              >
                {loading ? <Loader2 className="animate-spin"/> : <><Save size={20}/> FINALIZAR {tipoVistoria}</>}
              </button>
            </div>
          </div>
        )}

      </div>
    </div>
  );
};

export default Vistoria;
