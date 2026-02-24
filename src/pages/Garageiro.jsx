import React, { useState, useEffect } from 'react';
import { gasApi } from '../api/gasClient';
import { 
  Car, CheckCircle2, Lock, Unlock, History, 
  Search, AlertTriangle, Camera, Clock, UserCheck, Loader2
} from 'lucide-react';

const Garageiro = () => {
  const [abaAtiva, setAbaAtiva] = useState('pendentes'); // pendentes, frota, historico
  const [loading, setLoading] = useState(false);
  const [vistorias, setVistorias] = useState([]);
  const [viaturas, setViaturas] = useState([]);
  const [historico, setHistorico] = useState([]);
  
  // Estados para o Modal de Confirmação
  const [modalAberto, setModalAberto] = useState(false);
  const [selecionado, setSelecionado] = useState(null);
  const [checkListGarageiro, setCheckListGarageiro] = useState({
    limpa: false,
    motorista_confere: false,
    sem_avarias_novas: true,
    obs: ""
  });

  useEffect(() => {
    carregarDados();
  }, [abaAtiva]);

  const carregarDados = async () => {
    setLoading(true);
    try {
      if (abaAtiva === 'pendentes') {
        const res = await gasApi.getVistoriasPendentes(); // Vistorias de SAÍDA que o garageiro ainda não deu OK
        setVistorias(res.data || []);
      } else if (abaAtiva === 'frota') {
        const res = await gasApi.getViaturasStatus(); // Status real de todas as VTRs
        setViaturas(res.data || []);
      } else {
        const res = await gasApi.getHistoricoGarageiro();
        setHistorico(res.data || []);
      }
    } catch (e) { console.error(e); }
    setLoading(false);
  };

  const handleConfirmarEntrega = async () => {
    setLoading(true);
    const payload = {
      vistoria_id: selecionado.id,
      prefixo: selecionado.prefixo_vtr,
      ...checkListGarageiro,
      data_confirmacao: new Date().toLocaleString('pt-BR')
    };
    
    const res = await gasApi.confirmarVistoriaGarageiro(payload);
    if (res.status === 'success') {
      setModalAberto(false);
      carregarDados();
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-[#f1f5f9] pb-20">
      {/* HEADER TÁTICO */}
      <header className="bg-slate-900 text-white p-6 shadow-xl border-b-4 border-amber-500">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-xl font-black tracking-tighter flex items-center gap-2">
            <ShieldCheck className="text-amber-500" /> CONTROLE DE PÁTIO - 1º BPM
          </h1>
          <p className="text-[10px] opacity-60 font-bold uppercase tracking-widest">Porto Velho/RO</p>
        </div>
      </header>

      {/* NAV DE ABAS */}
      <nav className="max-w-4xl mx-auto p-4 flex gap-2">
        {[
          { id: 'pendentes', icon: Clock, label: 'Pendentes' },
          { id: 'frota', icon: Car, label: 'Gestão VTR' },
          { id: 'historico', icon: History, label: 'Histórico' }
        ].map(aba => (
          <button
            key={aba.id}
            onClick={() => setAbaAtiva(aba.id)}
            className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl font-black text-[10px] transition-all ${
              abaAtiva === aba.id ? 'bg-slate-900 text-white shadow-lg' : 'bg-white text-slate-400'
            }`}
          >
            <aba.icon size={16} /> {aba.label.toUpperCase()}
          </button>
        ))}
      </nav>

      <main className="max-w-4xl mx-auto p-4">
        {loading && <div className="flex justify-center p-10"><Loader2 className="animate-spin text-blue-600" /></div>}

        {/* ABA: PENDENTES (ENTREGA DE VIATURA) */}
        {abaAtiva === 'pendentes' && !loading && (
          <div className="grid gap-4">
            {vistorias.length === 0 && <p className="text-center py-10 text-slate-400 font-bold uppercase text-xs">Nenhuma VTR aguardando no pátio.</p>}
            {vistorias.map(v => (
              <div key={v.id} className="vtr-card p-5 border-l-8 border-amber-500 flex justify-between items-center">
                <div>
                  <h3 className="text-lg font-black text-slate-800">{v.prefixo_vtr}</h3>
                  <p className="text-[10px] font-bold text-slate-500 uppercase flex items-center gap-1">
                    <UserCheck size={12} /> Mot: {v.motorista_nome}
                  </p>
                  <p className="text-[10px] text-slate-400 font-medium">Entregue em: {v.data_hora_sistema}</p>
                </div>
                <button 
                  onClick={() => { setSelecionado(v); setModalAberto(true); }}
                  className="bg-green-600 text-white px-4 py-2 rounded-lg font-black text-[10px] hover:bg-green-700 shadow-md"
                >
                  CONFERIR
                </button>
              </div>
            ))}
          </div>
        )}

        {/* ABA: GESTÃO DA FROTA (PRENDER/LIBERAR) */}
        {abaAtiva === 'frota' && !loading && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {viaturas.map(vtr => (
              <div key={vtr.id} className="vtr-card p-5">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h3 className="text-xl font-black text-slate-800">{vtr.prefixo}</h3>
                    <p className="text-xs font-bold text-slate-400">{vtr.placa}</p>
                  </div>
                  <span className={`px-3 py-1 rounded-full text-[9px] font-black ${
                    vtr.status === 'disponivel' ? 'bg-green-100 text-green-700' : 
                    vtr.status === 'presa' ? 'bg-red-100 text-red-700' : 'bg-blue-100 text-blue-700'
                  }`}>
                    {vtr.status.toUpperCase()}
                  </span>
                </div>
                
                <div className="flex gap-2">
                  <button className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg font-black text-[10px] border-2 transition-all ${
                    vtr.status === 'presa' ? 'bg-green-600 border-green-600 text-white' : 'border-slate-200 text-slate-400'
                  }`}>
                    <Unlock size={14} /> LIBERAR
                  </button>
                  <button className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg font-black text-[10px] border-2 transition-all ${
                    vtr.status === 'disponivel' ? 'bg-red-600 border-red-600 text-white' : 'border-slate-200 text-slate-400'
                  }`}>
                    <Lock size={14} /> PRENDER
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      {/* MODAL DE CONFERÊNCIA (DIALOG CUSTOMIZADO PARA VELOCIDADE) */}
      {modalAberto && (
        <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-sm z-[100] p-4 flex items-center justify-center">
          <div className="bg-white w-full max-w-md rounded-3xl overflow-hidden shadow-2xl animate-in zoom-in-95">
            <div className="bg-slate-900 p-6 text-white">
              <h2 className="text-lg font-black">CONFERÊNCIA DE ENTRADA</h2>
              <p className="text-xs opacity-60">VTR {selecionado?.prefixo_vtr}</p>
            </div>
            
            <div className="p-6 space-y-4">
              <label className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl cursor-pointer">
                <input type="checkbox" className="w-5 h-5" onChange={e => setCheckListGarageiro({...checkListGarageiro, motorista_confere: e.target.checked})} />
                <span className="text-xs font-bold text-slate-700 uppercase">O motorista é o próprio {selecionado?.motorista_nome}?</span>
              </label>

              <label className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl cursor-pointer">
                <input type="checkbox" className="w-5 h-5" onChange={e => setCheckListGarageiro({...checkListGarageiro, limpa: e.target.checked})} />
                <span className="text-xs font-bold text-slate-700 uppercase">A viatura está limpa?</span>
              </label>

              <label className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl cursor-pointer">
                <input type="checkbox" className="w-5 h-5" defaultChecked onChange={e => setCheckListGarageiro({...checkListGarageiro, sem_avarias_novas: e.target.checked})} />
                <span className="text-xs font-bold text-slate-700 uppercase">Sem avarias novas?</span>
              </label>

              <textarea 
                className="vtr-input text-xs" 
                placeholder="Observações do Garageiro..." 
                rows="3"
                onChange={e => setCheckListGarageiro({...checkListGarageiro, obs: e.target.value})}
              />

              <div className="flex gap-2 pt-2">
                <button onClick={() => setModalAberto(false)} className="flex-1 py-3 text-slate-400 font-black text-[10px] uppercase">Cancelar</button>
                <button onClick={handleConfirmarEntrega} className="flex-2 bg-green-600 text-white px-8 py-3 rounded-xl font-black text-[10px] uppercase shadow-lg shadow-green-200">
                  Confirmar e Liberar Motorista
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Garageiro;
