import React, { useState, useEffect } from 'react';
import { gasApi } from '../api/gasClient';
import { useAuth } from '../lib/AuthContext';
import { 
  Settings, LayoutDashboard, ArrowLeft, Menu, X, Plus, Search, 
  Printer, Save, Edit2, Trash2, Loader2, 
  Database, Droplets, Eye, CheckCircle, Clock, AlertTriangle, ChevronRight
} from 'lucide-react';

const AdminDashboard = ({ onBack }) => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('stats'); 
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [viaturas, setViaturas] = useState([]);
  const [vistoriasPendentes, setVistoriasPendentes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [viewingPhoto, setViewingPhoto] = useState(null);
  const [isAddingVtr, setIsAddingVtr] = useState(false);

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
      const [resVtr, resVist] = await Promise.all([
        gasApi.getViaturas(),
        gasApi.getVistoriasPendentes()
      ]);
      
      if (resVtr.status === 'success') {
        setViaturas(resVtr.data.filter(v => (v.Status || v.STATUS) !== "FORA DE SERVIÇO (BAIXA)"));
      }
      if (resVist.status === 'success') {
        setVistoriasPendentes(resVist.data);
      }
    } catch (error) {
      console.error("Erro administrativo:", error);
    } finally {
      setLoading(false);
    }
  };

  // Lógica de Pendências: Troca de óleo marcada mas sem RE do garageiro
  const pendenciasOleo = vistoriasPendentes.filter(v => 
    v.troca_oleo === "SIM" && (!v.garageiro_re || v.garageiro_re === "")
  );

  const viaturasFiltradas = viaturas.filter(v => {
    const prefixo = (v.Prefixo || v.prefixo || "").toString().toUpperCase();
    const placa = (v.Placa || v.placa || "").toString().toUpperCase();
    const busca = searchTerm.toUpperCase();
    return prefixo.includes(busca) || placa.includes(busca);
  });

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
      alert("Falha na comunicação.");
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteViatura = async (prefixo) => {
    if (!window.confirm(`Deseja realmente baixar a VTR ${prefixo}?`)) return;
    try {
      const res = await gasApi.alterarStatusViatura(prefixo, "FORA DE SERVIÇO (BAIXA)", { motivo: 'baixa_definitiva' });
      if (res.status === 'success') loadData();
    } catch (e) {
      alert("Erro ao excluir.");
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex font-sans text-slate-900 overflow-hidden">
      
      {/* SIDEBAR */}
      <aside className={`fixed inset-y-0 left-0 z-[200] w-72 bg-slate-950 text-white flex flex-col transition-transform duration-300 md:relative md:translate-x-0 ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="p-8 border-b border-slate-900">
          <div className="flex items-center gap-3">
            <div className="bg-amber-500 p-2 rounded-xl text-slate-900 shadow-lg shadow-amber-500/20">
              <Settings size={22} className="animate-[spin_4s_linear_infinite]"/>
            </div>
            <div>
              <h1 className="font-black text-xl italic uppercase tracking-tighter">P4 ADMIN</h1>
              <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest leading-none">Logística & Frota</p>
            </div>
          </div>
        </div>

        <nav className="flex-1 p-4 space-y-2 mt-4">
          <MenuBtn active={activeTab === 'stats'} onClick={() => {setActiveTab('stats'); setIsSidebarOpen(false)}} icon={<LayoutDashboard size={18}/>} label="Visão Geral" />
          
          <button 
            onClick={() => {setActiveTab('oleo'); setIsSidebarOpen(false)}}
            className={`w-full flex items-center justify-between p-4 rounded-2xl text-[10px] font-black uppercase transition-all ${activeTab === 'oleo' ? 'bg-amber-500 text-slate-900 shadow-xl' : 'text-slate-500 hover:bg-slate-900 hover:text-white'}`}
          >
            <div className="flex items-center gap-3"><Droplets size={18}/> Trocas de Óleo</div>
            {pendenciasOleo.length > 0 && (
              <span className="bg-red-500 text-white px-2 py-0.5 rounded-full text-[8px] animate-pulse">{pendenciasOleo.length}</span>
            )}
          </button>

          <MenuBtn active={activeTab === 'frota'} onClick={() => {setActiveTab('frota'); setIsSidebarOpen(false)}} icon={<Database size={18}/>} label="Gestão de Frota" />
          
          <div className="pt-10 border-t border-slate-900 mt-6 px-4">
            <button onClick={onBack} className="w-full flex items-center gap-3 p-4 text-slate-500 hover:text-white hover:bg-red-500/10 rounded-2xl text-[10px] font-black uppercase border border-slate-900 transition-all">
              <ArrowLeft size={16}/> Sair do Painel
            </button>
          </div>
        </nav>
      </aside>

      {/* ÁREA DE CONTEÚDO */}
      <main className="flex-1 flex flex-col min-w-0 h-screen">
        <header className="bg-white h-20 border-b border-slate-200 flex items-center justify-between px-8 shrink-0">
          <div className="flex items-center gap-4">
            <button onClick={() => setIsSidebarOpen(true)} className="md:hidden p-3 bg-slate-100 rounded-xl text-slate-600"><Menu size={20} /></button>
            <div>
              <h2 className="font-black uppercase text-[10px] tracking-[0.3em] text-slate-400 mb-1">
                {activeTab === 'stats' ? 'Unidade Operacional' : activeTab === 'oleo' ? 'Manutenção Preventiva' : 'Inventário de Ativos'}
              </h2>
              <p className="font-bold text-slate-800 hidden sm:block">Painel de Controle Estratégico</p>
            </div>
          </div>

          <div className="flex items-center gap-4">
            {loading && <Loader2 size={18} className="animate-spin text-amber-500" />}
            {activeTab === 'frota' && (
              <button 
                onClick={() => {
                  setFormData({ id: '', prefixo: '', placa: '', modelo: '', tipoCarroceria: 'CAMBURÃO', isEditing: false });
                  setIsAddingVtr(true);
                }} 
                className="bg-slate-900 text-white px-5 py-3 rounded-2xl text-[10px] font-black uppercase flex items-center gap-2 hover:bg-amber-500 hover:text-slate-900 transition-all shadow-lg"
              >
                <Plus size={16}/> Cadastrar Viatura
              </button>
            )}
          </div>
        </header>

        <section className="flex-1 overflow-y-auto p-4 md:p-8 pb-20">
          
          {/* ABA 1: ESTATÍSTICAS */}
          {activeTab === 'stats' && (
            <div className="max-w-6xl mx-auto space-y-8 animate-in fade-in duration-500">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <StatCard label="Total Frota Ativa" value={viaturas.length} color="blue" />
                <StatCard label="Pendências de Óleo" value={pendenciasOleo.length} color="amber" />
                <StatCard label="VTRs Indisponíveis" value={viaturas.filter(v => (v.Status || v.STATUS) !== 'DISPONÍVEL' && (v.Status || v.STATUS) !== 'OK').length} color="red" />
              </div>

              <div className="bg-white rounded-[2.5rem] shadow-sm border border-slate-200 overflow-hidden">
                <div className="p-6 border-b border-slate-50 flex justify-between items-center bg-slate-50/50">
                  <span className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Resumo de Prontidão</span>
                  <button onClick={() => window.print()} className="p-2 hover:bg-white rounded-lg transition-colors border border-transparent hover:border-slate-200"><Printer size={16}/></button>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left">
                    <thead className="bg-slate-50 text-[9px] font-black uppercase text-slate-400">
                      <tr>
                        <th className="p-5">Prefixo</th>
                        <th className="p-5">Placa</th>
                        <th className="p-5">Status Atual</th>
                        <th className="p-5 text-right">Última Movimentação</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {viaturas.map((v, i) => (
                        <tr key={i} className="hover:bg-slate-50/50 transition-colors">
                          <td className="p-5 font-black text-slate-800">{v.Prefixo || v.prefixo}</td>
                          <td className="p-5 font-bold text-slate-400">{v.Placa || v.placa}</td>
                          <td className="p-5">
                            <span className={`text-[9px] font-black px-3 py-1 rounded-full uppercase ${(v.Status === 'DISPONÍVEL' || v.Status === 'OK' || v.STATUS === 'DISPONÍVEL') ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>
                              {v.Status || v.STATUS || 'S/ INFO'}
                            </span>
                          </td>
                          <td className="p-5 text-[10px] font-bold text-slate-400 text-right">{v.DataHora || v.DATAHORA || '--'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* ABA 2: PENDÊNCIAS DE ÓLEO */}
          {activeTab === 'oleo' && (
            <div className="max-w-5xl mx-auto space-y-6 animate-in slide-in-from-right-4 duration-300">
              <div className="bg-amber-500 rounded-[2.5rem] p-8 text-slate-900 flex flex-col md:flex-row justify-between items-center gap-6 shadow-xl shadow-amber-500/20">
                <div className="flex items-center gap-5">
                  <div className="bg-white/20 p-4 rounded-3xl"><Droplets size={32}/></div>
                  <div>
                    <h3 className="font-black uppercase text-xl tracking-tighter">Validação de Óleo</h3>
                    <p className="text-xs font-bold opacity-80 uppercase tracking-widest">Aguardando conferência física do garageiro no pátio</p>
                  </div>
                </div>
                <div className="text-center bg-white/20 px-6 py-4 rounded-3xl backdrop-blur-sm border border-white/30">
                  <p className="text-[10px] font-black uppercase">Pendentes</p>
                  <p className="text-3xl font-black leading-none mt-1">{pendenciasOleo.length}</p>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4">
                {pendenciasOleo.length === 0 ? (
                  <div className="py-24 bg-white rounded-[3rem] border-2 border-dashed border-slate-200 flex flex-col items-center justify-center">
                    <CheckCircle size={64} className="text-emerald-100 mb-4"/>
                    <p className="text-slate-400 font-black uppercase text-xs tracking-widest">Nenhuma pendência de óleo no momento</p>
                  </div>
                ) : pendenciasOleo.map((v, i) => (
                  <div key={i} className="bg-white border border-slate-200 rounded-[2rem] p-6 flex flex-col md:flex-row justify-between items-center shadow-sm hover:border-amber-400 transition-all gap-4">
                    <div className="flex items-center gap-6">
                      <div className="text-center bg-slate-900 text-white px-5 py-3 rounded-2xl">
                        <p className="text-[9px] font-black text-amber-500 leading-none mb-1 uppercase tracking-widest">VTR</p>
                        <p className="text-2xl font-black leading-none tracking-tighter">{v.prefixo_vtr}</p>
                      </div>
                      <div className="space-y-1">
                        <p className="text-xs font-black text-slate-800 uppercase flex items-center gap-2"><Clock size={14} className="text-slate-400"/> {v.motorista_nome}</p>
                        <div className="flex gap-2">
                          <span className="bg-blue-50 text-blue-700 px-2 py-0.5 rounded-lg text-[10px] font-black">KM: {v.hodometro_oleo}</span>
                          <span className="bg-slate-100 text-slate-500 px-2 py-0.5 rounded-lg text-[10px] font-black italic">{v.data_hora || v.timestamp}</span>
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-3 w-full md:w-auto">
                      {v.foto_oleo && (
                        <button 
                          onClick={() => setViewingPhoto(v.foto_oleo)}
                          className="flex-1 md:flex-none flex items-center justify-center gap-2 bg-slate-900 text-white px-6 py-4 rounded-2xl hover:bg-blue-600 transition-all shadow-lg"
                        >
                          <Eye size={18}/> <span className="text-[10px] font-black uppercase">Ver Comprovante</span>
                        </button>
                      )}
                      <div className="hidden lg:flex items-center gap-2 px-4 py-3 bg-amber-50 rounded-2xl border border-amber-200 text-amber-600 animate-pulse">
                        <AlertTriangle size={16}/>
                        <span className="text-[9px] font-black uppercase">Aguardando Pátio</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ABA 3: CRUD DE FROTA */}
          {activeTab === 'frota' && (
            <div className="max-w-6xl mx-auto space-y-6 animate-in slide-in-from-bottom-4 duration-500">
              <div className="bg-white p-4 rounded-3xl border border-slate-200 flex items-center gap-4 shadow-sm">
                <Search size={22} className="text-slate-300 ml-2" />
                <input 
                  type="text" 
                  placeholder="PESQUISAR POR PREFIXO OU PLACA..." 
                  className="bg-transparent border-none outline-none text-xs font-black w-full uppercase tracking-widest"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>

              <div className="bg-white rounded-[2.5rem] shadow-sm border border-slate-200 overflow-hidden">
                <table className="w-full text-left">
                  <thead className="bg-slate-900 text-[9px] font-black uppercase text-slate-500">
                    <tr>
                      <th className="p-6">Viatura</th>
                      <th className="p-6">Placa / Modelo</th>
                      <th className="p-6">Tipo</th>
                      <th className="p-6 text-center">Ações</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {viaturasFiltradas.map((v, i) => (
                      <tr key={i} className="text-sm font-bold text-slate-600 hover:bg-slate-50/50 transition-colors">
                        <td className="p-6 font-black text-slate-900 text-lg tracking-tighter">{v.Prefixo || v.prefixo}</td>
                        <td className="p-6">
                          <div className="flex flex-col">
                            <span className="text-slate-900 font-black">{v.Placa || v.placa || '---'}</span>
                            <span className="text-[10px] text-slate-400 uppercase font-bold tracking-tight">{v.Modelo || v.modelo}</span>
                          </div>
                        </td>
                        <td className="p-6">
                          <span className="text-[9px] uppercase font-black bg-blue-50 text-blue-600 px-3 py-1 rounded-lg">
                            {v.TipoCarroceria || v.tipocarroceria || 'COMUM'}
                          </span>
                        </td>
                        <td className="p-6">
                          <div className="flex justify-center gap-2">
                            <button 
                              onClick={() => {
                                setFormData({
                                  id: v.id || '',
                                  prefixo: v.Prefixo || v.prefixo, 
                                  placa: v.Placa || v.placa, 
                                  modelo: v.Modelo || v.modelo,
                                  tipoCarroceria: v.TipoCarroceria || v.tipocarroceria || 'CAMBURÃO',
                                  isEditing: true
                                });
                                setIsAddingVtr(true);
                              }}
                              className="p-3 text-amber-500 hover:bg-amber-50 rounded-xl transition-colors"
                            >
                              <Edit2 size={18}/>
                            </button>
                            <button 
                              onClick={() => handleDeleteViatura(v.Prefixo || v.prefixo)}
                              className="p-3 text-red-300 hover:bg-red-50 hover:text-red-600 rounded-xl transition-colors"
                            >
                              <Trash2 size={18}/>
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

      {/* MODAL: VISUALIZADOR DE FOTO */}
      {viewingPhoto && (
        <div className="fixed inset-0 bg-slate-950/98 z-[400] flex flex-col p-6 backdrop-blur-xl animate-in fade-in duration-300">
          <div className="flex justify-between items-center mb-6">
             <div className="text-white">
                <h4 className="font-black uppercase tracking-tighter text-xl">Comprovante de Troca</h4>
                <p className="text-amber-500 text-[10px] font-black uppercase tracking-widest">Verificação Administrativa</p>
             </div>
             <button onClick={() => setViewingPhoto(null)} className="text-white p-4 hover:bg-white/10 rounded-full transition-all border border-white/10"><X size={32} /></button>
          </div>
          <div className="flex-1 flex items-center justify-center overflow-hidden">
            <img 
              src={viewingPhoto} 
              className="max-w-full max-h-full object-contain rounded-3xl shadow-[0_0_100px_rgba(0,0,0,0.5)] border-4 border-white/5" 
              alt="Comprovante de Óleo" 
            />
          </div>
          <div className="p-10 text-center">
             <p className="text-white/40 font-black uppercase text-[10px] tracking-[0.3em]">O registro físico deve ser conferido pelo garageiro no ato da entrada.</p>
          </div>
        </div>
      )}

      {/* MODAL: CADASTRO / EDIÇÃO */}
      {isAddingVtr && (
        <div className="fixed inset-0 bg-slate-950/90 backdrop-blur-sm z-[300] flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-lg rounded-[3rem] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300 border border-white/20">
            <div className="p-8 bg-slate-900 text-white flex justify-between items-center">
              <div>
                <h2 className="font-black italic uppercase text-lg tracking-tighter">
                  {formData.isEditing ? 'Atualizar Ativo' : 'Adicionar à Frota'}
                </h2>
                <p className="text-[10px] font-black text-amber-500 uppercase tracking-widest">Base de Dados P4</p>
              </div>
              <button onClick={() => setIsAddingVtr(false)} className="p-2 hover:bg-white/10 rounded-full transition-transform hover:rotate-90"><X/></button>
            </div>
            <form onSubmit={handleSaveViatura} className="p-10 space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <Input 
                  label="Prefixo da VTR" 
                  value={formData.prefixo} 
                  onChange={e => setFormData({...formData, prefixo: e.target.value.toUpperCase()})} 
                  required 
                  disabled={formData.isEditing}
                  placeholder="EX: 01-123"
                />
                <Input 
                  label="Placa" 
                  value={formData.placa} 
                  onChange={e => setFormData({...formData, placa: e.target.value.toUpperCase()})} 
                  placeholder="ABC-1234"
                />
              </div>
              <Input 
                label="Modelo / Marca" 
                value={formData.modelo} 
                onChange={e => setFormData({...formData, modelo: e.target.value.toUpperCase()})} 
                placeholder="EX: TOYOTA HILUX"
              />
              <div>
                <label className="text-[10px] font-black uppercase text-slate-400 mb-2 block ml-1 tracking-widest">Configuração de Carroceria</label>
                <select 
                  value={formData.tipoCarroceria}
                  onChange={e => setFormData({...formData, tipoCarroceria: e.target.value})}
                  className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl p-4 text-sm font-black outline-none focus:border-amber-500 transition-all appearance-none"
                >
                  {LISTA_CARROCERIAS.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
              <button type="submit" className="w-full py-5 bg-slate-900 text-white rounded-[2rem] font-black uppercase text-xs shadow-xl shadow-slate-200 transition-all active:scale-95 flex items-center justify-center gap-3 hover:bg-amber-500 hover:text-slate-900">
                <Save size={18}/> {formData.isEditing ? 'Salvar Alterações' : 'Confirmar Cadastro'}
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
  <button onClick={onClick} className={`w-full flex items-center gap-3 p-4 rounded-2xl text-[10px] font-black uppercase transition-all ${active ? 'bg-amber-500 text-slate-900 shadow-xl shadow-amber-500/10' : 'text-slate-500 hover:bg-slate-900 hover:text-white'}`}>
    {icon} {label}
  </button>
);

const StatCard = ({ label, value, color }) => {
  const colors = { 
    blue: 'border-l-blue-600 text-blue-600 bg-blue-50/10', 
    amber: 'border-l-amber-500 text-amber-600 bg-amber-50/10', 
    red: 'border-l-red-500 text-red-600 bg-red-50/10' 
  };
  return (
    <div className={`bg-white p-8 rounded-[2.5rem] border-l-[10px] ${colors[color]} shadow-sm border border-slate-200/50`}>
      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{label}</p>
      <p className={`text-5xl font-black mt-2 tracking-tighter`}>{value}</p>
    </div>
  );
};

const Input = ({ label, ...props }) => (
  <div className="w-full">
    <label className="text-[10px] font-black uppercase text-slate-400 mb-2 block ml-1 tracking-widest">{label}</label>
    <input {...props} className={`w-full bg-slate-50 border-2 border-slate-100 rounded-2xl p-4 text-sm font-black outline-none focus:border-amber-500 transition-all ${props.disabled ? 'opacity-50 cursor-not-allowed bg-slate-100' : ''}`} />
  </div>
);

export default AdminDashboard;
