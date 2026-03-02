import React, { useState, useEffect } from 'react';
import { gasApi } from '../api/gasClient';
 
import { 
  Settings, Car, Wrench, Fuel, BarChart3, Plus, 
  AlertTriangle, Search, Filter, ArrowRight, Droplets, 
  History, X, AlertCircle, ArrowLeft, TrendingUp, PieChart, ExternalLink, Timer, 
  Activity, Users, Printer, Clock, ShieldCheck, Map, CheckCircle2, Save, FileText 
} from 'lucide-react';

const AdminDashboard = ({ onBack }) => {
  const [activeTab, setActiveTab] = useState('frota');
  const [viaturas, setViaturas] = useState([]);
  const [auditoria, setAuditoria] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedVtr, setSelectedVtr] = useState(null);
  const [vistoriasPendentes, setVistoriasPendentes] = useState([]); 
  
  // Estados para Gestão Administrativa
  const [isAddingVtr, setIsAddingVtr] = useState(false);
  const [isManutencaoOpen, setIsManutencaoOpen] = useState(false); // Novo Estado
  const [formData, setFormData] = useState({
    prefixo: '', placa: '', modelo: '', ano: '', cor: '', dataEntrada: '', chassi: '', observacoes: ''
  });

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [resVtr, resAuditoria, resPendentes] = await Promise.all([
        gasApi.getViaturas(),
        gasApi.getRelatorioGarageiros ? gasApi.getRelatorioGarageiros() : { status: 'success', data: [] },
        gasApi.doPost({ action: 'getVistoriasPendentes' })
      ]);

      if (resVtr.status === 'success') {
        // Filtra apenas as que não estão baixadas
        setViaturas(resVtr.data.filter(v => v.Status !== "FORA DE SERVIÇO (BAIXA)"));
      }
      if (resAuditoria.status === 'success') {
        setAuditoria(resAuditoria.data);
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

  const handleSaveViatura = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await gasApi.doPost({ action: 'addViatura', payload: formData });
      if (res.status === 'success') {
        alert("Viatura cadastrada com sucesso no acervo!");
        setIsAddingVtr(false);
        setFormData({ prefixo: '', placa: '', modelo: '', ano: '', cor: '', dataEntrada: '', chassi: '', observacoes: '' });
        loadData();
      }
    } catch (err) {
      alert("Falha ao comunicar com o servidor.");
    } finally {
      setLoading(false);
    }
  };

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

  const handlePrint = () => { window.print(); };

  // FUNÇÃO DE AÇÃO MELHORADA PARA TRATAR BAIXA E MANUTENÇÃO
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
        alert(res.message || "Operação realizada!");
        loadData(); 
        setSelectedVtr(null);
        setIsManutencaoOpen(false);
      } else {
        alert("Erro: " + res.message);
      }
    } catch (err) { 
      alert("Erro na rede."); 
    } finally { 
      setLoading(false); 
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex font-sans print:bg-white text-slate-900">
      
      {/* SIDEBAR */}
      <aside className="w-64 bg-slate-900 text-white flex flex-col shadow-2xl shrink-0 print:hidden">
        <div className="p-6 border-b border-slate-800 text-center">
          <h1 className="font-black text-xl tracking-tighter uppercase italic">Painel <span className="text-amber-500">CMDO</span></h1>
          <p className="text-[9px] font-bold text-slate-500 tracking-widest uppercase">1º BPM - Porto Velho</p>
        </div>

        <nav className="flex-1 p-4 space-y-1">
          <button onClick={onBack} className="w-full flex items-center gap-3 p-3 rounded-xl text-[10px] font-black uppercase text-blue-400 hover:bg-slate-800 mb-4 border border-blue-900/30 transition-all">
            <ArrowLeft size={16}/> Sair do Sistema
          </button>
          
          <MenuBtn active={activeTab==='frota'} onClick={()=>setActiveTab('frota')} icon={<ShieldCheck size={18}/>} label="Prontidão da Frota" />
          <MenuBtn active={activeTab==='admin'} onClick={()=>setActiveTab('admin')} icon={<Settings size={18}/>} label="Gestão de Frota" />
          <MenuBtn active={activeTab==='auditoria'} onClick={()=>setActiveTab('auditoria')} icon={<Activity size={18}/>} label="Auditoria de Pátio" />
          <MenuBtn active={activeTab==='manutencao'} onClick={()=>setActiveTab('manutencao')} icon={<Wrench size={18}/>} label="Escala de Manutenção" />
          <MenuBtn active={activeTab==='stats'} onClick={()=>setActiveTab('stats')} icon={<AlertTriangle size={18}/>} label="Indisponibilidade" />
          <MenuBtn active={activeTab==='analytics'} onClick={()=>setActiveTab('analytics')} icon={<TrendingUp size={18}/>} label="Análise de Dados" />
        </nav>

        <div className="p-4 bg-slate-950/50">
           <div className="flex items-center gap-2 text-[8px] font-bold text-slate-500 uppercase mb-2">
              <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div> Servidor Ativo
           </div>
        </div>
      </aside>

      <main className="flex-1 flex flex-col overflow-hidden">
        
        {/* HEADER */}
        <header className="bg-white h-16 border-b border-slate-200 flex items-center justify-between px-8 shrink-0 print:hidden">
          <div className="flex items-center gap-4 bg-slate-100 px-4 py-2 rounded-xl w-96 border border-slate-200 focus-within:border-blue-400 transition-all">
            <Search size={16} className="text-slate-400" />
            <input 
              type="text" 
              placeholder="Prefixo, Placa ou Setor..." 
              className="bg-transparent border-none outline-none text-xs font-bold w-full" 
              onChange={(e) => setSearchTerm(e.target.value)} 
            />
          </div>
          <div className="flex items-center gap-4">
            <button onClick={handlePrint} className="flex items-center gap-2 px-4 py-2 bg-slate-900 text-white rounded-lg text-[10px] font-black uppercase hover:bg-slate-800 transition-all active:scale-95 shadow-lg shadow-slate-200">
              <Printer size={16}/> Imprimir Relatório
            </button>
          </div>
        </header>

        <section className="p-8 overflow-y-auto">
          
          <div className="hidden print:block text-center mb-8 border-b-2 border-black pb-4">
            <h1 className="text-2xl font-bold uppercase">Polícia Militar de Rondônia - 1º BPM</h1>
            <h2 className="text-lg font-bold uppercase text-slate-700">Relatório Estratégico - {new Date().toLocaleDateString()}</h2>
          </div>

          {/* ABA: PRONTIDÃO */}
          {activeTab === 'frota' && (
            <div className="space-y-6 animate-in fade-in duration-500">
               <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <StatCard label="Efetivo Total" value={viaturas.length} color="blue" />
                <StatCard label="Em Patrulhamento" value={viaturas.filter(v => v.Status === 'EM SERVIÇO').length} color="emerald" />
                <StatCard label="Fora de Combate" value={viaturas.filter(v => v.Status === 'MANUTENÇÃO').length} color="red" />
                <StatCard label="Previsão Baixa" value={viaturas.filter(v => checkOil(v).level > 0).length} color="amber" />
              </div>

              <div className="bg-white rounded-[2rem] shadow-sm border border-slate-200 overflow-hidden">
                <table className="w-full text-left">
                  <thead className="bg-slate-50 border-b border-slate-200 text-[10px] font-black uppercase text-slate-400">
                    <tr>
                      <th className="p-4">Unidade</th>
                      <th className="p-4">Status</th>
                      <th className="p-4">Óleo</th>
                      <th className="p-4 text-right">Ações</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {viaturas.filter(v => v.Prefixo?.includes(searchTerm.toUpperCase())).map((v, i) => (
                      <tr key={i} className="hover:bg-slate-50 transition-all cursor-pointer" onClick={() => setSelectedVtr(v)}>
                        <td className="p-4 font-black text-slate-800">{v.Prefixo}</td>
                        <td className="p-4"><span className={`text-[9px] font-black px-2 py-1 rounded-md uppercase ${v.Status === 'EM SERVIÇO' ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>{v.Status}</span></td>
                        <td className="p-4 font-bold text-[10px]">{checkOil(v).msg}</td>
                        <td className="p-4 text-right"><ArrowRight size={16} className="ml-auto text-slate-300"/></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ABA: GESTÃO DE FROTA (COM BOTÕES ATIVADOS) */}
          {activeTab === 'admin' && (
            <div className="space-y-6 animate-in slide-in-from-right duration-500">
              <div className="flex justify-between items-center">
                <div>
                  <h2 className="text-2xl font-black uppercase italic">Controle de Ativos</h2>
                  <p className="text-xs font-bold text-slate-400 uppercase">Planilha Geral de Cadastro e Chassi</p>
                </div>
                <button 
                  onClick={() => setIsAddingVtr(true)}
                  className="flex items-center gap-2 px-6 py-4 bg-blue-600 text-white rounded-2xl text-[10px] font-black uppercase hover:bg-blue-700 transition-all shadow-xl shadow-blue-200 active:scale-95"
                >
                  <Plus size={18}/> Adicionar Viatura
                </button>
              </div>

              <div className="bg-white rounded-[2.5rem] shadow-sm border border-slate-200 overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left">
                    <thead className="bg-slate-900 text-[9px] font-black uppercase text-slate-400">
                      <tr>
                        <th className="p-5">Prefixo</th>
                        <th className="p-5">Placa</th>
                        <th className="p-5">Modelo / Ano</th>
                        <th className="p-5">Cor</th>
                        <th className="p-5">Chassi</th>
                        <th className="p-5">Entrada</th>
                        <th className="p-5 text-center">Ações</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-[11px] font-bold text-slate-600">
                      {viaturas.map((v, i) => (
                        <tr key={i} className="hover:bg-blue-50/50 transition-all">
                          <td className="p-5 text-slate-900 font-black">{v.Prefixo}</td>
                          <td className="p-5">{v.Placa || '---'}</td>
                          <td className="p-5">{v.Modelo} <span className="text-slate-300 ml-1">{v.Ano}</span></td>
                          <td className="p-5 uppercase">{v.Cor}</td>
                          <td className="p-5 font-mono text-[10px]">{v.Chassi || '---'}</td>
                          <td className="p-5">{v.Data_Entrada || '---'}</td>
                          <td className="p-5">
                            <div className="flex justify-center gap-2">
                              {/* BOTÃO MANUTENÇÃO (PÁGINA) */}
                              <button 
                                onClick={() => { setSelectedVtr(v); setIsManutencaoOpen(true); }}
                                className="p-2 hover:bg-blue-100 text-blue-600 rounded-lg transition-colors"
                              >
                                <FileText size={16}/>
                              </button>
                              {/* BOTÃO BAIXA (X) */}
                              <button 
                                onClick={() => handleAction('baixarViatura', { prefixo: v.Prefixo })}
                                className="p-2 hover:bg-red-100 text-red-600 rounded-lg transition-colors"
                              >
                                <X size={16}/>
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* ABA AUDITORIA */}
          {activeTab === 'auditoria' && (
             <div className="bg-white p-8 rounded-[2rem] border border-slate-200">
                <h3 className="font-black uppercase mb-4 italic">Inbox de Manutenção</h3>
                <div className="grid gap-4">
                   {vistoriasPendentes.length > 0 ? vistoriasPendentes.map((item, i) => (
                     <div key={i} className="p-4 bg-slate-50 rounded-xl flex justify-between">
                        <span>{item.prefixo_vtr}</span>
                        <button className="text-blue-600 font-black">VALIDAR</button>
                     </div>
                   )) : <p className="text-slate-400 italic">Nenhuma pendência.</p>}
                </div>
             </div>
          )}

        </section>
      </main>

      {/* MODAL DE CADASTRO */}
      {isAddingVtr && (
        <div className="fixed inset-0 bg-slate-900/90 backdrop-blur-sm z-[150] flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-2xl rounded-[3rem] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-8 bg-slate-900 text-white flex justify-between items-center">
              <div>
                <h2 className="text-2xl font-black italic uppercase">Cadastrar Nova Viatura</h2>
                <p className="text-[10px] font-bold text-blue-400 uppercase tracking-widest">Inclusão de Ativo no Patrimônio do 1º BPM</p>
              </div>
              <button onClick={() => setIsAddingVtr(false)} className="p-3 hover:bg-slate-800 rounded-full transition-all text-slate-400"><X size={24}/></button>
            </div>
            <form onSubmit={handleSaveViatura} className="p-10 grid grid-cols-2 gap-6">
              <Input label="Prefixo" value={formData.prefixo} onChange={e => setFormData({...formData, prefixo: e.target.value.toUpperCase()})} placeholder="Ex: VTR-1001" required />
              <Input label="Placa" value={formData.placa} onChange={e => setFormData({...formData, placa: e.target.value.toUpperCase()})} placeholder="ABC-1234" />
              <Input label="Modelo" value={formData.modelo} onChange={e => setFormData({...formData, modelo: e.target.value})} placeholder="Toyota Hilux" />
              <Input label="Ano de Fabricação" type="number" value={formData.ano} onChange={e => setFormData({...formData, ano: e.target.value})} placeholder="2024" />
              <Input label="Cor" value={formData.cor} onChange={e => setFormData({...formData, cor: e.target.value})} placeholder="Branca/Preta" />
              <Input label="Data de Entrada" type="date" value={formData.dataEntrada} onChange={e => setFormData({...formData, dataEntrada: e.target.value})} />
              <div className="col-span-2"><Input label="Número do Chassi" value={formData.chassi} onChange={e => setFormData({...formData, chassi: e.target.value.toUpperCase()})} placeholder="Digite o Chassi completo" /></div>
              <div className="col-span-2">
                <label className="text-[10px] font-black uppercase text-slate-400 mb-2 block ml-1">Observações Gerais</label>
                <textarea className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-4 text-sm font-bold min-h-[100px] outline-none focus:border-blue-500 transition-all" value={formData.observacoes} onChange={e => setFormData({...formData, observacoes: e.target.value})} placeholder="Ex: Viatura cedida pelo DETRAN..." />
              </div>
              <button type="submit" className="col-span-2 py-5 bg-blue-600 text-white rounded-[2rem] font-black uppercase text-xs shadow-xl shadow-blue-100 hover:bg-blue-700 transition-all flex items-center justify-center gap-3"><Save size={18}/> Salvar Viatura</button>
            </form>
          </div>
        </div>
      )}

      {/* MODAL DE REGISTRO DE MANUTENÇÃO (NOVO) */}
      {isManutencaoOpen && selectedVtr && (
        <div className="fixed inset-0 bg-slate-900/90 backdrop-blur-sm z-[150] flex items-center justify-center p-4">
           <div className="bg-white w-full max-w-md rounded-[3rem] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
              <div className="p-6 bg-blue-600 text-white flex justify-between items-center">
                 <h2 className="text-xl font-black uppercase italic">Manutenção: {selectedVtr.Prefixo}</h2>
                 <button onClick={() => setIsManutencaoOpen(false)}><X/></button>
              </div>
              <div className="p-8 space-y-4">
                 <button 
                    onClick={() => handleAction('registrarManutencao', { prefixo: selectedVtr.Prefixo, tipo: 'ÓLEO', km: selectedVtr.UltimoKM })}
                    className="w-full p-4 bg-slate-100 rounded-2xl font-black uppercase text-[10px] flex items-center gap-3 hover:bg-blue-50 transition-all"
                 >
                    <Droplets className="text-blue-500"/> Troca de Óleo e Filtro
                 </button>
                 <button 
                    onClick={() => handleAction('registrarManutencao', { prefixo: selectedVtr.Prefixo, tipo: 'FREIOS', km: selectedVtr.UltimoKM })}
                    className="w-full p-4 bg-slate-100 rounded-2xl font-black uppercase text-[10px] flex items-center gap-3 hover:bg-blue-50 transition-all"
                 >
                    <Wrench className="text-amber-500"/> Revisão de Freios/Suspensão
                 </button>
                 <button 
                    onClick={() => handleAction('registrarManutencao', { prefixo: selectedVtr.Prefixo, tipo: 'PNEUS', km: selectedVtr.UltimoKM })}
                    className="w-full p-4 bg-slate-100 rounded-2xl font-black uppercase text-[10px] flex items-center gap-3 hover:bg-blue-50 transition-all"
                 >
                    <Wrench className="text-slate-500"/> Troca de Pneus
                 </button>
              </div>
           </div>
        </div>
      )}

      {/* MODAL DETALHES (TELA DA DIREITA) */}
      {selectedVtr && !isManutencaoOpen && (
        <VtrDetailsModal vtr={selectedVtr} onClose={() => setSelectedVtr(null)} checkOil={checkOil} onAction={handleAction} />
      )}
    </div>
  );
};

// COMPONENTES AUXILIARES
const Input = ({ label, type = "text", ...props }) => (
  <div>
    <label className="text-[10px] font-black uppercase text-slate-400 mb-2 block ml-1">{label}</label>
    <input type={type} {...props} className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-sm font-bold focus:border-blue-500 outline-none transition-all" />
  </div>
);

const VtrDetailsModal = ({ vtr, onClose, checkOil, onAction }) => {
  const oilInfo = checkOil(vtr);
  return (
    <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-md z-[100] flex justify-end">
      <div className="w-full max-w-xl bg-white h-full shadow-2xl p-10 animate-in slide-in-from-right duration-500">
        <div className="flex justify-between items-center mb-10">
          <h2 className="text-4xl font-black italic uppercase">{vtr.Prefixo}</h2>
          <button onClick={onClose} className="p-3 hover:bg-slate-100 rounded-full text-slate-400"><X size={24}/></button>
        </div>
        <div className="space-y-6">
          <div className="bg-slate-50 p-6 rounded-3xl border border-slate-100">
            <p className="text-[10px] font-black text-slate-400 uppercase mb-2">Status do Óleo</p>
            <div className={`text-xl font-black ${oilInfo.color}`}>{oilInfo.msg}</div>
          </div>
          {/* BOTÃO DE BAIXA NA LATERAL TAMBÉM ATIVADO */}
          <button 
            onClick={() => onAction('baixarViatura', { prefixo: vtr.Prefixo })} 
            className="w-full py-5 bg-red-600 text-white rounded-[2rem] font-black uppercase text-xs hover:bg-red-700 transition-all"
          >
            Baixar Viatura (Fora de Serviço)
          </button>
        </div>
      </div>
    </div>
  );
};

const MenuBtn = ({ active, onClick, icon, label }) => (
  <button onClick={onClick} className={`w-full flex items-center gap-3 p-4 rounded-2xl text-[10px] font-black uppercase transition-all ${active ? 'bg-amber-500 text-slate-900 shadow-xl' : 'text-slate-500 hover:bg-slate-800'}`}>
    {icon} {label}
  </button>
);

const StatCard = ({ label, value, color }) => {
  const colors = { blue: 'border-l-blue-500 text-blue-600', emerald: 'border-l-emerald-500 text-emerald-600', red: 'border-l-red-500 text-red-600', amber: 'border-l-amber-500 text-amber-600' };
  return (
    <div className={`bg-white p-6 rounded-[2rem] border-l-8 ${colors[color].split(' ')[0]} shadow-sm`}>
      <p className="text-[10px] font-black text-slate-400 uppercase">{label}</p>
      <p className={`text-3xl font-black mt-1 ${colors[color].split(' ')[1]}`}>{value}</p>
    </div>
  );
};

export default AdminDashboard;
