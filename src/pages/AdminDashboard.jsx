import React, { useState, useEffect, useMemo } from 'react';
import { gasApi } from '../api/gasClient';
import { useAuth } from '../lib/AuthContext';
import { 
  Settings, LayoutDashboard, ArrowLeft, Menu, X, Plus, Search, 
  Printer, Save, Edit2, Trash2, Loader2, FileText,
  Database, Droplets, Eye, CheckCircle, Clock, AlertTriangle, 
  Filter, Download, Disc, Calendar, Car
} from 'lucide-react';

const AdminDashboard = ({ onBack }) => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('stats'); 
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [viaturas, setViaturas] = useState([]);
  const [vistorias, setVistorias] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Filtros em Dropdown
  const [filters, setFilters] = useState({ vtr: '', motorista: '', garageiro: '' });

  // Cadastro Robusto
  const [isAddingVtr, setIsAddingVtr] = useState(false);
  const [formData, setFormData] = useState({
    id: '', prefixo: '', placa: '', modelo: '', ano: '', chassi: '', renavam: '',
    odometro_atual: '', ultima_revisao: '', tipoCarroceria: 'CAMBURÃO', isEditing: false
  });

  useEffect(() => { 
    loadData(); 
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [resVtr, resHist] = await Promise.all([
        gasApi.getViaturas(),
        gasApi.getHistoricoVistorias() // Assume-se que esta rota retorna o log completo
      ]);
      if (resVtr.status === 'success') setViaturas(resVtr.data);
      if (resHist.status === 'success') setVistorias(resHist.data);
    } catch (e) { console.error(e); }
    setLoading(false);
  };

  // --- LÓGICA DE FILTROS (DROPDOWNS DINÂMICOS) ---
  const opcoesFiltro = useMemo(() => ({
    vtrs: [...new Set(vistorias.map(v => v.prefixo_vtr))].sort(),
    motoristas: [...new Set(vistorias.map(v => v.motorista_nome))].sort(),
    garageiros: [...new Set(vistorias.map(v => v.garageiro_re))].filter(Boolean).sort()
  }), [vistorias]);

  const dadosFiltrados = vistorias.filter(v => 
    (!filters.vtr || v.prefixo_vtr === filters.vtr) &&
    (!filters.motorista || v.motorista_nome === filters.motorista) &&
    (!filters.garageiro || v.garageiro_re === filters.garageiro)
  );

  return (
    <div className="min-h-screen bg-slate-100 flex font-sans overflow-hidden">
      
      {/* SIDEBAR */}
      <aside className={`fixed inset-y-0 left-0 z-[200] w-72 bg-slate-950 text-white flex flex-col transition-transform md:relative md:translate-x-0 ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="p-8 border-b border-slate-900 flex items-center gap-3">
          <div className="bg-amber-500 p-2 rounded-lg text-slate-900"><Settings size={20}/></div>
          <h1 className="font-black text-xl italic tracking-tighter">P4 ADMIN</h1>
        </div>

        <nav className="flex-1 p-4 space-y-2">
          <MenuBtn active={activeTab === 'stats'} onClick={() => setActiveTab('stats')} icon={<LayoutDashboard size={18}/>} label="Dashboard" />
          <MenuBtn active={activeTab === 'reports'} onClick={() => setActiveTab('reports')} icon={<FileText size={18}/>} label="Relatórios Finais" />
          <MenuBtn active={activeTab === 'pneus'} onClick={() => setActiveTab('pneus')} icon={<Disc size={18}/>} label="Controle de Rodagem" />
          <MenuBtn active={activeTab === 'frota'} onClick={() => setActiveTab('frota')} icon={<Database size={18}/>} label="Gestão de Frota" />
          <button onClick={onBack} className="w-full flex items-center gap-3 p-4 text-red-400 hover:bg-red-500/10 rounded-xl text-[10px] font-black uppercase mt-10 border border-red-500/20">
            <ArrowLeft size={16}/> Sair
          </button>
        </nav>
      </aside>

      <main className="flex-1 flex flex-col h-screen overflow-hidden">
        <header className="bg-white h-20 border-b px-8 flex items-center justify-between">
          <h2 className="font-black uppercase text-[11px] tracking-widest text-slate-400">{activeTab}</h2>
          {loading && <Loader2 className="animate-spin text-amber-500" />}
        </header>

        <section className="flex-1 overflow-y-auto p-8">
          
          {/* ABA: DASHBOARD COM DROPDOWNS */}
          {activeTab === 'stats' && (
            <div className="space-y-6">
              <div className="bg-white p-6 rounded-3xl shadow-sm grid grid-cols-1 md:grid-cols-3 gap-4 border border-slate-200">
                <SelectFilter label="Viatura" options={opcoesFiltro.vtrs} value={filters.vtr} onChange={v => setFilters({...filters, vtr: v})} />
                <SelectFilter label="Motorista" options={opcoesFiltro.motoristas} value={filters.motorista} onChange={v => setFilters({...filters, motorista: v})} />
                <SelectFilter label="Garageiro (RE)" options={opcoesFiltro.garageiros} value={filters.garageiro} onChange={v => setFilters({...filters, garageiro: v})} />
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <StatCard label="Movimentações" value={dadosFiltrados.length} color="blue" />
                <StatCard label="VTRs Ativas" value={viaturas.length} color="amber" />
                <StatCard label="Alertas" value={vistorias.filter(v => v.nivel_oleo === 'BAIXO').length} color="red" />
                <StatCard label="Média KM" value="---" color="blue" />
              </div>
            </div>
          )}

          {/* ABA: RELATÓRIOS FINAIS */}
          {activeTab === 'reports' && (
            <div className="bg-white rounded-3xl border shadow-sm overflow-hidden">
              <div className="p-6 bg-slate-50 border-b flex justify-between items-center">
                <h3 className="font-black text-xs uppercase text-slate-500">Relatório Consolidado de Vistorias</h3>
                <button onClick={() => window.print()} className="bg-slate-900 text-white px-4 py-2 rounded-xl text-[10px] font-black flex items-center gap-2">
                  <Printer size={14}/> IMPRIMIR P4
                </button>
              </div>
              <table className="w-full text-left">
                <thead className="bg-slate-100 text-[9px] font-black uppercase">
                  <tr>
                    <th className="p-4">Data</th>
                    <th className="p-4">Vtr</th>
                    <th className="p-4">Motorista</th>
                    <th className="p-4">RE Garageiro</th>
                    <th className="p-4">KM Saída</th>
                    <th className="p-4">Combustível</th>
                  </tr>
                </thead>
                <tbody className="divide-y text-[11px] font-bold">
                  {dadosFiltrados.map((v, i) => (
                    <tr key={i} className="hover:bg-slate-50">
                      <td className="p-4">{v.data_hora}</td>
                      <td className="p-4">{v.prefixo_vtr}</td>
                      <td className="p-4">{v.motorista_nome}</td>
                      <td className="p-4">{v.garageiro_re}</td>
                      <td className="p-4">{v.hodometro_saida}</td>
                      <td className="p-4">{v.nivel_combustivel}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* ABA: CONTROLE DE RODAGEM (PNEUS) */}
          {activeTab === 'pneus' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {viaturas.map(v => {
                const logs = vistorias.filter(l => l.prefixo_vtr === (v.Prefixo || v.prefixo));
                const kmInicial = logs.length > 0 ? Math.min(...logs.map(l => l.hodometro_saida)) : 0;
                const kmFinal = logs.length > 0 ? Math.max(...logs.map(l => l.hodometro_saida)) : 0;
                const rodagem = kmFinal - kmInicial;
                
                return (
                  <div key={v.id} className="bg-white p-6 rounded-3xl border flex justify-between items-center shadow-sm">
                    <div>
                      <span className="text-[10px] font-black text-slate-400 uppercase">VTR {v.Prefixo}</span>
                      <p className="text-2xl font-black italic">{v.Placa}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-3xl font-black text-amber-500">{rodagem} KM</p>
                      <p className="text-[9px] font-black uppercase text-slate-400">Rodados no Sistema</p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* ABA: GESTÃO DE FROTA (CADASTRO ROBUSTO) */}
          {activeTab === 'frota' && (
            <div className="space-y-6">
              <button onClick={() => {setFormData({isEditing:false}); setIsAddingVtr(true)}} className="bg-slate-900 text-white px-6 py-3 rounded-2xl font-black text-[10px] uppercase flex items-center gap-2 shadow-lg">
                <Plus size={16}/> Cadastrar Viatura Completa
              </button>
              <div className="bg-white rounded-3xl border shadow-sm overflow-hidden">
                <table className="w-full text-left">
                  <thead className="bg-slate-900 text-white text-[9px] font-black uppercase">
                    <tr><th className="p-5">Prefixo</th><th className="p-5">Placa</th><th className="p-5">Modelo/Ano</th><th className="p-5">Renavam/Chassi</th><th className="p-5 text-center">Ações</th></tr>
                  </thead>
                  <tbody className="divide-y font-bold text-xs">
                    {viaturas.map((v, i) => (
                      <tr key={i} className="hover:bg-slate-50">
                        <td className="p-5 text-lg font-black">{v.Prefixo}</td>
                        <td className="p-5">{v.Placa}</td>
                        <td className="p-5">{v.Modelo} / {v.Ano}</td>
                        <td className="p-5 text-slate-400">{v.Renavam} <br/> {v.Chassi}</td>
                        <td className="p-5 text-center">
                          <button onClick={() => {setFormData({...v, isEditing:true}); setIsAddingVtr(true)}} className="p-2 text-amber-500"><Edit2 size={16}/></button>
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

      {/* MODAL DE CADASTRO ROBUSTO */}
      {isAddingVtr && (
        <div className="fixed inset-0 bg-slate-950/90 z-[300] flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-white w-full max-w-2xl rounded-[3rem] shadow-2xl overflow-hidden overflow-y-auto max-h-[90vh]">
            <div className="p-8 bg-slate-900 text-white flex justify-between items-center">
              <h2 className="font-black uppercase italic tracking-tighter text-xl">Ficha Técnica do Ativo</h2>
              <button onClick={() => setIsAddingVtr(false)}><X/></button>
            </div>
            <form className="p-10 grid grid-cols-2 gap-4">
              <Input label="Prefixo (Ex: 01-123)" value={formData.prefixo} onChange={e => setFormData({...formData, prefixo: e.target.value})} />
              <Input label="Placa" value={formData.placa} onChange={e => setFormData({...formData, placa: e.target.value})} />
              <Input label="Modelo" value={formData.modelo} onChange={e => setFormData({...formData, modelo: e.target.value})} />
              <Input label="Ano" value={formData.ano} onChange={e => setFormData({...formData, ano: e.target.value})} />
              <Input label="Chassi" value={formData.chassi} onChange={e => setFormData({...formData, chassi: e.target.value})} />
              <Input label="Renavam" value={formData.renavam} onChange={e => setFormData({...formData, renavam: e.target.value})} />
              <Input label="Odômetro Atual" value={formData.odometro_atual} onChange={e => setFormData({...formData, odometro_atual: e.target.value})} />
              <Input label="Última Revisão" type="date" value={formData.ultima_revisao} onChange={e => setFormData({...formData, ultima_revisao: e.target.value})} />
              <div className="col-span-2">
                <button className="w-full py-5 bg-amber-500 text-slate-900 rounded-3xl font-black uppercase text-xs mt-4 shadow-xl shadow-amber-500/20">Salvar na Base de Dados P4</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

// Componentes Auxiliares
const MenuBtn = ({ active, onClick, icon, label }) => (
  <button onClick={onClick} className={`w-full flex items-center gap-3 p-4 rounded-2xl text-[10px] font-black uppercase transition-all ${active ? 'bg-amber-500 text-slate-900 shadow-lg' : 'text-slate-500 hover:bg-slate-900 hover:text-white'}`}>
    {icon} {label}
  </button>
);

const SelectFilter = ({ label, options, value, onChange }) => (
  <div className="space-y-1">
    <label className="text-[9px] font-black text-slate-400 uppercase ml-2">{label}</label>
    <select value={value} onChange={e => onChange(e.target.value)} className="w-full p-3 bg-slate-50 border-none rounded-xl text-xs font-bold outline-none ring-1 ring-slate-200">
      <option value="">TODOS</option>
      {options.map(opt => <option key={opt} value={opt}>{opt}</option>)}
    </select>
  </div>
);

const StatCard = ({ label, value, color }) => (
  <div className={`bg-white p-6 rounded-3xl border-l-[8px] ${color === 'blue' ? 'border-blue-500' : color === 'amber' ? 'border-amber-500' : 'border-red-500'} shadow-sm border border-slate-200`}>
    <p className="text-[9px] font-black text-slate-400 uppercase">{label}</p>
    <p className="text-3xl font-black mt-1">{value}</p>
  </div>
);

const Input = ({ label, ...props }) => (
  <div className="space-y-1">
    <label className="text-[9px] font-black text-slate-400 uppercase ml-2">{label}</label>
    <input {...props} className="w-full bg-slate-50 border-none rounded-2xl p-4 text-xs font-bold outline-none ring-1 ring-slate-100 focus:ring-amber-500" />
  </div>
);

export default AdminDashboard;
