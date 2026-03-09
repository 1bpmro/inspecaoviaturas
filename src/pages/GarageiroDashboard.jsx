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

  // 1. EFEITO INICIAL PARA CARREGAR DADOS
  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 30000); // Auto-refresh a cada 30s
    return () => clearInterval(interval);
  }, []);

  // 2. FILTRO DE MOTORISTAS (REGRAS DE NEGÓCIO)
  const motoristasFiltrados = motoristas.filter(m => {
    const nomeCompleto = (m.Nome || m.nome || "").toUpperCase().trim();
    if (!nomeCompleto || nomeCompleto.includes("ADMIN")) return false;

    const termosProibidos = [
      /PVSA/i, /TEN(\s?|\.)?CEL/i, /MAJ/i, /CAP/i,
      /[12](°|º|\.)?\s?TEN/i, /ASPIRANTE/i, /SUBTENENTE/i, /\bST\b/i
    ];

    return !termosProibidos.some(regex => regex.test(nomeCompleto));
  });

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => setFotoAvaria(reader.result);
      reader.readAsDataURL(file);
    }
  };

  const calcularEspera = (timestamp) => {
    if (!timestamp) return null;
    try {
      const dateObj = new Date(timestamp);
      const diff = Math.floor((new Date() - dateObj) / 60000);
      return diff >= 0 ? diff : 0;
    } catch(e) { return 0; }
  };

const fetchData = async () => {
  setLoading(true);
  try {
    const [resVtr, resPend, resMot] = await Promise.all([
      gasApi.getViaturas(),           // Traz os dados da guia PAINEL / PATRIMÔNIO
      gasApi.getVistoriasPendentes(), // Traz os dados da guia do Mês (ex: 03-2026)
      gasApi.getEfetivoCompleto()
    ]);
    
    let frotaGeral = [];
    if (resVtr?.status === 'success' && Array.isArray(resVtr.data)) {
      frotaGeral = resVtr.data;
      setViaturas(frotaGeral);
    }

    if (resMot?.status === 'success' && Array.isArray(resMot.data)) {
      setMotoristas(resMot.data);
    }

    // LISTA QUE O GARAGEIRO VAI ENXERGAR
    let listaFinal = [];

    // 1. REGRA DA GUIA DO MÊS (resPend)
    // Se você quiser que o garageiro NÃO veja vistorias de ENTRADA vindas diretamente 
    // da guia mensal (porque ele vai ler pelo Status do Painel), filtramos aqui:
    if (resPend?.status === 'success' && Array.isArray(resPend.data)) {
      // Filtramos para remover qualquer coisa que já tenha sido marcada como ENTRADA na guia mensal
      // Isso evita que apareçam dois cards para a mesma viatura.
      const vistoriasMesFiltradas = resPend.data.filter(v => 
        (v.tipo_vistoria || v.tipo || "").toUpperCase() !== "ENTRADA"
      );
      listaFinal = [...vistoriasMesFiltradas];
    }

    // 2. REGRA DA COLUNA STATUS (Guia PAINEL / PATRIMÔNIO)
    // Esta é a fonte de verdade para o garageiro saber quem está no pátio.
    frotaGeral.forEach(vtr => {
      if (!vtr) return;
      const statusVtr = (vtr.Status || vtr.status || "").toUpperCase().trim();
      const prefixo = vtr.Prefixo || vtr.prefixo;

      // Status que acionam a presença da VTR na tela do garageiro
      const statusAlvo = [
        "AGUARDANDO CONFERÊNCIA", 
        "PÁTIO", 
        "AGUARDANDO PÁTIO",
        "ENTRADA REGISTRADA",
        "EM CONFERÊNCIA"
      ];

      if (prefixo && statusAlvo.includes(statusVtr)) {
        // Verifica se já não adicionamos essa VTR pela lista da guia mensal
        const jaExiste = listaFinal.some(p => (p?.prefixo_vtr || p?.prefixo) === prefixo);
        
        if (!jaExiste) {
          listaFinal.push({
            prefixo: prefixo,
            prefixo_vtr: prefixo,
            motorista_nome: vtr.UltimoMotoristaNome || vtr.Motorista || "S/ INF",
            origem: "STATUS_PAINEL", 
            timestamp: vtr.DataHoraUltimaAtualizacao || new Date().toISOString(),
            rowId: vtr.rowId || vtr.ID || prefixo,
            // Mantém a regra do óleo baseada no status ou coluna específica
            troca_oleo: (statusVtr === "TROCA DE ÓLEO" || vtr.oleo_pendente === "SIM") ? "SIM" : "NÃO"
          });
        }
      }
    });

    // 3. FILTRO FINAL (Remover o que já foi finalizado localmente nesta sessão)
    const filtradas = listaFinal.filter(v => {
      if (!v) return false;
      const id = v.id_manutencao || v.id_sistema || v.rowId || v.prefixo;
      return id && !finalizadosLocal.includes(id);
    });

    // Feedback sonoro para novas viaturas no pátio
    if (soundEnabled && filtradas.length > prevItemsCount.current) {
      audioRef.current.play().catch(() => {});
    }
    
    prevItemsCount.current = filtradas.length;
    setVistorias(filtradas);

  } catch (error) {
    console.error("Erro crítico na sincronização do Garageiro:", error);
  } finally {
    setLoading(false);
  }
};
  

 const finalizarConferencia = async () => {
  if (isSubmitting) return;

  // 1. VALIDAÇÃO DE MOTORISTA
  // Ajustado para aceitar tanto a origem "VISTORIA" quanto "STATUS_PAINEL"
  const isVistoriaOuPainel = ["VISTORIA", "STATUS_PAINEL"].includes(selectedVtr.origem);
  
  if (isVistoriaOuPainel && !conf.motoristaConfirmado && !conf.novoMotoristaRE) {
    return alert("Por favor, selecione ou confirme o motorista que está entregando a viatura.");
  }
  
  // 2. VALIDAÇÃO DE ÓLEO E AVARIAS
  const precisaValidarOleo = selectedVtr.troca_oleo === "SIM" || selectedVtr.origem === "MANUTENCAO_AVULSA";
  if (precisaValidarOleo && !conf.oleoConfirmado) {
    return alert("Confirme a troca de óleo visualmente antes de finalizar.");
  }
  
  if (conf.avaria && !fotoAvaria) {
    return alert("É obrigatório anexar uma foto para registrar a avaria detectada.");
  }

  setIsSubmitting(true);

  // Identificadores para controle de UI e API
  const idParaRemover = selectedVtr.id_manutencao || selectedVtr.id_sistema || selectedVtr.rowId || selectedVtr.prefixo;
  const prefixoVtr = (selectedVtr.prefixo_vtr || selectedVtr.prefixo || "").toString().toUpperCase();

  try {
    const payload = {
      origem: selectedVtr.origem, // "STATUS_PAINEL" ou "VISTORIA"
      prefixo: prefixoVtr,
      // Garante o envio do rowId (importante para atualizar a guia PATRIMÔNIO)
      rowId: !isNaN(parseInt(selectedVtr.rowId)) ? parseInt(selectedVtr.rowId) : selectedVtr.rowId,
      id_manutencao: selectedVtr.id_manutencao,
      id_vistoria: selectedVtr.id_sistema || selectedVtr.id,
      status_fisico: conf.avaria ? 'AVARIADA' : 'OK',
      limpeza: `INT: ${conf.limpezaInterna ? 'C' : 'NC'} | EXT: ${conf.limpezaExterna ? 'C' : 'NC'}`,
      pertences: conf.pertences === 'SIM' ? `SIM: ${conf.detalhePertences}` : 'NÃO',
      obs_garageiro: conf.obs,
      garageiro_re: user.re,
      foto_avaria: fotoAvaria,
      motorista_confirmado: conf.motoristaConfirmado,
      novo_motorista_re: conf.novoMotoristaRE,
      // Coleta o KM disponível em qualquer uma das fontes de dados
      km_registro: selectedVtr.hodometro_oleo || selectedVtr.hodometro || selectedVtr.km || selectedVtr.Km 
    };

    // 1º Passo: Salva o log de conferência do garageiro e processa no banco
    const res = await gasApi.confirmarVistoriaGarageiro(payload);

    if (res.status === 'success') {
      // 2º Passo: Força a atualização do Status na guia PAINEL/PATRIMÔNIO para DISPONÍVEL
      // Se a origem for STATUS_PAINEL, o Apps Script usará o rowId para ser cirúrgico na atualização.
      await gasApi.alterarStatusViatura(prefixoVtr, "DISPONÍVEL", {
        motivo: 'disponivel',
        detalhes: 'Liberação via pátio (Garageiro)',
        re_responsavel: user.re,
        rowId: payload.rowId // Passamos o rowId também para a alteração de status
      });

      // 3º Passo: Feedback na UI e Reset de Estado
      setFinalizadosLocal(prev => [...prev, idParaRemover]);
      setShowModal(false);
      
      // Limpa o formulário para a próxima conferência
      setConf({ 
        limpezaInterna: true, limpezaExterna: true, pertences: 'NÃO', 
        detalhePertences: '', motoristaConfirmado: true, novoMotoristaRE: '', 
        avaria: false, obs: '', oleoConfirmado: false 
      });
      setFotoAvaria(null);

      // Refresh nos dados após 1.5s para garantir que o Google Sheets processou as duas chamadas
      setTimeout(fetchData, 1500);
      
    } else {
      alert("Erro ao salvar conferência: " + (res.message || "Tente novamente."));
    }
  } catch (e) {
    console.error("Erro na finalização:", e);
    alert("Erro de conexão com o servidor. Verifique sua internet.");
  } finally {
    setIsSubmitting(false);
  }
};

  const confirmarAlteracaoStatus = async () => {
    if (isSubmitting) return;
    setIsSubmitting(true);
    try {
      const novoStatus = lockData.motivo === 'disponivel' ? 'DISPONÍVEL' : 'MANUTENÇÃO';
      const res = await gasApi.alterarStatusViatura(lockData.prefixo, novoStatus, {
        motivo: lockData.motivo,
        detalhes: lockData.detalhes || 'Alteração manual via painel garageiro',
        re_responsavel: user.re
      });

      if (res.status === 'success') {
        setShowLockModal(false);
        fetchData();
      } else {
        alert("Erro ao alterar status.");
      }
    } catch (e) {
      alert("Erro de conexão.");
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
            <button onClick={() => setSoundEnabled(!soundEnabled)} className={`p-2 rounded-xl transition-all ${soundEnabled ? 'bg-emerald-500 text-white' : 'bg-slate-800 text-slate-400'}`}>
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
              const isOleo = vtr.troca_oleo === "SIM" || vtr.origem === "MANUTENCAO_AVULSA";
              return (
                <div key={i} className={`bg-white border-2 rounded-[2.5rem] p-6 shadow-sm hover:shadow-md transition-shadow ${isOleo ? 'border-amber-400 bg-amber-50/20' : 'border-slate-200'}`}>
                  <div className="flex justify-between items-start mb-4">
                    <span className="text-4xl font-black text-slate-900 tracking-tighter">{vtr.prefixo_vtr || vtr.prefixo}</span>
                    <div className="text-right">
                      <span className={`${isOleo ? 'bg-amber-500 text-white' : 'bg-blue-100 text-blue-700'} px-3 py-1 rounded-full text-[9px] font-black uppercase`}>
                        {isOleo ? 'PENDÊNCIA ÓLEO' : 'CHECKLIST ENTRADA'}
                      </span>
                      {espera !== null && <p className="text-[10px] font-black mt-2 text-slate-400 uppercase tracking-tighter">{espera} MIN AGUARDANDO</p>}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 mb-6 bg-slate-50 p-3 rounded-2xl border border-slate-100">
                    <div className="bg-slate-200 p-2 rounded-lg text-slate-500"><User size={14} /></div>
                    <p className="text-[11px] font-bold text-slate-600 uppercase truncate">{vtr.motorista_nome || "NÃO IDENTIFICADO"}</p>
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
                          <span className={`text-[9px] font-black px-3 py-1 rounded-full ${isDisp ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>
                             {s}
                          </span>
                        </td>
                        <td className="p-4 text-right">
                          <button onClick={() => {
                            setLockData({ prefixo: v.Prefixo || v.prefixo, motivo: isDisp ? 'manutencao' : 'disponivel', re_responsavel: user.re });
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

      {/* MODAL PRINCIPAL DE CONFERÊNCIA */}
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
                    <div className="mt-4 animate-in fade-in slide-in-from-top-2 duration-300">
                      <p className="text-[10px] font-black text-red-500 mb-2 ml-1 uppercase">Quem está devolvendo a VTR?</p>
                      <div className="relative">
                        <select 
                          className="w-full p-4 bg-white border-2 border-red-100 rounded-2xl font-black text-xs uppercase appearance-none outline-none focus:border-red-400"
                          value={conf.novoMotoristaRE}
                          onChange={(e) => setConf({...conf, novoMotoristaRE: e.target.value})}
                        >
                          <option value="">-- SELECIONE O MOTORISTA --</option>
                          {motoristasFiltrados.map((m, idx) => (
                            <option key={idx} value={m.RE || m.re}>{m.PostoGrad || ""} {m.NomeGuerra || m.nome} ({m.RE || m.re})</option>
                          ))}
                        </select>
                        <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 text-red-300 pointer-events-none" size={18} />
                      </div>
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

                {conf.pertences === 'SIM' && (
                  <textarea className="w-full bg-amber-50 border-2 border-amber-200 rounded-2xl p-4 text-[10px] font-bold uppercase outline-none" placeholder="DESCREVA OS PERTENCES ENCONTRADOS..." value={conf.detalhePertences} onChange={e => setConf({...conf, detalhePertences: e.target.value})} />
                )}

                {(selectedVtr.troca_oleo === "SIM" || selectedVtr.origem === "MANUTENCAO_AVULSA") && (
                  <div className="bg-amber-50 border-2 border-amber-200 rounded-3xl p-5 space-y-4 shadow-inner">
                    <div className="flex justify-between items-start">
                      <div>
                        <h4 className="text-amber-800 font-black text-xs uppercase flex items-center gap-2"><Droplets size={16} /> Comprovante de Óleo</h4>
                        <p className="text-[10px] text-amber-700 font-bold mt-1 uppercase">Validar troca no hodômetro</p>
                      </div>
                      {(selectedVtr.foto_evidencia || selectedVtr.foto_oleo) && (
                        <button onClick={() => setViewingPhoto(selectedVtr.foto_evidencia || selectedVtr.foto_oleo)} className="bg-white border-2 border-amber-200 p-2 rounded-xl text-amber-600 hover:bg-amber-100 shadow-sm transition-colors"><Eye size={20} /></button>
                      )}
                    </div>
                    <button onClick={() => setConf({...conf, oleoConfirmado: !conf.oleoConfirmado})} className={`w-full py-4 rounded-2xl font-black text-[10px] uppercase border-2 transition-all ${conf.oleoConfirmado ? 'bg-emerald-600 border-emerald-600 text-white shadow-md' : 'bg-white border-amber-300 text-amber-600'}`}>{conf.oleoConfirmado ? 'ÓLEO VALIDADO' : 'CONFIRMAR TROCA DE ÓLEO'}</button>
                  </div>
                )}

                {(conf.avaria || conf.pertences === 'SIM') && (
                  <div className="bg-slate-900 p-5 rounded-3xl space-y-4">
                    <div className="flex items-center gap-3 text-white">
                      <Camera className="text-amber-500" size={24} />
                      <p className="text-[11px] font-black uppercase">Registrar com Foto {conf.avaria ? "(OBRIGATÓRIO)" : "(OPCIONAL)"}</p>
                    </div>
                    <div className="relative">
                      <input type="file" accept="image/*" capture="environment" onChange={handleFileChange} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10" />
                      <div className={`bg-slate-800 border-2 border-dashed rounded-2xl p-6 text-center ${fotoAvaria ? 'border-emerald-500' : 'border-slate-700'}`}>
                        {fotoAvaria ? (
                          <div className="relative inline-block">
                            <img src={fotoAvaria} className="h-32 w-32 object-cover rounded-xl border-2 border-amber-500 shadow-2xl" alt="Preview" />
                            <button onClick={(e) => {e.stopPropagation(); setFotoAvaria(null);}} className="absolute -top-2 -right-2 bg-red-500 text-white p-1 rounded-full"><X size={12} /></button>
                          </div>
                        ) : (
                          <p className="text-slate-500 font-black text-[10px] uppercase">Toque para capturar imagem</p>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                <textarea className="w-full bg-slate-50 border-2 border-slate-100 rounded-3xl p-4 text-xs font-bold uppercase outline-none focus:border-amber-400" placeholder="OBSERVAÇÕES DO GARAGEIRO..." rows={2} value={conf.obs} onChange={e => setConf({...conf, obs: e.target.value})} />
              </div>

              <button 
                onClick={finalizarConferencia}
                disabled={isSubmitting || (conf.avaria && !fotoAvaria) || ((selectedVtr.troca_oleo === "SIM" || selectedVtr.origem === "MANUTENCAO_AVULSA") && !conf.oleoConfirmado)}
                className={`w-full py-5 rounded-[2rem] font-black uppercase text-xs shadow-2xl transition-all ${isSubmitting ? 'bg-slate-200' : (conf.avaria && !fotoAvaria) ? 'bg-slate-400 cursor-not-allowed opacity-50' : 'bg-slate-900 text-white hover:bg-emerald-600 active:scale-95'}`}
              >
                {isSubmitting ? 'Gravando...' : 'Finalizar Validação'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* VISUALIZADOR DE FOTO EM TELA CHEIA */}
      {viewingPhoto && (
        <div className="fixed inset-0 bg-black/95 z-[100] flex flex-col p-4">
          <button onClick={() => setViewingPhoto(null)} className="self-end text-white p-4 hover:bg-white/10 rounded-full transition-colors"><X size={32} /></button>
          <div className="flex-1 flex items-center justify-center p-4">
            <img src={viewingPhoto.startsWith('http') ? viewingPhoto : (viewingPhoto.startsWith('data:') ? viewingPhoto : `data:image/jpeg;base64,${viewingPhoto}`)} className="max-w-full max-h-full object-contain rounded-2xl shadow-2xl" alt="Evidência" />
          </div>
        </div>
      )}

      {/* MODAL DE BLOQUEIO/LIBERAÇÃO MANUAL */}
      {showLockModal && (
        <div className="fixed inset-0 bg-slate-900/90 backdrop-blur-md z-[60] flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-sm rounded-[3rem] p-8 shadow-2xl">
            <div className="flex flex-col items-center text-center space-y-6">
              <div className={`w-20 h-20 rounded-full flex items-center justify-center ${lockData.motivo === 'disponivel' ? 'bg-emerald-100 text-emerald-600' : 'bg-red-100 text-red-600'}`}>
                {lockData.motivo === 'disponivel' ? <Unlock size={40} /> : <Lock size={40} />}
              </div>
              <h3 className="text-2xl font-black text-slate-800 uppercase tracking-tighter">{lockData.motivo === 'disponivel' ? "Liberar VTR" : "Bloquear VTR"}</h3>
              <p className="text-xs font-bold text-slate-500 uppercase">Deseja alterar o status da viatura {lockData.prefixo}?</p>
              <div className="flex flex-col w-full gap-3">
                <button onClick={confirmarAlteracaoStatus} disabled={isSubmitting} className="w-full py-4 bg-slate-900 text-white rounded-2xl font-black uppercase text-xs shadow-lg disabled:opacity-50">
                  {isSubmitting ? 'Processando...' : 'Confirmar'}
                </button>
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
