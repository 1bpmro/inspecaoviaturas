import React, { useState, useEffect, useMemo } from 'react';
import { db, collection, onSnapshot, query, orderBy, addDoc, doc, updateDoc, serverTimestamp } from '../lib/firebase';
import { useAuth } from '../lib/AuthContext';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  PieChart as RePie, Pie, Cell, Legend 
} from 'recharts';
import { 
  Settings, LayoutDashboard, ArrowLeft, Menu, X, Plus, Edit2, Loader2,
  FileText, Database, Download, Car, ShieldCheck, AlertTriangle, Trash2,
  BarChart3, PieChart, Calendar, Search, Users, Hash, Palette
} from 'lucide-react';

const AdminDashboard = ({ onBack }) => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('stats');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false); // Controle da Sidebar
  const [viaturas, setViaturas] = useState([]);
  const [vistorias, setVistorias] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filtros de BI
  const [filterDate, setFilterDate] = useState('');
  const [filterPrefixo, setFilterPrefixo] = useState('');
  const [filterMotorista, setFilterMotorista] = useState('');

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);

  // FormData Ampliado com novos campos
  const [formData, setFormData] = useState({
    prefixo: '', 
    placa: '', 
    modelo: '', 
    ano: '',
    odometro_atual: '', 
    tipo: 'CAMBURÃO',
    carroceria: 'FECHADA', 
    combustivel: 'DIESEL',
    cor: 'BRANCA',
    renavam: '',
    chassi: ''
  });

  // Fecha a sidebar ao trocar de aba (melhor UX)
  const handleTabChange = (tab) => {
    setActiveTab(tab);
    setIsSidebarOpen(false);
  };

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
      const data = { 
        ...formData, 
        prefixo: formData.prefixo.toUpperCase(), 
        placa: formData.placa.toUpperCase(),
        renavam: formData.renavam.toUpperCase(),
        chassi: formData.chassi.toUpperCase(),
        odometro_atual: Number(formData.odometro_atual), 
        updatedAt: serverTimestamp() 
      };

      if (editingId) { 
        await updateDoc(doc(db, "viaturas", editingId), data); 
      } else { 
        await addDoc(collection(db, "viaturas"), { ...data, status: 'DISPONÍVEL' }); 
      }
      closeModal();
    } catch (error) { 
      alert("Erro ao salvar dados da viatura"); 
    } finally { 
      setLoading(false); 
    }
  };

  const closeModal = () => {
    setIsModalOpen(false); 
    setEditingId(null);
    setFormData({ 
      prefixo: '', placa: '', modelo: '', ano: '', odometro_atual: '', 
      tipo: 'CAMBURÃO', carroceria: 'FECHADA', combustivel: 'DIESEL',
      cor: 'BRANCA', renavam: '', chassi: ''
    });
  };

  // KPIs
  const stats = useMemo(() => ({
    total: vistorias.length,
    viaturas: viaturas.length,
    avariadas: vistorias.filter(v => v.status_fisico === 'AVARIADA').length,
    criticas: vistorias.filter(v => v.limpeza === 'CRÍTICA').length
  }), [vistorias, viaturas]);

  // Lógica de Gráficos (BI)
  const chartData = useMemo(() => {
    let filtered = vistorias;
    if (filterDate) filtered = filtered.filter(v => v.data_hora?.includes(filterDate));
    if (filterPrefixo) filtered = filtered.filter(v => v.prefixo_vtr?.includes(filterPrefixo));
    if (filterMotorista) filtered = filtered.filter(v => v.motorista_nome?.toLowerCase().includes(filterMotorista.toLowerCase()));

    const counts = filtered.reduce((acc, curr) => {
      acc[curr.prefixo_vtr] = (acc[curr.prefixo_vtr] || 0) + 1;
      return acc;
    }, {});

    const barData = Object.keys(counts).map(key => ({ 
      prefixo: key, 
      quantidade: counts[key] 
    })).sort((a, b) => b.quantidade - a.quantidade);

    const avariadas = filtered.filter(v => v.status_fisico === 'AVARIADA').length;
    const operacionais = filtered.length - avariadas;
    const pieData = [
      { name: 'Operacionais', value: operacionais },
      { name: 'Avariadas', value: avariadas }
    ];

    return { barData, pieData, totalFiltrado: filtered.length, listaFiltrada: filtered };
  }, [vistorias, filterDate, filterPrefixo, filterMotorista]);

  const COLORS = ['#10b981', '#ef4444'];

  const exportarCSV = () => {
    const headers = ["PREFIXO", "PLACA", "MOTORISTA", "DATA", "STATUS"];
    const linhas = vistorias.map(v => [v.prefixo_vtr, v.placa_vtr || 'N/A', v.motorista_nome, v.data_hora, v.status_fisico]);
    const csvContent = [headers, ...linhas].map(e => e.join(";")).join("\n");
    const blob = new Blob(["\ufeff" + csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `relatorio_patio_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
  };

  return (
    <div className="flex min-h-screen bg-slate-50 font-sans overflow-hidden">
      
      {/* SIDEBAR COM LOGICA DE FECHAMENTO */}
      <aside className={`fixed inset-y-0 left-0 z-[100] w-72 bg-slate-900 text-white transform transition-transform duration-300 ease-in-out md:relative md:translate-x-0 ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="p-6 h-full flex flex-col">
          <div className="flex items-center justify-between mb-10">
            <div className="flex items-center gap-3">
                <div className="bg-yellow-500 p-2 rounded-lg text-slate-900"><ShieldCheck size={24} /></div>
                <h1 className="font-black text-xl tracking-tighter italic">COMANDO GERAL</h1>
            </div>
            <button className="md:hidden text-slate-400" onClick={() => setIsSidebarOpen(false)}><X size={24}/></button>
          </div>

          <nav className="space-y-2 flex-1">
            <MenuBtn active={activeTab === 'stats'} onClick={() => handleTabChange('stats')} icon={<LayoutDashboard size={20} />} label="Painel de Controle" />
            <MenuBtn active={activeTab === 'frota'} onClick={() => handleTabChange('frota')} icon={<Database size={20} />} label="Gestão de Frota" />
            <MenuBtn active={activeTab === 'relatorios'} onClick={() => handleTabChange('relatorios')} icon={<FileText size={20} />} label="Relatórios e Logs" />
            <MenuBtn active={activeTab === 'bi'} onClick={() => handleTabChange('bi')} icon={<BarChart3 size={20} />} label="Análise Estatística (BI)" />
          </nav>

          <div className="pt-6 border-t border-slate-800">
            <button onClick={onBack} className="flex items-center gap-2 text-slate-400 hover:text-red-400 font-bold uppercase text-xs transition-colors"><ArrowLeft size={16} /> Voltar ao Início</button>
          </div>
        </div>
      </aside>

      {/* OVERLAY PARA MOBILE QUANDO SIDEBAR ESTIVER ABERTA */}
      {isSidebarOpen && <div className="fixed inset-0 bg-black/50 z-[90] md:hidden" onClick={() => setIsSidebarOpen(false)} />}

      <main className="flex-1 flex flex-col h-screen overflow-hidden">
        <header className="bg-white border-b border-slate-200 p-4 flex justify-between items-center px-8">
          <button className="md:hidden p-2 bg-slate-100 rounded-lg" onClick={() => setIsSidebarOpen(true)}><Menu size={24} /></button>
          <h2 className="font-black text-slate-800 uppercase tracking-widest text-xs">
            Módulo: <span className="text-yellow-600">{activeTab}</span>
          </h2>
          <div className="flex items-center gap-3">
            {loading && <Loader2 className="animate-spin text-yellow-500" size={18} />}
            <span className="bg-slate-100 px-3 py-1 rounded-full text-[10px] font-black italic uppercase text-slate-500">Admin: {user?.nome || 'Operador'}</span>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto p-4 md:p-8">
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
              <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 grid grid-cols-1 md:grid-cols-4 gap-4">
                <FilterInput label="Data" placeholder="DD/MM/AAAA" icon={<Calendar size={14}/>} value={filterDate} onChange={setFilterDate} />
                <FilterInput label="Prefixo" placeholder="EX: 1023" icon={<Search size={14}/>} value={filterPrefixo} onChange={setFilterPrefixo} />
                <FilterInput label="Motorista" placeholder="NOME..." icon={<Users size={14}/>} value={filterMotorista} onChange={setFilterMotorista} />
                <button onClick={() => {setFilterDate(''); setFilterPrefixo(''); setFilterMotorista('');}} className="mt-5 p-2 bg-slate-100 text-slate-500 rounded-xl text-[10px] font-black uppercase hover:bg-red-50 transition-all">Limpar Filtros</button>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="bg-white p-6 rounded-[2.5rem] shadow-sm border border-slate-100 h-[400px]">
                  <h3 className="font-black text-slate-800 uppercase text-[10px] mb-6 tracking-widest flex items-center gap-2"><BarChart3 size={16} className="text-yellow-500" /> Vistorias por Viatura</h3>
                  <ResponsiveContainer width="100%" height="85%">
                    <BarChart data={chartData.barData}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                      <XAxis dataKey="prefixo" tick={{fontSize: 9, fontWeight: 'bold'}} axisLine={false} tickLine={false} />
                      <YAxis tick={{fontSize: 10}} axisLine={false} tickLine={false} />
                      <Tooltip cursor={{fill: '#f8fafc'}} contentStyle={{borderRadius: '12px', border: 'none'}} />
                      <Bar dataKey="quantidade" fill="#eab308" radius={[6, 6, 0, 0]} barSize={30} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>

                <div className="bg-white p-6 rounded-[2.5rem] shadow-sm border border-slate-100 h-[400px]">
                  <h3 className="font-black text-slate-800 uppercase text-[10px] mb-6 tracking-widest flex items-center gap-2"><PieChart size={16} className="text-yellow-500" /> Saúde da Frota</h3>
                  <ResponsiveContainer width="100%" height="85%">
                    <RePie>
                      <Pie data={chartData.pieData} innerRadius={70} outerRadius={100} paddingAngle={8} dataKey="value" stroke="none">
                        {chartData.pieData.map((entry, index) => <Cell key={`cell-${index}`} fill={COLORS[index]} />)}
                      </Pie>
                      <Tooltip />
                      <Legend verticalAlign="bottom" height={36} wrapperStyle={{fontSize: '10px', fontWeight: '900'}}/>
                    </RePie>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'frota' && (
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden animate-in fade-in">
              <div className="p-6 border-b flex justify-between items-center bg-slate-50/50">
                <h3 className="font-black text-slate-800 uppercase text-xs tracking-tighter">Inventário de Viaturas</h3>
                <button onClick={() => setIsModalOpen(true)} className="bg-slate-900 text-white px-4 py-2 rounded-xl text-xs font-black uppercase flex items-center gap-2 hover:bg-slate-800 transition-all"><Plus size={16}/> Adicionar Vtr</button>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead className="bg-slate-50 text-[10px] font-black text-slate-400 uppercase">
                    <tr>
                      <th className="p-4">Prefixo / Placa</th>
                      <th className="p-4">Modelo / Cor</th>
                      <th className="p-4">KM Atual</th>
                      <th className="p-4">Status</th>
                      <th className="p-4">Ações</th>
                    </tr>
                  </thead>
                  <tbody className="text-xs font-bold text-slate-600">
                    {viaturas.map(v => (
                      <tr key={v.id} className="border-b hover:bg-slate-50/50 transition-colors">
                        <td className="p-4">
                            <div className="font-black text-slate-900">{v.prefixo}</div>
                            <div className="text-[10px] text-slate-400">{v.placa}</div>
                        </td>
                        <td className="p-4">
                            <div>{v.modelo}</div>
                            <div className="text-[10px] uppercase text-slate-400">{v.cor} - {v.carroceria}</div>
                        </td>
                        <td className="p-4 font-mono">{v.odometro_atual?.toLocaleString()} KM</td>
                        <td className="p-4">
                          <span className={`px-3 py-1 rounded-full text-[9px] font-black uppercase ${v.status === 'DISPONÍVEL' ? 'bg-emerald-100 text-emerald-600' : 'bg-red-100 text-red-600'}`}>
                            {v.status}
                          </span>
                        </td>
                        <td className="p-4">
                          <button onClick={() => { setFormData(v); setEditingId(v.id); setIsModalOpen(true); }} className="p-2 text-slate-400 hover:text-yellow-600 hover:bg-yellow-50 rounded-lg transition-all">
                            <Edit2 size={18} />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {activeTab === 'relatorios' && (
            <div className="space-y-6 animate-in fade-in">
              <button onClick={exportarCSV} className="w-full bg-emerald-600 text-white p-4 rounded-2xl font-black uppercase text-xs flex items-center justify-center gap-2 shadow-lg shadow-emerald-600/20 hover:bg-emerald-700 transition-all"><Download size={18} /> Exportar Base de Dados (CSV)</button>
              <div className="grid grid-cols-1 gap-3">
                {vistorias.map(v => (
                  <div key={v.id} className="bg-white p-4 rounded-xl border border-slate-200 flex justify-between items-center">
                    <div className="flex items-center gap-4">
                       <div className={`w-1 h-8 rounded-full ${v.status_fisico === 'AVARIADA' ? 'bg-red-500' : 'bg-emerald-500'}`} />
                       <div><p className="font-black text-slate-800 text-sm">{v.prefixo_vtr}</p><p className="text-[10px] text-slate-400 font-bold uppercase italic">{v.motorista_nome}</p></div>
                    </div>
                    <div className="text-right text-[10px] font-black text-slate-400 uppercase">{v.data_hora}</div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </main>

      {/* MODAL AMPLIADO COM NOVOS CAMPOS */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[110] bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <form onSubmit={handleSave} className="bg-white rounded-[2rem] w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl animate-in zoom-in-95">
            <div className="bg-slate-900 p-6 text-white flex justify-between items-center sticky top-0 z-10">
              <div>
                <h3 className="font-black uppercase text-lg tracking-tighter">{editingId ? 'Atualizar Viatura' : 'Nova Viatura na Frota'}</h3>
                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Preencha todos os dados identificadores</p>
              </div>
              <button type="button" onClick={closeModal} className="p-2 hover:bg-red-500 rounded-xl transition-colors"><X size={20}/></button>
            </div>
            
            <div className="p-8 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <InputGroup label="Prefixo" icon={<Hash size={14}/>} value={formData.prefixo} onChange={val => setFormData({...formData, prefixo: val})} placeholder="EX: 10.230" />
                <InputGroup label="Placa" value={formData.placa} onChange={val => setFormData({...formData, placa: val})} placeholder="ABC1D23" />
                <SelectGroup label="Cor Predominante" value={formData.cor} options={['BRANCA', 'PRETA', 'CINZA', 'CAMUFLADA', 'AZUL']} onChange={val => setFormData({...formData, cor: val})} />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <InputGroup label="Modelo / Versão" value={formData.modelo} onChange={val => setFormData({...formData, modelo: val})} placeholder="EX: TOYOTA HILUX CD 4X4" />
                <div className="grid grid-cols-2 gap-4">
                  <InputGroup label="Ano" type="number" value={formData.ano} onChange={val => setFormData({...formData, ano: val})} placeholder="2024" />
                  <InputGroup label="KM Atual" type="number" value={formData.odometro_atual} onChange={val => setFormData({...formData, odometro_atual: val})} placeholder="0" />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <InputGroup label="Renavam" value={formData.renavam} onChange={val => setFormData({...formData, renavam: val})} placeholder="00000000000" />
                <InputGroup label="Chassi" value={formData.chassi} onChange={val => setFormData({...formData, chassi: val})} placeholder="9BVXXXXXXXXXXXXXX" />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <SelectGroup label="Tipo Vtr" value={formData.tipo} options={['CAMBURÃO', 'ADMINISTRATIVA', 'MOTOCICLETA', 'BASE MÓVEL']} onChange={val => setFormData({...formData, tipo: val})} />
                <SelectGroup label="Carroceria" value={formData.carroceria} options={['FECHADA', 'ABERTA', 'SIDER']} onChange={val => setFormData({...formData, carroceria: val})} />
                <SelectGroup label="Combustível" value={formData.combustivel} options={['DIESEL', 'GASOLINA', 'FLEX', 'ELÉTRICO']} onChange={val => setFormData({...formData, combustivel: val})} />
              </div>

              <button type="submit" className="w-full bg-yellow-500 text-slate-900 font-black py-4 rounded-2xl uppercase tracking-widest shadow-lg shadow-yellow-500/20 hover:bg-yellow-400 transition-all mt-4">
                {editingId ? 'Salvar Alterações' : 'Finalizar Cadastro'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};

// COMPONENTES AUXILIARES REUTILIZÁVEIS
const MenuBtn = ({ active, onClick, icon, label }) => (
  <button onClick={onClick} className={`flex items-center gap-3 w-full p-4 rounded-2xl transition-all font-black uppercase text-[10px] tracking-widest ${active ? 'bg-yellow-500 text-slate-900 shadow-lg shadow-yellow-500/20' : 'text-slate-400 hover:bg-slate-800 hover:text-white'}`}>
    {icon} <span>{label}</span>
  </button>
);

const StatCard = ({ label, value, icon, highlight }) => (
  <div className={`bg-white p-6 rounded-[2rem] border-2 flex items-center gap-5 transition-all ${highlight ? 'border-red-100 bg-red-50/30' : 'border-slate-100'}`}>
    <div className="bg-slate-50 p-4 rounded-2xl shadow-inner">{icon}</div>
    <div>
      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{label}</p>
      <h4 className="text-3xl font-black text-slate-800 italic leading-none">{value}</h4>
    </div>
  </div>
);

const FilterInput = ({ label, placeholder, icon, value, onChange }) => (
  <div className="flex flex-col gap-1">
    <label className="text-[10px] font-black text-slate-400 uppercase ml-2 tracking-widest">{label}</label>
    <div className="relative">
      <div className="absolute left-3 top-3 text-slate-300">{icon}</div>
      <input type="text" placeholder={placeholder} className="w-full pl-10 p-2.5 bg-slate-50 border rounded-xl text-xs font-bold focus:border-yellow-500 outline-none transition-all" value={value} onChange={(e) => onChange(e.target.value)} />
    </div>
  </div>
);

const InputGroup = ({ label, value, onChange, placeholder, type = "text", icon }) => (
  <div className="flex flex-col gap-1">
    <label className="text-[10px] font-black text-slate-400 uppercase ml-2 tracking-widest flex items-center gap-1">
      {icon} {label}
    </label>
    <input 
      type={type} 
      value={value} 
      onChange={e => onChange(e.target.value)} 
      placeholder={placeholder}
      className="bg-slate-50 border-2 border-slate-100 rounded-xl p-3 text-sm font-bold outline-none focus:border-yellow-500 focus:bg-white transition-all" 
    />
  </div>
);

const SelectGroup = ({ label, value, onChange, options }) => (
  <div className="flex flex-col gap-1">
    <label className="text-[10px] font-black text-slate-400 uppercase ml-2 tracking-widest">{label}</label>
    <select 
      value={value} 
      onChange={e => onChange(e.target.value)} 
      className="bg-slate-50 border-2 border-slate-100 rounded-xl p-3 text-sm font-bold outline-none focus:border-yellow-500 transition-all cursor-pointer"
    >
      {options.map(opt => <option key={opt} value={opt}>{opt}</option>)}
    </select>
  </div>
);

export default AdminDashboard;
