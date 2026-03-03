import React, { useState, useEffect } from 'react';
import { gasApi } from '../api/gasClient';
import { 
  Settings, Car, Wrench, Fuel, BarChart3, Plus, 
  AlertTriangle, Search, Filter, ArrowRight, Droplets, 
  History, X, AlertCircle, ArrowLeft, TrendingUp, PieChart, 
  ExternalLink, Timer, Activity, Users, Printer, Clock, 
  ShieldCheck, Map, CheckCircle2, Save, FileText, Menu, Edit2
} from 'lucide-react';

const AdminDashboard = ({ onBack }) => {
  // --- ESTADOS ---
  const [activeTab, setActiveTab] = useState('frota');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [viaturas, setViaturas] = useState([]);
  const [vistoriasPendentes, setVistoriasPendentes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedVtr, setSelectedVtr] = useState(null);
  const [qruAtivo, setQruAtivo] = useState(false);
  
  // Estados para Modais e Formulários
  const [isAddingVtr, setIsAddingVtr] = useState(false);
  const [isManutencaoOpen, setIsManutencaoOpen] = useState(false);
  
  // MUDANÇA 1 & 2: Adicionado 'tipoCarroceria' e preparado para edição
  const [formData, setFormData] = useState({
    id: '', 
    prefixo: '', placa: '', modelo: '', ano: '', cor: '', 
    dataEntrada: '', chassi: '', observacoes: '', tipoCarroceria: 'CAMBURÃO'
  });

  // --- CARGA DE DADOS ---
  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [resVtr, resPendentes] = await Promise.all([
        gasApi.getViaturas(),
        gasApi.doPost({ action: 'getVistoriasPendentes' })
      ]);

      if (resVtr.status === 'success') {
        setViaturas(resVtr.data.filter(v => v.Status !== "FORA DE SERVIÇO (BAIXA)"));
      }
      if (resPendentes.status === 'success') {
        setVistoriasPendentes(resPendentes.data);
      }
    } catch (error) {
      console.error("Erro na carga de dados:", error);
    } finally {
      setLoading(false);
    }
  };

  // --- LÓGICA DE NEGÓCIO ---
  const checkOil = (vtr) => {
    const kmAtual = parseInt(vtr.UltimoKM || 0);
    const kmTroca = parseInt(vtr.KM_UltimaTroca || 0);
    const rodado = kmAtual - kmTroca;
    const mediaDiaria = 150; 
    const kmRestante = 10000 - rodado;
    const diasRestantes = Math.max(0, Math.floor(kmRestante / mediaDiaria));

    if (rodado >= 9500) return { color: 'text-red-600', bg: 'bg-red-600', msg: 'CRÍTICO', level: 2, dias: diasRestantes };
    if (rodado >= 8000) return { color: 'text-amber-500', bg: 'bg-amber-500', msg: 'ATENÇÃO', level: 1, dias: diasRestantes };
    return { color: 'text-emerald-500', bg: 'bg-emerald-500', msg: 'OPERACIONAL', level: 0, dias: diasRestantes };
  };

  const handleAction = async (action, payload) => {
    let motivoFinal = payload.motivo || "";
    if (action === 'baixarViatura') {
      const confirmacao = window.prompt(`Deseja realmente BAIXAR a viatura ${payload.prefixo}? Digite o MOTIVO da baixa:`);
      if (!confirmacao) return;
      motivoFinal = confirmacao;
      payload.motivo = motivoFinal;
    }
    if (action !== 'baixarViatura' && !window.confirm(`Confirma operação de ${action} para ${payload.prefixo}?`)) return;
    
    setLoading(true);
    try {
      const res = await gasApi.doPost({ action, payload });
      if (res.status === 'success') {
        alert(res.message || "Operação realizada com sucesso!");
        loadData();
        setSelectedVtr(null);
        setIsManutencaoOpen(false);
      } else {
        alert("Erro: " + res.message);
      }
    } catch (err) {
      alert("Erro na rede ou servidor.");
    } finally {
      setLoading(false);
    }
  };

  // MUDANÇA: Lógica de Edição integrada no salvamento
  const handleSaveViatura = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      // Se houver prefixo original ou ID, entende-se como edição
      const action = formData.isEditing ? 'updateViatura' : 'addViatura';
      const res = await gasApi.doPost({ action, payload: formData });
      if (res.status === 'success') {
        alert(formData.isEditing ? "Viatura atualizada!" : "Viatura cadastrada!");
        setIsAddingVtr(false);
        setFormData({ prefixo: '', placa: '', modelo: '', ano: '', cor: '', dataEntrada: '', chassi: '', observacoes: '', tipoCarroceria: 'CAMBURÃO' });
        loadData();
      }
    } catch (err) {
      alert("Falha ao salvar viatura.");
    } finally {
      setLoading(false);
    }
  };

  // Função para abrir edição
  const handleEditClick = (v) => {
    setFormData({
      ...v,
      prefixo: v.Prefixo,
      placa: v.Placa,
      modelo: v.Modelo,
      chassi: v.Chassi,
      tipoCarroceria: v.TipoCarroceria || 'CAMBURÃO',
      isEditing: true
    });
    setIsAddingVtr(true);
  };

  const handlePrint = () => { window.print(); };

  // --- RENDERIZAÇÃO ---
  return (
    <div className="min-h-screen bg-slate-50 flex font-sans print:bg-white text-slate-900 relative">
      
      {/* SIDEBAR */}
      <aside className={`
        fixed inset-y-0 left-0 z-[200] w-64 bg-slate-900 text-white flex flex-col shadow-2xl transition-transform duration-300
        md:relative md:translate-x-0 ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}
      `}>
        <div className="p-6 border-b border-slate-800 text-center relative">
          <h1 className="font-black text-xl tracking-tighter uppercase italic select-none">
            Painel <span className="text-amber-500">CMDO</span>
          </h1>
          <p 
            onClick={() => setQruAtivo(!qruAtivo)} 
            className={`text-[9px] font-bold tracking-widest uppercase cursor-pointer select-none transition-all duration-500 hover:text-amber-500 ${
              qruAtivo ? 'text-amber-400 scale-110' : 'text-slate-500'
            }`}
          >
            {qruAtivo ? "⚡ FORÇA E HONRA ⚡" : "1º BPM - Porto Velho"}
          </p>
          <button onClick={() => setIsSidebarOpen(false)} className="md:hidden absolute right-4 top-6 text-slate-500"><X size={20}/></button>
        </div>

        <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
          <button onClick={onBack} className="w-full flex items-center gap-3 p-3 rounded-xl text-[10px] font-black uppercase text-blue-400 hover:bg-slate-800 mb-4 border border-blue-900/30 transition-all">
            <ArrowLeft size={16}/> Sair do Sistema
          </button>
          <MenuBtn active={activeTab==='frota'} onClick={()=>{setActiveTab('frota'); setIsSidebarOpen(false)}} icon={<ShieldCheck size={18}/>} label="Prontidão da Frota" />
          <MenuBtn active={activeTab==='admin'} onClick={()=>{setActiveTab('admin'); setIsSidebarOpen(false)}} icon={<Settings size={18}/>} label="Gestão de Frota" />
          <MenuBtn active={activeTab==='auditoria'} onClick={()=>{setActiveTab('auditoria'); setIsSidebarOpen(false)}} icon={<Activity size={18}/>} label="Auditoria de Pátio" />
        </nav>
      </aside>

      {isSidebarOpen && <div onClick={() => setIsSidebarOpen(false)} className="fixed inset-0 bg-black/50 z-[190] md:hidden" />}

      <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
        
        {/* HEADER */}
        <header className="bg-white h-16 border-b border-slate-200 flex items-center justify-between px-4 md:px-8 shrink-0 print:hidden">
          <button onClick={() => setIsSidebarOpen(true)} className="md:hidden p-2 bg-slate-100 rounded-lg mr-2">
            <Menu size={20} className="text-slate-600" />
          </button>
          
          <div className="flex-1 flex items-center gap-3 bg-slate-100 px-3 py-2 rounded-xl border border-slate-200 focus-within:border-blue-400 transition-all max-w-md">
            {qruAtivo ? (
              <ShieldCheck size={14} className="text-amber-600 animate-pulse shrink-0" />
            ) : (
              <Search size={14} className="text-slate-400 shrink-0" />
            )}
            <input 
              type="text" 
              placeholder={qruAtivo ? "CONSULTAR QRU..." : "Buscar por prefixo..."} 
              className={`bg-transparent border-none outline-none text-[11px] font-bold w-full uppercase transition-colors ${
                qruAtivo ? 'placeholder:text-amber-500/50 text-amber-700' : 'placeholder:text-slate-400'
              }`} 
              onChange={(e) => setSearchTerm(e.target.value)} 
            />
          </div>
          
          <div className="ml-2">
             <button onClick={handlePrint} className="p-2 md:px-4 md:py-2 bg-slate-900 text-white rounded-lg text-[10px] font-black uppercase flex items-center gap-2">
               <Printer size={16}/><span className="hidden md:inline">Imprimir</span>
             </button>
          </div>
        </header>

        <section className="p-3 md:p-8 overflow-y-auto">
          
          {/* ABA: PRONTIDÃO */}
          {activeTab === 'frota' && (
            <div className="space-y-4 animate-in fade-in duration-500">
               <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
                <StatCard label="Efetivo" value={viaturas.length} color="blue" />
                <StatCard label="Em Serviço" value={viaturas.filter(v => v.Status === 'EM SERVIÇO').length} color="emerald" />
                <StatCard label="Manutenção" value={viaturas.filter(v => v.Status === 'MANUTENÇÃO').length} color="red" />
                <StatCard label="Óleo/Atenção" value={viaturas.filter(v => checkOil(v).level > 0).length} color="amber" />
              </div>

              <div className="bg-white rounded-2xl md:rounded-[2rem] shadow-sm border border-slate-200 overflow-hidden">
                <div className="hidden md:block">
                  <table className="w-full text-left">
                    <thead className="bg-slate-50 border-b border-slate-200 text-[10px] font-black uppercase text-slate-400">
                      <tr>
                        <th className="p-4">Unidade</th>
                        <th className="p-4">Status</th>
                        <th className="p-4">Óleo</th>
                        <th className="p-4 text-right">Ver Detalhes</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {viaturas.filter(v => v.Prefixo?.includes(searchTerm.toUpperCase())).map((v, i) => (
                        <tr key={i} className="hover:bg-slate-50 transition-all cursor-pointer" onClick={() => setSelectedVtr(v)}>
                          <td className="p-4 font-black text-slate-800">{v.Prefixo}</td>
                          <td className="p-4">
                            <span className={`text-[9px] font-black px-2 py-1 rounded-md uppercase ${v.Status === 'EM SERVIÇO' ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>
                              {v.Status}
                            </span>
                          </td>
                          <td className="p-4 font-bold text-[10px]">{checkOil(v).msg}</td>
                          <td className="p-4 text-right"><ArrowRight size={16} className="ml-auto text-slate-300"/></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="md:hidden divide-y divide-slate-100">
                  {viaturas.filter(v => v.Prefixo?.includes(searchTerm.toUpperCase())).map((v, i) => (
                    <div key={i} onClick={() => setSelectedVtr(v)} className="p-4 flex justify-between items-center active:bg-slate-50">
                      <div className="flex flex-col">
                        <span className="font-black text-slate-900">{v.Prefixo}</span>
                        <span className="text-[10px] font-bold text-slate-400 uppercase">{v.Modelo}</span>
                      </div>
                      <div className="flex flex-col items-end gap-1">
                        <span className={`text-[8px] font-black px-2 py-0.5 rounded uppercase ${v.Status === 'EM SERVIÇO' ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>
                          {v.Status}
                        </span>
                        <span className={`text-[9px] font-bold ${checkOil(v).color}`}>{checkOil(v).msg}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* ABA: GESTÃO DE FROTA */}
          {activeTab === 'admin' && (
            <div className="space-y-6 animate-in slide-in-from-right duration-500">
              <div className="flex justify-between items-center">
                <h2 className="text-xl md:text-2xl font-black uppercase italic leading-tight">Gestão de Ativos</h2>
                <button onClick={() => {
                  setFormData({ prefixo: '', placa: '', modelo: '', ano: '', cor: '', dataEntrada: '', chassi: '', observacoes: '', tipoCarroceria: 'CAMBURÃO' });
                  setIsAddingVtr(true);
                }} className="p-3 md:px-6 md:py-4 bg-blue-600 text-white rounded-xl md:rounded-2xl text-[10px] font-black uppercase flex items-center gap-2 shadow-lg">
                  <Plus size={18}/> <span className="hidden md:inline">Adicionar</span>
                </button>
              </div>

              <div className="bg-white rounded-2xl md:rounded-[2.5rem] shadow-sm border border-slate-200 overflow-hidden overflow-x-auto">
                <table className="w-full text-left min-w-[600px]">
                  <thead className="bg-slate-900 text-[9px] font-black uppercase text-slate-400">
                    <tr>
                      <th className="p-5">Prefixo</th>
                      <th className="p-5">Placa</th>
                      <th className="p-5">Modelo / Tipo</th>
                      <th className="p-5">Chassi</th>
                      <th className="p-5 text-center">Ações</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-[11px] font-bold text-slate-600">
                    {viaturas.map((v, i) => (
                      <tr key={i} className="hover:bg-blue-50/50">
                        <td className="p-5 text-slate-900 font-black">{v.Prefixo}</td>
                        <td className="p-5">{v.Placa || '---'}</td>
                        <td className="p-5">
                          <div className="flex flex-col">
                            <span>{v.Modelo}</span>
                            <span className="text-[8px] text-slate-400">{v.TipoCarroceria}</span>
                          </div>
                        </td>
                        <td className="p-5 font-mono text-[9px]">{v.Chassi || '---'}</td>
                        <td className="p-5">
                          <div className="flex justify-center gap-2">
                            {/* BOTÃO EDITAR ADICIONADO */}
                            <button onClick={() => handleEditClick(v)} className="p-2 bg-amber-50 text-amber-600 rounded-lg hover:bg-amber-100 transition-colors" title="Editar Viatura">
                              <Edit2 size={16}/>
                            </button>
                            <button onClick={() => { setSelectedVtr(v); setIsManutencaoOpen(true); }} className="p-2 bg-blue-50 text-blue-600 rounded-lg" title="Manutenção"><FileText size={16}/></button>
                            <button onClick={() => handleAction('baixarViatura', { prefixo: v.Prefixo })} className="p-2 bg-red-50 text-red-600 rounded-lg" title="Dar Baixa"><X size={16}/></button>
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

      {/* MODAL: ADICIONAR/EDITAR VIATURA */}
      {isAddingVtr && (
        <div className="fixed inset-0 bg-slate-900/90 backdrop-blur-sm z-[250] flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-2xl rounded-[2rem] md:rounded-[3rem] shadow-2xl overflow-hidden animate-in zoom-in-95">
            <div className="p-6 bg-slate-900 text-white flex justify-between items-center">
              <h2 className="font-black italic uppercase">{formData.isEditing ? 'Editar Viatura' : 'Cadastrar Viatura'}</h2>
              <button onClick={() => setIsAddingVtr(false)}><X/></button>
            </div>
            <form onSubmit={handleSaveViatura} className="p-6 md:p-10 grid grid-cols-2 gap-4 md:gap-6 max-h-[80vh] overflow-y-auto">
              <Input label="Prefixo" value={formData.prefixo} onChange={e => setFormData({...formData, prefixo: e.target.value.toUpperCase()})} required disabled={formData.isEditing} />
              <Input label="Placa" value={formData.placa} onChange={e => setFormData({...formData, placa: e.target.value.toUpperCase()})} />
              
              {/* CAMPO MODELO */}
              <div className="col-span-2 md:col-span-1">
                <Input label="Modelo" value={formData.modelo} onChange={e => setFormData({...formData, modelo: e.target.value})} />
              </div>

              {/* CAMPO TIPO DE CARROCERIA */}
              <div className="col-span-2 md:col-span-1">
                <label className="text-[9px] font-black uppercase text-slate-400 mb-1 block ml-1">Tipo de Carroceria</label>
                <select 
                  value={formData.tipoCarroceria}
                  onChange={e => setFormData({...formData, tipoCarroceria: e.target.value})}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-sm font-bold outline-none focus:border-blue-500"
                >
                  <option value="CAMBURÃO">CAMBURÃO</option>
                  <option value="CARROCERIA ABERTA">CARROCERIA ABERTA</option>
                  <option value="OSTENSIVA COMUM">OSTENSIVA COMUM</option>
                  <option value="ADMINISTRATIVA">ADMINISTRATIVA</option>
                  <option value="OUTROS">OUTROS</option>
                </select>
              </div>

              <div className="col-span-2"><Input label="Chassi" value={formData.chassi} onChange={e => setFormData({...formData, chassi: e.target.value.toUpperCase()})} /></div>
              
              <button type="submit" className="col-span-2 py-4 bg-blue-600 text-white rounded-2xl font-black uppercase text-xs shadow-xl">
                <Save size={18} className="inline mr-2"/> {formData.isEditing ? 'Salvar Alterações' : 'Salvar no Acervo'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: REGISTRO DE MANUTENÇÃO */}
      {isManutencaoOpen && selectedVtr && (
        <div className="fixed inset-0 bg-slate-900/90 backdrop-blur-sm z-[250] flex items-center justify-center p-4">
           <div className="bg-white w-full max-w-md rounded-[2.5rem] shadow-2xl overflow-hidden">
              <div className="p-6 bg-blue-600 text-white flex justify-between items-center">
                 <h2 className="text-lg font-black uppercase italic">Manutenção: {selectedVtr.Prefixo}</h2>
                 <button onClick={() => setIsManutencaoOpen(false)}><X/></button>
              </div>
              <div className="p-8 space-y-3">
                 <button onClick={() => handleAction('registrarManutencao', { prefixo: selectedVtr.Prefixo, tipo: 'ÓLEO', km: selectedVtr.UltimoKM })} className="w-full p-4 bg-slate-100 rounded-2xl font-black uppercase text-[10px] flex items-center gap-3 hover:bg-blue-50 transition-all">
                    <Droplets className="text-blue-500"/> Troca de Óleo e Filtro
                 </button>
                 <button onClick={() => handleAction('registrarManutencao', { prefixo: selectedVtr.Prefixo, tipo: 'FREIOS', km: selectedVtr.UltimoKM })} className="w-full p-4 bg-slate-100 rounded-2xl font-black uppercase text-[10px] flex items-center gap-3 hover:bg-blue-50 transition-all">
                    <Wrench className="text-amber-500"/> Revisão de Freios
                 </button>
                 <button onClick={() => handleAction('registrarManutencao', { prefixo: selectedVtr.Prefixo, tipo: 'PNEUS', km: selectedVtr.UltimoKM })} className="w-full p-4 bg-slate-100 rounded-2xl font-black uppercase text-[10px] flex items-center gap-3 hover:bg-blue-50 transition-all">
                    <Wrench className="text-slate-500"/> Troca de Pneus
                 </button>
              </div>
           </div>
        </div>
      )}

      {/* MODAL: DETALHES (LATERAL) */}
      {selectedVtr && !isManutencaoOpen && (
        <VtrDetailsModal vtr={selectedVtr} onClose={() => setSelectedVtr(null)} checkOil={checkOil} onAction={handleAction} />
      )}
    </div>
  );
};

// --- COMPONENTES AUXILIARES ---
const Input = ({ label, ...props }) => (
  <div>
    <label className="text-[9px] font-black uppercase text-slate-400 mb-1 block ml-1">{label}</label>
    <input {...props} className={`w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-sm font-bold outline-none focus:border-blue-500 ${props.disabled ? 'opacity-50' : ''}`} />
  </div>
);

const MenuBtn = ({ active, onClick, icon, label }) => (
  <button onClick={onClick} className={`w-full flex items-center gap-3 p-4 rounded-2xl text-[10px] font-black uppercase transition-all ${active ? 'bg-amber-500 text-slate-900 shadow-xl' : 'text-slate-500 hover:bg-slate-800'}`}>
    {icon} {label}
  </button>
);

const StatCard = ({ label, value, color }) => {
  const colors = { 
    blue: 'border-l-blue-500 text-blue-600', 
    emerald: 'border-l-emerald-500 text-emerald-600', 
    red: 'border-l-red-500 text-red-600', 
    amber: 'border-l-amber-500 text-amber-600' 
  };
  return (
    <div className={`bg-white p-4 md:p-6 rounded-2xl md:rounded-[2rem] border-l-4 md:border-l-8 ${colors[color].split(' ')[0]} shadow-sm`}>
      <p className="text-[8px] md:text-[10px] font-black text-slate-400 uppercase">{label}</p>
      <p className={`text-xl md:text-3xl font-black mt-1 ${colors[color].split(' ')[1]}`}>{value}</p>
    </div>
  );
};

const VtrDetailsModal = ({ vtr, onClose, checkOil, onAction }) => {
  const oilInfo = checkOil(vtr);
  return (
    <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-md z-[200] flex justify-end">
      <div className="w-full max-w-lg bg-white h-full shadow-2xl p-6 md:p-10 animate-in slide-in-from-right duration-500 overflow-y-auto">
        <div className="flex justify-between items-center mb-8">
          <h2 className="text-3xl font-black italic uppercase">{vtr.Prefixo}</h2>
          <button onClick={onClose} className="p-2 bg-slate-100 rounded-full"><X/></button>
        </div>
        <div className="space-y-4">
          <div className="p-5 bg-slate-50 rounded-2xl border border-slate-100">
            <p className="text-[10px] font-black text-slate-400 uppercase">Status do Motor</p>
            <div className={`text-xl font-black ${oilInfo.color}`}>{oilInfo.msg}</div>
            <p className="text-[11px] font-bold text-slate-500 mt-1">KM Rodado: {(parseInt(vtr.UltimoKM) || 0) - (parseInt(vtr.KM_UltimaTroca) || 0)} km</p>
          </div>
          <div className="grid grid-cols-2 gap-3">
             <div className="p-4 bg-slate-50 rounded-xl">
                <span className="text-[9px] font-black text-slate-400 uppercase">Placa</span>
                <p className="font-bold">{vtr.Placa || 'S/P'}</p>
             </div>
             <div className="p-4 bg-slate-50 rounded-xl">
                <span className="text-[9px] font-black text-slate-400 uppercase">Modelo</span>
                <p className="font-bold">{vtr.Modelo}</p>
             </div>
             {/* NOVO: Exibição da carroceria no detalhe */}
             <div className="p-4 bg-slate-50 rounded-xl col-span-2">
                <span className="text-[9px] font-black text-slate-400 uppercase">Tipo de Carroceria</span>
                <p className="font-bold">{vtr.TipoCarroceria || 'NÃO INFORMADO'}</p>
             </div>
          </div>
          <button onClick={() => onAction('baixarViatura', { prefixo: vtr.Prefixo })} className="w-full py-5 bg-red-600 text-white rounded-2xl font-black uppercase text-xs hover:bg-red-700 transition-all mt-6">
            Baixar Viatura (Retirar de Serviço)
          </button>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;
