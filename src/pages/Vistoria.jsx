import React, { useState, useEffect } from 'react';
import { useAuth } from '../lib/AuthContext';
import { gasApi } from '../api/gasClient';
import { 
  ArrowLeft, CheckCircle2, AlertCircle, ShieldCheck, 
  User, Stepper, ChevronRight, Save, Loader2 
} from 'lucide-react';

const ITENS_CHECKLIST = [
  "Documento da Viatura", "Estepe", "Chave de Roda", "Macaco", "Triângulo", "Extintor",
  "Nível de Água", "Porta Traseira", "Porta Dianteira", "Pneus", "Capô", "Cinto",
  "Paralama Dianteiro", "Paralama Traseiro", "Parachoque Dianteiro", "Parachoque Traseiro",
  "Lanternas", "Caçamba", "Vidros e Portas", "Retrovisor Externo", "Retrovisor Interno",
  "Maçanetas", "Para-brisas", "Sirene", "Giroscópio", "Rádio", "Painel de Instrumentos",
  "Bancos", "Forro Interno", "Tapetes", "Protetor Dianteiro", "Regulador dos Bancos"
];

const Vistoria = ({ onBack }) => {
  const { user } = useAuth();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [viaturas, setViaturas] = useState([]);
  const [tipoVistoria, setTipoVistoria] = useState('ENTRADA'); // ENTRADA ou SAÍDA

  // Estados de identificação e guarnição
  const [formData, setFormData] = useState({
    prefixo_vtr: '',
    hodometro: '',
    tipo_patrulhamento: '',
    possui_video: false,
    video_funcional: false,
    motorista_re: '', motorista_nome: '',
    comandante_re: '', comandante_nome: '',
    patrulheiro_re: '', patrulheiro_nome: '',
    observacoes: '',
    termo_aceite: false,
    houve_alteracoes: false
  });

  // Checklist: Inicia tudo como "OK"
  const [checklist, setChecklist] = useState(
    ITENS_CHECKLIST.reduce((acc, item) => ({ ...acc, [item]: 'OK' }), {})
  );

  useEffect(() => {
    carregarViaturas();
  }, [tipoVistoria]);

  const carregarViaturas = async () => {
    setLoading(true);
    const res = await gasApi.getViaturas(tipoVistoria === 'SAÍDA');
    if (res.status === 'success') setViaturas(res.data);
    setLoading(false);
  };

  const buscarMilitar = async (re, campo) => {
    if (re.length < 4) return;
    const res = await gasApi.post(GAS_URL, { action: 'buscarMilitar', payload: { re } });
    if (res.data.status === 'success') {
      setFormData(prev => ({ ...prev, [`${campo}_nome`]: `${res.data.patente} ${res.data.nome}` }));
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
      data_hora_sistema: new Date().toLocaleString('pt-BR')
    };
    
    const res = await gasApi.saveVistoria(payload);
    if (res.status === 'success') {
      alert("Registro finalizado com sucesso!");
      onBack();
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-[#F1F5F9] pb-10">
      {/* Header */}
      <div className="bg-[#1E3A8A] text-white p-4 shadow-lg sticky top-0 z-50 flex items-center justify-between">
        <button onClick={onBack} className="p-1"><ArrowLeft /></button>
        <span className="font-bold uppercase text-sm tracking-widest">{tipoVistoria} DE SERVIÇO</span>
        <div className="w-6" />
      </div>

      <div className="max-w-xl mx-auto p-4 space-y-4">
        
        {/* Passo 1: Seleção de Tipo */}
        {step === 1 && (
          <div className="space-y-4 animate-in fade-in duration-500">
            <div className="bg-white rounded-xl shadow-sm border overflow-hidden flex">
              <button 
                onClick={() => setTipoVistoria('ENTRADA')}
                className={`flex-1 py-4 font-black text-xs ${tipoVistoria === 'ENTRADA' ? 'bg-green-600 text-white' : 'bg-slate-50 text-slate-400'}`}
              >ENTRADA DE SERVIÇO</button>
              <button 
                onClick={() => setTipoVistoria('SAÍDA')}
                className={`flex-1 py-4 font-black text-xs ${tipoVistoria === 'SAÍDA' ? 'bg-orange-500 text-white' : 'bg-slate-50 text-slate-400'}`}
              >SAÍDA DE SERVIÇO</button>
            </div>

            <section className="bg-white p-6 rounded-2xl shadow-sm border space-y-5">
              <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-tighter flex items-center gap-2">
                <ShieldCheck size={14}/> Identificação da Viatura
              </h3>
              
              <div className="space-y-4">
                <div>
                  <label className="text-xs font-bold text-slate-600">Viatura</label>
                  <select 
                    className="w-full mt-1 p-3 bg-slate-50 border rounded-xl font-bold"
                    onChange={(e) => setFormData({...formData, prefixo_vtr: e.target.value})}
                  >
                    <option value="">Selecione a viatura...</option>
                    {viaturas.map(v => <option key={v.Placa} value={v.Prefixo}>{v.Prefixo} - {v.Placa} - {v.Modelo}</option>)}
                  </select>
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-600">Hodômetro (KM)</label>
                  <input 
                    type="number" 
                    className="w-full mt-1 p-3 bg-slate-50 border rounded-xl font-bold"
                    placeholder="Digite a quilometragem"
                    onChange={(e) => setFormData({...formData, hodometro: e.target.value})}
                  />
                </div>
              </div>

              {tipoVistoria === 'ENTRADA' && (
                <div className="pt-4 border-t space-y-4">
                   <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-tighter">Guarnição</h3>
                   {['motorista', 'comandante', 'patrulheiro'].map(cargo => (
                     <div key={cargo} className="space-y-1">
                        <input 
                          placeholder={`RE do ${cargo}`}
                          className="w-full p-3 bg-slate-50 border rounded-xl text-sm"
                          onBlur={(e) => buscarMilitar(e.target.value, cargo)}
                        />
                        {formData[`${cargo}_nome`] && (
                          <div className="p-2 bg-green-50 text-green-700 text-xs font-bold rounded-lg flex items-center gap-2">
                            <CheckCircle2 size={12}/> {formData[`${cargo}_nome`]}
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
              className="w-full bg-slate-800 text-white py-4 rounded-2xl font-black flex items-center justify-center gap-2 disabled:opacity-50"
            >
              PROSSEGUIR PARA CHECKLIST <ChevronRight size={18}/>
            </button>
          </div>
        )}

        {/* Passo 2: Checklist */}
        {step === 2 && (
          <div className="space-y-4 animate-in slide-in-from-right duration-500">
            <div className="bg-white p-4 rounded-2xl shadow-sm border flex justify-around">
              <div className="text-center">
                <p className="text-2xl font-black text-green-600">{32 - itensComFalha}</p>
                <p className="text-[10px] font-bold text-slate-400 uppercase">Itens OK</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-black text-red-500">{itensComFalha}</p>
                <p className="text-[10px] font-bold text-slate-400 uppercase">Com Falha</p>
              </div>
            </div>

            <div className="space-y-2">
              {ITENS_CHECKLIST.map(item => (
                <div 
                  key={item}
                  onClick={() => toggleChecklist(item)}
                  className="bg-white p-4 rounded-xl border flex justify-between items-center active:scale-95 transition-all cursor-pointer"
                >
                  <span className="text-sm font-bold text-slate-700">{item}</span>
                  <span className={`px-4 py-1 rounded-full text-[10px] font-black ${checklist[item] === 'OK' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                    {checklist[item]}
                  </span>
                </div>
              ))}
            </div>

            <section className="bg-white p-4 rounded-2xl border space-y-4">
              <textarea 
                className="w-full p-3 bg-slate-50 border rounded-xl text-sm"
                placeholder="Observações (opcional)"
                rows="3"
                onChange={(e) => setFormData({...formData, observacoes: e.target.value})}
              />
              
              <div className="p-4 bg-slate-50 rounded-xl border-2 border-dashed border-slate-200">
                <label className="flex items-start gap-3 cursor-pointer">
                  <input 
                    type="checkbox" 
                    className="w-5 h-5 mt-1" 
                    onChange={(e) => setFormData({...formData, termo_aceite: e.target.checked})}
                  />
                  <p className="text-[11px] leading-tight text-slate-600">
                    <strong>TERMO DE RESPONSABILIDADE:</strong> EU, <span className="text-blue-700 font-bold uppercase">{formData.motorista_nome || user.nome}</span>, declaro ter recebido/entregue a viatura <span className="text-blue-700 font-bold">{formData.prefixo_vtr}</span> nas condições descritas e me responsabilizo pelo uso.
                  </p>
                </label>
              </div>
            </section>

            <button 
              onClick={handleFinalizar}
              disabled={!formData.termo_aceite || loading}
              className="w-full bg-green-600 text-white py-5 rounded-2xl font-black shadow-lg flex items-center justify-center gap-3 disabled:opacity-50"
            >
              {loading ? <Loader2 className="animate-spin"/> : <><Save size={20}/> FINALIZAR {tipoVistoria}</>}
            </button>
          </div>
        )}

      </div>
    </div>
  );
};

export default Vistoria;
