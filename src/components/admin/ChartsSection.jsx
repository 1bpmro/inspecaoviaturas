import {
  PieChart, Pie, Cell,
  LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid,
  BarChart, Bar
} from "recharts";

const COLORS = ["#10b981", "#f59e0b", "#ef4444"];

export default function ChartsSection({ viaturas, vistorias }) {

  // 📊 STATUS FROTA
  const statusData = [
    { name: "Disponível", value: viaturas.filter(v => v.status === "DISPONÍVEL").length },
    { name: "Manutenção", value: viaturas.filter(v => v.status === "MANUTENCAO").length },
    { name: "Outros", value: viaturas.filter(v => v.status !== "DISPONÍVEL" && v.status !== "MANUTENCAO").length },
  ];

  // 📈 VISTORIAS POR DIA
  const vistoriaPorDia = {};
  vistorias.forEach(v => {
    const d = new Date(v.data_hora).toLocaleDateString();
    vistoriaPorDia[d] = (vistoriaPorDia[d] || 0) + 1;
  });

  const lineData = Object.keys(vistoriaPorDia).map(d => ({
    data: d,
    total: vistoriaPorDia[d]
  }));

  // 📊 PROBLEMAS
  const problemas = [
    { name: "Avaria", value: vistorias.filter(v => v.status_fisico === "AVARIADA").length },
    { name: "Óleo", value: vistorias.filter(v => v.nivel_oleo === "BAIXO").length },
    { name: "Limpeza", value: vistorias.filter(v => v.limpeza === "CRÍTICA").length },
  ];

  return (
    <div className="grid md:grid-cols-3 gap-6">

      {/* PIE */}
      <div className="bg-white p-4 rounded-2xl shadow">
        <h3 className="font-black text-xs mb-2">Status da Frota</h3>
        <PieChart width={250} height={200}>
          <Pie data={statusData} dataKey="value">
            {statusData.map((_, i) => <Cell key={i} fill={COLORS[i]} />)}
          </Pie>
          <Tooltip />
        </PieChart>
      </div>

      {/* LINE */}
      <div className="bg-white p-4 rounded-2xl shadow">
        <h3 className="font-black text-xs mb-2">Vistorias por Dia</h3>
        <LineChart width={300} height={200} data={lineData}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="data" />
          <YAxis />
          <Tooltip />
          <Line type="monotone" dataKey="total" stroke="#f59e0b" />
        </LineChart>
      </div>

      {/* BAR */}
      <div className="bg-white p-4 rounded-2xl shadow">
        <h3 className="font-black text-xs mb-2">Problemas Detectados</h3>
        <BarChart width={300} height={200} data={problemas}>
          <XAxis dataKey="name" />
          <YAxis />
          <Tooltip />
          <Bar dataKey="value" fill="#ef4444" />
        </BarChart>
      </div>

    </div>
  );
}
