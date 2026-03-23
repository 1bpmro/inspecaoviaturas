import React, { useState, useEffect, useMemo } from 'react';
import { db, collection, onSnapshot, query, orderBy, addDoc, doc, updateDoc, serverTimestamp } from '../lib/firebase';
import { useAuth } from '../lib/AuthContext';
// NOVOS IMPORTS DO RECHARTS
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  PieChart as RePie, Pie, Cell, Legend 
} from 'recharts';
import { 
  Settings, LayoutDashboard, ArrowLeft, Menu, X, Plus, Edit2, Loader2,
  FileText, Database, Download, Car, ShieldCheck, AlertTriangle, Trash2,
  BarChart3, PieChart, Calendar, Search, Users
} from 'lucide-react';

const AdminDashboard = ({ onBack }) => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('stats');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [viaturas, setViaturas] = useState([]);
  const [vistorias, setVistorias] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filtros
  const [filterDate, setFilterDate] = useState('');
  const [filterPrefixo, setFilterPrefixo] = useState('');
  const [filterMotorista, setFilterMotorista] = useState('');

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [formData, setFormData] = useState({
    prefixo: '', placa: '', modelo: '', ano: '',
    odometro_atual: '', tipo: 'CAMBURÃO',
    carroceria: 'FECHADA', combustivel: 'DIESEL'
  });

  useEffect(() => {
    const qVtrs = query(collection(db, "viaturas"), orderBy("prefixo"));
    const qVist = query(collection(db, "vistorias"), orderBy("data_hora", "desc"));
    const unsub1 = onSnapshot(qVtrs, (snap) => {
      setViaturas(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      setLoading(false);
    });
    const unsub2 = onSnapshot(qVist, (snap) => {
      setVistorias(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });
    return () => { unsub1(); unsub2(); };
  }, []);

  const handleSave = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const data = { ...formData, prefixo: formData.prefixo.toUpperCase(), odometro_atual: Number(formData.odometro_atual), updatedAt: serverTimestamp() };
      if (editingId) { await updateDoc(doc(db, "viaturas", editingId), data); }
      else { await addDoc(collection(db, "viaturas"), { ...data, status: 'DISPONÍVEL' }); }
      closeModal();
    } catch (error) { alert("Erro ao salvar"); } finally { setLoading(false); }
  };

  const closeModal = () => {
    setIsModalOpen(false); setEditingId(null);
    setFormData({ prefixo: '', placa: '', modelo: '', ano: '', odometro_atual: '', tipo: 'CAMBURÃO', carroceria: 'FECHADA', combustivel: 'DIESEL' });
  };

  // ================= ENGINE DE DADOS (BI) =================
  const stats = useMemo(() => ({
    total: vistorias.length,
    viaturas: viaturas.length,
    avariadas: vistorias.filter(v => v.status_fisico === 'AVARIADA').length,
    criticas: vistorias.filter(v => v.limpeza === 'CRÍTICA').length
  }), [vistorias, viaturas]);

  const chartData = useMemo(() => {
    let filtered = vistorias;
    if (filterDate) filtered = filtered.filter(v => v.data_hora?.includes(filterDate));
    if (filterPrefixo) filtered = filtered.filter(v => v.prefixo_vtr?.includes(filterPrefixo));
    if (filterMotorista) filtered = filtered.filter(v => v.motorista_nome?.toLowerCase().includes(filterMotorista.toLowerCase()));

    // 1. Dados para Gráfico de Barras (Vistorias por Prefixo)
    const counts = filtered.reduce((acc, curr) => {
      acc[curr.prefixo_vtr] = (acc[curr.prefixo_vtr] || 0) + 1;
      return acc;
    }, {});
    const barData = Object.keys(counts).map(key => ({ 
      prefixo: key, 
      quantidade: counts[key] 
    })).sort((a, b) => b.quantidade - a.quantidade);

    // 2. Dados para Gráfico de Pizza (Status Físico)
    const avariadas = filtered.filter(v => v.status_fisico === 'AVARIADA').length;
    const operacionais = filtered.length - avariadas;
    const pieData = [
      { name: 'Operacionais', value: operacionais },
      { name: 'Avariadas', value: avariadas }
    ];

    return { barData, pieData, totalFiltrado: filtered.length, listaFiltrada: filtered };
  }, [vistorias, filterDate, filterPrefixo, filterMotorista]);

  const COLORS = ['#10b981', '#ef4444']; // Verde e Vermelho

  const exportarCSV = () => {
    const headers = ["PREFIXO", "MOTORISTA", "DATA"];
    const linhas = vistorias.map(v => [v.prefixo_vtr, v.motorista_nome, v.data_hora]);
    const csvContent = [headers, ...linhas].map(e => e.join(";")).join("\n");
    const blob = new Blob(["\ufeff" + csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `relatorio_pm.csv`;
    link.click();
  };

  return (
    <div className="flex min-h-screen bg-slate-50 font-sans">
      <aside className={`fixed inset-y-0 left-0 z-50 w-72 bg-slate-900 text-white transform transition-transform duration-300 md:relative md:translate-x-0 ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="p-6">
          <div className="flex items-center gap-3 mb-10">
            <div className="bg-yellow-500 p-2 rounded-lg text-slate-900"><ShieldCheck size={24} /></div>
            <h1 className="font-black text-xl tracking-tighter italic">COMANDO GERAL</h1>
          </div>
          <nav className="space-y-2">
            <MenuBtn active={activeTab === 'stats'} onClick={() => setActiveTab('stats')} icon={<LayoutDashboard size={20} />} label="Painel de Controle" />
            <MenuBtn active={activeTab === 'frota'} onClick={() => setActiveTab('frota')} icon={<Database size={20} />} label="Gestão de Frota" />
            <MenuBtn active={activeTab === 'relatorios'} onClick={() => setActiveTab('relatorios')} icon={<FileText size={20} />} label="Relatórios e Logs" />
            <MenuBtn active={activeTab === 'bi'} onClick={() => setActiveTab('bi')} icon={<BarChart3 size={20} />} label="Análise Estatística (BI)" />
          </nav>
        </div>
        <div className="absolute bottom-0 w-full p-6 border-t border-slate-800">
          <button onClick={onBack} className="flex items-center gap-2 text-slate-400 hover:text-red-400 font-bold uppercase text-xs"><ArrowLeft size={16} /> Voltar</button>
        </div>
      </aside>

      <main className="flex-1 flex flex-col h-screen overflow-hidden">
        <header className="bg-white border-b border-slate-200 p-4 flex justify-between items-center px-8">
          <button className="md:hidden" onClick={() => setIsSidebarOpen(!isSidebarOpen)}><Menu size={24} /></button>
          <h2 className="font-black text-slate-800 uppercase tracking-widest text-sm">Sessão: <span className="text-yellow-600">{activeTab}</span></h2>
          <span className="bg-slate-100 px-3 py-1 rounded-full text-xs font-bold italic uppercase">Admin: {user?.nome || 'Operador'}</span>
        </header>

        <div className="flex-1 overflow-y-auto p-8">
          {activeTab === 'stats' && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 animate-in fade-in">
              <StatCard label="Total Vistorias" value={stats.total} icon={<FileText className="text-blue-500"/>} />
              <StatCard label="Viaturas" value={stats.viaturas} icon={<Car className="text-indigo-500"/>}/>
              <StatCard label="Avarias" value={stats.avariadas} icon={<AlertTriangle className="text-red-500"/>} highlight={stats.avariadas > 0} />
              <StatCard label="Críticas" value={stats.criticas} icon={<Trash2 className="text-amber-500"/>} highlight={stats.criticas > 0} />
            </div>
          )}

          {activeTab === 'bi' && (
            <div className="space-y-6 animate-in fade-in">
              {/* FILTROS */}
              <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 grid grid-cols-1 md:grid-cols-4 gap-4">
                <FilterInput label="Data" placeholder="DD/MM/AAAA" icon={<Calendar size={14}/>} value={filterDate} onChange={setFilterDate} />
                <FilterInput label="Prefixo" placeholder="EX: 1023" icon={<Search size={14}/>} value={filterPrefixo} onChange={setFilterPrefixo} />
                <FilterInput label="Motorista" placeholder="NOME..." icon={<Users size={14}/>} value={filterMotorista} onChange={setFilterMotorista} />
                <button onClick={() => {setFilterDate(''); setFilterPrefixo(''); setFilterMotorista('');}} className="mt-5 p-2 bg-slate-100 text-slate-500 rounded-xl text-[10px] font-black uppercase hover:bg-red-50 transition-all">Limpar</button>
              </div>

              {/* GRÁFICOS RECHARTS */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* BARRAS */}
                <div className="bg-white p-6 rounded-[2.5rem] shadow-sm border border-slate-100 h-[400px]">
                  <h3 className="font-black text-slate-800 uppercase text-[10px] mb-6 tracking-widest flex items-center gap-2">
                    <BarChart3 size={16} className="text-yellow-500" /> Vistorias por Viatura
                  </h3>
                  <ResponsiveContainer width="100%" height="85%">
                    <BarChart data={chartData.barData}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                      <XAxis dataKey="prefixo" tick={{fontSize: 9, fontWeight: 'bold', fill: '#94a3b8'}} axisLine={false} tickLine={false} />
                      <YAxis tick={{fontSize: 10, fill: '#94a3b8'}} axisLine={false} tickLine={false} />
                      <Tooltip 
                        cursor={{fill: '#f8fafc'}} 
                        contentStyle={{borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)', fontSize: '12px', fontWeight: 'bold'}} 
                      />
                      <Bar dataKey="quantidade" fill="#eab308" radius={[6, 6, 0, 0]} barSize={30} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>

                {/* PIZZA (DONUT) */}
                <div className="bg-white p-6 rounded-[2.5rem] shadow-sm border border-slate-100 h-[400px]">
                  <h3 className="font-black text-slate-800 uppercase text-[10px] mb-6 tracking-widest flex items-center gap-2">
                    <PieChart size={16} className="text-yellow-500" /> Saúde da Frota
                  </h3>
                  <ResponsiveContainer width="100%" height="85%">
                    <RePie>
                      <Pie 
                        data={chartData.pieData} 
                        innerRadius={70} 
                        outerRadius={100} 
                        paddingAngle={8} 
                        dataKey="value"
                        stroke="none"
                      >
                        {chartData.pieData.map((entry, index) => <Cell key={`cell-${index}`} fill={COLORS[index]} />)}
                      </Pie>
                      <Tooltip />
                      <Legend verticalAlign="bottom" height={36} wrapperStyle={{fontSize: '10px', fontWeight: '900', textTransform: 'uppercase'}}/>
                    </RePie>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* LISTA RESUMIDA FILTRADA */}
              <div className="bg-white p-6 rounded-2xl border border-slate-100">
                 <h3 className="font-black text-slate-800 uppercase text-[9px] mb-4">Amostra: {chartData.totalFiltrado} registros encontrados</h3>
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                    {chartData.listaFiltrada.slice(0, 6).map(v => (
                      <div key={v.id} className="text-[10px] font-bold p-2 bg-slate-50 rounded-lg border border-slate-100 flex justify-between uppercase">
                        <span>{v.prefixo_vtr} - {v.motorista_nome}</span>
                        <span className="text-slate-400">{v.data_hora}</span>
                      </div>
                    ))}
                 </div>
              </div>
            </div>
          )}

          {activeTab === 'frota' && (
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
              <div className="p-6 border-b flex justify-between items-center">
                <h3 className="font-black text-slate-800 uppercase text-xs">Gestão de Viaturas</h3>
                <button onClick={() => setIsModalOpen(true)} className="bg-slate-900 text-white px-4 py-2 rounded-xl text-xs font-black uppercase flex items-center gap-2"><Plus size={16}/> Novo</button>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead className="bg-slate-50 text-[10px] font-black text-slate-400 uppercase">
                    <tr><th className="p-4">Prefixo</th><th className="p-4">Modelo</th><th className="p-4">KM</th><th className="p-4">Status</th><th className="p-4">Ações</th></tr>
                  </thead>
                  <tbody className="text-sm font-bold text-slate-600 italic">
                    {viaturas.map(v => (
                      <tr key={v.id} className="border-b hover:bg-slate-50/50">
                        <td className="p-4 text-slate-900 font-black">{v.prefixo}</td>
                        <td className="p-4">{v.modelo}</td>
                        <td className="p-4">{v.odometro_atual?.toLocaleString()} KM</td>
                        <td className="p-4"><span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase ${v.status === 'DISPONÍVEL' ? 'bg-emerald-100 text-emerald-600' : 'bg-red-100 text-red-600'}`}>{v.status}</span></td>
                        <td className="p-4"><button onClick={() => { setFormData(v); setEditingId(v.id); setIsModalOpen(true); }} className="text-slate-400 hover:text-blue-500"><Edit2 size={18} /></button></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {activeTab === 'relatorios' && (
            <div className="space-y-6">
              <button onClick={exportarCSV} className="w-full bg-emerald-600 text-white p-4 rounded-2xl font-black uppercase text-xs flex items-center justify-center gap-2 shadow-lg shadow-emerald-600/20 hover:scale-[1.01] transition-all"><Download size={18} /> Baixar Planilha Geral (CSV)</button>
              <div className="grid gap-3">
                {vistorias.map(v => (
                  <div key={v.id} className="bg-white p-4 rounded-xl border flex justify-between items-center group">
                    <div className="flex items-center gap-4">
                       <div className={`w-1 h-8 rounded-full ${v.status_fisico === 'AVARIADA' ? 'bg-red-500' : 'bg-emerald-500'}`} />
                       <div><p className="font-black text-slate-800 text-sm">{v.prefixo_vtr}</p><p className="text-[10px] text-slate-400 font-bold uppercase italic">{v.motorista_nome}</p></div>
                    </div>
                    <div className="text-right font-black text-slate-400 text-[9px] uppercase">{v.data_hora}</div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </main>

      {/* MODAL */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[100] bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <form onSubmit={handleSave} className="bg-white rounded-[2rem] w-full max-w-md overflow-hidden animate-in zoom-in-95">
            <div className="bg-slate-900 p-6 text-white flex justify-between items-center"><h3 className="font-black uppercase text-lg">{editingId ? 'Editar' : 'Novo'}</h3><button type="button" onClick={closeModal}><X size={20}/></button></div>
            <div className="p-8 space-y-4">
              <InputGroup label="Prefixo" value={formData.prefixo} onChange={val => setFormData({...formData, prefixo: val})} />
              <InputGroup label="Modelo" value={formData.modelo} onChange={val => setFormData({...formData, modelo: val})} />
              <div className="grid grid-cols-2 gap-4">
                <InputGroup label="Ano" type="number" value={formData.ano} onChange={val => setFormData({...formData, ano: val})} />
                <InputGroup label="KM" type="number" value={formData.odometro_atual} onChange={val => setFormData({...formData, odometro_atual: val})} />
              </div>
              <button type="submit" className="w-full bg-yellow-500 text-slate-900 font-black py-4 rounded-2xl uppercase tracking-widest">Salvar Viatura</button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};

// COMPONENTES AUXILIARES
const FilterInput = ({ label, placeholder, icon, value, onChange }) => (
  <div className="flex flex-col gap-1">
    <label className="text-[10px] font-black text-slate-400 uppercase ml-2 tracking-widest">{label}</label>
    <div className="relative">
      <div className="absolute left-3 top-3 text-slate-300">{icon}</div>
      <input type="text" placeholder={placeholder} className="w-full pl-10 p-2 bg-slate-50 border rounded-xl text-xs font-bold focus:border-yellow-500 outline-none" value={value} onChange={(e) => onChange(e.target.value)} />
    </div>
  </div>
);

const MenuBtn = ({ active, onClick, icon, label }) => (
  <button onClick={onClick} className={`flex items-center gap-3 w-full p-4 rounded-2xl transition-all font-black uppercase text-[10px] tracking-widest ${active ? 'bg-yellow-500 text-slate-900 shadow-lg' : 'text-slate-400 hover:bg-slate-800 hover:text-white'}`}>
    {icon} <span>{label}</span>
  </button>
);

const StatCard = ({ label, value, icon, highlight }) => (
  <div className={`bg-white p-6 rounded-[2rem] border-2 flex items-center gap-5 transition-all ${highlight ? 'border-red-100 bg-red-50/20' : 'border-slate-100'}`}>
    <div className="bg-slate-50 p-4 rounded-2xl shadow-inner">{icon}</div>
    <div>
      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{label}</p>
      <h4 className="text-3xl font-black text-slate-800 italic leading-none">{value}</h4>
    </div>
  </div>
);

const InputGroup = ({ label, value, onChange, type = "text" }) => (
  <div className="flex flex-col gap-1">
    <label className="text-[10px] font-black text-slate-400 uppercase ml-2 tracking-widest">{label}</label>
    <input type={type} value={value} onChange={e => onChange(e.target.value)} className="bg-slate-50 border-2 border-slate-100 rounded-xl p-3 text-sm font-bold outline-none focus:border-yellow-500" />
  </div>
);

export default AdminDashboard;
