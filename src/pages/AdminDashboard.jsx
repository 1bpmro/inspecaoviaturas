import React, { useState, useEffect } from 'react';
import { gasApi } from '../api/gasClient';
import ManutencaoInbox from './ManutencaoInbox';
import AlertaInatividade from './AlertaInatividade';
import { 
  Settings, Car, Wrench, Fuel, BarChart3, Plus, 
  AlertTriangle, Search, Filter, ArrowRight, Droplets, 
  History, X, AlertCircle, ArrowLeft, TrendingUp, PieChart, ExternalLink, Timer, 
  Activity, Users, Printer, Clock, ShieldCheck, Map, CheckCircle2
} from 'lucide-react';

const AdminDashboard = ({ onBack }) => {
  const [activeTab, setActiveTab] = useState('frota');
  const [viaturas, setViaturas] = useState([]);
  const [auditoria, setAuditoria] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedVtr, setSelectedVtr] = useState(null);
  const [vistoriasPendentes, setVistoriasPendentes] = useState([]); 
  
  useEffect(() => { loadData(); }, []);

 const loadData = async () => {
  setLoading(true);
  try {
    // Adicionado resPendentes na desestruturação do Promise.all
    const [resVtr, resAuditoria, resPendentes] = await Promise.all([
      gasApi.getViaturas(),
      gasApi.getRelatorioGarageiros ? gasApi.getRelatorioGarageiros() : { status: 'success', data: [] },
      gasApi.doPost({ action: 'getVistoriasPendentes' }) // Busca as fotos pendentes
    ]);

    if (resVtr.status === 'success') {
      setViaturas(resVtr.data.filter(v => v.Status !== "FORA DE SERVIÇO (BAIXA)"));
    }
    if (resAuditoria.status === 'success') {
      setAuditoria(resAuditoria.data);
    }
    // Salva as vistorias pendentes no estado
    if (resPendentes.status === 'success') {
      setVistoriasPendentes(resPendentes.data);
    }
  } catch (error) { 
    console.error("Erro na carga de dados:", error); 
  } finally { 
    setLoading(false); 
  }
};

  const checkOil = (vtr) => {
    const kmAtual = parseInt(vtr.UltimoKM || 0);
    const kmTroca = parseInt(vtr.KM_UltimaTroca || 0);
    const rodado = kmAtual - kmTroca;
    const mediaDiaria = 150; // Média estimada PMRO
    const kmRestante = 10000 - rodado;
    const diasRestantes = Math.max(0, Math.floor(kmRestante / mediaDiaria));

    if (rodado >= 9500) return { color: 'text-red-600', bg: 'bg-red-600', msg: 'CRÍTICO', level: 2, dias: diasRestantes };
    if (rodado >= 8000) return { color: 'text-amber-500', bg: 'bg-amber-500', msg: 'ATENÇÃO', level: 1, dias: diasRestantes };
    return { color: 'text-emerald-500', bg: 'bg-emerald-500', msg: 'OPERACIONAL', level: 0, dias: diasRestantes };
  };

  const handlePrint = () => { window.print(); };

  const handleAction = async (action, payload) => {
    if (!window.confirm(`Confirma operação militar de ${action}?`)) return;
    setLoading(true);
    try {
      const res = await gasApi.doPost({ action, payload }); 
      if (res.status === 'success') { 
        loadData(); 
        setSelectedVtr(null); 
      }
    } catch (err) { 
      alert("Erro na rede."); 
    } finally { 
      setLoading(false); 
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex font-sans print:bg-white">
      
      {/* SIDEBAR */}
      <aside className="w-64 bg-slate-900 text-white flex flex-col shadow-2xl shrink-0 print:hidden">
        <div className="p-6 border-b border-slate-800 text-center">
          <h1 className="font-black text-xl tracking-tighter uppercase italic">Painel <span className="text-amber-500">CMDO</span></h1>
          <p className="text-[9px] font-bold text-slate-500 tracking-widest uppercase">1º BPM - Porto Velho</p>
        </div>

        <nav className="flex-1 p-4 space-y-1">
          <button onClick={onBack} className="w-full flex items-center gap-3 p-3 rounded-xl text-[10px] font-black uppercase text-blue-400 hover:bg-slate-800 mb-4 border border-blue-900/30 transition-all">
            <ArrowLeft size={16}/> Sair do Sistema
          </button>
          
          <MenuBtn active={activeTab==='frota'} onClick={()=>setActiveTab('frota')} icon={<ShieldCheck size={18}/>} label="Prontidão da Frota" />
          <MenuBtn active={activeTab==='auditoria'} onClick={()=>setActiveTab('auditoria')} icon={<Activity size={18}/>} label="Auditoria de Pátio" />
          <MenuBtn active={activeTab==='manutencao'} onClick={()=>setActiveTab('manutencao')} icon={<Wrench size={18}/>} label="Escala de Manutenção" />
          <MenuBtn active={activeTab==='stats'} onClick={()=>setActiveTab('stats')} icon={<AlertTriangle size={18}/>} label="Indisponibilidade" />
          <MenuBtn active={activeTab==='analytics'} onClick={()=>setActiveTab('analytics')} icon={<TrendingUp size={18}/>} label="Análise de Dados" />
        </nav>

        <div className="p-4 bg-slate-950/50">
           <div className="flex items-center gap-2 text-[8px] font-bold text-slate-500 uppercase mb-2">
              <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div> Servidor Ativo
           </div>
        </div>
      </aside>

      <main className="flex-1 flex flex-col overflow-hidden">
        
        {/* HEADER */}
        <header className="bg-white h-16 border-b border-slate-200 flex items-center justify-between px-8 shrink-0 print:hidden">
          <div className="flex items-center gap-4 bg-slate-100 px-4 py-2 rounded-xl w-96 border border-slate-200 focus-within:border-blue-400 transition-all">
            <Search size={16} className="text-slate-400" />
            <input 
              type="text" 
              placeholder="Prefixo, Placa ou Setor..." 
              className="bg-transparent border-none outline-none text-xs font-bold w-full" 
              onChange={(e) => setSearchTerm(e.target.value)} 
            />
          </div>
          <div className="flex items-center gap-4">
            <button onClick={handlePrint} className="flex items-center gap-2 px-4 py-2 bg-slate-900 text-white rounded-lg text-[10px] font-black uppercase hover:bg-slate-800 transition-all active:scale-95 shadow-lg shadow-slate-200">
              <Printer size={16}/> Gerar Relatório de Passagem
            </button>
          </div>
        </header>

        <section className="p-8 overflow-y-auto">
          
          {/* CABEÇALHO DE IMPRESSÃO */}
          <div className="hidden print:block text-center mb-8 border-b-2 border-black pb-4">
            <h1 className="text-2xl font-bold uppercase">Polícia Militar de Rondônia - 1º BPM</h1>
            <h2 className="text-lg font-bold uppercase text-slate-700">Relatório Estratégico de Frota - {new Date().toLocaleDateString()}</h2>
          </div>

          {/* ABA: PRONTIDÃO */}
          {activeTab === 'frota' && (
            <div className="space-y-6 animate-in fade-in duration-500">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <StatCard label="Efetivo Total" value={viaturas.length} color="blue" />
                <StatCard label="Em Patrulhamento" value={viaturas.filter(v => v.Status === 'EM SERVIÇO').length} color="emerald" />
                <StatCard label="Fora de Combate" value={viaturas.filter(v => v.Status === 'MANUTENÇÃO').length} color="red" />
                <StatCard label="Previsão Baixa (7 dias)" value={viaturas.filter(v => checkOil(v).level > 0).length} color="amber" />
              </div>

              <div className="bg-white rounded-[2rem] shadow-sm border border-slate-200 overflow-hidden">
                <table className="w-full text-left border-collapse">
                  <thead className="bg-slate-50 border-b border-slate-200 text-[10px] font-black uppercase text-slate-400">
                    <tr>
                      <th className="p-4">Unidade / Setor</th>
                      <th className="p-4">Status Atual</th>
                      <th className="p-4">Integridade Óleo</th>
                      <th className="p-4">Autonomia Est.</th>
                      <th className="p-4 text-right print:hidden">Dossiê</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {viaturas.filter(v => 
                      v.Prefixo?.includes(searchTerm.toUpperCase()) || 
                      v.Setor?.toUpperCase().includes(searchTerm.toUpperCase())
                    ).map((v, i) => {
                      const oil = checkOil(v);
                      return (
                        <tr key={i} className="hover:bg-slate-50 transition-all cursor-pointer group" onClick={() => setSelectedVtr(v)}>
                          <td className="p-4">
                             <div className="flex items-center gap-3">
                               <div className={`w-10 h-10 rounded-lg flex items-center justify-center font-black text-white ${oil.bg}`}>{v.Prefixo?.slice(-2)}</div>
                               <div><p className="font-black text-slate-800">{v.Prefixo}</p><p className="text-[9px] text-slate-400 font-bold uppercase tracking-tighter">{v.Setor || 'SETOR NÃO DEFINIDO'}</p></div>
                             </div>
                          </td>
                          <td className="p-4">
                            <span className={`text-[9px] font-black px-2 py-1 rounded-md inline-block uppercase ${v.Status === 'EM SERVIÇO' ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>{v.Status}</span>
                          </td>
                          <td className="p-4">
                             <div className="flex items-center gap-2">
                               <div className={`w-2 h-2 rounded-full ${oil.level === 2 ? 'animate-pulse' : ''} ${oil.bg}`}></div>
                               <span className={`text-[10px] font-black ${oil.color}`}>{oil.msg}</span>
                             </div>
                          </td>
                          <td className="p-4 text-slate-500 font-bold text-[10px]">
                            <div className="flex items-center gap-2"><Clock size={12}/> {oil.dias} Dias úteis</div>
                          </td>
                          <td className="p-4 text-right print:hidden">
                            <button className="p-2 hover:bg-white rounded-lg border border-transparent hover:border-slate-200 transition-all">
                              <History size={16} className="text-slate-300 group-hover:text-slate-900"/>
                            </button>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ABA: AUDITORIA DE PÁTIO */}
        
{activeTab === 'auditoria' && (
  <div className="space-y-6 animate-in slide-in-from-right duration-500">
    {/* HEADER DA ABA */}
    <div className="bg-slate-900 p-8 rounded-[2.5rem] text-white flex justify-between items-center shadow-2xl border-b-4 border-blue-500">
      <div>
        <h2 className="text-2xl font-black uppercase italic leading-none">Controle de Garageiros</h2>
        <p className="text-sm font-bold uppercase mt-2 text-slate-400">Fiscalização de conferência e integridade de pátio</p>
      </div>
      <ShieldCheck size={40} className="text-blue-500" />
    </div>

    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      
      {/* COLUNA ESQUERDA: VALIDAÇÃO DE MANUTENÇÃO (TROCA DE ÓLEO) */}
      <div className="bg-white rounded-[2.5rem] border border-slate-200 shadow-sm overflow-hidden flex flex-col">
        <div className="p-6 border-b border-slate-100 bg-slate-50/50 flex justify-between items-center">
          <div>
            <h3 className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Inbox de Manutenção</h3>
            <p className="text-xs font-bold text-slate-800 italic">Validar Comprovantes de Óleo</p>
          </div>
          <Droplets className="text-blue-500" size={20} />
        </div>

        <div className="p-4 space-y-3 max-h-[500px] overflow-y-auto">
          {/* Filtra vistorias pendentes que possuam link de foto (indicando envio de comprovante) */}
          {vistoriasPendentes.filter(p => p.Links_Fotos).length > 0 ? (
            vistoriasPendentes.filter(p => p.Links_Fotos).map((item, i) => (
              <div key={i} className="p-4 bg-slate-50 rounded-2xl border border-slate-100 flex justify-between items-center group hover:border-blue-200 transition-all shadow-sm">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-blue-600 text-white rounded-xl flex items-center justify-center font-black">
                    {item.prefixo_vtr?.slice(-2)}
                  </div>
                  <div>
                    <p className="text-sm font-black text-slate-800">{item.prefixo_vtr}</p>
                    <p className="text-[9px] font-bold text-slate-400 uppercase">KM: {item.hodometro} • RE: {item.motorista_matricula}</p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <a 
                    href={item.Links_Fotos?.split(' | ')[0]} 
                    target="_blank" 
                    rel="noreferrer" 
                    className="p-2 bg-white text-slate-400 hover:text-blue-600 rounded-lg border border-slate-200 transition-all"
                    title="Ver Comprovante"
                  >
                    <ExternalLink size={16} />
                  </a>
                  <button 
                    onClick={() => handleAction('registrarManutencao', { 
                      prefixo: item.prefixo_vtr, 
                      tipo: 'TROCA_OLEO', 
                      km: item.hodometro,
                      descricao: 'Validado via Auditoria de Pátio',
                      responsavel_re: 'ADMIN' 
                    })}
                    className="p-2 bg-emerald-500 text-white rounded-lg hover:bg-emerald-600 shadow-lg shadow-emerald-100 transition-all"
                  >
                    <CheckCircle2 size={16} />
                  </button>
                </div>
              </div>
            ))
          ) : (
            <div className="py-20 text-center">
              <Clock className="mx-auto text-slate-200 mb-2" size={32} />
              <p className="text-[10px] font-bold text-slate-400 uppercase italic">Nenhum comprovante pendente</p>
            </div>
          )}
        </div>
      </div>

      {/* COLUNA DIREITA: ALERTAS E RANKING */}
      <div className="space-y-6">
        
        {/* CARD: ALERTAS DE PÁTIO (VTRS AGUARDANDO) */}
        <div className="bg-white rounded-[2.5rem] border border-red-100 shadow-sm p-6">
          <div className="flex items-center gap-2 mb-6">
            <div className="p-2 bg-red-100 text-red-600 rounded-lg">
              <AlertTriangle size={18} />
            </div>
            <div>
              <p className="text-[10px] font-black uppercase text-red-500 tracking-widest leading-none">Alerta de Inatividade</p>
              <p className="text-[9px] font-bold text-slate-400 uppercase">Viaturas entregues sem conferência</p>
            </div>
          </div>
          <div className="space-y-3">
            {viaturas.filter(v => v.Status === 'AGUARDANDO').length > 0 ? (
              viaturas.filter(v => v.Status === 'AGUARDANDO').map((v, i) => (
                <div key={i} className="flex justify-between items-center p-3 bg-red-50/50 rounded-xl border border-red-50">
                  <span className="font-black text-slate-800 italic text-sm">{v.Prefixo}</span>
                  <div className="flex items-center gap-2">
                    <span className="text-[9px] font-bold bg-white px-2 py-1 rounded border border-red-100 text-red-600 uppercase">Aguardando Pátio</span>
                    <Timer size={14} className="text-red-300 animate-pulse" />
                  </div>
                </div>
              ))
            ) : (
              <p className="text-[10px] text-slate-400 font-bold text-center italic py-4">Pátio operando em tempo real</p>
            )}
          </div>
        </div>

        {/* CARD: ATIVIDADE POR GRADUADO (RANKING) */}
        <div className="bg-white rounded-[2.5rem] border border-slate-200 shadow-sm overflow-hidden">
          <div className="p-6 border-b border-slate-100 bg-slate-50/50 flex justify-between items-center">
            <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Atividade por Graduado</p>
            <Users size={16} className="text-slate-400" />
          </div>
          <div className="divide-y divide-slate-100 max-h-[300px] overflow-y-auto">
            {auditoria.length > 0 ? auditoria.map((rel, i) => (
              <div key={i} className="p-4 flex justify-between items-center hover:bg-slate-50 transition-colors">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-blue-100 text-blue-600 rounded-lg flex items-center justify-center font-black text-[10px]">
                    {rel.re?.slice(-2) || '??'}
                  </div>
                  <div>
                    <p className="text-xs font-black text-slate-800 uppercase">{rel.nome || 'Sentinela RE ' + rel.re}</p>
                    <p className="text-[9px] font-bold text-slate-400 uppercase">Total Conferido: {rel.total_conferencias}</p>
                  </div>
                </div>
                {rel.vistorias_com_avaria > 0 && (
                  <span className="text-[8px] bg-orange-100 text-orange-600 px-2 py-1 rounded-full font-black">
                    {rel.vistorias_com_avaria} AVARIAS
                  </span>
                )}
              </div>
            )) : (
              <div className="p-10 text-center text-slate-400 font-bold uppercase text-[10px]">
                Nenhuma atividade registrada no turno
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  </div>
)}

          {/* ABA: ANALYTICS */}
          {activeTab === 'analytics' && (
            <div className="space-y-8 animate-in slide-in-from-right duration-500">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                
                {/* Gráfico Circular de Prontidão */}
                <div className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-slate-200 flex flex-col items-center">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-6">Disponibilidade Operacional</p>
                  <div className="relative flex items-center justify-center">
                    <svg className="w-40 h-40 transform -rotate-90">
                      <circle cx="80" cy="80" r="70" stroke="currentColor" strokeWidth="18" fill="transparent" className="text-slate-50" />
                      <circle cx="80" cy="80" r="70" stroke="currentColor" strokeWidth="18" fill="transparent" 
                        strokeDasharray={440} 
                        strokeDashoffset={440 - (440 * (viaturas.filter(v => v.Status === 'EM SERVIÇO').length / (viaturas.length || 1)))} 
                        className="text-blue-600 transition-all duration-1000" strokeLinecap="round" />
                    </svg>
                    <div className="absolute text-center">
                      <span className="text-4xl font-black text-slate-800 tracking-tighter">
                        {Math.round((viaturas.filter(v => v.Status === 'EM SERVIÇO').length / (viaturas.length || 1)) * 100)}%
                      </span>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4 mt-8 w-full">
                    <div className="text-center bg-slate-50 p-3 rounded-2xl">
                      <p className="text-[8px] font-bold text-slate-400 uppercase">Aptas</p>
                      <p className="font-black text-emerald-600">{viaturas.filter(v => v.Status === 'EM SERVIÇO').length}</p>
                    </div>
                    <div className="text-center bg-slate-50 p-3 rounded-2xl">
                      <p className="text-[8px] font-bold text-slate-400 uppercase">Oficina</p>
                      <p className="font-black text-red-600">{viaturas.filter(v => v.Status !== 'EM SERVIÇO').length}</p>
                    </div>
                  </div>
                </div>

                {/* Top 5 Trocas Próximas */}
                <div className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-slate-200 md:col-span-2">
                   <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-6">Projeção Logística - Troca de Óleo</p>
                   <div className="space-y-5">
                      {viaturas.sort((a,b) => (b.UltimoKM - b.KM_UltimaTroca) - (a.UltimoKM - a.KM_UltimaTroca)).slice(0, 5).map((v, i) => {
                         const rodado = (v.UltimoKM - (v.KM_UltimaTroca || 0));
                         const perc = Math.min(100, (rodado / 10000) * 100);
                         return (
                           <div key={i}>
                              <div className="flex justify-between mb-1">
                                <span className="text-xs font-black text-slate-800">{v.Prefixo}</span>
                                <span className="text-[10px] font-bold text-slate-400">{rodado} / 10.000 KM</span>
                              </div>
                              <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                                <div className={`h-full ${perc > 90 ? 'bg-red-600' : 'bg-blue-600'}`} style={{width: `${perc}%`}}></div>
                              </div>
                           </div>
                         )
                      })}
                   </div>
                </div>

                {/* Banner de Resumo */}
                <div className="bg-slate-900 text-white p-8 rounded-[3rem] md:col-span-3 flex justify-between items-center border-t-8 border-amber-500 shadow-2xl">
                   <div className="space-y-1">
                     <p className="text-[10px] font-bold text-amber-500 uppercase tracking-widest">Estado de Alerta 1º BPM</p>
                     <h3 className="text-2xl font-black italic">PRONTIDÃO OPERACIONAL: <span className="text-emerald-400 underline decoration-2">ALTA</span></h3>
                   </div>
                   <div className="flex gap-10">
                      <div className="text-center border-r border-slate-800 pr-10">
                         <p className="text-[8px] font-bold text-slate-500 uppercase">Disponibilidade</p>
                         <p className="text-2xl font-black">94%</p>
                      </div>
                      <div className="text-center">
                         <p className="text-[8px] font-bold text-slate-500 uppercase">Tempo Médio Oficina</p>
                         <p className="text-2xl font-black">4.2 <span className="text-[10px]">DIAS</span></p>
                      </div>
                   </div>
                </div>
              </div>
            </div>
          )}

          {/* MANUTENÇÃO E INDISPONIBILIDADE (COMPACTAS) */}
          {(activeTab === 'manutencao' || activeTab === 'stats') && (
            <div className="grid grid-cols-1 gap-6 animate-in slide-in-from-bottom-4 duration-500">
               <div className={`${activeTab === 'manutencao' ? 'bg-amber-500 text-slate-900' : 'bg-red-600 text-white'} p-8 rounded-[2rem] flex justify-between items-center`}>
                  <div>
                    <h2 className="text-2xl font-black uppercase italic leading-none">{activeTab === 'manutencao' ? 'Escala de Manutenção' : 'Unidades Fora de Combate'}</h2>
                    <p className="text-sm font-bold uppercase mt-2 opacity-80">{activeTab === 'manutencao' ? 'Prioridade por quilometragem rodada' : 'Viaturas atualmente baixadas em oficina'}</p>
                  </div>
                  {activeTab === 'manutencao' ? <Wrench size={40} /> : <AlertTriangle size={40} />}
               </div>
               
               <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                 {viaturas.filter(v => activeTab === 'manutencao' ? checkOil(v).level > 0 : v.Status === 'MANUTENÇÃO').map((v, i) => (
                    <div key={i} className="bg-white p-6 rounded-[2rem] border border-slate-200 hover:shadow-lg transition-all flex justify-between items-center group">
                       <div>
                          <p className="text-lg font-black text-slate-800 italic">{v.Prefixo}</p>
                          <p className="text-[10px] font-bold text-slate-400 uppercase">{v.Placa}</p>
                          {activeTab === 'manutencao' && (
                            <div className={`mt-2 text-[9px] font-black px-2 py-0.5 rounded-full inline-block ${checkOil(v).bg} text-white`}>
                               {checkOil(v).msg}
                            </div>
                          )}
                       </div>
                       <button onClick={()=>setSelectedVtr(v)} className="p-3 bg-slate-50 text-slate-300 group-hover:text-blue-600 rounded-2xl transition-all">
                          <ArrowRight size={20}/>
                       </button>
                    </div>
                 ))}
               </div>
            </div>
          )}

        </section>
      </main>

      {/* MODAL DETALHES */}
      {selectedVtr && <VtrDetailsModal vtr={selectedVtr} onClose={() => setSelectedVtr(null)} checkOil={checkOil} onAction={handleAction} />}
    </div>
  );
};

// COMPONENTES AUXILIARES
const VtrDetailsModal = ({ vtr, onClose, checkOil, onAction }) => {
  const oilInfo = checkOil(vtr);
  const kmRodado = (vtr.UltimoKM - (vtr.KM_UltimaTroca || 0));
  const percentual = Math.max(0, 100 - (kmRodado / 10000) * 100);
  
  return (
    <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-md z-[100] flex justify-end print:hidden">
      <div className="w-full max-w-xl bg-white h-full shadow-2xl p-10 overflow-y-auto animate-in slide-in-from-right duration-500 border-l border-slate-200">
        <div className="flex justify-between items-center mb-10">
          <div>
            <h2 className="text-4xl font-black text-slate-900 italic uppercase tracking-tighter">{vtr.Prefixo}</h2>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Ficha Técnica da Unidade</p>
          </div>
          <button onClick={onClose} className="p-3 hover:bg-slate-100 rounded-full transition-all text-slate-400"><X size={24}/></button>
        </div>

        <div className="space-y-8">
           {/* Card de Saúde */}
           <div className="bg-slate-50 p-6 rounded-[2rem] border border-slate-100 shadow-inner">
              <div className="flex justify-between items-end mb-4">
                  <p className="text-[10px] font-black text-slate-400 uppercase flex items-center gap-2"><Droplets size={16}/> Nível de Lubrificante</p>
                  <p className="text-xl font-black text-slate-800">{Math.max(0, 10000 - kmRodado)} KM <span className="text-[10px] text-slate-400">PARA TROCA</span></p>
              </div>
              <div className="w-full bg-slate-200 h-4 rounded-full overflow-hidden">
                <div className={`h-full transition-all duration-1000 ${oilInfo.bg}`} style={{ width: `${percentual}%` }} />
              </div>
              <div className="mt-4 flex gap-4">
                 <div className="flex-1 bg-white p-3 rounded-2xl border border-slate-100">
                    <p className="text-[8px] font-bold text-slate-400 uppercase">KM Última Troca</p>
                    <p className="font-black text-slate-700">{vtr.KM_UltimaTroca || '0'}</p>
                 </div>
                 <div className="flex-1 bg-white p-3 rounded-2xl border border-slate-100">
                    <p className="text-[8px] font-bold text-slate-400 uppercase">KM Atual</p>
                    <p className="font-black text-slate-700">{vtr.UltimoKM}</p>
                 </div>
              </div>
           </div>

           {/* Ações de Comando */}
           <div className="space-y-3">
              <p className="text-[10px] font-black uppercase text-slate-400 ml-2">Ordens de Serviço</p>
              <button onClick={() => onAction('registrarManutencao', { prefixo: vtr.Prefixo, tipo: 'TROCA_OLEO', km: vtr.UltimoKM })} className="w-full py-5 bg-emerald-500 text-white rounded-3xl font-black uppercase text-xs hover:bg-emerald-600 transition-all flex items-center justify-center gap-2 shadow-lg shadow-emerald-100">
                <CheckCircle2 size={18}/> Validar Troca Realizada
              </button>
              <button onClick={() => onAction('baixarViatura', { prefixo: vtr.Prefixo, motivo: 'Solicitação Administrativa' })} className="w-full py-5 bg-red-600 text-white rounded-3xl font-black uppercase text-xs hover:bg-red-700 transition-all flex items-center justify-center gap-2 shadow-lg shadow-red-100">
                <AlertTriangle size={18}/> Decretar Baixa Imediata
              </button>
           </div>

           {/* Detalhes Técnicos */}
           <div className="grid grid-cols-2 gap-4">
              <div className="p-4 bg-slate-50 rounded-2xl">
                 <p className="text-[8px] font-black text-slate-400 uppercase">Placa Policial</p>
                 <p className="font-bold text-slate-800">{vtr.Placa || 'N/A'}</p>
              </div>
              <div className="p-4 bg-slate-50 rounded-2xl">
                 <p className="text-[8px] font-black text-slate-400 uppercase">Setor Designado</p>
                 <p className="font-bold text-slate-800">{vtr.Setor || 'N/A'}</p>
              </div>
           </div>
        </div>
      </div>
    </div>
  );
};

const MenuBtn = ({ active, onClick, icon, label }) => (
  <button onClick={onClick} className={`w-full flex items-center gap-3 p-4 rounded-2xl text-[10px] font-black uppercase transition-all ${active ? 'bg-amber-500 text-slate-900 shadow-xl scale-[1.02]' : 'text-slate-500 hover:bg-slate-800 hover:text-slate-300'}`}>
    {icon} {label}
  </button>
);

const StatCard = ({ label, value, color }) => {
  const themes = { 
    blue: 'border-l-blue-500 text-blue-600', 
    emerald: 'border-l-emerald-500 text-emerald-600', 
    red: 'border-l-red-500 text-red-600', 
    amber: 'border-l-amber-500 text-amber-600' 
  };
  return (
    <div className={`bg-white p-6 rounded-[2rem] border-l-8 ${themes[color].split(' ')[0]} shadow-sm`}>
      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{label}</p>
      <p className={`text-3xl font-black mt-1 ${themes[color].split(' ')[1]}`}>{value}</p>
    </div>
  );
};

export default AdminDashboard;
