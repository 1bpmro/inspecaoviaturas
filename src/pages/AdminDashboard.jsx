import React, { useState, useEffect } from 'react';
import { gasApi } from '../api/gasClient';
import { 
  Settings, Car, ShieldCheck, LayoutDashboard, ArrowLeft, 
  Menu, X, Plus, Search, Filter, Printer, Save, Edit2, FileText,
  Activity, Tool
} from 'lucide-react';

// Importação dos componentes que você mencionou
import Vistoria from './Vistoria';
import GarageiroDashboard from './GarageiroDashboard';

const AdminDashboard = ({ onBack }) => {
  // --- NAVEGAÇÃO ---
  const [activeTab, setActiveTab] = useState('stats'); // stats, frota, garagem, nova-vistoria
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  // --- DADOS ---
  const [viaturas, setViaturas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCarroceria, setFilterCarroceria] = useState('TODOS');
  const [selectedVtr, setSelectedVtr] = useState(null);
  const [isAddingVtr, setIsAddingVtr] = useState(false);

  // --- FORMULÁRIO DE GESTÃO (CRUD) ---
  const [formData, setFormData] = useState({
    id: '', prefixo: '', placa: '', modelo: '', ano: '', cor: '', 
    dataEntrada: '', chassi: '', observacoes: '', tipoCarroceria: 'CAMBURÃO'
  });

  const LISTA_CARROCERIAS = ['TODOS', 'CAMBURÃO', 'CARROCERIA ABERTA', 'OSTENSIVA COMUM', 'ADMINISTRATIVA', 'OUTROS'];

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const res = await gasApi.getViaturas();
      if (res.status === 'success') {
        setViaturas(res.data.filter(v => v.Status !== "FORA DE SERVIÇO (BAIXA)"));
      }
    } catch (error) {
      console.error("Erro na carga de dados:", error);
    } finally {
      setLoading(false);
    }
  };

  const viaturasFiltradas = viaturas.filter(v => {
    const matchBusca = v.Prefixo?.toUpperCase().includes(searchTerm.toUpperCase());
    const matchFiltro = filterCarroceria === 'TODOS' || v.TipoCarroceria === filterCarroceria;
    return matchBusca && matchFiltro;
  });

  // --- HANDLERS DE GESTÃO ---
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
      alert("Falha ao salvar viatura.");
    } finally {
      setLoading(false);
    }
  };

  // --- RENDERIZADOR DE CONTEÚDO ---
  const renderContent = () => {
    switch (activeTab) {
      case 'nova-vistoria':
        return <Vistoria onCancel={() => setActiveTab('stats')} />;
      case 'garagem':
        return <GarageiroDashboard />;
      case 'frota':
        return <GestaoAtivos />;
      default:
        return <VisaoGeral />;
    }
  };

  // --- SUB-COMPONENTES INTERNOS (Para manter o arquivo limpo) ---
  const VisaoGeral = () => (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard label="Frota Total" value={viaturas.length} color="blue" />
        <StatCard label="Em Serviço" value={viaturas.filter(v => v.Status === 'EM SERVIÇO').length} color="emerald" />
        <StatCard label="Manutenção" value={viaturas.filter(v => v.Status === 'MANUTENÇÃO').length} color="red" />
        <StatCard label="Filtro Ativo" value={viaturasFiltradas.length} color="amber" />
      </div>

      <div className="bg-white rounded-[2rem] shadow-sm border border-slate-200 overflow-hidden">
        <div className="p-6 border-b border-slate-50 bg-slate-50/50 flex justify-between items-center">
            <h3 className="font-black text-[10px] uppercase tracking-widest text-slate-400">Prontidão Instantânea</h3>
            <button onClick={() => window.print()} className="p-2 bg-white border rounded-lg"><Printer size={14}/></button>
        </div>
        <table className="w-full text-left">
          <thead className="bg-slate-50 text-[9px] font-black uppercase text-slate-400">
            <tr>
              <th className="p-4">Viatura</th>
              <th className="p-4">Carroceria</th>
              <th className="p-4">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {viaturasFiltradas.map((v, i) => (
              <tr key={i} className="hover:bg-slate-50 transition-all cursor-pointer" onClick={() => { setSelectedVtr(v); setActiveTab('frota'); }}>
                <td className="p-4 font-black text-slate-800">{v.Prefixo}</td>
                <td className="p-4 text-[9px] font-bold text-slate-500">{v.TipoCarroceria}</td>
                <td className="p-4">
                  <span className={`text-[9px] font-black px-2 py-1 rounded-md uppercase ${v.Status === 'EM SERVIÇO' ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>
                    {v.Status}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );

  const GestaoAtivos = () => (
    <div className="space-y-6 animate-in slide-in-from-right duration-500">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-black uppercase italic">Gestão de Acervo</h2>
        <button onClick={() => {
          setFormData({ prefixo: '', placa: '', modelo: '', ano: '', cor: '', dataEntrada: '', chassi: '', observacoes: '', tipoCarroceria: 'CAMBURÃO' });
          setIsAddingVtr(true);
        }} className="px-6 py-3 bg-blue-600 text-white rounded-2xl text-[10px] font-black uppercase flex items-center gap-2 shadow-lg">
          <Plus size={18}/> Novo Ativo
        </button>
      </div>

      <div className="bg-white rounded-[2.5rem] shadow-sm border border-slate-200 overflow-hidden overflow-x-auto">
        <table className="w-full text-left">
          <thead className="bg-slate-900 text-[9px] font-black uppercase text-slate-400">
            <tr>
              <th className="p-5">Prefixo</th>
              <th className="p-5">Modelo / Tipo</th>
              <th className="p-5 text-center">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 text-[11px] font-bold text-slate-600">
            {viaturasFiltradas.map((v, i) => (
              <tr key={i} className="hover:bg-blue-50/50 transition-colors">
                <td className="p-5 text-slate-900 font-black">{v.Prefixo}</td>
                <td className="p-5">
                  <div className="flex flex-col">
                    <span>{v.Modelo}</span>
                    <span className="text-[8px] text-blue-500 font-black uppercase">{v.TipoCarroceria}</span>
                  </div>
                </td>
                <td className="p-5">
                  <div className="flex justify-center gap-2">
                    <button onClick={() => {
                      setFormData({...v, prefixo: v.Prefixo, isEditing: true});
                      setIsAddingVtr(true);
                    }} className="p-2 bg-amber-50 text-amber-600 rounded-lg"><Edit2 size={16}/></button>
                    <button className="p-2 bg-slate-50 text-slate-400 rounded-lg opacity-50 cursor-not-allowed"><FileText size={16}/></button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-50 flex font-sans text-slate-900 relative">
      
      {/* SIDEBAR ORQUESTRADORA */}
      <aside className={`fixed inset-y-0 left-0 z-[200] w-64 bg-slate-900 text-white flex flex-col transition-transform duration-300 md:relative md:translate-x-0 ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="p-8 border-b border-slate-800">
          <h1 className="font-black text-xl italic uppercase tracking-tighter">Painel <span className="text-amber-500">CMDO</span></h1>
          <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest mt-1">1º BPM - Porto Velho</p>
        </div>

        <nav className="flex-1 p-4 space-y-2">
          <MenuBtn active={activeTab === 'stats'} onClick={() => {setActiveTab('stats'); setIsSidebarOpen(false)}} icon={<LayoutDashboard size={18}/>} label="Visão Geral" />
          <MenuBtn active={activeTab === 'nova-vistoria'} onClick={() => {setActiveTab('nova-vistoria'); setIsSidebarOpen(false)}} icon={<ShieldCheck size={18}/>} label="Entrada/Saída" />
          <MenuBtn active={activeTab === 'garagem'} onClick={() => {setActiveTab('garagem'); setIsSidebarOpen(false)}} icon={<Activity size={18}/>} label="Painel Garageiro" />
          <MenuBtn active={activeTab === 'frota'} onClick={() => {setActiveTab('frota'); setIsSidebarOpen(false)}} icon={<Settings size={18}/>} label="Gestão de Frota" />
          
          <div className="pt-10 border-t border-slate-800 mt-6">
            <button onClick={onBack} className="w-full flex items-center gap-3 p-4 text-red-400 hover:bg-red-900/20 rounded-2xl text-[10px] font-black uppercase transition-all">
              <ArrowLeft size={16}/> Sair do Painel
            </button>
          </div>
        </nav>
      </aside>

      {/* ÁREA DE CONTEÚDO */}
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <header className="bg-white h-16 border-b border-slate-200 flex items-center justify-between px-4 md:px-8 shrink-0">
          <div className="flex items-center gap-4 flex-1">
            <button onClick={() => setIsSidebarOpen(true)} className="md:hidden p-2 bg-slate-100 rounded-lg">
              <Menu size={20} />
            </button>
            <div className="flex-1 max-w-md relative hidden md:block">
               <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
               <input 
                 type="text" 
                 placeholder="Buscar viatura..." 
                 className="w-full bg-slate-100 border-none rounded-xl py-2 pl-10 text-[11px] font-bold uppercase focus:ring-2 ring-blue-500"
                 onChange={(e) => setSearchTerm(e.target.value)}
               />
            </div>
          </div>

          <div className="flex items-center gap-3">
             <Filter size={14} className="text-slate-400" />
             <select 
               className="bg-slate-100 border-none rounded-lg text-[10px] font-black uppercase py-2 px-4"
               value={filterCarroceria}
               onChange={(e) => setFilterCarroceria(e.target.value)}
             >
               {LISTA_CARROCERIAS.map(t => <option key={t} value={t}>{t}</option>)}
             </select>
          </div>
        </header>

        <section className="flex-1 overflow-y-auto p-4 md:p-8">
          {renderContent()}
        </section>
      </main>

      {/* MODAL GESTÃO (ADICIONAR/EDITAR) */}
      {isAddingVtr && (
        <div className="fixed inset-0 bg-slate-900/90 backdrop-blur-sm z-[300] flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-2xl rounded-[2.5rem] shadow-2xl overflow-hidden">
            <div className="p-6 bg-slate-900 text-white flex justify-between items-center">
              <h2 className="font-black italic uppercase text-sm">Registro de Ativo</h2>
              <button onClick={() => setIsAddingVtr(false)}><X/></button>
            </div>
            <form onSubmit={handleSaveViatura} className="p-8 grid grid-cols-2 gap-4">
              <Input label="Prefixo" value={formData.prefixo} onChange={e => setFormData({...formData, prefixo: e.target.value.toUpperCase()})} required />
              <Input label="Placa" value={formData.placa} onChange={e => setFormData({...formData, placa: e.target.value.toUpperCase()})} />
              <div className="col-span-2">
                <label className="text-[9px] font-black uppercase text-slate-400 mb-1 block ml-1">Tipo de Carroceria</label>
                <select 
                  value={formData.tipoCarroceria}
                  onChange={e => setFormData({...formData, tipoCarroceria: e.target.value})}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-sm font-bold outline-none focus:border-blue-500"
                >
                  {LISTA_CARROCERIAS.filter(t => t !== 'TODOS').map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
              <button type="submit" className="col-span-2 py-4 bg-blue-600 text-white rounded-2xl font-black uppercase text-xs mt-4">
                <Save size={18} className="inline mr-2"/> Gravar no Banco de Dados
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

// --- COMPONENTES AUXILIARES ---
const MenuBtn = ({ active, onClick, icon, label }) => (
  <button onClick={onClick} className={`w-full flex items-center gap-3 p-4 rounded-2xl text-[10px] font-black uppercase transition-all ${active ? 'bg-amber-500 text-slate-900 shadow-lg' : 'text-slate-500 hover:bg-slate-800'}`}>
    {icon} {label}
  </button>
);

const StatCard = ({ label, value, color }) => {
  const colors = { blue: 'border-l-blue-500 text-blue-600', emerald: 'border-l-emerald-500 text-emerald-600', red: 'border-l-red-500 text-red-600', amber: 'border-l-amber-500 text-amber-600' };
  return (
    <div className={`bg-white p-6 rounded-[2rem] border-l-8 ${colors[color].split(' ')[0]} shadow-sm`}>
      <p className="text-[9px] font-black text-slate-400 uppercase tracking-tighter">{label}</p>
      <p className={`text-2xl font-black mt-1 ${colors[color].split(' ')[1]}`}>{value}</p>
    </div>
  );
};

const Input = ({ label, ...props }) => (
  <div>
    <label className="text-[9px] font-black uppercase text-slate-400 mb-1 block ml-1">{label}</label>
    <input {...props} className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-sm font-bold outline-none focus:border-blue-500" />
  </div>
);

export default AdminDashboard;
