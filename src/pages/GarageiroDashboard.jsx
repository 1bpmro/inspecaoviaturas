import React, { useState, useEffect, useRef } from 'react';
import { gasApi } from '../api/gasClient';
import { useAuth } from '../lib/AuthContext';
import { 
  Car, CheckCircle2, AlertTriangle, Clock, RefreshCw,
  Search, ShieldCheck, Lock, Unlock, Camera, User, X, 
  AlertCircle, Inbox, Droplets, Eye, Check, Volume2, VolumeX,
  Wrench, ChevronDown
} from 'lucide-react';

const GarageiroDashboard = ({ onBack }) => {
  const { user } = useAuth();
  const [tab, setTab] = useState('pendentes'); 
  const [vistorias, setVistorias] = useState([]);
  const [viaturas, setViaturas] = useState([]);
  const [motoristas, setMotoristas] = useState([]); 
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [soundEnabled, setSoundEnabled] = useState(false);
  const [finalizadosLocal, setFinalizadosLocal] = useState([]);
  
  // Áudio de notificação
  const audioRef = useRef(new Audio('https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3'));
  const prevItemsCount = useRef(0);

  const [showModal, setShowModal] = useState(false);
  const [selectedVtr, setSelectedVtr] = useState(null);
  const [viewingPhoto, setViewingPhoto] = useState(null);
  
  const [conf, setConf] = useState({ 
    limpezaInterna: true, limpezaExterna: true, pertences: 'NÃO',
    detalhePertences: '', motoristaConfirmado: true, novoMotoristaRE: '',
    avaria: false, obs: '', oleoConfirmado: false
  });
  
  const [fotoAvaria, setFotoAvaria] = useState(null);
  const [showLockModal, setShowLockModal] = useState(false);
  const [lockData, setLockData] = useState({ prefixo: '', motivo: 'manutencao', detalhes: '', re_responsavel: '' });

  // 1. CARREGAMENTO E AUTO-REFRESH
  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 30000); 
    return () => clearInterval(interval);
  }, []);

  // 2. LOGICA DE SOM (Desbloqueio de áudio por interação do usuário)
  const toggleSound = () => {
    if (!soundEnabled) {
      // Tenta dar um play curto e silencioso para "acordar" o áudio no navegador
      audioRef.current.play().then(() => {
        audioRef.current.pause();
        audioRef.current.currentTime = 0;
      }).catch(() => {});
    }
    setSoundEnabled(!soundEnabled);
  };

  const fetchData = async () => {
    setLoading(true);
    try {
      const [resVtr, resPend, resMot] = await Promise.all([
        gasApi.getViaturas(),           
        gasApi.getVistoriasPendentes(), 
        gasApi.getEfetivoCompleto()
      ]);
      
      let frotaGeral = resVtr?.status === 'success' ? resVtr.data : [];
      if (resVtr?.status === 'success') setViaturas(frotaGeral);
      if (resMot?.status === 'success') setMotoristas(resMot.data);

      let listaFinal = [];

      // A. Vistorias da Guia Mensal (Checklists pendentes)
      if (resPend?.status === 'success' && Array.isArray(resPend.data)) {
        listaFinal = resPend.data
          .filter(v => (v.tipo_vistoria || v.tipo || "").toUpperCase() !== "SAIDA")
          .map(v => ({
            ...v,
            origem: "VISTORIA",
            prefixo: v.prefixo_vtr || v.prefixo,
            troca_oleo: frotaGeral.find(f => f.Prefixo === (v.prefixo_vtr || v.prefixo))?.Status === "TROCA DE ÓLEO" ? "SIM" : "NÃO"
          }));
      }

      // B. Vistorias baseadas no Status do Painel (Patrimônio)
      frotaGeral.forEach(vtr => {
        const statusVtr = (vtr.Status || "").toUpperCase().trim();
        const prefixo = vtr.Prefixo || vtr.prefixo;
        const statusAlvo = ["AGUARDANDO CONFERÊNCIA", "PÁTIO", "AGUARDANDO PÁTIO", "ENTRADA REGISTRADA", "TROCA DE ÓLEO"];

        if (prefixo && statusAlvo.includes(statusVtr)) {
          if (!listaFinal.some(p => p.prefixo === prefixo)) {
            listaFinal.push({
              prefixo: prefixo,
              prefixo_vtr: prefixo,
              motorista_nome: vtr.UltimoMotoristaNome || vtr.Motorista || "S/ INF",
              origem: "STATUS_PAINEL", 
              timestamp: vtr.DataHoraUltimaAtualizacao || new Date().toISOString(),
              rowId: vtr.rowId || vtr.ID,
              troca_oleo: (statusVtr === "TROCA DE ÓLEO" || vtr.oleo_pendente === "SIM") ? "SIM" : "NÃO"
            });
          }
        }
      });

      // Filtro de segurança (removendo o que foi finalizado na sessão)
      const filtradas = listaFinal.filter(v => {
        const id = v.rowId || v.id_sistema || v.id_manutencao || v.prefixo;
        return !finalizadosLocal.includes(id);
      });

      // SOM DE NOTIFICAÇÃO
      if (soundEnabled && filtradas.length > prevItemsCount.current) {
        audioRef.current.play().catch(e => console.log("Erro áudio:", e));
      }
      
      prevItemsCount.current = filtradas.length;
      setVistorias(filtradas);
    } catch (error) {
      console.error("Erro na sincronização:", error);
    } finally {
      setLoading(false);
    }
  };

  const finalizarConferencia = async () => {
    if (isSubmitting) return;

    // Validação de Motorista
    const precisaMotorista = !["MANUTENCAO_AVULSA"].includes(selectedVtr.origem);
    if (precisaMotorista && !conf.motoristaConfirmado && !conf.novoMotoristaRE) {
      return alert("Selecione o motorista que está entregando a viatura.");
    }

    // Validação de Óleo
    const pendenciaOleo = selectedVtr.troca_oleo === "SIM";
    if (pendenciaOleo && !conf.oleoConfirmado) {
      return alert("Você deve confirmar visualmente a troca de óleo antes de prosseguir.");
    }

    // Validação de Foto para Avarias
    if (conf.avaria && !fotoAvaria) {
      return alert("É obrigatório anexar uma foto para registrar a avaria.");
    }

    setIsSubmitting(true);
    const idParaRemover = selectedVtr.rowId || selectedVtr.id_sistema || selectedVtr.id_manutencao || selectedVtr.prefixo;
    const prefixoVtr = (selectedVtr.prefixo || "").toString().toUpperCase();

    try {
      const payload = {
        prefixo: prefixoVtr,
        rowId: selectedVtr.rowId,
        origem: selectedVtr.origem,
        status_fisico: conf.avaria ? 'AVARIADA' : 'OK',
        limpeza: `INT: ${conf.limpezaInterna ? 'C' : 'NC'} | EXT: ${conf.limpezaExterna ? 'C' : 'NC'}`,
        pertences: conf.pertences === 'SIM' ? `SIM: ${conf.detalhePertences}` : 'NÃO',
        obs_garageiro: conf.obs,
        garageiro_re: user.re,
        foto_avaria: fotoAvaria,
        motorista_confirmado: conf.motoristaConfirmado,
        novo_motorista_re: conf.novoMotoristaRE,
        validacao_oleo_concluida: conf.oleoConfirmado,
        km_registro: selectedVtr.hodometro_oleo || selectedVtr.km || selectedVtr.Km
      };

      const res = await gasApi.confirmarVistoriaGarageiro(payload);

      if (res.status === 'success') {
        const novoStatus = conf.avaria ? "MANUTENÇÃO" : "DISPONÍVEL";
        await gasApi.alterarStatusViatura(prefixoVtr, novoStatus, {
          motivo: 'conferencia_patio',
          detalhes: `Conferência finalizada. ${conf.oleoConfirmado ? 'Óleo validado.' : ''}`,
          re_responsavel: user.re,
          rowId: selectedVtr.rowId
        });

        setFinalizadosLocal(prev => [...prev, idParaRemover]);
        setShowModal(false);
        setConf({ 
          limpezaInterna: true, limpezaExterna: true, pertences: 'NÃO', 
          detalhePertences: '', motoristaConfirmado: true, novoMotoristaRE: '', 
          avaria: false, obs: '', oleoConfirmado: false 
        });
        setFotoAvaria(null);
        setTimeout(fetchData, 1500);
      } else {
        alert("Erro: " + res.message);
      }
    } catch (e) {
      alert("Erro de conexão.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Funções Auxiliares
  const motoristasFiltrados = motoristas.filter(m => {
    const nome = (m.Nome || m.nome || "").toUpperCase();
    return !/ADMIN|PVSA|TEN|MAJ|CAP|ASP|SUB|ST/i.test(nome);
  });

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => setFotoAvaria(reader.result);
      reader.readAsDataURL(file);
    }
  };

  const calcularEspera = (ts) => {
    if (!ts) return null;
    const diff = Math.floor((new Date() - new Date(ts)) / 60000);
    return diff > 0 ? diff : 0;
  };

  const confirmarAlteracaoStatus = async () => {
    if (isSubmitting) return;
    setIsSubmitting(true);
    try {
      const novoStatus = lockData.motivo === 'disponivel' ? 'DISPONÍVEL' : 'MANUTENÇÃO';
      await gasApi.alterarStatusViatura(lockData.prefixo, novoStatus, {
        motivo: lockData.motivo,
        detalhes: 'Alteração via Painel Garageiro',
        re_responsavel: user.re
      });
      setShowLockModal(false);
      fetchData();
    } catch (e) {
      alert("Erro ao alterar status.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col font-sans">
      <header className="bg-slate-900 text-white p-4 shadow-xl border-b-4 border-amber-500">
        <div className="max-w-6xl mx-auto flex justify-between items-center">
          <div className="flex items-center gap-3">
            <button onClick={onBack} className="p-2 hover:bg-slate-800 rounded-lg transition-colors"><X size={20} /></button>
            <div className="bg-amber-500 p-2 rounded-lg text-slate-900"><ShieldCheck size={24} /></div>
            <div>
              <h1 className="font-black uppercase tracking-tighter text-lg leading-none">Fiscalização de Pátio</h1>
              <p className="text-[10px] font-bold text-amber-500 uppercase tracking-widest">1º BPM - Rondon</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={toggleSound} className={`p-2 rounded-xl transition-all ${soundEnabled ? 'bg-emerald-500 text-white' : 'bg-slate-800 text-slate-400'}`}>
              {soundEnabled ? <Volume2 size={20} /> : <VolumeX size={20} />}
            </button>
            <button onClick={fetchData} className={`p-2 rounded-full ${loading ? 'animate-spin text-amber-500' : 'text-slate-400'}`}><RefreshCw size={20} /></button>
          </div>
        </div>
      </header>

      <nav className="bg-white border-b border-slate-200 sticky top-0 z-10 shadow-sm">
        <div className="max-w-6xl mx-auto flex">
          <button onClick={() => setTab('pendentes')} className={`flex-1 p-4 text-xs font-black uppercase transition-all border-b-2 ${tab === 'pendentes' ? 'border-amber-500 text-amber-600 bg-amber-50/50' : 'border-transparent text-slate-400'}`}>
            <Clock size={16} className="inline mr-2"/> Conferência ({vistorias.length})
          </button>
          <button onClick={() => setTab('frota')} className={`flex-1 p-4 text-xs font-black uppercase transition-all border-b-2 ${tab === 'frota' ? 'border-amber-500 text-amber-600 bg-amber-50/50' : 'border-transparent text-slate-400'}`}>
            <Car size={16} className="inline mr-2"/> Frota Total ({viaturas.length})
          </button>
        </div>
      </nav>

      <main className="p-4 max-w-6xl mx-auto w-full flex-1">
        {tab === 'pendentes' && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {vistorias.length === 0 ? (
              <div className="col-span-full py-20 flex flex-col items-center justify-center bg-white rounded-[2.5rem] border-2 border-dashed border-slate-200 text-center">
                <Inbox size={48} className="text-slate-200 mb-2" />
                <p className="text-slate-400 font-black uppercase text-xs tracking-widest">Pátio em conformidade</p>
              </div>
            ) : vistorias.map((vtr, i) => {
              const espera = calcularEspera(vtr.timestamp || vtr.data_hora);
              const isOleo = vtr.troca_oleo === "SIM";
              return (
                <div key={i} className={`bg-white border-2 rounded-[2.5rem] p-6 shadow-sm hover:shadow-md transition-shadow ${isOleo ? 'border-amber-400 bg-amber-50/20' : 'border-slate-200'}`}>
                  <div className="flex justify-between items-start mb-4">
                    <span className="text-4xl font-black text-slate-900 tracking-tighter">{vtr.prefixo}</span>
                    <div className="text-right">
                      <span className={`${isOleo ? 'bg-amber-500 text-white' : 'bg-blue-100 text-blue-700'} px-3 py-1 rounded-full text-[9px] font-black uppercase`}>
                        {isOleo ? 'PENDÊNCIA ÓLEO' : 'CHECKLIST ENTRADA'}
                      </span>
                      {espera !== null && <p className="text-[10px] font-black mt-2 text-slate-400 uppercase tracking-tighter">{espera} MIN AGUARDANDO</p>}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 mb-6 bg-slate-50 p-3 rounded-2xl border border-slate-100">
                    <div className="bg-slate-200 p-2 rounded-lg text-slate-500"><User size={14} /></div>
                    <p className="text-[11px] font-bold text-slate-600 uppercase truncate">{vtr.motorista_nome || "S/ INF"}</p>
                  </div>
                  <button onClick={() => { setSelectedVtr(vtr); setShowModal(true); }} className={`w-full py-4 rounded-2xl font-black uppercase text-xs shadow-lg transition-transform active:scale-95 ${isOleo ? 'bg-amber-600 text-white' : 'bg-slate-900 text-white'}`}>
                    Iniciar Conferência
                  </button>
                </div>
              );
            })}
          </div>
        )}

        {tab === 'frota' && (
          <div className="space-y-4">
            <div className="relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
              <input type="text" placeholder="BUSCAR VTR..." className="w-full p-5 pl-12 bg-white border-2 border-slate-200 rounded-3xl font-black text-xs uppercase outline-none focus:border-amber-500 transition-colors" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
            </div>
            <div className="bg-white rounded-[2rem] shadow-sm overflow-hidden border border-slate-200">
              <table className="w-full text-left text-xs md:text-sm">
                <tbody className="divide-y divide-slate-100 font-bold uppercase">
                  {viaturas.filter(v => (v.Prefixo || "").toLowerCase().includes(searchTerm.toLowerCase())).map((v, i) => {
                    const s = (v.Status || "").toUpperCase();
                    const isDisp = s.includes("DISPON") || s === "OK";
                    return (
                      <tr key={i} className="hover:bg-slate-50 transition-colors">
                        <td className="p-4">
                          <p className="font-black text-slate-800">{v.Prefixo}</p>
                          <p className="text-[10px] text-slate-400">{v.Placa}</p>
                        </td>
                        <td className="p-4">
                          <span className={`text-[9px] font-black px-3 py-1 rounded-full ${isDisp ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>
                             {s}
                          </span>
                        </td>
                        <td className="p-4 text-right">
                          <button onClick={() => {
                            setLockData({ prefixo: v.Prefixo, motivo: isDisp ? 'manutencao' : 'disponivel', re_responsavel: user.re });
                            setShowLockModal(true);
                          }} className="p-2 text-slate-400 hover:text-slate-900 transition-colors">
                             {isDisp ? <Unlock size={18} /> : <Lock size={18} />}
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </main>

      {/* MODAL PRINCIPAL */}
      {showModal && selectedVtr && (
        <div className="fixed inset-0 bg-slate-900/90 backdrop-blur-md z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white w-full max-w-lg rounded-[3rem] shadow-2xl overflow-hidden flex flex-col my-auto max-h-[95vh]">
            <div className="bg-slate-900 p-6 text-white flex justify-between items-center shrink-0">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-amber-500 rounded-2xl flex items-center justify-center text-slate-900 font-black text-xl">{(selectedVtr.prefixo || "").toString().slice(-2)}</div>
                <div>
                  <h2 className="text-2xl font-black uppercase tracking-tighter leading-none">{selectedVtr.prefixo}</h2>
                  <p className="text-[10px] text-amber-500 font-bold uppercase mt-1 tracking-widest">Procedimento de Pátio</p>
                </div>
              </div>
              <button onClick={() => setShowModal(false)} className="p-2 hover:bg-white/10 rounded-full transition-colors"><X size={24} /></button>
            </div>

            <div className="p-6 space-y-6 overflow-y-auto bg-white">
              <div className="space-y-3">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">Identificação do Motorista</p>
                <div className="bg-slate-50 p-4 rounded-3xl border-2 border-slate-100">
                  <p className="text-xs font-bold text-slate-800 text-center mb-4 uppercase">O Motorista <span className="text-amber-600 underline">{selectedVtr.motorista_nome}</span> está entregando?</p>
                  <div className="flex gap-2">
                    <button onClick={() => setConf({...conf, motoristaConfirmado: true, novoMotoristaRE: ''})} className={`flex-1 py-4 rounded-2xl font-black text-xs uppercase transition-all ${conf.motoristaConfirmado ? 'bg-slate-900 text-white shadow-lg' : 'bg-white text-slate-300 border-2 border-slate-100'}`}>SIM</button>
                    <button onClick={() => setConf({...conf, motoristaConfirmado: false})} className={`flex-1 py-4 rounded-2xl font-black text-xs uppercase transition-all ${!conf.motoristaConfirmado ? 'bg-red-600 text-white shadow-lg' : 'bg-white text-slate-300 border-2 border-slate-100'}`}>NÃO</button>
                  </div>
                  
                  {!conf.motoristaConfirmado && (
                    <div className="mt-4">
                      <select 
                        className="w-full p-4 bg-white border-2 border-red-100 rounded-2xl font-black text-xs uppercase appearance-none outline-none"
                        value={conf.novoMotoristaRE}
                        onChange={(e) => setConf({...conf, novoMotoristaRE: e.target.value})}
                      >
                        <option value="">-- QUEM ESTÁ ENTREGANDO? --</option>
                        {motoristasFiltrados.map((m, idx) => (
                          <option key={idx} value={m.RE || m.re}>{m.PostoGrad || ""} {m.NomeGuerra || m.nome} ({m.RE || m.re})</option>
                        ))}
                      </select>
                    </div>
                  )}
                </div>
              </div>

              <div className="space-y-4">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">Checklist de Recebimento</p>
                <div className="grid grid-cols-2 gap-3">
                  <button onClick={() => setConf({...conf, limpezaInterna: !conf.limpezaInterna})} className={`p-4 rounded-3xl border-2 font-black text-[10px] uppercase transition-all ${conf.limpezaInterna ? 'bg-emerald-50 border-emerald-500 text-emerald-700' : 'bg-red-50 border-red-200 text-red-700'}`}>INT: {conf.limpezaInterna ? 'LIMPO' : 'SUJO'}</button>
                  <button onClick={() => setConf({...conf, limpezaExterna: !conf.limpezaExterna})} className={`p-4 rounded-3xl border-2 font-black text-[10px] uppercase transition-all ${conf.limpezaExterna ? 'bg-emerald-50 border-emerald-500 text-emerald-700' : 'bg-slate-50 text-slate-400'}`}>EXT: {conf.limpezaExterna ? 'LIMPO' : 'SUJO'}</button>
                  <button onClick={() => setConf({...conf, pertences: conf.pertences === 'NÃO' ? 'SIM' : 'NÃO'})} className={`p-4 rounded-3xl border-2 font-black text-[10px] uppercase transition-all ${conf.pertences === 'NÃO' ? 'bg-emerald-50 border-emerald-500 text-emerald-700' : 'bg-amber-50 border-amber-500 text-amber-700'}`}>PERTENCES: {conf.pertences}</button>
                  <button onClick={() => setConf({...conf, avaria: !conf.avaria})} className={`p-4 rounded-3xl border-2 font-black text-[10px] uppercase transition-all ${!conf.avaria ? 'bg-emerald-50 border-emerald-500 text-emerald-700' : 'bg-red-600 border-red-600 text-white animate-pulse'}`}>AVARIAS: {conf.avaria ? 'SIM' : 'NÃO'}</button>
                </div>

                {selectedVtr.troca_oleo === "SIM" && (
                  <div className="bg-amber-50 border-2 border-amber-200 rounded-3xl p-5 space-y-4">
                    <div className="flex justify-between items-center">
                      <h4 className="text-amber-800 font-black text-xs uppercase flex items-center gap-2"><Droplets size={16} /> Comprovante de Óleo</h4>
                      {selectedVtr.foto_evidencia && (
                        <button onClick={() => setViewingPhoto(selectedVtr.foto_evidencia)} className="p-2 bg-white rounded-xl text-amber-600"><Eye size={20} /></button>
                      )}
                    </div>
                    <button onClick={() => setConf({...conf, oleoConfirmado: !conf.oleoConfirmado})} className={`w-full py-4 rounded-2xl font-black text-[10px] uppercase border-2 transition-all ${conf.oleoConfirmado ? 'bg-emerald-600 border-emerald-600 text-white shadow-md' : 'bg-white border-amber-300 text-amber-600'}`}>{conf.oleoConfirmado ? 'ÓLEO VALIDADO' : 'CONFIRMAR TROCA DE ÓLEO'}</button>
                  </div>
                )}

                {conf.avaria && (
                  <div className="bg-slate-900 p-5 rounded-3xl space-y-4">
                    <div className="flex items-center gap-3 text-white">
                      <Camera className="text-amber-500" size={24} />
                      <p className="text-[11px] font-black uppercase tracking-tighter">Registrar Avaria (Obrigatório)</p>
                    </div>
                    <input type="file" accept="image/*" capture="environment" onChange={handleFileChange} className="hidden" id="camera-input" />
                    <label htmlFor="camera-input" className="block">
                      <div className={`bg-slate-800 border-2 border-dashed rounded-2xl p-6 text-center cursor-pointer ${fotoAvaria ? 'border-emerald-500' : 'border-slate-700'}`}>
                        {fotoAvaria ? (
                          <img src={fotoAvaria} className="h-32 mx-auto rounded-xl" alt="Preview" />
                        ) : (
                          <p className="text-slate-500 font-black text-[10px] uppercase">Toque para tirar foto</p>
                        )}
                      </div>
                    </label>
                  </div>
                )}

                <textarea className="w-full bg-slate-50 border-2 border-slate-100 rounded-3xl p-4 text-xs font-bold uppercase outline-none focus:border-amber-400" placeholder="OBSERVAÇÕES..." rows={2} value={conf.obs} onChange={e => setConf({...conf, obs: e.target.value})} />
              </div>

              <button 
                onClick={finalizarConferencia}
                disabled={isSubmitting}
                className={`w-full py-5 rounded-[2rem] font-black uppercase text-xs shadow-2xl transition-all ${isSubmitting ? 'bg-slate-200' : 'bg-slate-900 text-white hover:bg-emerald-600 active:scale-95'}`}
              >
                {isSubmitting ? 'Gravando...' : 'Finalizar Validação'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* VISUALIZADOR DE FOTO */}
      {viewingPhoto && (
        <div className="fixed inset-0 bg-black/95 z-[100] flex flex-col p-4" onClick={() => setViewingPhoto(null)}>
          <button className="self-end text-white p-4"><X size={32} /></button>
          <div className="flex-1 flex items-center justify-center p-4">
            <img src={viewingPhoto.startsWith('http') ? viewingPhoto : `data:image/jpeg;base64,${viewingPhoto}`} className="max-w-full max-h-full object-contain rounded-2xl" alt="Evidência" />
          </div>
        </div>
      )}

      {/* MODAL LOCK */}
      {showLockModal && (
        <div className="fixed inset-0 bg-slate-900/90 backdrop-blur-md z-[60] flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-sm rounded-[3rem] p-8">
            <div className="flex flex-col items-center text-center space-y-6">
              <div className={`w-20 h-20 rounded-full flex items-center justify-center ${lockData.motivo === 'disponivel' ? 'bg-emerald-100 text-emerald-600' : 'bg-red-100 text-red-600'}`}>
                {lockData.motivo === 'disponivel' ? <Unlock size={40} /> : <Lock size={40} />}
              </div>
              <h3 className="text-2xl font-black text-slate-800 uppercase">{lockData.motivo === 'disponivel' ? "Liberar VTR" : "Bloquear VTR"}</h3>
              <div className="flex flex-col w-full gap-3">
                <button onClick={confirmarAlteracaoStatus} disabled={isSubmitting} className="w-full py-4 bg-slate-900 text-white rounded-2xl font-black uppercase text-xs">Confirmar</button>
                <button onClick={() => setShowLockModal(false)} className="w-full py-4 bg-slate-100 text-slate-400 rounded-2xl font-black uppercase text-xs">Cancelar</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default GarageiroDashboard;
