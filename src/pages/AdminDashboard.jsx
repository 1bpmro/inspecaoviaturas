import React, { useState, useEffect, useMemo } from 'react';
import { gasApi } from '../api/gasClient';
import { useAuth } from '../lib/AuthContext';
import { 
  Settings, LayoutDashboard, ArrowLeft, Menu, X, Plus, Search, 
  Printer, Save, Edit2, Trash2, Loader2, FileText,
  Database, Droplets, Eye, CheckCircle, Clock, AlertTriangle, 
  ChevronRight, Filter, Download, BarChart3, Disc
} from 'lucide-react';

const AdminDashboard = ({ onBack }) => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('stats'); 
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [viaturas, setViaturas] = useState([]);
  const [vistorias, setVistorias] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [viewingPhoto, setViewingPhoto] = useState(null);
  const [isAddingVtr, setIsAddingVtr] = useState(false);

  // Estados de Filtro para o Comandante
  const [filters, setFilters] = useState({
    viatura: '',
    motorista: '',
    garageiro: '',
    dataInicio: '',
    dataFim: ''
  });

  const [formData, setFormData] = useState({
    id: '', prefixo: '', placa: '', modelo: '', tipoCarroceria: 'CAMBURÃO', isEditing: false
  });

  const LISTA_CARROCERIAS = ['CAMBURÃO', 'CARROCERIA ABERTA', 'OSTENSIVA COMUM', 'ADMINISTRATIVA', 'OUTROS'];

  useEffect(() => { 
    loadData(); 
    const interval = setInterval(loadData, 60000);
    return () => clearInterval(interval);
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      // Buscando vistorias completas para os relatórios "das antigas"
      const [resVtr, resVist, resHist] = await Promise.all([
        gasApi.getViaturas(),
        gasApi.getVistoriasPendentes(),
        gasApi.getHistoricoVistorias ? gasApi.getHistoricoVistorias() : { data: [] }
      ]);
      
      if (resVtr.status === 'success') {
        setViaturas(resVtr.data.filter(v => (v.Status || v.STATUS) !== "FORA DE SERVIÇO (BAIXA)"));
      }
      // Unificando vistorias para análise de dados
      setVistorias(resHist.data || []);
    } catch (error) {
      console.error("Erro administrativo:", error);
    } finally {
      setLoading(false);
    }
  };

  // --- LÓGICA DE FILTROS DO COMANDANTE ---
  const dadosFiltrados = useMemo(() => {
    return vistorias.filter(item => {
      const matchVtr = !filters.viatura || item.prefixo_vtr?.includes(filters.viatura);
      const matchMot = !filters.motorista || item.motorista_nome?.toUpperCase().includes(filters.motorista.toUpperCase());
      const matchGar = !filters.garageiro || item.garageiro_re?.includes(filters.garageiro);
      return matchVtr && matchMot && matchGar;
    });
  }, [vistorias, filters]);

  // --- CÁLCULO DE DESGASTE DE PNEU (RODAGEM) ---
  const calculoPneus = useMemo(() => {
    const kmPorVtr = {};
    dadosFiltrados.forEach(v => {
      const pref = v.prefixo_vtr;
      const km = parseInt(v.hodometro_saida || 0);
      if(!kmPorVtr[pref]) kmPorVtr[pref] = { min: km, max: km };
      kmPorVtr[pref].min = Math.min(kmPorVtr[pref].min, km);
      kmPorVtr[pref].max = Math.max(kmPorVtr[pref].max, km);
    });
    return kmPorVtr;
  }, [dadosFiltrados]);

  const pendenciasOleo = vistorias.filter(v => 
    v.troca_oleo === "SIM" && (!v.garageiro_re || v.garageiro_re === "")
  );

  const handleSaveViatura = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const action = formData.isEditing ? 'updateViatura' : 'addViatura';
      const res = await gasApi.doPost({ action, payload: formData });
      if (res.status === 'success') {
        setIsAddingVtr(false);
        loadData();
      }
    } catch (err) {
      alert("Falha na comunicação.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex font-sans text-slate-900 overflow-hidden">
      
      {/* SIDEBAR ESTRATÉGICA */}
      <aside className={`fixed inset-y-0 left-0 z-[200] w-72 bg-slate-950 text-white flex flex-col transition-transform duration-300 md:relative md:translate-x-0 ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="p-8 border-b border-slate-900">
          <div className="flex items-center gap-3">
            <div className="bg-amber-500 p-2 rounded-xl text-slate-900">
              <Settings size={22} className="animate-spin-slow"/>
            </div>
            <div>
              <h1 className="font-black text-xl italic uppercase tracking-tighter">P4 COMMAND</h1>
              <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Inteligência de Frota</p>
            </div>
          </div>
        </div>

        <nav className="flex-1 p-4 space-y-2 mt-4">
          <MenuBtn active={activeTab === 'stats'} onClick={() => setActiveTab('stats')} icon={<LayoutDashboard size={18}/>} label="Dashboard" />
          <MenuBtn active={activeTab === 'reports'} onClick={() => setActiveTab('reports')} icon={<FileText size={18}/>} label="Relatórios Finais" />
          <MenuBtn active={activeTab === 'frota'} onClick={() => setActiveTab('frota')} icon={<Database size={18}/>} label="Gestão de Frota" />
          <MenuBtn active={activeTab === 'pneus'} onClick={() => setActiveTab('pneus')} icon={<Disc size={18}/>} label="Controle de Rodagem" />
          
          <div className="pt-10 border-t border-slate-900 mt-6 px-4">
            <button onClick={onBack} className="w-full flex items-center gap-3 p-4 text-slate-500 hover:text-white hover:bg-red-500/10 rounded-2xl text-[10px] font-black uppercase border border-slate-900 transition-all">
              <ArrowLeft size={16}/> Sair do Painel
            </button>
          </div>
        </nav>
      </aside>

      <main className="flex-1 flex flex-col min-w-0 h-screen">
        <header className="bg-white h-20 border-b border-slate-200 flex items-center justify-between px-8 shrink-0">
          <div className="flex items-center gap-4">
            <button onClick={() => setIsSidebarOpen(true)} className="md:hidden p-3 bg-slate-100 rounded-xl"><Menu size={20} /></button>
            <h2 className="font-black uppercase text-[10px] tracking-[0.3em] text-slate-400">
              {activeTab === 'stats' ? 'Análise do Comandante' : 'Módulo Administrativo'}
            </h2>
          </div>
          {loading && <Loader2 size={18} className="animate-spin text-amber-500" />}
        </header>

        <section className="flex-1 overflow-y-auto p-4 md:p-8">
          
          {/* ABA: DASHBOARD DO COMANDANTE */}
          {activeTab === 'stats' && (
            <div className="max-w-7xl mx-auto space-y-6">
              {/* FILTROS DE INTELIGÊNCIA */}
              <div className="bg-white p-6 rounded-[2rem] shadow-sm border border-slate-200 grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="space-y-1">
                  <label className="text-[9px] font-black text-slate-400 uppercase ml-2">Viatura</label>
                  <div className="relative">
                    <Search className="absolute left-4 top-3.5 text-slate-300" size={16}/>
                    <input className="w-full bg-slate-50 border-none rounded-xl py-3 pl-11 text-xs font-bold" placeholder="Prefixo..." onChange={e => setFilters({...filters, viatura: e.target.value})} />
                  </div>
                </div>
                <div className="space-y-1">
                  <label className="text-[9px] font-black text-slate-400 uppercase ml-2">Motorista (RE/Nome)</label>
                  <input className="w-full bg-slate-50 border-none rounded-xl py-3 px-4 text-xs font-bold" placeholder="Filtrar motorista..." onChange={e => setFilters({...filters, motorista: e.target.value})} />
                </div>
                <div className="space-y-1">
                  <label className="text-[9px] font-black text-slate-400 uppercase ml-2">Garageiro</label>
                  <input className="w-full bg-slate-50 border-none rounded-xl py-3 px-4 text-xs font-bold" placeholder="RE do garageiro..." onChange={e => setFilters({...filters, garageiro: e.target.value})} />
                </div>
                <div className="flex items-end">
                  <button className="w-full bg-slate-900 text-white h-[46px] rounded-xl font-black text-[10px] uppercase flex items-center justify-center gap-2">
                    <Filter size={14}/> Aplicar Filtros
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <StatCard label="Atv. Recentes" value={dadosFiltrados.length} color="blue" />
                <StatCard label="Alertas Óleo" value={pendenciasOleo.length} color="amber" />
                <StatCard label="Frota Total" value={viaturas.length} color="blue" />
                <StatCard label="KMs Rodados" value={Object.values(calculoPneus).reduce((a, b) => a + (b.max - b.min), 0)} color="red" />
              </div>

              {/* TABELA DE OPERAÇÕES EM TEMPO REAL */}
              <div className="bg-white rounded-[2rem] border border-slate-200 overflow-hidden shadow-sm">
                 <div className="p-6 border-b border-slate-50 flex justify-between items-center">
                    <h3 className="text-xs font-black uppercase tracking-widest text-slate-400">Log de Movimentação Cross-Filter</h3>
                    <button onClick={() => window.print()} className="p-2 hover:bg-slate-100 rounded-lg"><Printer size={18}/></button>
                 </div>
                 <div className="overflow-x-auto">
                    <table className="w-full text-left">
                      <thead className="bg-slate-50 text-[9px] font-black uppercase text-slate-400">
                        <tr>
                          <th className="p-5">Data/Hora</th>
                          <th className="p-5">VTR</th>
                          <th className="p-5">Motorista</th>
                          <th className="p-5">KM Saída</th>
                          <th className="p-5">Garageiro</th>
                          <th className="p-5 text-right">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-50 text-[11px] font-bold">
                        {dadosFiltrados.slice(0, 20).map((item, i) => (
                          <tr key={i} className="hover:bg-slate-50/50">
                            <td className="p-5 text-slate-400">{item.data_hora}</td>
                            <td className="p-5 font-black">{item.prefixo_vtr}</td>
                            <td className="p-5">{item.motorista_nome}</td>
                            <td className="p-5">{item.hodometro_saida} KM</td>
                            <td className="p-5">{item.garageiro_re || '---'}</td>
                            <td className="p-5 text-right">
                               <span className="px-2 py-1 bg-emerald-100 text-emerald-700 rounded-md text-[9px]">REGISTRADO</span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                 </div>
              </div>
            </div>
          )}

          {/* ABA: CONTROLE DE PNEUS / RODAGEM */}
          {activeTab === 'pneus' && (
            <div className="max-w-5xl mx-auto animate-in fade-in">
              <div className="bg-slate-900 rounded-[2.5rem] p-10 text-white mb-8">
                <h3 className="text-2xl font-black italic uppercase">Desgaste de Rodagem (Pneus)</h3>
                <p className="text-slate-400 text-xs mt-2 uppercase tracking-widest">Cálculo automático baseado na variação de KM entre vistorias</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {Object.entries(calculoPneus).map(([pref, dados]) => (
                  <div key={pref} className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm flex items-center justify-between">
                    <div>
                      <p className="text-[10px] font-black text-slate-400 uppercase">Prefixo</p>
                      <p className="text-2xl font-black">{pref}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-[10px] font-black text-emerald-500 uppercase">KM Rodado no Período</p>
                      <p className="text-3xl font-black text-slate-800">{dados.max - dados.min} <span className="text-sm font-normal text-slate-400">KM</span></p>
                      <div className="w-32 h-2 bg-slate-100 rounded-full mt-2 overflow-hidden">
                        <div className="h-full bg-amber-500" style={{width: `${Math.min((dados.max - dados.min)/50, 100)}%`}}></div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ABA: GESTÃO DE FROTA (CRUD) */}
          {activeTab === 'frota' && (
            <div className="max-w-6xl mx-auto space-y-6">
              <div className="flex justify-between items-center">
                 <div className="bg-white p-3 rounded-2xl border border-slate-200 flex-1 max-w-md flex items-center gap-3">
                   <Search size={18} className="text-slate-300"/>
                   <input className="bg-transparent border-none outline-none text-xs font-black uppercase w-full" placeholder="Buscar ativo..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
                 </div>
                 <button onClick={() => {setFormData({id:'', prefixo:'', placa:'', modelo:'', tipoCarroceria:'CAMBURÃO', isEditing:false}); setIsAddingVtr(true)}} className="bg-slate-900 text-white px-6 py-3 rounded-2xl font-black text-[10px] uppercase flex items-center gap-2">
                   <Plus size={16}/> Nova VTR
                 </button>
              </div>

              <div className="bg-white rounded-[2.5rem] border border-slate-200 overflow-hidden shadow-sm">
                <table className="w-full text-left text-sm font-bold">
                  <thead className="bg-slate-900 text-[9px] text-slate-500 uppercase font-black">
                    <tr>
                      <th className="p-6">Viatura</th>
                      <th className="p-6">Placa / Modelo</th>
                      <th className="p-6">Carroceria</th>
                      <th className="p-6 text-center">Ações</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {viaturas.filter(v => v.Prefixo?.includes(searchTerm.toUpperCase())).map((v, i) => (
                      <tr key={i} className="hover:bg-slate-50 transition-colors">
                        <td className="p-6 text-xl font-black tracking-tighter">{v.Prefixo || v.prefixo}</td>
                        <td className="p-6">
                          <p className="text-slate-900">{v.Placa || v.placa}</p>
                          <p className="text-[10px] text-slate-400 uppercase">{v.Modelo || v.modelo}</p>
                        </td>
                        <td className="p-6 text-[10px] uppercase font-black text-blue-600">{v.TipoCarroceria || 'PADRÃO'}</td>
                        <td className="p-6 text-center">
                           <div className="flex justify-center gap-2">
                             <button onClick={() => {setFormData({...v, isEditing: true}); setIsAddingVtr(true)}} className="p-2 text-amber-500 hover:bg-amber-50 rounded-lg"><Edit2 size={16}/></button>
                             <button className="p-2 text-red-300 hover:text-red-500"><Trash2 size={16}/></button>
                           </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </section>
      </main>

      {/* MODAL CADASTRO */}
      {isAddingVtr && (
        <div className="fixed inset-0 bg-slate-950/90 z-[300] flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-white w-full max-w-lg rounded-[3rem] shadow-2xl overflow-hidden">
            <div className="p-8 bg-slate-900 text-white flex justify-between items-center">
              <h2 className="font-black uppercase italic tracking-tighter">{formData.isEditing ? 'Editar Ativo' : 'Novo Ativo'}</h2>
              <button onClick={() => setIsAddingVtr(false)}><X/></button>
            </div>
            <form onSubmit={handleSaveViatura} className="p-10 space-y-4">
              <Input label="Prefixo" value={formData.prefixo} onChange={e => setFormData({...formData, prefixo: e.target.value.toUpperCase()})} />
              <Input label="Placa" value={formData.placa} onChange={e => setFormData({...formData, placa: e.target.value.toUpperCase()})} />
              <Input label="Modelo" value={formData.modelo} onChange={e => setFormData({...formData, modelo: e.target.value.toUpperCase()})} />
              <select className="w-full p-4 bg-slate-50 border-none rounded-2xl font-black text-xs" value={formData.tipoCarroceria} onChange={e => setFormData({...formData, tipoCarroceria: e.target.value})}>
                {LISTA_CARROCERIAS.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
              <button className="w-full py-5 bg-slate-900 text-white rounded-3xl font-black uppercase text-xs mt-4">Salvar Dados</button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

const MenuBtn = ({ active, onClick, icon, label }) => (
  <button onClick={onClick} className={`w-full flex items-center gap-3 p-4 rounded-2xl text-[10px] font-black uppercase transition-all ${active ? 'bg-amber-500 text-slate-900 shadow-lg' : 'text-slate-500 hover:bg-slate-900 hover:text-white'}`}>
    {icon} {label}
  </button>
);

const StatCard = ({ label, value, color }) => (
  <div className={`bg-white p-6 rounded-[2rem] border-l-[8px] ${color === 'blue' ? 'border-blue-500' : color === 'amber' ? 'border-amber-500' : 'border-red-500'} shadow-sm border border-slate-200`}>
    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">{label}</p>
    <p className="text-3xl font-black mt-1">{value}</p>
  </div>
);

const Input = ({ label, ...props }) => (
  <div className="space-y-1">
    <label className="text-[9px] font-black text-slate-400 uppercase ml-2">{label}</label>
    <input {...props} className="w-full bg-slate-50 border-none rounded-2xl p-4 text-xs font-bold focus:ring-2 ring-amber-500 outline-none" />
  </div>
);

export default AdminDashboard;
