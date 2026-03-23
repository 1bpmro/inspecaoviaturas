export default function AlertasSection({ viaturas, vistorias }) {

  const alertas = [
    ...viaturas.filter(v => v.status === "MANUTENCAO").map(v => `VTR ${v.prefixo} em manutenção`),
    ...vistorias.filter(v => v.nivel_oleo === "BAIXO").map(v => `Óleo crítico: ${v.prefixo_vtr}`)
  ];

  if (alertas.length === 0) return null;

  return (
    <div className="space-y-2">
      {alertas.map((a, i) => (
        <div key={i} className="bg-red-100 text-red-700 p-4 rounded-xl text-xs font-bold">
          ⚠️ {a}
        </div>
      ))}
    </div>
  ); 
}
