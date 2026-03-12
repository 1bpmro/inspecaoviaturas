import React, { useState, useEffect, useMemo } from 'react';
import { db, collection, onSnapshot, query, orderBy, addDoc, doc, updateDoc, serverTimestamp } from '../lib/firebase';
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
  
  const [filters, setFilters] = useState({ vtr: '', motorista: '', garageiro: '' });

  // Estado para o formulário de cadastro/edição
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState({
    prefixo: '', placa: '', modelo: '', ano: '', chassi: '', renavam: '',
    odometro_atual: '', ultima_revisao: '', tipo: 'CAMBURÃO'
  });
  const [editingId, setEditingId] = useState(null);

  // Escuta Viaturas e Vistorias em tempo real
  useEffect(() => {
    const qVtrs = query(collection(db, "viaturas"), orderBy("prefixo", "asc"));
    const qVistorias = query(collection(db, "vistorias"), orderBy("data_hora", "desc"));

    const unsubVtrs = onSnapshot(qVtrs, (snap) => {
      setViaturas(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      setLoading(false);
    });

    const unsubVist = onSnapshot(qVistorias, (snap) => {
      setVistorias(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });

    return () => { unsubVtrs(); unsubVist(); };
  }, []);

  // Lógica de Salvamento no Firebase
  const handleSaveViatura = async (e) => {
    e.preventDefault();
    try {
      const data = {
        ...formData,
        odometro_atual: Number(formData.odometro_atual),
        updatedAt: serverTimestamp()
      };

      if (editingId) {
        await updateDoc(doc(db, "viaturas", editingId), data);
      } else {
        await addDoc(collection(db, "viaturas"), { ...data, status: 'DISPONÍVEL' });
      }
      
      setIsModalOpen(false);
      setFormData({ prefixo: '', placa: '', modelo: '', ano: '', chassi: '', renavam: '', odometro_atual: '', ultima_revisao: '', tipo: 'CAMBURÃO' });
      setEditingId(null);
    } catch (error) {
      alert("Erro ao salvar: " + error.message);
    }
  };

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
      
      {/* SIDEBAR TÁTICA */}
      <aside className={`fixed inset-y-0 left-0 z-[200] w-72 bg-slate-950 text-white flex flex-col transition-transform md:relative md:translate-x-0 ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="p-8 border-b border-slate-900 flex items-center gap-3">
          <div className="bg-amber-500 p-2 rounded-lg text-slate-900"><Settings size={20}/></div>
          <div>
            <h1 className="font-black text-xl italic tracking-tighter leading-none">P4 ADMIN</h1>
            <span className="text-[8px] text-amber-500 font-bold tracking-[0.3em] uppercase">1º BPM Rondon</span>
          </div>
        </div>

        <nav className="flex-1 p-4 space-y-2">
          <MenuBtn active={activeTab === 'stats'} onClick={() => setActiveTab('stats')} icon={<LayoutDashboard size={18}/>} label="Dashboard" />
          <MenuBtn active={activeTab === 'reports'} onClick={() => setActiveTab('reports')} icon={<FileText size={18}/>} label="Relatórios Finais" />
          <MenuBtn active={activeTab === 'pneus'} onClick={() => setActiveTab('pneus')} icon={<Disc size={18}/>} label="Controle de Rodagem" />
          <MenuBtn active={activeTab === 'frota'} onClick={() => setActiveTab('frota')} icon={<Database size={18}/>} label="Gestão de Frota" />
          
          <button onClick={onBack} className="w-full flex items-center gap-3 p-4 text-red-400 hover:bg-red-500/10 rounded-xl text-[10px] font-black uppercase mt-10 border border-red-500/20 transition-all">
            <ArrowLeft size={16}/> Sair do Painel
          </button>
        </nav>
      </aside>

      <main className="flex-1 flex flex-col h-screen overflow-hidden">
        <header className="bg-white h-20 border-b px-8 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button onClick={() => setIsSidebarOpen(!isSidebarOpen)} className="md:hidden p-2 bg-slate-100 rounded-lg">
              <Menu size={20}/>
            </button>
            <h2 className="font-black uppercase text-[11px] tracking-widest text-slate-400">{activeTab}</h2>
          </div>
          <div className="flex items-center gap-4">
            {loading && <Loader2 className="animate-spin text-amber-500" size={20} />}
            <div className="text-right">
              <p className="text-[10px] font-black text-slate-900 leading-none">{user?.displayName || 'ADMINISTRADOR'}</p>
              <p className="text-[8px] font-bold text-slate-400 uppercase tracking-tighter">Sessão Ativa</p>
            </div>
          </div>
        </header>

        <section className="flex-1 overflow-y-auto p-8">
          
          {activeTab === 'stats' && (
            <div className="space-y-6 animate-in fade-in duration-500">
              <div className="bg-white p-6 rounded-[2.5rem] shadow-sm grid grid-cols-1 md:grid-cols-3 gap-6 border border-slate-200">
                <SelectFilter label="Viatura" options={opcoesFiltro.vtrs} value={filters.vtr} onChange={v => setFilters({...filters, vtr: v})} />
                <SelectFilter label="Motorista" options={opcoesFiltro.motoristas} value={filters.motorista} onChange={v => setFilters({...filters, motorista: v})} />
                <SelectFilter label="Garageiro (RE)" options={opcoesFiltro.garageiros} value={filters.garageiro} onChange={v => setFilters({...filters, garageiro: v})} />
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <StatCard label="Movimentações" value={dadosFiltrados.length} color="blue" />
                <StatCard label="Frota Cadastrada" value={viaturas.length} color="amber" />
                <StatCard label="Nível Óleo Crítico" value={vistorias.filter(v => v.nivel_oleo === 'BAIXO').length} color="red" />
                <StatCard label="Pneus em Alerta" value={vistorias.filter(v => v.pneus_estado === 'RUIM').length} color="red" />
              </div>
            </div>
          )}

          {activeTab === 'frota' && (
            <div className="space-y-6 animate-in slide-in-from-bottom-4 duration-500">
              <div className="flex justify-between items-center">
                <button 
                  onClick={() => { setEditingId(null); setFormData({prefixo:'', placa:'', modelo:'', ano:'', chassi:'', renavam:'', odometro_atual:'', ultima_revisao:'', tipo:'CAMBURÃO'}); setIsModalOpen(true); }} 
                  className="bg-slate-900 text-white px-8 py-4 rounded-2xl font-black text-[10px] uppercase flex items-center gap-3 shadow-xl hover:bg-slate-800 transition-all"
                >
                  <Plus size={18}/> Novo Ativo de Frota
                </button>
              </div>

              <div className="bg-white rounded-[3rem] border shadow-sm overflow-hidden">
                <table className="w-full text-left">
                  <thead className="bg-slate-950 text-white text-[9px] font-black uppercase">
                    <tr>
                      <th className="p-6">Prefixo</th>
                      <th className="p-6">Placa</th>
                      <th className="p-6">Modelo / Ano</th>
                      <th className="p-6">Status Atual</th>
                      <th className="p-6 text-center">Ações</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y font-bold text-xs text-slate-700">
                    {viaturas.map((v) => (
                      <tr key={v.id} className="hover:bg-slate-50 transition-colors">
                        <td className="p-6 text-xl font-black tracking-tighter text-slate-900">{v.prefixo}</td>
                        <td className="p-6 font-mono">{v.placa}</td>
                        <td className="p-6">{v.modelo} <br/> <span className="text-[10px] text-slate-400">{v.ano}</span></td>
                        <td className="p-6">
                          <span className={`px-3 py-1 rounded-full text-[9px] font-black ${v.status === 'DISPONÍVEL' ? 'bg-emerald-100 text-emerald-700' : 'bg-orange-100 text-orange-700'}`}>
                            {v.status}
                          </span>
                        </td>
                        <td className="p-6 text-center">
                          <button onClick={() => { setFormData(v); setEditingId(v.id); setIsModalOpen(true); }} className="p-3 bg-slate-100 text-slate-600 rounded-xl hover:bg-amber-500 hover:text-white transition-all">
                            <Edit2 size={16}/>
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
          
          {/* Outras abas seguiriam a mesma lógica de mapeamento do 'dadosFiltrados' */}
        </section>
      </main>

      {/* MODAL DE CADASTRO/EDIÇÃO */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-950/90 z-[300] flex items-center justify-center p-4 backdrop-blur-md">
          <div className="bg-white w-full max-w-2xl rounded-[3.5rem] shadow-2xl overflow-hidden animate-in zoom-in duration-300">
            <div className="p-8 bg-slate-900 text-white flex justify-between items-center border-b border-slate-800">
              <div>
                <h2 className="font-black uppercase italic tracking-tighter text-2xl">Ficha Técnica</h2>
                <p className="text-[9px] text-amber-500 font-bold uppercase tracking-widest">Base de Dados P4</p>
              </div>
              <button onClick={() => setIsModalOpen(false)} className="p-2 hover:bg-white/10 rounded-full transition-all"><X/></button>
            </div>
            
            <form onSubmit={handleSaveViatura} className="p-10 grid grid-cols-2 gap-5 max-h-[70vh] overflow-y-auto">
              <Input label="Prefixo" required value={formData.prefixo} onChange={e => setFormData({...formData, prefixo: e.target.value})} placeholder="Ex: 01-123" />
              <Input label="Placa" required value={formData.placa} onChange={e => setFormData({...formData, placa: e.target.value.toUpperCase()})} placeholder="ABC-1234" />
              <Input label="Modelo" value={formData.modelo} onChange={e => setFormData({...formData, modelo: e.target.value})} />
              <Input label="Ano" value={formData.ano} onChange={e => setFormData({...formData, ano: e.target.value})} />
              <Input label="Chassi" value={formData.chassi} onChange={e => setFormData({...formData, chassi: e.target.value})} />
              <Input label="Renavam" value={formData.renavam} onChange={e => setFormData({...formData, renavam: e.target.value})} />
              <Input label="Odômetro (KM)" type="number" value={formData.odometro_atual} onChange={e => setFormData({...formData, odometro_atual: e.target.value})} />
              <Input label="Última Revisão" type="date" value={formData.ultima_revisao} onChange={e => setFormData({...formData, ultima_revisao: e.target.value})} />
              
              <div className="col-span-2 pt-6">
                <button type="submit" className="w-full py-5 bg-amber-500 text-slate-900 rounded-3xl font-black uppercase text-xs shadow-xl shadow-amber-500/20 active:scale-95 transition-all">
                  {editingId ? 'Atualizar Registro' : 'Gravar na Base de Dados'}
                </button>
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
    <select value={value} onChange={e => onChange(e.target.value)} className="w-full p-4 bg-slate-50 border-none rounded-2xl text-xs font-bold outline-none ring-2 ring-transparent focus:ring-amber-500 transition-all cursor-pointer">
      <option value="">TODOS OS REGISTROS</option>
      {options.map(opt => <option key={opt} value={opt}>{opt}</option>)}
    </select>
  </div>
);

const StatCard = ({ label, value, color }) => (
  <div className={`bg-white p-6 rounded-[2rem] border-l-[8px] ${color === 'blue' ? 'border-blue-500' : color === 'amber' ? 'border-amber-500' : 'border-red-500'} shadow-sm border border-slate-200`}>
    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">{label}</p>
    <p className="text-4xl font-black mt-2 text-slate-900 tabular-nums leading-none">{value}</p>
  </div>
);

const Input = ({ label, ...props }) => (
  <div className="space-y-1">
    <label className="text-[9px] font-black text-slate-400 uppercase ml-2">{label}</label>
    <input {...props} className="w-full bg-slate-50 border-none rounded-2xl p-4 text-xs font-bold outline-none ring-2 ring-slate-100 focus:ring-amber-500 transition-all placeholder:text-slate-300" />
  </div>
);

export default AdminDashboard;
