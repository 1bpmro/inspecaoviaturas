import React, { useState, useEffect } from 'react';
import { gasApi } from '../api/gasClient';
import { useAuth } from '../lib/AuthContext';
import { 
  Car, CheckCircle2, AlertTriangle, Clock, 
  Search, ShieldCheck, Lock, Unlock, History, Camera
} from 'lucide-react';

const GarageiroDashboard = () => {
  const { user } = useAuth();
  const [tab, setTab] = useState('pendentes'); // 'pendentes', 'frota', 'historico'
  const [vistorias, setVistorias] = useState([]);
  const [viaturas, setViaturas] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Estados do Modal de Conferência
  const [showModal, setShowModal] = useState(false);
  const [selectedVtr, setSelectedVtr] = useState(null);
  const [conf, setConf] = useState({ limpa: false, motoristaOk: false, avaria: false, obs: '' });

  const fetchData = async () => {
    setLoading(true);
    const [resVtr, resPend] = await Promise.all([
      gasApi.getViaturas(), // Pega status de toda a frota
      gasApi.getVistoriasPendentes() // Só o que o motorista já enviou ao portão
    ]);
    if (resVtr.status === 'success') setViaturas(resVtr.data);
    if (resPend.status === 'success') setVistorias(resPend.data);
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, []);

  const finalizarConferencia = async () => {
    if (!conf.motoristaOk) return alert("Você precisa confirmar se o motorista é o correto.");
    
    const res = await gasApi.confirmarVistoriaGarageiro({
      rowId: selectedVtr.rowId,
      status_fisico: conf.avaria ? 'AVARIADA' : 'OK',
      limpeza: conf.limpa ? 'LIMPA' : 'SUJA',
      obs_garageiro: conf.obs,
      garageiro_re: user.re
    });

    if (res.status === 'success') {
      setShowModal(false);
      setConf({ limpa: false, motoristaOk: false, avaria: false, obs: '' });
      fetchData();
    }
  };

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col">
      {/* NAV SUPERIOR - ESTILO SALA DE SITUAÇÃO */}
      <header className="bg-slate-900 text-white p-4 shadow-xl border-b-4 border-amber-500">
        <div className="max-w-6xl mx-auto flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="bg-amber-500 p-2 rounded-lg text-slate-900">
              <ShieldCheck size={24} />
            </div>
            <div>
              <h1 className="font-black uppercase tracking-tighter text-lg">Fiscalização de Pátio</h1>
              <p className="text-[10px] font-bold text-amber-500 uppercase tracking-widest">1º BPM - Rondon • Sala de Monitoramento</p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-[10px] text-slate-400 font-bold uppercase">Garageiro de Serviço</p>
            <p className="text-sm font-black text-white">{user?.patente} {user?.nome}</p>
          </div>
        </div>
      </header>

      {/* TABS DE CONTROLE */}
      <nav className="bg-white border-b border-slate-200 sticky top-0 z-10">
        <div className="max-w-6xl mx-auto flex">
          <button onClick={() => setTab('pendentes')} className={`flex-1 p-4 text-xs font-black uppercase transition-all border-b-2 ${tab === 'pendentes' ? 'border-amber-500 text-amber-600 bg-amber-50/50' : 'border-transparent text-slate-400'}`}>
            <span className="flex items-center justify-center gap-2">
              <Clock size={16} /> Conferência ({vistorias.length})
            </span>
          </button>
          <button onClick={() => setTab('frota')} className={`flex-1 p-4 text-xs font-black uppercase transition-all border-b-2 ${tab === 'frota' ? 'border-amber-500 text-amber-600 bg-amber-50/50' : 'border-transparent text-slate-400'}`}>
            <span className="flex items-center justify-center gap-2">
              <Car size={16} /> Frota Total
            </span>
          </button>
        </div>
      </nav>

      <main className="p-4 max-w-6xl mx-auto w-full flex-1">
        {loading ? (
           <div className="py-20 text-center animate-pulse font-black text-slate-400 uppercase text-xs">Sincronizando com a nuvem...</div>
        ) : (
          <>
            {/* LISTA DE CONFERÊNCIA (VTRs QUE ESTÃO CHEGANDO) */}
            {tab === 'pendentes' && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {vistorias.length === 0 ? (
                  <div className="col-span-full py-20 text-center bg-white rounded-[2rem] border-2 border-dashed border-slate-200">
                    <p className="text-slate-400 font-bold uppercase text-xs">Nenhuma VTR aguardando no portão.</p>
                  </div>
                ) : vistorias.map((vtr, i) => (
                  <div key={i} className="bg-white border-2 border-slate-200 rounded-[2rem] p-5 shadow-sm hover:border-amber-400 transition-all group">
                    <div className="flex justify-between items-start mb-4">
                      <span className="text-3xl font-black text-slate-900 tracking-tighter">{vtr.prefixo_vtr}</span>
                      <span className="bg-blue-100 text-blue-700 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest">
                        Devolução
                      </span>
                    </div>
                    <div className="space-y-1 mb-6">
                      <p className="text-xs font-bold text-slate-500 uppercase flex items-center gap-1">
                         <User size={12} /> {vtr.motorista_nome}
                      </p>
                      <p className="text-[10px] text-slate-400 font-bold uppercase tracking-tight">
                        Enviado às: {vtr.Data_Hora}
                      </p>
                    </div>
                    <button 
                      onClick={() => { setSelectedVtr(vtr); setShowModal(true); }}
                      className="w-full py-4 bg-slate-900 text-white rounded-2xl font-black uppercase text-xs tracking-widest hover:bg-amber-600 transition-all flex items-center justify-center gap-2"
                    >
                      <CheckCircle2 size={16} /> Iniciar Conferência Física
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* FROTA TOTAL (PARA PRENDER/LIBERAR VTR EM MANUTENÇÃO) */}
            {tab === 'frota' && (
              <div className="bg-white rounded-[2rem] shadow-sm overflow-hidden border border-slate-200">
                <table className="w-full text-left">
                  <thead className="bg-slate-50 border-b border-slate-200">
                    <tr>
                      <th className="p-4 text-[10px] font-black uppercase text-slate-500 tracking-widest">Viatura</th>
                      <th className="p-4 text-[10px] font-black uppercase text-slate-500 tracking-widest">Status Atual</th>
                      <th className="p-4 text-[10px] font-black uppercase text-slate-500 tracking-widest text-right">Ação</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {viaturas.map((v, i) => (
                      <tr key={i} className="hover:bg-slate-50 transition-colors">
                        <td className="p-4">
                          <p className="font-black text-slate-800 tracking-tighter">{v.prefixo}</p>
                          <p className="text-[10px] text-slate-400 font-bold">{v.placa}</p>
                        </td>
                        <td className="p-4">
                          <span className={`text-[9px] font-black px-2 py-1 rounded-md uppercase ${v.status === 'disponivel' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                            {v.status}
                          </span>
                        </td>
                        <td className="p-4 text-right">
                          <button className="text-slate-400 hover:text-amber-600 transition-colors p-2">
                             {v.status === 'disponivel' ? <Lock size={18} /> : <Unlock size={18} />}
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </>
        )}
      </main>

      {/* MODAL DE CONFERÊNCIA FÍSICA (O CHECKLIST DO GARAGEIRO) */}
      {showModal && selectedVtr && (
        <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-lg rounded-[2.5rem] shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-300">
            <div className="bg-slate-900 p-6 text-white flex justify-between items-center">
              <div>
                <h2 className="text-2xl font-black tracking-tighter uppercase">Check-in VTR {selectedVtr.prefixo_vtr}</h2>
                <p className="text-[10px] text-amber-500 font-black uppercase tracking-widest">Conferência de Devolução</p>
              </div>
              <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-white">✕</button>
            </div>

            <div className="p-8 space-y-6">
              <div className="space-y-4">
                <label className="flex items-center gap-4 p-4 bg-slate-50 rounded-2xl border-2 border-transparent hover:border-amber-200 cursor-pointer transition-all">
                  <input type="checkbox" className="w-6 h-6 rounded-lg accent-amber-500" checked={conf.motoristaOk} onChange={e => setConf({...conf, motoristaOk: e.target.checked})} />
                  <span className="text-xs font-black uppercase text-slate-700 italic">É o {selectedVtr.motorista_nome} que está entregando?</span>
                </label>

                <label className="flex items-center gap-4 p-4 bg-slate-50 rounded-2xl border-2 border-transparent hover:border-amber-200 cursor-pointer transition-all">
                  <input type="checkbox" className="w-6 h-6 rounded-lg accent-amber-500" checked={conf.limpa} onChange={e => setConf({...conf, limpa: e.target.checked})} />
                  <span className="text-xs font-black uppercase text-slate-700">A Viatura está limpa (Lavada)?</span>
                </label>

                <label className="flex items-center gap-4 p-4 bg-slate-50 rounded-2xl border-2 border-transparent hover:border-amber-200 cursor-pointer transition-all">
                  <input type="checkbox" className="w-6 h-6 rounded-lg accent-red-500" checked={conf.avaria} onChange={e => setConf({...conf, avaria: e.target.checked})} />
                  <span className="text-xs font-black uppercase text-red-600">Detectou novas avarias/danos?</span>
                </label>
              </div>

              <div className="space-y-2">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Observações do Recebimento</p>
                <textarea 
                  className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl p-4 text-sm font-medium outline-none focus:border-amber-500 transition-all"
                  placeholder="Ex: Faltando cone, pneu reserva baixo, etc..."
                  value={conf.obs}
                  onChange={e => setConf({...conf, obs: e.target.value})}
                  rows={3}
                />
              </div>

              <button 
                onClick={finalizarConferencia}
                className="w-full py-5 bg-emerald-600 text-white rounded-[1.5rem] font-black uppercase tracking-widest text-xs shadow-lg shadow-emerald-900/20 active:scale-95 transition-all"
              >
                Concluir Fiscalização e Liberar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default GarageiroDashboard;
