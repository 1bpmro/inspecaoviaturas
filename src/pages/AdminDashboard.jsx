import React, { useState, useEffect } from 'react';
import { gasApi } from '../api/gasClient';
import { 
  Settings, Car, Tool, Fuel, BarChart3, Plus, 
  AlertTriangle, Search, Filter, ArrowRight, Droplets, History
} from 'lucide-react';

const AdminDashboard = () => {
  const [activeTab, setActiveTab] = useState('frota');
  const [viaturas, setViaturas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    const res = await gasApi.getViaturas();
    if (res.status === 'success') setViaturas(res.data);
    setLoading(false);
  };

  // Lógica de Alerta de Óleo
  const checkOil = (vtr) => {
    const kmAtual = parseInt(vtr.UltimoKM || 0);
    const kmTroca = parseInt(vtr.KM_UltimaTroca || 0); // Você precisará desta coluna na planilha
    const rodado = kmAtual - kmTroca;
    if (rodado >= 9500) return { color: 'text-red-600', msg: 'TROCA IMEDIATA', level: 2 };
    if (rodado >= 8000) return { color: 'text-amber-500', msg: 'PRÓXIMO', level: 1 };
    return { color: 'text-emerald-500', msg: 'OK', level: 0 };
  };

  return (
    <div className="min-h-screen bg-slate-50 flex">
      {/* Sidebar Lateral Tática */}
      <aside className="w-64 bg-slate-900 text-white flex flex-col shadow-2xl">
        <div className="p-6 border-b border-slate-800 text-center">
          <h1 className="font-black text-xl tracking-tighter uppercase">Painel <span className="text-amber-500">CMDO</span></h1>
          <p className="text-[9px] font-bold text-slate-500 tracking-widest uppercase">Gestão Estratégica 1º BPM</p>
        </div>

        <nav className="flex-1 p-4 space-y-2">
          <MenuBtn active={activeTab==='frota'} onClick={()=>setActiveTab('frota')} icon={<Car size={18}/>} label="Gestão de Frota" />
          <MenuBtn active={activeTab==='manutencao'} onClick={()=>setActiveTab('manutencao')} icon={<Tool size={18}/>} label="Manutenção / Óleo" />
          <MenuBtn active={activeTab==='custos'} onClick={()=>setActiveTab('custos')} icon={<Fuel size={18}/>} label="Abastecimento" />
          <MenuBtn active={activeTab==='stats'} onClick={()=>setActiveTab('stats')} icon={<BarChart3 size={18}/>} label="Estatísticas" />
        </nav>
      </aside>

      {/* Área de Conteúdo */}
      <main className="flex-1 flex flex-col overflow-hidden">
        <header className="bg-white h-16 border-b border-slate-200 flex items-center justify-between px-8">
          <div className="flex items-center gap-4 bg-slate-100 px-4 py-2 rounded-xl w-96">
            <Search size={16} className="text-slate-400" />
            <input 
              type="text" 
              placeholder="Buscar prefixo, placa ou motorista..." 
              className="bg-transparent border-none outline-none text-xs font-bold w-full"
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <button className="bg-slate-900 text-white px-4 py-2 rounded-xl text-xs font-black uppercase flex items-center gap-2 hover:bg-amber-600 transition-all">
            <Plus size={16} /> Nova Viatura
          </button>
        </header>

        <section className="p-8 overflow-y-auto">
          {activeTab === 'frota' && (
            <div className="space-y-6">
              {/* Cards de Resumo */}
              <div className="grid grid-cols-4 gap-6">
                <StatCard label="Total Frota" value={viaturas.length} color="blue" />
                <StatCard label="Em Serviço" value={viaturas.filter(v => v.Status === 'EM SERVIÇO').length} color="emerald" />
                <StatCard label="Manutenção" value={viaturas.filter(v => v.Status === 'MANUTENÇÃO').length} color="red" />
                <StatCard label="Troca de Óleo" value={viaturas.filter(v => checkOil(v).level > 0).length} color="amber" />
              </div>

              {/* Tabela Principal */}
              <div className="bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden">
                <table className="w-full text-left">
                  <thead className="bg-slate-50 border-b border-slate-200">
                    <tr>
                      <th className="p-4 text-[10px] font-black uppercase text-slate-400">Viatura</th>
                      <th className="p-4 text-[10px] font-black uppercase text-slate-400">Status</th>
                      <th className="p-4 text-[10px] font-black uppercase text-slate-400">KM Atual</th>
                      <th className="p-4 text-[10px] font-black uppercase text-slate-400">Óleo (10k)</th>
                      <th className="p-4 text-[10px] font-black uppercase text-slate-400 text-right">Ações</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {viaturas.filter(v => (v.Prefixo || '').includes(searchTerm)).map((v, i) => {
                      const oil = checkOil(v);
                      return (
                        <tr key={i} className="hover:bg-slate-50 transition-colors cursor-pointer group">
                          <td className="p-4">
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 bg-slate-100 rounded-lg flex items-center justify-center text-slate-900 font-black">
                                {v.Prefixo?.slice(-2)}
                              </div>
                              <div>
                                <p className="font-black text-slate-800">{v.Prefixo}</p>
                                <p className="text-[10px] text-slate-400 font-bold">{v.Placa}</p>
                              </div>
                            </div>
                          </td>
                          <td className="p-4">
                            <span className={`text-[10px] font-black px-2 py-1 rounded-md ${v.Status === 'EM SERVIÇO' ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-600'}`}>
                              {v.Status}
                            </span>
                          </td>
                          <td className="p-4 font-mono font-bold text-slate-600">{v.UltimoKM} KM</td>
                          <td className="p-4">
                            <div className="flex items-center gap-2">
                              <Droplets size={14} className={oil.color} />
                              <span className={`text-xs font-black ${oil.color}`}>{oil.msg}</span>
                            </div>
                          </td>
                          <td className="p-4 text-right">
                             <button className="p-2 hover:bg-amber-100 rounded-lg text-slate-400 hover:text-amber-600 transition-all">
                                <History size={18} />
                             </button>
                             <button className="p-2 hover:bg-slate-200 rounded-lg text-slate-400 hover:text-slate-900 transition-all">
                                <Settings size={18} />
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
        </section>
      </main>
    </div>
  );
};

// Sub-componentes para limpeza de código
const MenuBtn = ({ active, onClick, icon, label }) => (
  <button 
    onClick={onClick}
    className={`w-full flex items-center gap-3 p-3 rounded-xl text-xs font-bold transition-all ${active ? 'bg-amber-500 text-slate-900 shadow-lg shadow-amber-500/20' : 'text-slate-400 hover:bg-slate-800 hover:text-white'}`}
  >
    {icon} {label}
  </button>
);

const StatCard = ({ label, value, color }) => {
  const colors = {
    blue: 'border-l-blue-500',
    emerald: 'border-l-emerald-500',
    red: 'border-l-red-500',
    amber: 'border-l-amber-500'
  };
  return (
    <div className={`bg-white p-6 rounded-3xl border-l-4 ${colors[color]} shadow-sm`}>
      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{label}</p>
      <p className="text-3xl font-black text-slate-900 mt-1">{value}</p>
    </div>
  );
};

export default AdminDashboard;
