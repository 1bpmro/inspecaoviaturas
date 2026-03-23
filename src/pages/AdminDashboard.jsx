import React, { useState, useEffect, useMemo } from 'react';
import { db, collection, onSnapshot, query, orderBy, addDoc, doc, updateDoc, serverTimestamp } from '../lib/firebase';
import { useAuth } from '../lib/AuthContext';
import { 
  Settings, LayoutDashboard, ArrowLeft, Menu, X, Plus, Edit2, Loader2,
  FileText, Database, Download, Car
} from 'lucide-react';

// ================= DASHBOARD =================
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

    const unsub1 = onSnapshot(qVtrs, snap => {
      setViaturas(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      setLoading(false);
    });

    const unsub2 = onSnapshot(qVist, snap => {
      setVistorias(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });

    return () => { unsub1(); unsub2(); };
  }, []);

  // ================= SALVAR VIATURA =================
  const handleSave = async (e) => {
    e.preventDefault();

    const data = {
      ...formData,
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

    setIsModalOpen(false);
    setEditingId(null);
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
    const linhas = vistorias.map(v => [
      v.prefixo_vtr,
      v.motorista_nome,
      v.garageiro_re,
      v.status_fisico,
      v.limpeza,
      v.data_hora
    ]);

    const csv = [
      ["PREFIXO","MOTORISTA","GARAGEIRO","STATUS","LIMPEZA","DATA"],
      ...linhas
    ].map(e => e.join(";")).join("\n");

    const blob = new Blob([csv]);
    const url = URL.createObjectURL(blob);

    const a = document.createElement("a");
    a.href = url;
    a.download = "relatorio.csv";
    a.click();
  };

  return (
    <div className="flex min-h-screen bg-slate-100">

      {/* SIDEBAR */}
      <aside className={`w-72 bg-slate-900 text-white p-4 ${isSidebarOpen ? '' : 'hidden md:block'}`}>
        <h1 className="font-black text-xl mb-6">COMANDO GERAL</h1>

        <MenuBtn active={activeTab==='stats'} onClick={()=>setActiveTab('stats')} icon={<LayoutDashboard size={18}/>} label="Dashboard"/>
        <MenuBtn active={activeTab==='frota'} onClick={()=>setActiveTab('frota')} icon={<Database size={18}/>} label="Frota"/>
        <MenuBtn active={activeTab==='relatorios'} onClick={()=>setActiveTab('relatorios')} icon={<FileText size={18}/>} label="Relatórios"/>

        <button onClick={onBack} className="mt-10 text-red-400">Sair</button>
      </aside>

      {/* MAIN */}
      <main className="flex-1 p-6">

        {/* HEADER */}
        <div className="flex justify-between mb-6">
          <h2 className="font-black uppercase">{activeTab}</h2>
          {loading && <Loader2 className="animate-spin"/>}
        </div>

        {/* DASHBOARD */}
        {activeTab === 'stats' && (
          <div className="grid grid-cols-4 gap-4">
            <StatCard label="Movimentações" value={stats.total}/>
            <StatCard label="Frota" value={stats.viaturas}/>
            <StatCard label="Avariadas" value={stats.avariadas}/>
            <StatCard label="Críticas" value={stats.criticas}/>
          </div>
        )}

        {/* FROTA */}
        {activeTab === 'frota' && (
          <div>
            <button onClick={()=>setIsModalOpen(true)} className="mb-4 bg-black text-white px-4 py-2">+ Nova Viatura</button>

            <table className="w-full bg-white">
              <thead>
                <tr>
                  <th>Prefixo</th>
                  <th>Modelo</th>
                  <th>Status</th>
                  <th>Ação</th>
                </tr>
              </thead>
              <tbody>
                {viaturas.map(v => (
                  <tr key={v.id}>
                    <td>{v.prefixo}</td>
                    <td>{v.modelo}</td>
                    <td>{v.status}</td>
                    <td>
                      <button onClick={()=>{setFormData(v); setEditingId(v.id); setIsModalOpen(true)}}>
                        <Edit2 size={16}/>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* RELATORIOS */}
        {activeTab === 'relatorios' && (
          <div>
            <button onClick={exportarCSV} className="bg-green-600 text-white px-4 py-2">
              <Download size={16}/> Exportar CSV
            </button>

            <div className="mt-6 space-y-2">
              {vistorias.map(v => (
                <div key={v.id} className="bg-white p-4 rounded">
                  {v.prefixo_vtr} - {v.motorista_nome}
                </div>
              ))}
            </div>
          </div>
        )}
      </main>

      {/* MODAL */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center">
          <form onSubmit={handleSave} className="bg-white p-6 rounded w-[400px]">

            <input placeholder="Prefixo" value={formData.prefixo} onChange={e=>setFormData({...formData,prefixo:e.target.value})}/>
            <input placeholder="Modelo" value={formData.modelo} onChange={e=>setFormData({...formData,modelo:e.target.value})}/>

            <select value={formData.carroceria} onChange={e=>setFormData({...formData,carroceria:e.target.value})}>
              <option>FECHADA</option>
              <option>ABERTA</option>
              <option>CAMBURÃO</option>
            </select>

            <button type="submit">Salvar</button>
          </form>
        </div>
      )}
    </div>
  );
};

// ================= COMPONENTES =================
const MenuBtn = ({ active, onClick, icon, label }) => (
  <button onClick={onClick} className={`block w-full text-left p-2 ${active ? 'bg-yellow-500 text-black' : ''}`}>
    {icon} {label}
  </button>
);

const StatCard = ({ label, value }) => (
  <div className="bg-white p-4">
    <p>{label}</p>
    <h1>{value}</h1>
  </div>
);

export default AdminDashboard;
