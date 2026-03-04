import React, { useState, useEffect } from 'react';
import { gasApi } from '../api/gasClient';
import { 
  Settings, ShieldCheck, LayoutDashboard, ArrowLeft, 
  Menu, X, Plus, Search, Filter, Printer, Save, Edit2, FileText,
  Trash2, AlertCircle
} from 'lucide-react';

const AdminDashboard = ({ onBack }) => {
  const [activeTab, setActiveTab] = useState('stats'); // stats ou frota
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [viaturas, setViaturas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [isAddingVtr, setIsAddingVtr] = useState(false);

  const [formData, setFormData] = useState({
    id: '', prefixo: '', placa: '', modelo: '', tipoCarroceria: 'CAMBURÃO'
  });

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const res = await gasApi.getViaturas();
      if (res.status === 'success') {
        setViaturas(res.data.filter(v => v.Status !== "FORA DE SERVIÇO (BAIXA)"));
      }
    } catch (error) { console.error(error); }
    finally { setLoading(false); }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex font-sans text-slate-900">
      
      {/* SIDEBAR ADMINISTRATIVA */}
      <aside className={`fixed inset-y-0 left-0 z-[200] w-64 bg-slate-900 text-white flex flex-col transition-transform md:relative md:translate-x-0 ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="p-8 border-b border-slate-800">
          <h1 className="font-black text-xl italic uppercase tracking-tighter text-amber-500">ADMINISTRAÇÃO</h1>
          <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest mt-1">Gestão de Ativos - 1º BPM</p>
        </div>

        <nav className="flex-1 p-4 space-y-2">
          <MenuBtn active={activeTab === 'stats'} onClick={() => setActiveTab('stats')} icon={<LayoutDashboard size={18}/>} label="Painel de Controle" />
          <MenuBtn active={activeTab === 'frota'} onClick={() => setActiveTab('frota')} icon={<Settings size={18}/>} label="Inventário da Frota" />
          
          <div className="pt-10 border-t border-slate-800 mt-6">
            <button onClick={onBack} className="w-full flex items-center gap-3 p-4 text-slate-400 hover:text-white rounded-2xl text-[10px] font-black uppercase transition-all">
              <ArrowLeft size={16}/> Sair do Admin
            </button>
          </div>
        </nav>
      </aside>

      {/* CONTEÚDO */}
      <main className="flex-1 flex flex-col min-w-0">
        <header className="bg-white h-16 border-b flex items-center justify-between px-8">
          <div className="flex items-center gap-4">
            <button onClick={() => setIsSidebarOpen(true)} className="md:hidden"><Menu /></button>
            <h2 className="font-black uppercase text-sm tracking-widest text-slate-400">
              {activeTab === 'stats' ? 'Estatísticas' : 'Gerenciamento'}
            </h2>
          </div>
          {activeTab === 'frota' && (
            <button onClick={() => {setFormData({prefixo:''}); setIsAddingVtr(true)}} className="bg-blue-600 text-white px-4 py-2 rounded-xl text-[10px] font-black uppercase flex items-center gap-2">
              <Plus size={14}/> Cadastrar Vtr
            </button>
          )}
        </header>

        <section className="p-8 overflow-y-auto">
          {activeTab === 'stats' ? (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <StatCard label="Total Frota" value={viaturas.length} color="blue" />
              <StatCard label="Disponíveis" value={viaturas.filter(v => v.Status === 'EM SERVIÇO').length} color="emerald" />
              <StatCard label="Em Manutenção" value={viaturas.filter(v => v.Status === 'MANUTENÇÃO').length} color="red" />
            </div>
          ) : (
            <div className="bg-white rounded-[2rem] shadow-sm border border-slate-200 overflow-hidden">
                <table className="w-full text-left">
                  <thead className="bg-slate-50 text-[9px] font-black uppercase text-slate-400">
                    <tr>
                      <th className="p-5">Viatura</th>
                      <th className="p-5">Placa</th>
                      <th className="p-5">Carroceria</th>
                      <th className="p-5 text-right">Ações</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {viaturas.map((v, i) => (
                      <tr key={i} className="text-sm font-bold">
                        <td className="p-5 font-black">{v.Prefixo}</td>
                        <td className="p-5">{v.Placa}</td>
                        <td className="p-5 text-[10px]">{v.TipoCarroceria}</td>
                        <td className="p-5 text-right">
                          <button className="p-2 text-amber-500 hover:bg-amber-50 rounded-lg"><Edit2 size={16}/></button>
                          <button className="p-2 text-red-500 hover:bg-red-50 rounded-lg"><Trash2 size={16}/></button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
            </div>
          )}
        </section>
      </main>
    </div>
  );
};

const MenuBtn = ({ active, onClick, icon, label }) => (
  <button onClick={onClick} className={`w-full flex items-center gap-3 p-4 rounded-2xl text-[10px] font-black uppercase transition-all ${active ? 'bg-amber-500 text-slate-900 shadow-lg' : 'text-slate-500 hover:bg-slate-800 hover:text-white'}`}>
    {icon} {label}
  </button>
);

const StatCard = ({ label, value, color }) => {
  const colors = { blue: 'border-l-blue-500 text-blue-600', emerald: 'border-l-emerald-500 text-emerald-600', red: 'border-l-red-500 text-red-600' };
  return (
    <div className={`bg-white p-8 rounded-[2rem] border-l-8 ${colors[color].split(' ')[0]} shadow-sm`}>
      <p className="text-[10px] font-black text-slate-400 uppercase">{label}</p>
      <p className={`text-4xl font-black mt-2 ${colors[color].split(' ')[1]}`}>{value}</p>
    </div>
  );
};

export default AdminDashboard;
