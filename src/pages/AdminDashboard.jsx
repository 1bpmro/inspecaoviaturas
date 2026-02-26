import React, { useState, useEffect } from 'react';
import { gasApi } from '../api/gasClient';
import { 
  Settings, Car, Wrench, Fuel, BarChart3, Plus, 
  AlertTriangle, Search, Filter, ArrowRight, Droplets, 
  History, X, AlertCircle, ArrowLeft 
} from 'lucide-react';

const AdminDashboard = ({ onBack }) => {
  const [activeTab, setActiveTab] = useState('frota');
  const [viaturas, setViaturas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedVtr, setSelectedVtr] = useState(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const res = await gasApi.getViaturas();
      if (res.status === 'success') {
        setViaturas(res.data.filter(v => v.Status !== "FORA DE SERVIÇO (BAIXA)"));
      }
    } catch (error) {
      console.error("Erro ao carregar frota:", error);
    } finally {
      setLoading(false);
    }
  };

  const checkOil = (vtr) => {
    const kmAtual = parseInt(vtr.UltimoKM || 0);
    const kmTroca = parseInt(vtr.KM_UltimaTroca || 0);
    const rodado = kmAtual - kmTroca;
    if (rodado >= 9500) return { color: 'text-red-600', bg: 'bg-red-600', msg: 'TROCA IMEDIATA', level: 2 };
    if (rodado >= 8000) return { color: 'text-amber-500', bg: 'bg-amber-500', msg: 'PRÓXIMO', level: 1 };
    return { color: 'text-emerald-500', bg: 'bg-emerald-500', msg: 'OK', level: 0 };
  };

  const handleAction = async (action, payload) => {
    if (!window.confirm(`Confirma esta operação?`)) return;
    
    setLoading(true);
    try {
      const res = await gasApi.doPost({ action, payload }); 
      if (res.status === 'success') {
        alert("Operação realizada com sucesso!");
        setSelectedVtr(null);
        loadData();
      } else {
        alert("Erro: " + res.message);
      }
    } catch (err) {
      alert("Erro de conexão com o servidor.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex font-sans">
      <aside className="w-64 bg-slate-900 text-white flex flex-col shadow-2xl shrink-0">
        <div className="p-6 border-b border-slate-800 text-center">
          <h1 className="font-black text-xl tracking-tighter uppercase italic">Painel <span className="text-amber-500">CMDO</span></h1>
          <p className="text-[9px] font-bold text-slate-500 tracking-widest uppercase">1º BPM - Porto Velho</p>
        </div>

        <nav className="flex-1 p-4 space-y-2">
          <button 
            onClick={onBack}
            className="w-full flex items-center gap-3 p-3 rounded-xl text-[11px] font-black uppercase transition-all text-blue-400 hover:bg-slate-800 mb-6 border border-blue-900/30"
          >
            <ArrowLeft size={18}/> Início (Sair)
          </button>

          <MenuBtn active={activeTab==='frota'} onClick={()=>setActiveTab('frota')} icon={<Car size={18}/>} label="Gestão de Frota" />
          <MenuBtn active={activeTab==='manutencao'} onClick={()=>setActiveTab('manutencao')} icon={<Wrench size={18}/>} label="Manutenção / Óleo" />
          <MenuBtn active={activeTab==='stats'} onClick={()=>setActiveTab('stats')} icon={<BarChart3 size={18}/>} label="Indisponibilidade" />
        </nav>
      </aside>

      <main className="flex-1 flex flex-col overflow-hidden">
        <header className="bg-white h-16 border-b border-slate-200 flex items-center justify-between px-8 shrink-0">
          <div className="flex items-center gap-4 bg-slate-100 px-4 py-2 rounded-xl w-96">
            <Search size={16} className="text-slate-400" />
            <input 
              type="text" 
              placeholder="Buscar prefixo ou placa..." 
              className="bg-transparent border-none outline-none text-xs font-bold w-full"
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          {loading && <div className="text-[10px] font-black text-amber-600 animate-pulse">SINCRONIZANDO...</div>}
        </header>

        <section className="p-8 overflow-y-auto">
          {activeTab === 'frota' ? (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <StatCard label="Total Frota" value={viaturas.length} color="blue" />
                <StatCard label="Em Serviço" value={viaturas.filter(v => v.Status === 'EM SERVIÇO').length} color="emerald" />
                <StatCard label="Manutenção" value={viaturas.filter(v => v.Status === 'MANUTENÇÃO').length} color="red" />
                <StatCard label="Alerta Óleo" value={viaturas.filter(v => checkOil(v).level > 0).length} color="amber" />
              </div>

              <div className="bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden">
                <table className="w-full text-left">
                  <thead className="bg-slate-50 border-b border-slate-200 text-[10px] font-black uppercase text-slate-400">
                    <tr>
                      <th className="p-4">Viatura</th>
                      <th className="p-4">Status</th>
                      <th className="p-4">KM Atual</th>
                      <th className="p-4">Óleo</th>
                      <th className="p-4 text-right">Ações</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {viaturas.filter(v => v.Prefixo?.includes(searchTerm.toUpperCase())).map((v, i) => {
                      const oil = checkOil(v);
                      return (
                        <tr key={i} className="hover:bg-slate-50 transition-all cursor-pointer group">
                          <td className="p-4" onClick={() => setSelectedVtr(v)}>
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 bg-slate-900 text-white rounded-lg flex items-center justify-center font-black">{v.Prefixo?.slice(-2)}</div>
                              <div>
                                <p className="font-black text-slate-800">{v.Prefixo}</p>
                                <p className="text-[10px] text-slate-400 font-bold">{v.Placa}</p>
                              </div>
                            </div>
                          </td>
                          <td className="p-4">
                            <span className={`text-[9px] font-black px-2 py-1 rounded-md uppercase ${
                              v.Status === 'EM SERVIÇO' ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'
                            }`}>{v.Status}</span>
                          </td>
                          <td className="p-4 font-mono font-bold text-slate-600">{v.UltimoKM} KM</td>
                          <td className="p-4">
                            <div className="flex items-center gap-2">
                              <Droplets size={14} className={oil.color} />
                              <span className={`text-xs font-black ${oil.color}`}>{oil.msg}</span>
                            </div>
                          </td>
                          <td className="p-4 text-right">
                             <button onClick={() => setSelectedVtr(v)} className="p-2 hover:bg-slate-900 hover:text-white rounded-lg text-slate-400 transition-all">
                                <History size={18} />
                             </button>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-64 text-slate-400 opacity-50">
              <Settings size={48} className="animate-spin duration-[10000ms]" />
              <p className="mt-4 font-black uppercase text-xs tracking-widest">Módulo em Desenvolvimento</p>
            </div>
          )}
        </section>
      </main>

      {selectedVtr && (
        <VtrDetailsModal vtr={selectedVtr} onClose={() => setSelectedVtr(null)} checkOil={checkOil} onAction={handleAction} />
      )}
    </div>
  );
};

const VtrDetailsModal = ({ vtr, onClose, checkOil, onAction }) => {
  const oilInfo = checkOil(vtr);
  const kmRodado = vtr.UltimoKM - (vtr.KM_UltimaTroca || 0);
  const percentual = Math.max(0, 100 - (kmRodado / 10000) * 100);

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[100] flex justify-end">
      <div className="w-full max-w-xl bg-white h-full shadow-2xl p-8 overflow-y-auto animate-in slide-in-from-right duration-300">
        <div className="flex justify-between items-center mb-10">
          <div>
            <h2 className="text-3xl font-black text-slate-900 italic uppercase">{vtr.Prefixo}</h2>
            <p className="text-xs font-bold text-slate-400 uppercase">Dossiê de Manutenção</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-full"><X/></button>
        </div>

        <div className="grid grid-cols-2 gap-4 mb-10">
          <div className="bg-slate-50 p-5 rounded-3xl border border-slate-100">
            <p className="text-[10px] font-black text-slate-400 uppercase mb-4 flex items-center gap-2"><Droplets size={14}/> Vida Útil do Óleo</p>
            <p className="text-2xl font-black text-slate-800">{Math.max(0, 10000 - kmRodado)} <span className="text-xs">KM RESTANTES</span></p>
            <div className="w-full bg-slate-200 h-2 rounded-full mt-3 overflow-hidden">
              <div className={`h-full rounded-full transition-all duration-1000 ${oilInfo.bg}`} style={{ width: `${percentual}%` }} />
            </div>
          </div>
          <div className="bg-slate-50 p-5 rounded-3xl border border-slate-100">
            <p className="text-[10px] font-black text-slate-400 uppercase mb-4 flex items-center gap-2"><AlertCircle size={14}/> Status Patrimonial</p>
            <p className="text-lg font-black text-slate-800 uppercase leading-none">{vtr.Status}</p>
            <p className="text-[10px] text-slate-400 font-bold mt-2 font-mono">ÚLTIMO KM: {vtr.UltimoKM}</p>
          </div>
        </div>

        <div className="space-y-4">
          <h3 className="text-xs font-black uppercase text-slate-400 tracking-widest border-b pb-2">Ações Administrativas</h3>
          <button 
            onClick={() => onAction('registrarManutencao', { prefixo: vtr.Prefixo, tipo: 'TROCA_OLEO', km: vtr.UltimoKM, responsavel_re: 'ADMIN' })}
            className="w-full py-5 bg-amber-500 text-slate-900 rounded-2xl font-black uppercase text-xs hover:bg-amber-600 active:scale-95 transition-all flex items-center justify-center gap-2"
          >
            <Droplets size={16}/> Confirmar Troca de Óleo
          </button>
          <button 
            onClick={() => onAction('baixarViatura', { prefixo: vtr.Prefixo, motivo: 'Baixa solicitada via Painel Administrativo' })}
            className="w-full py-5 bg-slate-100 text-red-600 rounded-2xl font-black uppercase text-xs hover:bg-red-50 active:scale-95 transition-all flex items-center justify-center gap-2"
          >
            <AlertTriangle size={16}/> Retirar da Frota (Baixa)
          </button>
        </div>
      </div>
    </div>
  );
};

const MenuBtn = ({ active, onClick, icon, label }) => (
  <button onClick={onClick} className={`w-full flex items-center gap-3 p-3 rounded-xl text-[11px] font-black uppercase transition-all ${active ? 'bg-amber-500 text-slate-900 shadow-lg' : 'text-slate-500 hover:bg-slate-800'}`}>
    {icon} {label}
  </button>
);

const StatCard = ({ label, value, color }) => {
  const borderColors = { blue: 'border-l-blue-500', emerald: 'border-l-emerald-500', red: 'border-l-red-500', amber: 'border-l-amber-500' };
  return (
    <div className={`bg-white p-6 rounded-3xl border-l-4 ${borderColors[color]} shadow-sm`}>
      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{label}</p>
      <p className="text-3xl font-black text-slate-900 mt-1">{value}</p>
    </div>
  );
};

export default AdminDashboard;
