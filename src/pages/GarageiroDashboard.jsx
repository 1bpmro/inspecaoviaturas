import React, { useState, useEffect, useRef } from 'react';
import { gasApi } from '../api/gasClient';
import { useAuth } from '../lib/AuthContext';
import { 
  Car, CheckCircle2, AlertTriangle, Clock, RefreshCw,
  Search, ShieldCheck, Lock, Unlock, History, Camera, User, X, 
  AlertCircle, ChevronDown, Inbox, Droplets, Eye, Check, Volume2, VolumeX,
  Wrench
} from 'lucide-react';

const GarageiroDashboard = ({ onBack }) => {
  const { user } = useAuth();
  const [tab, setTab] = useState('pendentes'); 
  const [vistorias, setVistorias] = useState([]);
  const [manutencoesRecentas, setManutencoesRecentes] = useState([]); // Nova state para óleo instantâneo
  const [viaturas, setViaturas] = useState([]);
  const [motoristas, setMotoristas] = useState([]); 
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [soundEnabled, setSoundEnabled] = useState(false);
  
  const audioRef = useRef(new Audio('https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3'));
  const prevItemsCount = useRef(0);

  const [showModal, setShowModal] = useState(false);
  const [selectedVtr, setSelectedVtr] = useState(null);
  const [viewingPhoto, setViewingPhoto] = useState(null);
  
  const [conf, setConf] = useState({ 
    limpezaInterna: true,
    limpezaExterna: true,
    pertences: 'NÃO',
    detalhePertences: '',
    motoristaConfirmado: true, 
    novoMotoristaRE: '',
    avaria: false, 
    obs: '',
    oleoConfirmado: false
  });
  
  const [fotoAvaria, setFotoAvaria] = useState(null);
  const [uploading, setUploading] = useState(false);

  const [showLockModal, setShowLockModal] = useState(false);
  const [lockData, setLockData] = useState({ 
    prefixo: '', motivo: 'manutencao', detalhes: '', re_responsavel: '' 
  });

  const calcularEspera = (timestamp) => {
    if (!timestamp) return null;
    const diff = Math.floor((new Date() - new Date(timestamp)) / 60000);
    return diff >= 0 ? diff : 0;
  };

  const fetchData = async () => {
    setLoading(true);
    try {
      // Adicionado busca de manutenções para pegar o óleo em tempo real
      const [resVtr, resPend, resMot] = await Promise.all([
        gasApi.getViaturas(), 
        gasApi.getVistoriasPendentes(),
        gasApi.getEfetivoCompleto()
      ]);
      
      if (resVtr.status === 'success') setViaturas(resVtr.data);
      
      if (resPend.status === 'success') {
        const novasVistorias = resPend.data;
        
        // Filtra manutenções de óleo que ainda não foram "validadas" se o seu backend permitir
        // Ou simplesmente exibe as vistorias que já trazem o campo troca_oleo: "SIM"
        
        const totalAlertas = novasVistorias.length;

        if (soundEnabled && totalAlertas > prevItemsCount.current) {
          audioRef.current.play().catch(e => console.log("Erro ao tocar som:", e));
        }
        
        prevItemsCount.current = totalAlertas;
        setVistorias(novasVistorias);
      }
      
      if (resMot.status === 'success') setMotoristas(resMot.data);
    } catch (error) {
      console.error("Erro ao buscar dados:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 30000);
    return () => clearInterval(interval);
  }, [soundEnabled]);

  const handleFileChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setUploading(true);
    try {
      const res = await gasApi.uploadFoto(file); 
      if (res.status === 'success') setFotoAvaria(res.url);
    } catch (err) {
      alert("Falha ao processar foto.");
    } finally {
      setUploading(false);
    }
  };

  const finalizarConferencia = async () => {
    if (isSubmitting) return;
    if (!conf.motoristaConfirmado && !conf.novoMotoristaRE) return alert("Selecione o motorista.");
    if (conf.pertences === 'SIM' && !conf.detalhePertences) return alert("Descreva os pertences.");
    if (conf.avaria && !fotoAvaria) return alert("Tire foto da avaria.");
    if (selectedVtr.troca_oleo === "SIM" && !conf.oleoConfirmado) return alert("Confirme a troca de óleo visualmente.");

    setIsSubmitting(true);
    try {
      const res = await gasApi.confirmarVistoriaGarageiro({
        rowId: selectedVtr.rowId,
        id_vistoria: selectedVtr.id_sistema || selectedVtr.ID_SISTEMA,
        status_fisico: conf.avaria ? 'AVARIADA' : 'OK',
        limpeza: `INT: ${conf.limpezaInterna ? 'C' : 'NC'} | EXT: ${conf.limpezaExterna ? 'C' : 'NC'}`,
        pertences: conf.pertences === 'SIM' ? `SIM: ${conf.detalhePertences}` : 'NÃO',
        obs_garageiro: conf.obs,
        garageiro_re: user.re,
        foto_avaria: fotoAvaria,
        motorista_confirmado: conf.motoristaConfirmado,
        novo_motorista_re: conf.novoMotoristaRE,
        troca_oleo_aprovada: selectedVtr.troca_oleo === "SIM"
      });

      if (res.status === 'success') {
        setShowModal(false);
        setFotoAvaria(null);
        setConf({ 
          limpezaInterna: true, limpezaExterna: true, pertences: 'NÃO', 
          detalhePertences: '', motoristaConfirmado: true, novoMotoristaRE: '', 
          avaria: false, obs: '', oleoConfirmado: false 
        });
        fetchData();
      }
    } catch (e) {
      alert("Erro ao salvar.");
    } finally {
      setIsSubmitting(false);
    }
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
      }
    } catch (e) {
      alert("Erro de comunicação.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col">
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
            <button 
              onClick={() => setSoundEnabled(!soundEnabled)}
              className={`p-2 rounded-xl flex items-center gap-2 transition-all ${soundEnabled ? 'bg-emerald-500 text-white' : 'bg-slate-800 text-slate-400'}`}
            >
              {soundEnabled ? <Volume2 size={20} /> : <VolumeX size={20} />}
              <span className="text-[10px] font-black uppercase hidden sm:block">
                {soundEnabled ? 'Alerta Ligado' : 'Som Desligado'}
              </span>
            </button>
            <button onClick={fetchData} className={`p-2 rounded-full ${loading ? 'animate-spin text-amber-500' : 'text-slate-400'}`}><RefreshCw size={20} /></button>
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
        {tab === 'pendentes' && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {vistorias.length === 0 ? (
              <div className="col-span-full py-20 flex flex-col items-center justify-center bg-white rounded-[2.5rem] border-2 border-dashed border-slate-200">
                <Inbox size={48} className="text-slate-200 mb-2" />
                <p className="text-slate-400 font-black uppercase text-xs">Aguardando novos check-ins...</p>
              </div>
            ) : vistorias.map((vtr, i) => {
              const espera = calcularEspera(vtr.timestamp || vtr.data_hora);
              const isOleoInstantaneo = vtr.tipo === "ÓLEO" && !vtr.id_vistoria; // Identifica se é apenas aviso de óleo

              return (
                <div key={i} className={`bg-white border-2 rounded-[2rem] p-5 shadow-sm transition-all animate-in fade-in slide-in-from-bottom-4 ${isOleoInstantaneo ? 'border-amber-500 bg-amber-50/30' : 'border-slate-200 hover:border-amber-400'}`}>
                  <div className="flex justify-between items-start mb-4">
                    <span className="text-3xl font-black text-slate-900 tracking-tighter">{vtr.prefixo_vtr || vtr.prefixo}</span>
                    <div className="text-right">
                      <span className={`${isOleoInstantaneo ? 'bg-amber-500 text-white' : 'bg-blue-100 text-blue-700'} px-3 py-1 rounded-full text-[9px] font-black uppercase`}>
                        {isOleoInstantaneo ? 'ALERTA ÓLEO' : 'Pátio'}
                      </span>
                      {espera !== null && (
                        <p className={`text-[10px] font-black mt-1 ${espera > 10 ? 'text-red-500 animate-pulse' : 'text-slate-400'}`}>
                          HÁ {espera} MIN
                        </p>
                      )}
                    </div>
                  </div>
                  
                  <div className="space-y-2 mb-6">
                    <p className="text-xs font-bold text-slate-500 uppercase flex items-center gap-1">
                      <User size={12} /> {vtr.motorista_nome || vtr.responsavel_re || "S/ INF"}
                    </p>
                    
                    {(vtr.troca_oleo === "SIM" || isOleoInstantaneo) && (
                      <div className="flex flex-col gap-1">
                        <span className="inline-flex items-center gap-1 bg-amber-100 text-amber-700 px-2 py-1 rounded-lg text-[9px] font-black uppercase w-fit">
                          <Droplets size={12} /> Troca de Óleo Realizada
                        </span>
                        {isOleoInstantaneo && (
                          <p className="text-[9px] font-bold text-amber-600 uppercase italic">Vtr ainda em patrulhamento</p>
                        )}
                      </div>
                    )}
                  </div>

                  <button 
                    onClick={() => { 
                      setSelectedVtr(vtr); 
                      setShowModal(true); 
                    }} 
                    className={`w-full py-4 rounded-2xl font-black uppercase text-xs tracking-widest transition-all flex items-center justify-center gap-2 shadow-lg ${isOleoInstantaneo ? 'bg-amber-600 text-white shadow-amber-200' : 'bg-slate-900 text-white shadow-slate-200 hover:bg-amber-600'}`}
                  >
                    {isOleoInstantaneo ? <Eye size={16} /> : <CheckCircle2 size={16} />}
                    {isOleoInstantaneo ? 'Ver Comprovante' : 'Abrir Vistoria'}
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
              <input 
                type="text" 
                placeholder="FILTRAR POR PREFIXO OU PLACA..." 
                className="w-full p-5 pl-12 bg-white border-2 border-slate-200 rounded-3xl font-black text-xs uppercase outline-none focus:border-amber-500 transition-all shadow-sm"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            
            <div className="bg-white rounded-[2rem] shadow-sm overflow-hidden border border-slate-200">
              <table className="w-full text-left text-xs md:text-sm">
                <thead className="bg-slate-50 border-b border-slate-200">
                  <tr>
                    <th className="p-4 font-black uppercase text-slate-500 tracking-widest text-[10px]">Viatura</th>
                    <th className="p-4 font-black uppercase text-slate-500 tracking-widest text-[10px]">Situação</th>
                    <th className="p-4 font-black uppercase text-slate-500 tracking-widest text-[10px] text-right">Ação</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-bold uppercase">
                  {viaturas.filter(v => (v.Prefixo || v.prefixo || "").toLowerCase().includes(searchTerm.toLowerCase())).map((v, i) => {
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
                          <button onClick={() => {
                            setLockData({ prefixo: v.Prefixo || v.prefixo, motivo: isDisp ? 'manutencao' : 'disponivel', re_responsavel: user.re });
                            setShowLockModal(true);
                          }} className="p-2 text-slate-400 hover:text-amber-600 transition-colors">
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

      {/* MODAL DE CONFERÊNCIA INTEGRADO */}
      {showModal && selectedVtr && (
        <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-lg rounded-[2.5rem] shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="bg-slate-900 p-6 text-white flex justify-between items-center">
              <div>
                <h2 className="text-2xl font-black uppercase tracking-tighter">Fiscon {selectedVtr.prefixo_vtr || selectedVtr.prefixo}</h2>
                <p className="text-[10px] text-amber-500 font-black uppercase tracking-widest">
                  {selectedVtr.id_vistoria ? 'Conferência de Pátio' : 'Validação de Manutenção'}
                </p>
              </div>
              <button onClick={() => setShowModal(false)} className="p-2 hover:bg-white/10 rounded-full"><X size={24} /></button>
            </div>

            <div className="p-6 space-y-5 overflow-y-auto">
              {/* LÓGICA DO ÓLEO (Sempre visível se houver troca_oleo ou for tipo ÓLEO) */}
              {(selectedVtr.troca_oleo === "SIM" || selectedVtr.tipo === "ÓLEO") && (
                <div className="bg-amber-50 border-2 border-amber-200 rounded-3xl p-5 space-y-4">
                  <div className="flex justify-between items-start">
                    <div>
                      <h4 className="text-amber-800 font-black text-xs uppercase flex items-center gap-2">
                        <Droplets size={16} /> Comprovante de Óleo
                      </h4>
                      <p className="text-[10px] text-amber-700 font-bold mt-1">HODÔMETRO: {selectedVtr.hodometro_oleo || selectedVtr.km} KM</p>
                    </div>
                    {(selectedVtr.foto_oleo || selectedVtr.foto) && (
                      <button 
                        onClick={() => setViewingPhoto(selectedVtr.foto_oleo || selectedVtr.foto)}
                        className="bg-white border-2 border-amber-200 p-2 rounded-xl text-amber-600 hover:bg-amber-100 transition-all shadow-sm"
                      >
                        <Eye size={20} />
                      </button>
                    )}
                  </div>
                  
                  <button 
                    onClick={() => setConf({...conf, oleoConfirmado: !conf.oleoConfirmado})}
                    className={`w-full py-4 rounded-2xl font-black text-[10px] uppercase transition-all flex items-center justify-center gap-2 border-2 
                      ${conf.oleoConfirmado ? 'bg-emerald-500 border-emerald-500 text-white' : 'bg-white border-amber-300 text-amber-600'}`}
                  >
                    {conf.oleoConfirmado ? <Check size={16}/> : <AlertCircle size={16}/>}
                    {conf.oleoConfirmado ? 'DADOS CONFERIDOS' : 'CONFERIR AGORA'}
                  </button>
                </div>
              )}

              {/* SE FOR UMA VISTORIA DE PÁTIO, MOSTRA O RESTANTE DO FORMULÁRIO */}
              {selectedVtr.id_vistoria ? (
                <>
                  <div className="bg-slate-50 p-4 rounded-3xl border-2 border-slate-100">
                    <p className="text-[10px] font-black text-slate-400 uppercase mb-3 text-center">Confirmar Entrega</p>
                    <div className="flex gap-2">
                      <button onClick={() => setConf({...conf, motoristaConfirmado: true})} className={`flex-1 py-3 rounded-2xl font-black text-[10px] uppercase ${conf.motoristaConfirmado ? 'bg-amber-500 text-slate-900 shadow-md' : 'bg-white text-slate-300 border border-slate-100'}`}>SIM, É O {selectedVtr.motorista_nome?.split(' ')[0]}</button>
                      <button onClick={() => setConf({...conf, motoristaConfirmado: false})} className={`flex-1 py-3 rounded-2xl font-black text-[10px] uppercase ${!conf.motoristaConfirmado ? 'bg-red-600 text-white shadow-md' : 'bg-white text-slate-300 border border-slate-100'}`}>NÃO É ELE</button>
                    </div>
                    {!conf.motoristaConfirmado && (
                      <select className="w-full mt-3 p-4 bg-white border-2 border-red-100 rounded-2xl font-bold text-xs" value={conf.novoMotoristaRE} onChange={e => setConf({...conf, novoMotoristaRE: e.target.value})}>
                        <option value="">QUEM ESTÁ ENTREGANDO?</option>
                        {motoristas.map((m, idx) => <option key={idx} value={m.re}>{m.patente} {m.nome}</option>)}
                      </select>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <button onClick={() => setConf({...conf, limpezaInterna: !conf.limpezaInterna})} className={`p-4 rounded-3xl border-2 font-black text-[10px] uppercase transition-all ${conf.limpezaInterna ? 'bg-emerald-50 border-emerald-500 text-emerald-700' : 'bg-slate-50 border-transparent text-slate-400'}`}>INT: {conf.limpezaInterna ? 'LIMPO' : 'SUJO'}</button>
                    <button onClick={() => setConf({...conf, limpezaExterna: !conf.limpezaExterna})} className={`p-4 rounded-3xl border-2 font-black text-[10px] uppercase transition-all ${conf.limpezaExterna ? 'bg-emerald-50 border-emerald-500 text-emerald-700' : 'bg-slate-50 border-transparent text-slate-400'}`}>EXT: {conf.limpezaExterna ? 'LIMPO' : 'SUJO'}</button>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <select className={`p-4 rounded-3xl border-2 font-black text-[10px] uppercase ${conf.pertences === 'SIM' ? 'bg-amber-50 border-amber-500 text-amber-700' : 'bg-slate-50 border-transparent text-slate-400'}`} value={conf.pertences} onChange={e => setConf({...conf, pertences: e.target.value})}>
                      <option value="NÃO">SEM PERTENCES</option>
                      <option value="SIM">HÁ PERTENCES</option>
                    </select>
                    <button onClick={() => setConf({...conf, avaria: !conf.avaria})} className={`p-4 rounded-3xl border-2 font-black text-[10px] uppercase ${conf.avaria ? 'bg-red-50 border-red-500 text-red-700' : 'bg-slate-50 border-transparent text-slate-400'}`}>AVARIAS: {conf.avaria ? 'SIM' : 'NÃO'}</button>
                  </div>

                  {conf.pertences === 'SIM' && <input type="text" placeholder="O QUE FOI ESQUECIDO?" className="w-full p-4 bg-amber-50 border-2 border-amber-200 rounded-2xl font-bold text-xs" value={conf.detalhePertences} onChange={e => setConf({...conf, detalhePertences: e.target.value})} />}

                  {conf.avaria && (
                    <div className="p-4 bg-red-50 border-2 border-dashed border-red-200 rounded-2xl flex flex-col items-center gap-3">
                      {fotoAvaria ? <img src={fotoAvaria} className="h-24 rounded-lg" alt="Dano" /> : <Camera size={32} className="text-red-300" />}
                      <label className="bg-red-600 text-white px-4 py-2 rounded-xl font-black text-[10px] cursor-pointer uppercase">Tirar Foto da Avaria <input type="file" accept="image/*" capture="environment" className="hidden" onChange={handleFileChange} /></label>
                    </div>
                  )}

                  <textarea className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl p-4 text-xs font-bold uppercase" placeholder="OBSERVAÇÕES ADICIONAIS..." value={conf.obs} onChange={e => setConf({...conf, obs: e.target.value})} />
                </>
              ) : (
                /* SE FOR APENAS ALERTA DE ÓLEO */
                <div className="py-6 text-center space-y-3">
                  <Wrench size={40} className="mx-auto text-slate-300" />
                  <p className="text-xs font-bold text-slate-500 uppercase px-4">
                    Esta viatura informou troca de óleo enquanto está em serviço. Verifique a foto acima.
                  </p>
                </div>
              )}

              <button 
                onClick={selectedVtr.id_vistoria ? finalizarConferencia : () => setShowModal(false)}
                disabled={isSubmitting || ((selectedVtr.troca_oleo === "SIM" || selectedVtr.tipo === "ÓLEO") && !conf.oleoConfirmado)}
                className={`w-full py-5 rounded-[1.5rem] font-black uppercase tracking-widest text-xs shadow-xl transition-all ${isSubmitting || ((selectedVtr.troca_oleo === "SIM" || selectedVtr.tipo === "ÓLEO") && !conf.oleoConfirmado) ? 'bg-slate-200 text-slate-400 cursor-not-allowed' : 'bg-slate-900 text-white hover:bg-emerald-600'}`}
              >
                {isSubmitting ? 'Processando...' : selectedVtr.id_vistoria ? 'Finalizar e Liberar' : 'Entendido / Fechar'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* VISUALIZADOR DE FOTO */}
      {viewingPhoto && (
        <div className="fixed inset-0 bg-black/95 z-[100] flex flex-col p-4 animate-in fade-in duration-300">
          <button onClick={() => setViewingPhoto(null)} className="self-end text-white p-4 hover:bg-white/10 rounded-full transition-all"><X size={32} /></button>
          <div className="flex-1 flex items-center justify-center">
            <img src={viewingPhoto} className="max-w-full max-h-full object-contain rounded-2xl shadow-2xl border-2 border-white/20" alt="Comprovante" />
          </div>
        </div>
      )}

      {/* MODAL DE BLOQUEIO */}
      {showLockModal && (
        <div className="fixed inset-0 bg-slate-900/90 backdrop-blur-md z-[60] flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-sm rounded-[2.5rem] p-8 shadow-2xl animate-in zoom-in duration-300">
            <div className="flex flex-col items-center text-center space-y-4">
              <div className={`p-4 rounded-full ${lockData.motivo === 'disponivel' ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'}`}>
                {lockData.motivo === 'disponivel' ? <Unlock size={40} /> : <Lock size={40} />}
              </div>
              <h3 className="text-2xl font-black text-slate-800 uppercase tracking-tighter">{lockData.motivo === 'disponivel' ? "Liberar VTR" : "Bloquear VTR"}</h3>
              {lockData.motivo !== 'disponivel' && (
                <select className="w-full p-4 bg-slate-50 border-2 border-slate-100 rounded-2xl font-bold text-xs uppercase" value={lockData.motivo} onChange={e => setLockData({...lockData, motivo: e.target.value})}>
                  <option value="manutencao">Manutenção</option>
                  <option value="incidente">Incidente/Avaria</option>
                  <option value="pendencia_garageiro">Pendência de Limpeza</option>
                </select>
              )}
              <div className="flex flex-col w-full gap-3 mt-6">
                <button onClick={confirmarAlteracaoStatus} disabled={isSubmitting} className="w-full py-4 bg-slate-900 text-white rounded-2xl font-black uppercase text-xs tracking-widest">Confirmar</button>
                <button onClick={() => setShowLockModal(false)} className="w-full py-4 bg-slate-100 text-slate-400 rounded-2xl font-black uppercase text-xs tracking-widest">Cancelar</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default GarageiroDashboard;
