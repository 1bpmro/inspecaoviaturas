import React, { useState, useEffect, useMemo } from 'react';
import { db, collection, onSnapshot, query, orderBy, addDoc, doc, updateDoc, serverTimestamp } from '../lib/firebase';
import { useAuth } from '../lib/AuthContext';
import { 
  Settings, LayoutDashboard, ArrowLeft, Menu, X, Plus, Edit2, Loader2,
  FileText, Database, Download, Car, ShieldCheck, AlertTriangle, Trash2
} from 'lucide-react';

const AdminDashboard = ({ onBack }) => {
  const { user } = useAuth();

  const [activeTab, setActiveTab] = useState('stats');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  const [viaturas, setViaturas] = useState([]);
  const [vistorias, setVistorias] = useState([]);
  const [loading, setLoading] = useState(true);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);

  const [formData, setFormData] = useState({
    prefixo: '', placa: '', modelo: '', ano: '',
    odometro_atual: '', tipo: 'CAMBURÃO',
    carroceria: 'FECHADA', combustivel: 'DIESEL'
  });

  // ================= FIREBASE REALTIME =================
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

  // ================= SALVAR VIATURA =================
  const handleSave = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const data = {
        ...formData,
        prefixo: formData.prefixo.toUpperCase(),
        odometro_atual: Number(formData.odometro_atual),
        updatedAt: serverTimestamp()
      };

      if (editingId) {
        await updateDoc(doc(db, "viaturas", editingId), data);
      } else {
        await addDoc(collection(db, "viaturas"), {
          ...data,
          status: 'DISPONÍVEL'
        });
      }

      closeModal();
    } catch (error) {
      alert("Erro ao salvar viatura");
    } finally {
      setLoading(false);
    }
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingId(null);
    setFormData({
      prefixo: '', placa: '', modelo: '', ano: '',
      odometro_atual: '', tipo: 'CAMBURÃO',
      carroceria: 'FECHADA', combustivel: 'DIESEL'
    });
  };

  // ================= KPIs =================
  const stats = useMemo(() => {
    return {
      total: vistorias.length,
      viaturas: viaturas.length,
      avariadas: vistorias.filter(v => v.status_fisico === 'AVARIADA').length,
      criticas: vistorias.filter(v => v.limpeza === 'CRÍTICA').length
    };
  }, [vistorias, viaturas]);

  // ================= EXPORT CSV =================
  const exportarCSV = () => {
    const headers = ["PREFIXO", "MOTORISTA", "GARAGEIRO", "STATUS", "LIMPEZA", "DATA"];
    const linhas = vistorias.map(v => [
      v.prefixo_vtr,
      v.motorista_nome,
      v.garageiro_re,
      v.status_fisico,
      v.limpeza,
      v.data_hora
    ]);

    const csvContent = [headers, ...linhas].map(e => e.join(";")).join("\n");
    const blob = new Blob(["\ufeff" + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);

    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `relatorio_patio_${new Date().toLocaleDateString()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="flex min-h-screen bg-slate-50 font-sans">

      {/* SIDEBAR */}
      <aside className={`fixed inset-y-0 left-0 z-50 w-72 bg-slate-900 text-white transform transition-transform duration-300 ease-in-out md:relative md:translate-x-0 ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="p-6">
          <div className="flex items-center gap-3 mb-10">
            <div className="bg-yellow-500 p-2 rounded-lg text-slate-900">
              <ShieldCheck size={24} />
            </div>
            <h1 className="font-black text-xl tracking-tighter italic">COMANDO GERAL</h1>
          </div>

          <nav className="space-y-2">
            <MenuBtn active={activeTab === 'stats'} onClick={() => setActiveTab('stats')} icon={<LayoutDashboard size={20} />} label="Painel de Controle" />
            <MenuBtn active={activeTab === 'frota'} onClick={() => setActiveTab('frota')} icon={<Database size={20} />} label="Gestão de Frota" />
            <MenuBtn active={activeTab === 'relatorios'} onClick={() => setActiveTab('relatorios')} icon={<FileText size={20} />} label="Relatórios e Logs" />
          </nav>
        </div>

        <div className="absolute bottom-0 w-full p-6 border-t border-slate-800">
          <button onClick={onBack} className="flex items-center gap-2 text-slate-400 hover:text-red-400 transition-colors font-bold uppercase text-xs">
            <ArrowLeft size={16} /> Voltar ao Início
          </button>
        </div>
      </aside>

      {/* MAIN CONTENT */}
      <main className="flex-1 flex flex-col h-screen overflow-hidden">
        
        {/* TOPBAR */}
        <header className="bg-white border-b border-slate-200 p-4 flex justify-between items-center px-8">
          <div className="flex items-center gap-4">
            <button className="md:hidden" onClick={() => setIsSidebarOpen(!isSidebarOpen)}>
              <Menu size={24} />
            </button>
            <h2 className="font-black text-slate-800 uppercase tracking-widest text-sm">
              Sessão: <span className="text-yellow-600">{activeTab}</span>
            </h2>
          </div>
          <div className="flex items-center gap-4 text-xs font-bold text-slate-500">
            {loading && <Loader2 className="animate-spin text-yellow-500" size={20} />}
            <span className="bg-slate-100 px-3 py-1 rounded-full uppercase italic">Admin: {user?.nome || 'Operador'}</span>
          </div>
        </header>

        {/* CONTENT AREA */}
        <div className="flex-1 overflow-y-auto p-8">
          
          {/* DASHBOARD STATS */}
          {activeTab === 'stats' && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 animate-in fade-in slide-in-from-bottom-4">
              <StatCard label="Total Vistorias" value={stats.total} icon={<FileText className="text-blue-500"/>} />
              <StatCard label="Viaturas no Sistema" value={stats.viaturas} icon={<Car className="text-indigo-500"/>}/>
              <StatCard label="Avarias Detectadas" value={stats.avariadas} icon={<AlertTriangle className="text-red-500"/>} highlight={stats.avariadas > 0} />
              <StatCard label="Limpeza Crítica" value={stats.criticas} icon={<Trash2 className="text-amber-500"/>} highlight={stats.criticas > 0} />
            </div>
          )}

          {/* FROTA TABLE */}
          {activeTab === 'frota' && (
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden animate-in fade-in">
              <div className="p-6 border-b border-slate-100 flex justify-between items-center">
                <h3 className="font-black text-slate-800 uppercase text-xs tracking-widest">Listagem de Frota Ativa</h3>
                <button onClick={() => setIsModalOpen(true)} className="flex items-center gap-2 bg-slate-900 text-white px-4 py-2 rounded-xl text-xs font-black hover:bg-slate-700 transition-all uppercase">
                  <Plus size={16} /> Adicionar Viatura
                </button>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                      <th className="p-4">Prefixo</th>
                      <th className="p-4">Modelo / Tipo</th>
                      <th className="p-4">KM Atual</th>
                      <th className="p-4">Status</th>
                      <th className="p-4 text-center">Ações</th>
                    </tr>
                  </thead>
                  <tbody className="text-sm font-bold text-slate-600 italic">
                    {viaturas.map(v => (
                      <tr key={v.id} className="border-b border-slate-50 hover:bg-slate-50/50 transition-colors">
                        <td className="p-4 text-slate-900 font-black tracking-tighter">{v.prefixo}</td>
                        <td className="p-4">{v.modelo} <span className="text-[10px] bg-slate-100 px-2 py-0.5 rounded ml-2">{v.carroceria}</span></td>
                        <td className="p-4">{v.odometro_atual?.toLocaleString()} KM</td>
                        <td className="p-4">
                          <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase ${v.status === 'DISPONÍVEL' ? 'bg-emerald-100 text-emerald-600' : 'bg-red-100 text-red-600'}`}>
                            {v.status}
                          </span>
                        </td>
                        <td className="p-4">
                          <div className="flex justify-center gap-2">
                            <button onClick={() => { setFormData(v); setEditingId(v.id); setIsModalOpen(true); }} className="p-2 text-slate-400 hover:text-blue-500 hover:bg-blue-50 rounded-lg transition-all">
                              <Edit2 size={18} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* RELATORIOS LOGS */}
          {activeTab === 'relatorios' && (
            <div className="space-y-6 animate-in fade-in">
              <div className="flex justify-between items-center bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
                <div>
                  <h3 className="font-black text-slate-800 uppercase text-xs tracking-widest">Central de Exportação</h3>
                  <p className="text-xs text-slate-400 font-medium">Baixe o log completo das movimentações do pátio.</p>
                </div>
                <button onClick={exportarCSV} className="flex items-center gap-2 bg-emerald-600 text-white px-6 py-3 rounded-2xl text-xs font-black hover:bg-emerald-700 transition-all uppercase shadow-lg shadow-emerald-600/20">
                  <Download size={18} /> Exportar Relatório CSV
                </button>
              </div>

              <div className="grid grid-cols-1 gap-3">
                {vistorias.map(v => (
                  <div key={v.id} className="bg-white p-4 rounded-xl border border-slate-200 flex justify-between items-center group hover:border-blue-200 transition-all">
                    <div className="flex items-center gap-4">
                       <div className={`w-2 h-10 rounded-full ${v.status_fisico === 'AVARIADA' ? 'bg-red-500' : 'bg-emerald-500'}`} />
                       <div>
                         <p className="font-black text-slate-800 text-sm">{v.prefixo_vtr}</p>
                         <p className="text-[10px] text-slate-400 font-bold uppercase italic">Motorista: {v.motorista_nome}</p>
                       </div>
                    </div>
                    <div className="text-right">
                      <p className="text-[10px] font-black text-slate-800 uppercase">{v.data_hora}</p>
                      <p className="text-[9px] text-slate-400 font-bold">GARAGEIRO: {v.garageiro_re}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </main>

      {/* MODAL FORM */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[100] bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <form onSubmit={handleSave} className="bg-white rounded-[2rem] w-full max-w-md overflow-hidden shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="bg-slate-900 p-6 text-white flex justify-between items-center">
              <h3 className="font-black uppercase tracking-tighter text-lg">{editingId ? 'Editar Viatura' : 'Nova Viatura'}</h3>
              <button type="button" onClick={closeModal} className="bg-slate-800 p-2 rounded-xl hover:bg-red-500 transition-colors"><X size={20}/></button>
            </div>
            
            <div className="p-8 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <InputGroup label="Prefixo" value={formData.prefixo} onChange={val => setFormData({...formData, prefixo: val})} placeholder="EX: 1023" />
                <InputGroup label="Placa" value={formData.placa} onChange={val => setFormData({...formData, placa: val})} placeholder="ABC-1234" />
              </div>

              <InputGroup label="Modelo da Viatura" value={formData.modelo} onChange={val => setFormData({...formData, modelo: val})} placeholder="EX: HILUX 4X4" />
              
              <div className="grid grid-cols-2 gap-4">
                <InputGroup label="Ano" value={formData.ano} onChange={val => setFormData({...formData, ano: val})} placeholder="2024" type="number" />
                <InputGroup label="Hôdometro (KM)" value={formData.odometro_atual} onChange={val => setFormData({...formData, odometro_atual: val})} placeholder="0" type="number" />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <SelectGroup label="Carroceria" value={formData.carroceria} options={['FECHADA', 'ABERTA', 'CAMBURÃO']} onChange={val => setFormData({...formData, carroceria: val})} />
                <SelectGroup label="Combustível" value={formData.combustivel} options={['DIESEL', 'GASOLINA', 'FLEX']} onChange={val => setFormData({...formData, combustivel: val})} />
              </div>

              <button type="submit" className="w-full bg-yellow-500 text-slate-900 font-black py-4 rounded-2xl hover:bg-yellow-400 transition-all uppercase tracking-widest mt-4 shadow-lg shadow-yellow-500/20">
                {editingId ? 'Confirmar Alterações' : 'Cadastrar Viaturas'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};

// ================= SUB-COMPONENTES AUXILIARES =================

const MenuBtn = ({ active, onClick, icon, label }) => (
  <button onClick={onClick} className={`flex items-center gap-3 w-full p-4 rounded-2xl transition-all font-black uppercase text-[10px] tracking-widest ${active ? 'bg-yellow-500 text-slate-900 shadow-lg shadow-yellow-500/20' : 'text-slate-400 hover:bg-slate-800 hover:text-white'}`}>
    {icon} <span>{label}</span>
  </button>
);

const StatCard = ({ label, value, icon, highlight }) => (
  <div className={`bg-white p-6 rounded-[2rem] border-2 shadow-sm flex items-center gap-5 ${highlight ? 'border-red-100' : 'border-slate-100'}`}>
    <div className="bg-slate-50 p-4 rounded-2xl">{icon}</div>
    <div>
      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{label}</p>
      <h4 className="text-3xl font-black text-slate-800 tracking-tighter italic leading-none">{value}</h4>
    </div>
  </div>
);

const InputGroup = ({ label, value, onChange, placeholder, type = "text" }) => (
  <div className="flex flex-col gap-1">
    <label className="text-[10px] font-black text-slate-400 uppercase ml-2 tracking-widest">{label}</label>
    <input 
      type={type} value={value} 
      onChange={e => onChange(e.target.value)} 
      placeholder={placeholder}
      className="bg-slate-50 border-2 border-slate-100 rounded-xl p-3 text-sm font-bold outline-none focus:border-yellow-500 transition-all"
    />
  </div>
);

const SelectGroup = ({ label, value, onChange, options }) => (
  <div className="flex flex-col gap-1">
    <label className="text-[10px] font-black text-slate-400 uppercase ml-2 tracking-widest">{label}</label>
    <select 
      value={value} 
      onChange={e => onChange(e.target.value)} 
      className="bg-slate-50 border-2 border-slate-100 rounded-xl p-3 text-sm font-bold outline-none focus:border-yellow-500 transition-all"
    >
      {options.map(opt => <option key={opt} value={opt}>{opt}</option>)}
    </select>
  </div>
);

export default AdminDashboard;
