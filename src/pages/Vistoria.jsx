import React, { useState, useEffect } from 'react';
import { useAuth } from '../lib/AuthContext';
import { gasApi } from '../api/gasClient';
import { 
  ArrowLeft, CheckCircle2, ShieldCheck, 
  ChevronRight, Save, Loader2, AlertTriangle 
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
    prefixo_vtr: '', hodometro: '',
    motorista_re: '', motorista_nome: '',
    comandante_re: '', comandante_nome: '',
    patrulheiro_re: '', patrulheiro_nome: '',
    observacoes: '', termo_aceite: false
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
    } catch (e) { console.error("Erro busca:", e); }
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
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-[var(--bg-app)] pb-10 transition-all">
      {/* HEADER TÁTICO */}
      <header className="bg-slate-900 text-white p-5 shadow-2xl sticky top-0 z-50 border-b-4 border-blue-900">
        <div className="max-w-xl mx-auto flex items-center justify-between">
          <button onClick={onBack} className="p-2 hover:bg-slate-800 rounded-full"><ArrowLeft size={24}/></button>
          <div className="text-center">
            <h1 className="font-black text-[10px] tracking-widest opacity-50 uppercase">1º BPM - Rondon</h1>
            <p className="text-xs font-bold text-blue-400 uppercase">{tipoVistoria} DE SERVIÇO</p>
          </div>
          <div className="w-10" />
        </div>
      </header>

      <main className="max-w-xl mx-auto p-4 space-y-6">
        {step === 1 && (
          <div className="space-y-6 animate-in slide-in-from-bottom-4">
            {/* SELETOR TÁTICO */}
            <div className="vtr-card p-1.5 flex bg-slate-200 border-none shadow-inner">
              <button onClick={() => setTipoVistoria('ENTRADA')} className={`flex-1 py-3 rounded-2xl font-black text-[10px] ${tipoVistoria === 'ENTRADA' ? 'bg-green-600 text-white shadow-lg' : 'text-slate-500'}`}>ENTRADA</button>
              <button onClick={() => setTipoVistoria('SAÍDA')} className={`flex-1 py-3 rounded-2xl font-black text-[10px] ${tipoVistoria === 'SAÍDA' ? 'bg-orange-500 text-white shadow-lg' : 'text-slate-500'}`}>SAÍDA</button>
            </div>

            <section className="vtr-card p-6 space-y-5">
              <div className="flex items-center gap-2 border-b pb-4 border-slate-100">
                <ShieldCheck className="text-blue-600" size={20}/>
                <h3 className="text-xs font-black uppercase text-slate-800">Dados da Viatura</h3>
              </div>
              <div className="space-y-4">
                <select className="vtr-input" value={formData.prefixo_vtr} onChange={(e) => setFormData({...formData, prefixo_vtr: e.target.value})}>
                  <option value="">Selecione a VTR</option>
                  {viaturas.map(v => <option key={v.Placa} value={v.Prefixo}>{v.Prefixo} - {v.Placa}</option>)}
                </select>
                <input type="number" className="vtr-input" placeholder="Hodômetro Atual" onChange={(e) => setFormData({...formData, hodometro: e.target.value})} />
              </div>

              {tipoVistoria === 'ENTRADA' && (
                <div className="space-y-4 pt-4 border-t border-slate-50">
                  {['motorista', 'comandante', 'patrulheiro'].map(cargo => (
                    <div key={cargo}>
                      <input placeholder={`RE do ${cargo}`} className="vtr-input !py-3 !text-sm" onBlur={(e) => buscarMilitar(e.target.value, cargo)} />
                      {formData[`${cargo}_nome`] && (
                        <div className="mt-2 p-2 bg-blue-50 text-blue-700 text-[10px] font-black rounded-lg border border-blue-100 flex items-center gap-2">
                          <CheckCircle2 size={12}/> {formData[`${cargo}_nome`]}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </section>

            <button onClick={() => setStep(2)} disabled={!formData.prefixo_vtr} className="btn-tatico w-full">PRÓXIMO PASSO <ChevronRight size={20}/></button>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-4 animate-in slide-in-from-right">
            <div className="flex gap-3">
              <div className="flex-1 vtr-card p-4 text-center border-b-4 border-b-green-500">
                <p className="text-2xl font-black text-green-600">{itensAtuais.length - itensComFalha}</p>
                <p className="text-[9px] font-black text-slate-400 uppercase">Itens OK</p>
              </div>
              <div className="flex-1 vtr-card p-4 text-center border-b-4 border-b-red-500">
                <p className="text-2xl font-black text-red-600">{itensComFalha}</p>
                <p className="text-[9px] font-black text-slate-400 uppercase">Avarias</p>
              </div>
            </div>

            <div className="grid gap-2">
              {itensAtuais.map(item => (
                <div key={item} onClick={() => toggleChecklist(item)} className={checklist[item] === 'OK' ? 'checklist-item-ok' : 'checklist-item-falha'}>
                  <span className="text-sm font-bold uppercase">{item}</span>
                  <div className={`px-3 py-1 rounded-lg text-[10px] font-black ${checklist[item] === 'OK' ? 'bg-green-100 text-green-700' : 'bg-red-600 text-white'}`}>{checklist[item]}</div>
                </div>
              ))}
            </div>

            <section className="vtr-card p-6 space-y-4">
              <textarea className="vtr-input text-sm" placeholder="Observações..." rows="3" onChange={(e) => setFormData({...formData, observacoes: e.target.value})} />
              <div className={`p-4 rounded-2xl border-2 border-dashed ${formData.termo_aceite ? 'bg-blue-50 border-blue-400' : 'bg-slate-50 border-slate-300'}`}>
                <label className="flex items-start gap-3 cursor-pointer">
                  <input type="checkbox" className="w-6 h-6 mt-1" onChange={(e) => setFormData({...formData, termo_aceite: e.target.checked})} />
                  <p className="text-[10px] font-bold text-slate-600 leading-tight">
                    EU, <span className="text-blue-800 font-black uppercase">{formData.motorista_nome || user.nome}</span>, declaro estar ciente das condições da VTR {formData.prefixo_vtr}.
                  </p>
                </label>
              </div>
              <button onClick={handleFinalizar} disabled={!formData.termo_aceite || loading} className="btn-tatico w-full">
                {loading ? <Loader2 className="animate-spin"/> : <><Save size={20}/> FINALIZAR REGISTRO</>}
              </button>
            </section>
          </div>
        )}
      </main>
    </div>
  );
};

export default Vistoria;
