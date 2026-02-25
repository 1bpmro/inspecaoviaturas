import React, { useState, useEffect } from 'react';
import { gasApi } from '../api/gasClient';
import { useAuth } from '../lib/AuthContext';
import { 
  Car, CheckCircle2, AlertTriangle, Clock, 
  Search, ShieldCheck, Lock, Unlock, History, Camera, User, X
} from 'lucide-react';

const GarageiroDashboard = () => {
  const { user } = useAuth();
  const [tab, setTab] = useState('pendentes'); 
  const [vistorias, setVistorias] = useState([]);
  const [viaturas, setViaturas] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Estados do Modal de Conferência
  const [showModal, setShowModal] = useState(false);
  const [selectedVtr, setSelectedVtr] = useState(null);
  const [conf, setConf] = useState({ limpa: false, motoristaOk: false, avaria: false, obs: '' });
  
  // Estados para Foto de Avaria
  const [fotoAvaria, setFotoAvaria] = useState(null);
  const [uploading, setUploading] = useState(false);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [resVtr, resPend] = await Promise.all([
        gasApi.getViaturas(), 
        gasApi.getVistoriasPendentes() 
      ]);
      if (resVtr.status === 'success') setViaturas(resVtr.data);
      if (resPend.status === 'success') setVistorias(resPend.data);
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
      // Chama sua API de upload (ajuste o nome do método se necessário no seu gasClient)
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
    if (!conf.motoristaOk) return alert("Você precisa confirmar se o motorista é o correto.");
    if (conf.avaria && !fotoAvaria) return alert("Por favor, tire uma foto da avaria detectada.");
    
    const res = await gasApi.confirmarVistoriaGarageiro({
      rowId: selectedVtr.rowId,
      status_fisico: conf.avaria ? 'AVARIADA' : 'OK',
      limpeza: conf.limpa ? 'LIMPA' : 'SUJA',
      obs_garageiro: conf.obs,
      garageiro_re: user.re,
      foto_avaria: fotoAvaria // Enviando o link da foto para a nova aba
    });

    if (res.status === 'success') {
      setShowModal(false);
      // Reset total dos estados
      setFotoAvaria(null);
      setConf({ limpa: false, motoristaOk: false, avaria: false, obs: '' });
      fetchData();
    }
  };

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col">
      {/* NAV SUPERIOR */}
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

      {/* TABS */}
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
                      <span className="bg-blue-100 text-blue-700 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest">Devolução</span>
                    </div>
                    <div className="space-y-1 mb-6">
                      <p className="text-xs font-bold text-slate-500 uppercase flex items-center gap-1">
                         <User size={12} /> {vtr.motorista_nome}
                      </p>
                      <p className="text-[10px] text-slate-400 font-bold uppercase tracking-tight">Enviado às: {vtr.Data_Hora}</p>
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
                    {viaturas.map((v, i) => (
                      <tr key={i} className="hover:bg-slate-50 transition-colors">
                        <td className="p-4">
                          <p className="font-black text-slate-800">{v.prefixo}</p>
                          <p className="text-[10px] text-slate-400">{v.placa}</p>
                        </td>
                        <td className="p-4">
                          <span className={`text-[9px] font-black px-2 py-1 rounded-md ${v.status === 'disponivel' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
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

      {/* MODAL DE CONFERÊNCIA */}
      {showModal && selectedVtr && (
        <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-lg rounded-[2.5rem] shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-300">
            <div className="bg-slate-900 p-6 text-white flex justify-between items-center">
              <div>
                <h2 className="text-2xl font-black tracking-tighter uppercase">Check-in VTR {selectedVtr.prefixo_vtr}</h2>
                <p className="text-[10px] text-amber-500 font-black uppercase tracking-widest">Conferência de Devolução</p>
              </div>
              <button onClick={() => { setShowModal(false); setFotoAvaria(null); }} className="text-slate-400 hover:text-white"><X /></button>
            </div>

            <div className="p-8 space-y-5">
              <div className="space-y-3">
                <label className="flex items-center gap-4 p-4 bg-slate-50 rounded-2xl border-2 border-transparent hover:border-amber-200 cursor-pointer transition-all">
                  <input type="checkbox" className="w-6 h-6 rounded-lg accent-amber-500" checked={conf.motoristaOk} onChange={e => setConf({...conf, motoristaOk: e.target.checked})} />
                  <span className="text-xs font-black uppercase text-slate-700 italic">É o {selectedVtr.motorista_nome} que está entregando?</span>
                </label>

                <label className="flex items-center gap-4 p-4 bg-slate-50 rounded-2xl border-2 border-transparent hover:border-amber-200 cursor-pointer transition-all">
                  <input type="checkbox" className="w-6 h-6 rounded-lg accent-amber-500" checked={conf.limpa} onChange={e => setConf({...conf, limpa: e.target.checked})} />
                  <span className="text-xs font-black uppercase text-slate-700">A Viatura está limpa?</span>
                </label>

                <label className="flex items-center gap-4 p-4 bg-slate-50 rounded-2xl border-2 border-transparent hover:border-red-200 cursor-pointer transition-all">
                  <input type="checkbox" className="w-6 h-6 rounded-lg accent-red-500" checked={conf.avaria} onChange={e => setConf({...conf, avaria: e.target.checked})} />
                  <span className="text-xs font-black uppercase text-red-600">Detectou novas avarias/danos?</span>
                </label>
              </div>

              {/* CAMPO DE FOTO CONDICIONAL */}
              {conf.avaria && (
                <div className="p-4 bg-red-50 border-2 border-dashed border-red-200 rounded-2xl animate-in slide-in-from-top-2">
                  <p className="text-[10px] font-black text-red-600 uppercase mb-2 tracking-widest text-center">📸 Registro Obrigatório da Avaria</p>
                  
                  <label className="flex flex-col items-center justify-center gap-2 cursor-pointer py-4 bg-white hover:bg-red-100 transition-all rounded-xl shadow-inner min-h-[140px]">
                    {fotoAvaria ? (
                      <div className="relative w-full px-2">
                        <img src={fotoAvaria} className="w-full h-32 object-cover rounded-lg shadow-md" alt="Avaria" />
                        <div className="absolute top-2 right-4 bg-green-500 text-white p-1 rounded-full"><CheckCircle2 size={16}/></div>
                      </div>
                    ) : (
                      <>
                        <Camera size={40} className={uploading ? "animate-bounce text-red-300" : "text-red-400"} />
                        <span className="text-[10px] font-bold text-red-400 uppercase">Tirar Foto do Dano</span>
                      </>
                    )}
                    <input type="file" accept="image/*" capture="environment" className="hidden" onChange={handleFileChange} disabled={uploading} />
                  </label>
                  {uploading && <p className="text-center text-[9px] font-bold text-red-500 animate-pulse mt-2">ENVIANDO PROVA PARA O SISTEMA...</p>}
                </div>
              )}

              <div className="space-y-1">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Observações Finais</p>
                <textarea 
                  className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl p-4 text-sm font-medium outline-none focus:border-amber-500 transition-all"
                  placeholder="Descreva o estado ou itens faltantes..."
                  value={conf.obs}
                  onChange={e => setConf({...conf, obs: e.target.value})}
                  rows={2}
                />
              </div>

              <button 
                onClick={finalizarConferencia}
                disabled={uploading}
                className={`w-full py-5 rounded-[1.5rem] font-black uppercase tracking-widest text-xs shadow-lg transition-all active:scale-95 ${uploading ? 'bg-slate-300' : 'bg-emerald-600 text-white shadow-emerald-900/20'}`}
              >
                {uploading ? 'Aguarde o Upload...' : 'Concluir Fiscalização'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default GarageiroDashboard;
