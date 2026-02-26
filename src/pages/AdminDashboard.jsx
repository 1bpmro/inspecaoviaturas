import React, { useState, useEffect } from 'react';
import { gasApi } from '../api/gasClient';
import { 
  Settings, Car, Wrench, Fuel, BarChart3, Plus, 
  AlertTriangle, Search, Filter, ArrowRight, Droplets, 
  History, X, AlertCircle, ArrowLeft, TrendingUp, PieChart, 
  Activity, Printer, Clock, ShieldCheck, Map
} from 'lucide-react';

const AdminDashboard = ({ onBack }) => {
  const [activeTab, setActiveTab] = useState('frota');
  const [viaturas, setViaturas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedVtr, setSelectedVtr] = useState(null);

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const res = await gasApi.getViaturas();
      if (res.status === 'success') {
        setViaturas(res.data.filter(v => v.Status !== "FORA DE SERVIÇO (BAIXA)"));
      }
    } catch (error) { console.error("Erro:", error); } finally { setLoading(false); }
  };

  const checkOil = (vtr) => {
    const kmAtual = parseInt(vtr.UltimoKM || 0);
    const kmTroca = parseInt(vtr.KM_UltimaTroca || 0);
    const rodado = kmAtual - kmTroca;
    const mediaDiaria = 150; // Média estimada de rodagem PM
    const kmRestante = 10000 - rodado;
    const diasRestantes = Math.max(0, Math.floor(kmRestante / mediaDiaria));

    if (rodado >= 9500) return { color: 'text-red-600', bg: 'bg-red-600', msg: 'CRÍTICO', level: 2, dias: diasRestantes };
    if (rodado >= 8000) return { color: 'text-amber-500', bg: 'bg-amber-500', msg: 'ATENÇÃO', level: 1, dias: diasRestantes };
    return { color: 'text-emerald-500', bg: 'bg-emerald-500', msg: 'OPERACIONAL', level: 0, dias: diasRestantes };
  };

  const handlePrint = () => { window.print(); };

  const handleAction = async (action, payload) => {
    if (!window.confirm(`Confirma operação militar?`)) return;
    setLoading(true);
    try {
      const res = await gasApi.doPost({ action, payload }); 
      if (res.status === 'success') { loadData(); setSelectedVtr(null); }
    } catch (err) { alert("Erro na rede."); } finally { setLoading(false); }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex font-sans print:bg-white">
      {/* SIDEBAR - Escondida na impressão */}
      <aside className="w-64 bg-slate-900 text-white flex flex-col shadow-2xl shrink-0 print:hidden">
        <div className="p-6 border-b border-slate-800 text-center">
          <h1 className="font-black text-xl tracking-tighter uppercase italic">Painel <span className="text-amber-500">CMDO</span></h1>
          <p className="text-[9px] font-bold text-slate-500 tracking-widest uppercase">1º BPM - Porto Velho</p>
        </div>

        <nav className="flex-1 p-4 space-y-1">
          <button onClick={onBack} className="w-full flex items-center gap-3 p-3 rounded-xl text-[10px] font-black uppercase text-blue-400 hover:bg-slate-800 mb-4 border border-blue-900/30">
            <ArrowLeft size={16}/> Sair do Sistema
          </button>
          <MenuBtn active={activeTab==='frota'} onClick={()=>setActiveTab('frota')} icon={<ShieldCheck size={18}/>} label="Prontidão da Frota" />
          <MenuBtn active={activeTab==='manutencao'} onClick={()=>setActiveTab('manutencao')} icon={<Wrench size={18}/>} label="Escala de Manutenção" />
          <MenuBtn active={activeTab==='stats'} onClick={()=>setActiveTab('stats')} icon={<AlertTriangle size={18}/>} label="Indisponibilidade" />
          <MenuBtn active={activeTab==='analytics'} onClick={()=>setActiveTab('analytics')} icon={<TrendingUp size={18}/>} label="Viaturas em Números" />
        </nav>
      </aside>

      <main className="flex-1 flex flex-col overflow-hidden">
        {/* HEADER */}
        <header className="bg-white h-16 border-b border-slate-200 flex items-center justify-between px-8 shrink-0 print:hidden">
          <div className="flex items-center gap-4 bg-slate-100 px-4 py-2 rounded-xl w-96">
            <Search size={16} className="text-slate-400" />
            <input type="text" placeholder="Filtrar por Prefixo, Placa ou Setor..." className="bg-transparent border-none outline-none text-xs font-bold w-full" onChange={(e) => setSearchTerm(e.target.value)} />
          </div>
          <div className="flex items-center gap-4">
            <button onClick={handlePrint} className="flex items-center gap-2 px-4 py-2 bg-slate-900 text-white rounded-lg text-[10px] font-black uppercase hover:bg-slate-800 transition-all">
              <Printer size={16}/> Relatório de Passagem
            </button>
          </div>
        </header>

        <section className="p-8 overflow-y-auto">
          {/* CABEÇALHO DE IMPRESSÃO (Só aparece no papel) */}
          <div className="hidden print:block text-center mb-8 border-b-2 border-black pb-4">
            <h1 className="text-2xl font-bold uppercase">Polícia Militar de Rondônia - 1º BPM</h1>
            <h2 className="text-lg font-bold uppercase text-slate-700">Relatório Estratégico de Frota - {new Date().toLocaleDateString()}</h2>
          </div>

          {/* ABA 1: PRONTIDÃO (TABELA COMPLETA COM CORES DE SEMÁFORO) */}
          {activeTab === 'frota' && (
            <div className="space-y-6 animate-in fade-in duration-500">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <StatCard label="Efetivo Total" value={viaturas.length} color="blue" />
                <StatCard label="Em Patrulhamento" value={viaturas.filter(v => v.Status === 'EM SERVIÇO').length} color="emerald" />
                <StatCard label="Fora de Combate" value={viaturas.filter(v => v.Status === 'MANUTENÇÃO').length} color="red" />
                <StatCard label="Nível de Óleo OK" value={viaturas.filter(v => checkOil(v).level === 0).length} color="blue" />
              </div>

              <div className="bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden">
                <table className="w-full text-left">
                  <thead className="bg-slate-50 border-b border-slate-200 text-[10px] font-black uppercase text-slate-400">
                    <tr><th className="p-4">Unidade</th><th className="p-4">Status</th><th className="p-4">Saúde Mecânica</th><th className="p-4">Previsão Parada</th><th className="p-4 text-right print:hidden">Ações</th></tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {viaturas.filter(v => v.Prefixo?.includes(searchTerm.toUpperCase())).map((v, i) => {
                      const oil = checkOil(v);
                      return (
                        <tr key={i} className="hover:bg-slate-50 transition-all cursor-pointer group" onClick={() => setSelectedVtr(v)}>
                          <td className="p-4">
                             <div className="flex items-center gap-3">
                               <div className={`w-10 h-10 rounded-lg flex items-center justify-center font-black text-white ${oil.bg}`}>{v.Prefixo?.slice(-2)}</div>
                               <div><p className="font-black text-slate-800">{v.Prefixo}</p><p className="text-[9px] text-slate-400 font-bold uppercase">Setor: {v.Setor || 'N/A'}</p></div>
                             </div>
                          </td>
                          <td className="p-4">
                            <div className="flex flex-col">
                              <span className={`text-[9px] font-black px-2 py-1 rounded-md inline-block w-fit uppercase ${v.Status === 'EM SERVIÇO' ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>{v.Status}</span>
                              <span className="text-[8px] text-slate-400 font-bold mt-1 uppercase">KM: {v.UltimoKM}</span>
                            </div>
                          </td>
                          <td className="p-4">
                             <div className="flex items-center gap-2">
                               <div className={`w-2 h-2 rounded-full animate-pulse ${oil.bg}`}></div>
                               <span className={`text-[10px] font-black ${oil.color}`}>{oil.msg}</span>
                             </div>
                          </td>
                          <td className="p-4">
                            <div className="flex items-center gap-2 text-slate-500 font-bold text-[10px]">
                              <Clock size={12}/> {oil.dias} Dias est.
                            </div>
                          </td>
                          <td className="p-4 text-right print:hidden"><History size={16} className="text-slate-300 ml-auto group-hover:text-slate-900"/></td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ABA 4: VIATURAS EM NÚMEROS (ANALYTICS) */}
          {activeTab === 'analytics' && (
            <div className="space-y-8 animate-in slide-in-from-right duration-500">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                
                {/* Gráfico Circular de Prontidão */}
                <div className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-slate-200 flex flex-col items-center">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-6">Prontidão Operacional</p>
                  <div className="relative flex items-center justify-center">
                    <svg className="w-40 h-40 transform -rotate-90">
                      <circle cx="80" cy="80" r="70" stroke="currentColor" strokeWidth="18" fill="transparent" className="text-slate-50" />
                      <circle cx="80" cy="80" r="70" stroke="currentColor" strokeWidth="18" fill="transparent" 
                        strokeDasharray={440} 
                        strokeDashoffset={440 - (440 * (viaturas.filter(v => v.Status === 'EM SERVIÇO').length / viaturas.length))} 
                        className="text-blue-600 transition-all duration-1000" strokeLinecap="round" />
                    </svg>
                    <div className="absolute text-center">
                      <span className="text-4xl font-black text-slate-800 tracking-tighter">{Math.round((viaturas.filter(v => v.Status === 'EM SERVIÇO').length / viaturas.length) * 100)}%</span>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4 mt-8 w-full">
                    <div className="text-center bg-slate-50 p-3 rounded-2xl">
                      <p className="text-[8px] font-bold text-slate-400 uppercase">Aptas</p>
                      <p className="font-black text-emerald-600">{viaturas.filter(v => v.Status === 'EM SERVIÇO').length}</p>
                    </div>
                    <div className="text-center bg-slate-50 p-3 rounded-2xl">
                      <p className="text-[8px] font-bold text-slate-400 uppercase">Baixadas</p>
                      <p className="font-black text-red-600">{viaturas.filter(v => v.Status !== 'EM SERVIÇO').length}</p>
                    </div>
                  </div>
                </div>

                {/* Previsão de Gastos/Troca (Barras) */}
                <div className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-slate-200 md:col-span-2">
                   <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-6">Top 5 - Próximas Trocas de Óleo</p>
                   <div className="space-y-5">
                      {viaturas.sort((a,b) => (b.UltimoKM - b.KM_UltimaTroca) - (a.UltimoKM - a.KM_UltimaTroca)).slice(0, 5).map((v, i) => {
                         const rodado = (v.UltimoKM - (v.KM_UltimaTroca || 0));
                         const perc = (rodado / 10000) * 100;
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

                {/* Quadro de Motivos de Indisponibilidade */}
                <div className="bg-slate-900 text-white p-8 rounded-[3rem] md:col-span-3 flex justify-between items-center">
                   <div className="space-y-1">
                     <p className="text-[10px] font-bold text-amber-500 uppercase tracking-widest">Resumo Estratégico</p>
                     <h3 className="text-2xl font-black italic">ESTADO DE PRONTIDÃO: <span className="text-emerald-400 underline">ALTO</span></h3>
                   </div>
                   <div className="flex gap-10">
                      <div className="text-center border-r border-slate-800 pr-10">
                         <p className="text-[8px] font-bold text-slate-500 uppercase">Média Frota</p>
                         <p className="text-2xl font-black">94%</p>
                      </div>
                      <div className="text-center">
                         <p className="text-[8px] font-bold text-slate-500 uppercase">Tempo Médio Baixa</p>
                         <p className="text-2xl font-black">4.2 <span className="text-[10px]">DIAS</span></p>
                      </div>
                   </div>
                </div>

              </div>
            </div>
          )}

          {/* AS OUTRAS ABAS (MANUTENÇÃO E INDISPONIBILIDADE) SÃO MANTIDAS COM ESTILO REFORÇADO */}
          {activeTab === 'manutencao' && (
             <div className="space-y-6 animate-in slide-in-from-bottom-4 duration-500">
                <div className="bg-amber-500 p-8 rounded-[2rem] text-slate-900 flex justify-between items-center">
                   <div>
                     <h2 className="text-2xl font-black uppercase italic leading-none">Escala de Manutenção</h2>
                     <p className="text-sm font-bold uppercase mt-2 opacity-80">Prioridade baseada em KM e tempo de serviço</p>
                   </div>
                   <Clock size={48} className="opacity-20" />
                </div>
                {/* Tabela de Manutenção... (Igual anterior, mas com o checkOil completo) */}
                <div className="bg-white rounded-2xl border overflow-hidden">
                   <table className="w-full text-left">
                      <thead className="bg-slate-50 border-b text-[10px] font-black uppercase p-4">
                         <tr><th className="p-4">Viatura</th><th className="p-4">KM Rodado</th><th className="p-4">Previsão</th><th className="p-4 text-right">Dossiê</th></tr>
                      </thead>
                      <tbody className="divide-y">
                         {viaturas.filter(v => checkOil(v).level > 0).map((v, i) => (
                           <tr key={i} className="hover:bg-slate-50">
                              <td className="p-4 font-black">{v.Prefixo}</td>
                              <td className="p-4 font-mono font-bold">{(v.UltimoKM - v.KM_UltimaTroca)} KM</td>
                              <td className="p-4"><span className={`text-[9px] font-black px-3 py-1 rounded-full ${checkOil(v).bg} text-white uppercase`}>{checkOil(v).msg}</span></td>
                              <td className="p-4 text-right"><button onClick={()=>setSelectedVtr(v)} className="bg-slate-900 text-white px-4 py-2 rounded-xl text-[10px] font-black">ABRIR</button></td>
                           </tr>
                         ))}
                      </tbody>
                   </table>
                </div>
             </div>
          )}
          
          {activeTab === 'stats' && (
             <div className="space-y-6 animate-in slide-in-from-bottom-4 duration-500">
                <div className="bg-red-600 p-8 rounded-[2rem] text-white flex justify-between items-center shadow-lg shadow-red-200">
                   <div>
                     <h2 className="text-2xl font-black uppercase italic leading-none">Fora de Combate</h2>
                     <p className="text-sm font-bold uppercase mt-2 opacity-80">Unidades atualmente em oficina ou impedidas</p>
                   </div>
                   <AlertTriangle size={48} className="text-white/30" />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {viaturas.filter(v => v.Status === 'MANUTENÇÃO').map((v, i) => (
                    <div key={i} className="bg-white p-6 rounded-3xl border border-red-100 flex justify-between items-center">
                       <div className="flex items-center gap-4">
                          <div className="w-14 h-14 bg-red-100 text-red-600 rounded-2xl flex items-center justify-center font-black text-xl italic">{v.Prefixo?.slice(-2)}</div>
                          <div><p className="font-black text-slate-800 text-lg">{v.Prefixo}</p><p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{v.Placa}</p></div>
                       </div>
                       <button onClick={()=>setSelectedVtr(v)} className="p-3 bg-slate-50 text-slate-400 hover:text-red-600 rounded-2xl transition-all"><History size={20}/></button>
                    </div>
                  ))}
                </div>
             </div>
          )}
        </section>
      </main>

      {/* MODAL DETALHES (MANTIDO E MELHORADO) */}
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
      <div className="w-full max-w-xl bg-white h-full shadow-2xl p-10 overflow-y-auto animate-in slide-in-from-right duration-500">
        <div className="flex justify-between items-center mb-10">
          <div><h2 className="text-4xl font-black text-slate-900 italic uppercase tracking-tighter">{vtr.Prefixo}</h2><p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Dossiê de Unidade Móvel</p></div>
          <button onClick={onClose} className="p-3 hover:bg-slate-100 rounded-full transition-all"><X size={24}/></button>
        </div>
        <div className="grid grid-cols-1 gap-4 mb-10">
           <div className="bg-slate-50 p-6 rounded-[2rem] border border-slate-100">
              <div className="flex justify-between items-end mb-4">
                 <p className="text-[10px] font-black text-slate-400 uppercase flex items-center gap-2"><Droplets size={16}/> Eficiência Lubrificante</p>
                 <p className="text-xl font-black text-slate-800">{Math.max(0, 10000 - kmRodado)} KM <span className="text-[10px] text-slate-400">RESTANTES</span></p>
              </div>
              <div className="w-full bg-slate-200 h-4 rounded-full overflow-hidden shadow-inner"><div className={`h-full transition-all duration-1000 ${oilInfo.bg}`} style={{ width: `${percentual}%` }} /></div>
              <p className="mt-4 text-[10px] font-bold text-slate-400 uppercase italic">Previsão de manutenção em aproximadamente {oilInfo.dias} dias de uso contínuo.</p>
           </div>
        </div>
        <div className="space-y-4">
          <h3 className="text-xs font-black uppercase text-slate-400 border-b pb-2">Comandos Administrativos</h3>
          <button onClick={() => onAction('registrarManutencao', { prefixo: vtr.Prefixo, tipo: 'TROCA_OLEO', km: vtr.UltimoKM })} className="w-full py-6 bg-amber-500 text-slate-900 rounded-3xl font-black uppercase text-xs hover:shadow-lg hover:shadow-amber-200 active:scale-95 transition-all flex items-center justify-center gap-2"><Wrench size={18}/> Validar Manutenção Realizada</button>
          <button onClick={() => onAction('baixarViatura', { prefixo: vtr.Prefixo, motivo: 'Solicitação via CMDO' })} className="w-full py-6 bg-red-600 text-white rounded-3xl font-black uppercase text-xs hover:shadow-lg hover:shadow-red-200 active:scale-95 transition-all flex items-center justify-center gap-2"><AlertTriangle size={18}/> Decretar Baixa de Unidade</button>
        </div>
      </div>
    </div>
  );
};

const MenuBtn = ({ active, onClick, icon, label }) => (
  <button onClick={onClick} className={`w-full flex items-center gap-3 p-4 rounded-2xl text-[11px] font-black uppercase transition-all ${active ? 'bg-amber-500 text-slate-900 shadow-xl scale-[1.02]' : 'text-slate-500 hover:bg-slate-800'}`}>
    {icon} {label}
  </button>
);

const StatCard = ({ label, value, color }) => {
  const borderColors = { blue: 'border-l-blue-500', emerald: 'border-l-emerald-500', red: 'border-l-red-500', amber: 'border-l-amber-500' };
  return (
    <div className={`bg-white p-6 rounded-[2rem] border-l-8 ${borderColors[color]} shadow-sm`}>
      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{label}</p>
      <p className="text-3xl font-black text-slate-900 mt-1">{value}</p>
    </div>
  );
};

export default AdminDashboard;
