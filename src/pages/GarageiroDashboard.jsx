import React, { useState, useEffect } from 'react';
import { gasApi } from '../api/gasClient';
import { useAuth } from '../lib/AuthContext';
import { 
  Car, CheckCircle2, AlertTriangle, Clock, 
  Search, ShieldCheck, Lock, Unlock, History, Camera, User, X, AlertCircle, ChevronDown
} from 'lucide-react';

const GarageiroDashboard = ({ onBack }) => {
  const { user } = useAuth();
  const [tab, setTab] = useState('pendentes'); 
  const [vistorias, setVistorias] = useState([]);
  const [viaturas, setViaturas] = useState([]);
  const [motoristas, setMotoristas] = useState([]); 
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false); 
  
  const [showModal, setShowModal] = useState(false);
  const [selectedVtr, setSelectedVtr] = useState(null);
  
  const [conf, setConf] = useState({ 
    limpa: false, 
    motoristaConfirmado: true, 
    novoMotoristaRE: '',
    avaria: false, 
    obs: '' 
  });
  
  const [fotoAvaria, setFotoAvaria] = useState(null);
  const [uploading, setUploading] = useState(false);

  const [showLockModal, setShowLockModal] = useState(false);
  const [lockData, setLockData] = useState({ 
    prefixo: '', motivo: 'manutencao', detalhes: '', re_responsavel: '' 
  });

  const fetchData = async () => {
    setLoading(true);
    try {
      const [resVtr, resPend, resMot] = await Promise.all([
        gasApi.getViaturas(), 
        gasApi.getVistoriasPendentes(),
        gasApi.getMotoristas()
      ]);
      if (resVtr.status === 'success') setViaturas(resVtr.data);
      if (resPend.status === 'success') setVistorias(resPend.data);
      if (resMot.status === 'success') setMotoristas(resMot.data);
    } catch (error) {
      console.error("Erro ao buscar dados:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  const handleFileChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setUploading(true);
    try {
      const res = await gasApi.uploadFoto(file); 
      if (res.status === 'success') {
        setFotoAvaria(res.url);
      } else {
        alert("Erro no upload da imagem.");
      }
    } catch (err) {
      alert("Falha ao processar foto.");
    } finally {
      setUploading(false);
    }
  };

  const finalizarConferencia = async () => {
    if (isSubmitting) return;
    
    if (!conf.motoristaConfirmado && !conf.novoMotoristaRE) {
      return alert("Por favor, selecione quem está entregando a viatura.");
    }
    if (conf.avaria && !fotoAvaria) {
      return alert("Por favor, tire uma foto da avaria detectada.");
    }
    
    setIsSubmitting(true);
    try {
      const res = await gasApi.confirmarVistoriaGarageiro({
        rowId: selectedVtr.rowId,
        status_fisico: conf.avaria ? 'AVARIADA' : 'OK',
        limpeza: conf.limpa ? 'LIMPA' : 'SUJA',
        obs_garageiro: conf.obs,
        garageiro_re: user.re,
        foto_avaria: fotoAvaria,
        motorista_confirmado: conf.motoristaConfirmado,
        novo_motorista_re: conf.novoMotoristaRE
      });

      if (res.status === 'success') {
        setShowModal(false);
        setFotoAvaria(null);
        setConf({ limpa: false, motoristaConfirmado: true, novoMotoristaRE: '', avaria: false, obs: '' });
        fetchData();
      } else {
        alert(res.message || "Erro ao salvar conferência.");
      }
    } catch (e) {
      alert("Erro de conexão.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const abrirModalBloqueio = (v) => {
    const s = (v.Status || v.status || "").toUpperCase();
    const isDisp = s.includes("DISPON") || s === "OK";
    setLockData({
      prefixo: v.Prefixo || v.prefixo,
      motivo: isDisp ? 'manutencao' : 'disponivel',
      detalhes: '',
      re_responsavel: user.re
    });
    setShowLockModal(true);
  };

  const confirmarAlteracaoStatus = async () => {
    setIsSubmitting(true);
    try {
      let statusFinal = "DISPONÍVEL";
      if (lockData.motivo === 'manutencao') statusFinal = "MANUTENÇÃO";
      if (lockData.motivo === 'incidente') statusFinal = "BAIXADA (INCIDENTE)";
      if (lockData.motivo === 'pendencia_garageiro') statusFinal = "PENDÊNCIA PÁTIO";

      const res = await gasApi.alterarStatusViatura(lockData.prefixo, statusFinal, lockData);
      if (res.status === 'success') {
        setShowLockModal(false);
        fetchData();
      } else {
        alert("Erro ao alterar status.");
      }
    } catch (e) {
      alert("Erro de comunicação com o servidor.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col">
      <header className="bg-slate-900 text-white p-4 shadow-xl border-b-4 border-amber-500">
        <div className="max-w-6xl mx-auto flex justify-between items-center">
          <div className="flex items-center gap-3">
            <button onClick={onBack} className="p-2 hover:bg-slate-800 rounded-lg transition-colors">
               <X size={20} />
            </button>
            <div className="bg-amber-500 p-2 rounded-lg text-slate-900">
              <ShieldCheck size={24} />
            </div>
            <div>
              <h1 className="font-black uppercase tracking-tighter text-lg leading-none">Fiscalização de Pátio</h1>
              <p className="text-[10px] font-bold text-amber-500 uppercase tracking-widest">1º BPM - Rondon</p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-[10px] text-slate-400 font-bold uppercase">Garageiro</p>
            <p className="text-sm font-black text-white">{user?.patente} {user?.nome}</p>
          </div>
        </div>
      </header>

      <nav className="bg-white border-b border-slate-200 sticky top-0 z-10">
        <div className="max-w-6xl mx-auto flex">
          <button onClick={() => setTab('pendentes')} className={`flex-1 p-4 text-xs font-black uppercase transition-all border-b-2 ${tab === 'pendentes' ? 'border-amber-500 text-amber-600 bg-amber-50/50' : 'border-transparent text-slate-400'}`}>
            <span className="flex items-center justify-center gap-2">
              <Clock size={16} /> Conferência ({vistorias.length})
            </span>
          </button>
          <button onClick={() => setTab('frota')} className={`flex-1 p-4 text-xs font-black uppercase transition-all border-b-2 ${tab === 'frota' ? 'border-amber-500 text-amber-600 bg-amber-50/50' : 'border-transparent text-slate-400'}`}>
            <span className="flex items-center justify-center gap-2">
              <Car size={16} /> Frota Total ({viaturas.length})
            </span>
          </button>
        </div>
      </nav>

      <main className="p-4 max-w-6xl mx-auto w-full flex-1">
        {loading ? (
           <div className="py-20 text-center animate-pulse font-black text-slate-400 uppercase text-xs">Sincronizando...</div>
        ) : (
          <>
            {tab === 'pendentes' && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {vistorias.length === 0 ? (
                  <div className="col-span-full py-20 text-center bg-white rounded-[2rem] border-2 border-dashed border-slate-200">
                    <p className="text-slate-400 font-bold uppercase text-xs">Nenhum check-in pendente.</p>
                  </div>
                ) : vistorias.map((vtr, i) => (
                  <div key={i} className="bg-white border-2 border-slate-200 rounded-[2rem] p-5 shadow-sm hover:border-amber-400 transition-all">
                    <div className="flex justify-between items-start mb-4">
                      <span className="text-3xl font-black text-slate-900 tracking-tighter">{vtr.prefixo_vtr}</span>
                      <span className="bg-blue-100 text-blue-700 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest">Aguardando</span>
                    </div>
                    <div className="space-y-1 mb-6">
                      <p className="text-xs font-bold text-slate-500 uppercase flex items-center gap-1">
                         <User size={12} /> {vtr.motorista_nome}
                      </p>
                      <p className="text-[10px] text-slate-400 font-bold uppercase italic">Hodômetro: {vtr.hodometro} KM</p>
                    </div>
                    <button onClick={() => { setSelectedVtr(vtr); setShowModal(true); }} className="w-full py-4 bg-slate-900 text-white rounded-2xl font-black uppercase text-xs tracking-widest hover:bg-amber-600 transition-all flex items-center justify-center gap-2">
                      <CheckCircle2 size={16} /> Iniciar Conferência
                    </button>
                  </div>
                ))}
              </div>
            )}

            {tab === 'frota' && (
              <div className="bg-white rounded-[2rem] shadow-sm overflow-hidden border border-slate-200">
                <table className="w-full text-left text-xs md:text-sm">
                  <thead className="bg-slate-50 border-b border-slate-200">
                    <tr>
                      <th className="p-4 font-black uppercase text-slate-500 tracking-widest text-[10px]">Viatura</th>
                      <th className="p-4 font-black uppercase text-slate-500 tracking-widest text-[10px]">Status</th>
                      <th className="p-4 font-black uppercase text-slate-500 tracking-widest text-[10px] text-right">Ação</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-bold uppercase">
                    {viaturas.map((v, i) => {
                      const s = (v.Status || v.status || "").toString().toUpperCase();
                      const isDisp = s.includes("DISPON") || s === "OK";
                      return (
                        <tr key={i} className="hover:bg-slate-50 transition-colors">
                          <td className="p-4">
                            <p className="font-black text-slate-800">{v.Prefixo || v.prefixo}</p>
                            <p className="text-[10px] text-slate-400">{v.Placa || v.placa}</p>
                          </td>
                          <td className="p-4">
                            <span className={`text-[9px] font-black px-2 py-1 rounded-md ${isDisp ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                               {s || "S/ INF"}
                            </span>
                          </td>
                          <td className="p-4 text-right">
                            <button onClick={() => abrirModalBloqueio(v)} className={`transition-colors p-2 rounded-lg ${isDisp ? 'text-slate-400 hover:text-red-600' : 'text-amber-600 hover:text-green-600'}`}>
                               {isDisp ? <Unlock size={18} /> : <Lock size={18} />}
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </>
        )}
      </main>

      {/* MODAL DE CONFERÊNCIA */}
      {showModal && selectedVtr && (
        <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-lg rounded-[2.5rem] shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-300">
            <div className="bg-slate-900 p-6 text-white flex justify-between items-center">
              <div>
                <h2 className="text-2xl font-black tracking-tighter uppercase">Fiscon {selectedVtr.prefixo_vtr}</h2>
                <p className="text-[10px] text-amber-500 font-black uppercase tracking-widest">Conferência Final de Turno</p>
              </div>
              <button onClick={() => { setShowModal(false); setFotoAvaria(null); }} className="text-slate-400 hover:text-white"><X /></button>
            </div>

            <div className="p-8 space-y-5 overflow-y-auto max-h-[70vh]">
              <div className="bg-slate-50 p-4 rounded-3xl border-2 border-slate-100">
                <p className="text-[10px] font-black text-slate-400 uppercase mb-3 tracking-widest text-center">Confirmação de Identidade</p>
                <div className="flex gap-2">
                  <button 
                    onClick={() => setConf({...conf, motoristaConfirmado: true})}
                    className={`flex-1 py-3 rounded-2xl font-black text-xs transition-all ${conf.motoristaConfirmado ? 'bg-amber-500 text-slate-900 shadow-md' : 'bg-white text-slate-400 border border-slate-200'}`}
                  >
                    SIM, É O {selectedVtr.motorista_nome.split(' ')[0]}
                  </button>
                  <button 
                    onClick={() => setConf({...conf, motoristaConfirmado: false})}
                    className={`flex-1 py-3 rounded-2xl font-black text-xs transition-all ${!conf.motoristaConfirmado ? 'bg-red-600 text-white shadow-md' : 'bg-white text-slate-400 border border-slate-200'}`}
                  >
                    NÃO É ELE
                  </button>
                </div>

                {!conf.motoristaConfirmado && (
                  <div className="mt-4 animate-in slide-in-from-top-2">
                    <label className="text-[9px] font-black text-red-600 uppercase mb-1 block">Quem está entregando?</label>
                    <div className="relative">
                       <select 
                         className="w-full p-4 bg-white border-2 border-red-100 rounded-2xl font-bold text-sm outline-none appearance-none"
                         value={conf.novoMotoristaRE}
                         onChange={(e) => setConf({...conf, novoMotoristaRE: e.target.value})}
                       >
                         <option value="">Selecione o motorista...</option>
                         {motoristas.map((m, idx) => (
                           <option key={idx} value={m.re}>{m.patente} {m.nome} ({m.re})</option>
                         ))}
                       </select>
                       <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={18} />
                    </div>
                  </div>
                )}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <button 
                  onClick={() => setConf({...conf, limpa: !conf.limpa})}
                  className={`p-4 rounded-3xl border-2 flex flex-col items-center gap-2 transition-all ${conf.limpa ? 'bg-emerald-50 border-emerald-500 text-emerald-700' : 'bg-slate-50 border-transparent text-slate-400'}`}
                >
                  <CheckCircle2 size={24} />
                  <span className="text-[10px] font-black uppercase">Limpa</span>
                </button>
                <button 
                  onClick={() => setConf({...conf, avaria: !conf.avaria})}
                  className={`p-4 rounded-3xl border-2 flex flex-col items-center gap-2 transition-all ${conf.avaria ? 'bg-red-50 border-red-500 text-red-700' : 'bg-slate-50 border-transparent text-slate-400'}`}
                >
                  <AlertTriangle size={24} />
                  <span className="text-[10px] font-black uppercase">Avaria</span>
                </button>
              </div>

              {conf.avaria && (
                <div className="p-4 bg-red-50 border-2 border-dashed border-red-200 rounded-2xl">
                  <label className="flex flex-col items-center justify-center gap-2 cursor-pointer py-4 bg-white rounded-xl min-h-[100px]">
                    {fotoAvaria ? (
                      <img src={fotoAvaria} className="w-full h-24 object-cover rounded-lg" alt="Dano" />
                    ) : (
                      <>
                        <Camera size={30} className={uploading ? "animate-bounce text-red-300" : "text-red-400"} />
                        <span className="text-[10px] font-bold text-red-400">Anexar Prova do Dano</span>
                      </>
                    )}
                    <input type="file" accept="image/*" capture="environment" className="hidden" onChange={handleFileChange} />
                  </label>
                </div>
              )}

              <textarea 
                className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl p-4 text-sm font-medium outline-none focus:border-amber-500"
                placeholder="Observações do pátio..."
                value={conf.obs}
                onChange={e => setConf({...conf, obs: e.target.value})}
                rows={2}
              />

              <button 
                onClick={finalizarConferencia}
                disabled={uploading || isSubmitting}
                className={`w-full py-5 rounded-[1.5rem] font-black uppercase tracking-widest text-xs shadow-lg transition-all ${isSubmitting || uploading ? 'bg-slate-300 cursor-not-allowed' : 'bg-slate-900 text-white hover:bg-emerald-600'}`}
              >
                {isSubmitting ? 'Processando...' : uploading ? 'Aguarde a Foto...' : 'Finalizar e Liberar'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL DE STATUS (CORRIGIDO PARA O BUILD) */}
      {showLockModal && (
        <div className="fixed inset-0 bg-slate-900/90 backdrop-blur-md z-[60] flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-sm rounded-[2.5rem] p-8 shadow-2xl animate-in zoom-in duration-300">
            <div className="flex flex-col items-center text-center space-y-4">
              <div className={`p-4 rounded-full ${lockData.motivo === 'disponivel' ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'}`}>
                {lockData.motivo === 'disponivel' ? <Unlock size={40} /> : <Lock size={40} />}
              </div>
              
              <h3 className="text-2xl font-black text-slate-800 uppercase tracking-tighter">
                {lockData.motivo === 'disponivel' ? "Liberar VTR" : "Bloquear VTR"}
              </h3>
              <p className="text-xs font-bold text-slate-400 uppercase">{lockData.prefixo}</p>

              {lockData.motivo !== 'disponivel' && (
                <div className="w-full space-y-2 mt-4 text-left">
                  <label className="text-[9px] font-black text-slate-400 uppercase px-1">Motivo do Bloqueio</label>
                  <select 
                    className="w-full p-4 bg-slate-50 border-2 border-slate-100 rounded-2xl font-bold text-xs uppercase"
                    value={lockData.motivo}
                    onChange={(e) => setLockData({...lockData, motivo: e.target.value})}
                  >
                    <option value="manutencao">Manutenção</option>
                    <option value="incidente">Incidente/Avaria</option>
                    <option value="pendencia_garageiro">Pendência de Limpeza</option>
                  </select>
                </div>
              )}

              <div className="flex flex-col w-full gap-3 mt-6">
                <button 
                  onClick={confirmarAlteracaoStatus}
                  disabled={isSubmitting}
                  className={`w-full py-4 rounded-2xl font-black uppercase text-xs tracking-widest transition-all ${lockData.motivo === 'disponivel' ? 'bg-green-600 text-white' : 'bg-red-600 text-white'}`}
                >
                  {isSubmitting ? 'Salvando...' : 'Confirmar Alteração'}
                </button>
                <button 
                  onClick={() => setShowLockModal(false)}
                  className="w-full py-4 bg-slate-100 text-slate-400 rounded-2xl font-black uppercase text-xs tracking-widest"
                >
                  Voltar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default GarageiroDashboard;
