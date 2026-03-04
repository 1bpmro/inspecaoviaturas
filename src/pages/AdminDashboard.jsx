import React, { useState, useEffect } from 'react';
import { gasApi } from '../api/gasClient';
import { 
  Settings, 
  LayoutDashboard, 
  ArrowLeft, 
  Menu, 
  X, 
  Plus, 
  Search, 
  Filter, 
  Printer, 
  Save, 
  Edit2, 
  FileText,
  Trash2, 
  Loader2,
  Database
} from 'lucide-react';

const AdminDashboard = ({ onBack }) => {
  // --- ESTADOS ---
  const [activeTab, setActiveTab] = useState('stats'); // stats ou frota
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [viaturas, setViaturas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [isAddingVtr, setIsAddingVtr] = useState(false);

  const [formData, setFormData] = useState({
    id: '', prefixo: '', placa: '', modelo: '', tipoCarroceria: 'CAMBURÃO', isEditing: false
  });

  const LISTA_CARROCERIAS = ['CAMBURÃO', 'CARROCERIA ABERTA', 'OSTENSIVA COMUM', 'ADMINISTRATIVA', 'OUTROS'];

  // --- CARGA DE DADOS ---
  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const res = await gasApi.getViaturas();
      if (res.status === 'success') {
        // Filtramos apenas as que não foram baixadas definitivamente
        setViaturas(res.data.filter(v => v.Status !== "FORA DE SERVIÇO (BAIXA)"));
      }
    } catch (error) {
      console.error("Erro ao carregar dados administrativos:", error);
    } finally {
      setLoading(false);
    }
  };

  // --- AÇÕES DE GESTÃO ---
  const handleSaveViatura = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const action = formData.isEditing ? 'updateViatura' : 'addViatura';
      const res = await gasApi.doPost({ action, payload: formData });
      if (res.status === 'success') {
        setIsAddingVtr(false);
        loadData();
      } else {
        alert("Erro: " + res.message);
      }
    } catch (err) {
      alert("Falha na comunicação com o servidor.");
    } finally {
      setLoading(false);
    }
  };

  // --- FILTRAGEM ---
  const viaturasFiltradas = viaturas.filter(v => 
    v.Prefixo?.toUpperCase().includes(searchTerm.toUpperCase())
  );

  return (
    <div className="min-h-screen bg-slate-50 flex font-sans text-slate-900">
      
      {/* SIDEBAR ADMINISTRATIVA - FOCADA EM GESTÃO */}
      <aside className={`fixed inset-y-0 left-0 z-[200] w-64 bg-slate-900 text-white flex flex-col transition-transform duration-300 md:relative md:translate-x-0 ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="p-8 border-b border-slate-800">
          <h1 className="font-black text-xl italic uppercase tracking-tighter text-amber-500 flex items-center gap-2">
            <Settings size={20}/> ADMIN
          </h1>
          <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest mt-1 italic">Gestão Estratégica</p>
        </div>

        <nav className="flex-1 p-4 space-y-2">
          <MenuBtn 
            active={activeTab === 'stats'} 
            onClick={() => {setActiveTab('stats'); setIsSidebarOpen(false)}} 
            icon={<LayoutDashboard size={18}/>} 
            label="Visão Geral" 
          />
          <MenuBtn 
            active={activeTab === 'frota'} 
            onClick={() => {setActiveTab('frota'); setIsSidebarOpen(false)}} 
            icon={<Database size={18}/>} 
            label="Cadastro de Frota" 
          />
          
          <div className="pt-10 border-t border-slate-800 mt-6 px-4">
            <button 
              onClick={onBack} 
              className="w-full flex items-center gap-3 p-3 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl text-[10px] font-black uppercase transition-all border border-slate-800"
            >
              <ArrowLeft size={16}/> Sair do Admin
            </button>
          </div>
        </nav>
      </aside>

      {/* ÁREA DE CONTEÚDO */}
      <main className="flex-1 flex flex-col min-w-0 h-screen">
        <header className="bg-white h-16 border-b border-slate-200 flex items-center justify-between px-8 shrink-0">
          <div className="flex items-center gap-4">
            <button onClick={() => setIsSidebarOpen(true)} className="md:hidden p-2 bg-slate-100 rounded-lg">
              <Menu size={20} />
            </button>
            <h2 className="font-black uppercase text-xs tracking-[0.2em] text-slate-400">
              {activeTab === 'stats' ? 'Dashboard de Prontidão' : 'Controle de Inventário'}
            </h2>
          </div>

          <div className="flex items-center gap-4">
            {loading && <Loader2 size={16} className="animate-spin text-blue-600" />}
            {activeTab === 'frota' && (
              <button 
                onClick={() => {
                  setFormData({prefixo:'', placa:'', modelo:'', tipoCarroceria:'CAMBURÃO', isEditing: false});
                  setIsAddingVtr(true);
                }} 
                className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-xl text-[10px] font-black uppercase flex items-center gap-2 shadow-lg shadow-blue-200 transition-all active:scale-95"
              >
                <Plus size={14}/> Cadastrar Novo
              </button>
            )}
          </div>
        </header>

        <section className="flex-1 overflow-y-auto p-4 md:p-8">
          {activeTab === 'stats' ? (
            /* ABA 1: ESTATÍSTICAS E VISÃO GERAL */
            <div className="space-y-8 animate-in fade-in duration-500">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <StatCard label="Total no Acervo" value={viaturas.length} color="blue" />
                <StatCard label="Operacionais" value={viaturas.filter(v => v.Status === 'EM SERVIÇO').length} color="emerald" />
                <StatCard label="Em Manutenção" value={viaturas.filter(v => v.Status === 'MANUTENÇÃO').length} color="red" />
              </div>

              <div className="bg-white rounded-[2.5rem] shadow-sm border border-slate-200 overflow-hidden">
                <div className="p-6 border-b border-slate-50 flex justify-between items-center bg-slate-50/30">
                  <span className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Resumo de Status</span>
                  <button onClick={() => window.print()} className="p-2 hover:bg-white rounded-lg transition-colors border border-transparent hover:border-slate-200"><Printer size={16}/></button>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left">
                    <thead className="bg-slate-50 text-[9px] font-black uppercase text-slate-400">
                      <tr>
                        <th className="p-5">Prefixo</th>
                        <th className="p-5">Status Atual</th>
                        <th className="p-5">Última Atualização</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {viaturas.map((v, i) => (
                        <tr key={i} className="hover:bg-slate-50/50 transition-colors">
                          <td className="p-5 font-black text-slate-700">{v.Prefixo}</td>
                          <td className="p-5">
                            <span className={`text-[9px] font-black px-2 py-1 rounded-md uppercase ${v.Status === 'EM SERVIÇO' ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>
                              {v.Status}
                            </span>
                          </td>
                          <td className="p-5 text-[10px] font-bold text-slate-400">{v.DataHora || '--'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          ) : (
            /* ABA 2: CRUD DE FROTA */
            <div className="space-y-6 animate-in slide-in-from-bottom-4 duration-500">
              <div className="bg-white p-4 rounded-2xl border border-slate-200 flex items-center gap-3">
                <Search size={18} className="text-slate-400" />
                <input 
                  type="text" 
                  placeholder="Filtrar por prefixo..." 
                  className="bg-transparent border-none outline-none text-sm font-bold w-full uppercase"
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>

              <div className="bg-white rounded-[2rem] shadow-sm border border-slate-200 overflow-hidden">
                <table className="w-full text-left">
                  <thead className="bg-slate-900 text-[9px] font-black uppercase text-slate-400">
                    <tr>
                      <th className="p-5">Viatura</th>
                      <th className="p-5">Placa / Modelo</th>
                      <th className="p-5">Tipo</th>
                      <th className="p-5 text-center">Ações</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {viaturasFiltradas.map((v, i) => (
                      <tr key={i} className="text-sm font-bold text-slate-600 hover:bg-blue-50/30 transition-colors">
                        <td className="p-5 font-black text-slate-900">{v.Prefixo}</td>
                        <td className="p-5">
                          <div className="flex flex-col">
                            <span>{v.Placa || '---'}</span>
                            <span className="text-[10px] text-slate-400 uppercase font-normal">{v.Modelo}</span>
                          </div>
                        </td>
                        <td className="p-5 text-[10px] uppercase font-black text-blue-600">{v.TipoCarroceria}</td>
                        <td className="p-5">
                          <div className="flex justify-center gap-2">
                            <button 
                              onClick={() => {
                                setFormData({...v, prefixo: v.Prefixo, isEditing: true});
                                setIsAddingVtr(true);
                              }}
                              className="p-2 text-amber-500 hover:bg-amber-50 rounded-xl transition-colors"
                            >
                              <Edit2 size={16}/>
                            </button>
                            <button className="p-2 text-red-400 hover:bg-red-50 rounded-xl transition-colors">
                              <Trash2 size={16}/>
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
        </section>
      </main>

      {/* MODAL: CADASTRO / EDIÇÃO */}
      {isAddingVtr && (
        <div className="fixed inset-0 bg-slate-900/90 backdrop-blur-sm z-[300] flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-lg rounded-[2.5rem] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-6 bg-slate-900 text-white flex justify-between items-center">
              <h2 className="font-black italic uppercase text-sm tracking-widest">
                {formData.isEditing ? 'Editar Registro' : 'Novo Ativo de Frota'}
              </h2>
              <button onClick={() => setIsAddingVtr(false)} className="hover:rotate-90 transition-transform"><X/></button>
            </div>
            <form onSubmit={handleSaveViatura} className="p-8 space-y-5">
              <div className="grid grid-cols-2 gap-4">
                <Input 
                  label="Prefixo" 
                  value={formData.prefixo} 
                  onChange={e => setFormData({...formData, prefixo: e.target.value.toUpperCase()})} 
                  required 
                  disabled={formData.isEditing}
                />
                <Input 
                  label="Placa" 
                  value={formData.placa} 
                  onChange={e => setFormData({...formData, placa: e.target.value.toUpperCase()})} 
                />
              </div>
              <Input 
                label="Modelo / Marca" 
                value={formData.modelo} 
                onChange={e => setFormData({...formData, modelo: e.target.value})} 
              />
              <div>
                <label className="text-[9px] font-black uppercase text-slate-400 mb-1 block ml-1">Tipo de Carroceria</label>
                <select 
                  value={formData.tipoCarroceria}
                  onChange={e => setFormData({...formData, tipoCarroceria: e.target.value})}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-sm font-bold outline-none focus:ring-2 ring-blue-500 transition-all appearance-none"
                >
                  {LISTA_CARROCERIAS.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
              <button type="submit" className="w-full py-4 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl font-black uppercase text-xs shadow-xl shadow-blue-100 transition-all active:scale-95 flex items-center justify-center gap-2">
                <Save size={18}/> {formData.isEditing ? 'Atualizar Dados' : 'Salvar no Acervo'}
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
  <button onClick={onClick} className={`w-full flex items-center gap-3 p-4 rounded-2xl text-[10px] font-black uppercase transition-all ${active ? 'bg-amber-500 text-slate-900 shadow-xl' : 'text-slate-500 hover:bg-slate-800 hover:text-white'}`}>
    {icon} {label}
  </button>
);

const StatCard = ({ label, value, color }) => {
  const colors = { 
    blue: 'border-l-blue-500 text-blue-600 bg-blue-50/10', 
    emerald: 'border-l-emerald-500 text-emerald-600 bg-emerald-50/10', 
    red: 'border-l-red-500 text-red-600 bg-red-50/10' 
  };
  return (
    <div className={`bg-white p-8 rounded-[2rem] border-l-8 ${colors[color]} shadow-sm`}>
      <p className="text-[10px] font-black text-slate-400 uppercase tracking-tighter">{label}</p>
      <p className={`text-4xl font-black mt-2 ${colors[color].split(' ')[1]}`}>{value}</p>
    </div>
  );
};

const Input = ({ label, ...props }) => (
  <div>
    <label className="text-[9px] font-black uppercase text-slate-400 mb-1 block ml-1">{label}</label>
    <input {...props} className={`w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-sm font-bold outline-none focus:ring-2 ring-blue-500 transition-all ${props.disabled ? 'opacity-50' : ''}`} />
  </div>
);

export default AdminDashboard;
