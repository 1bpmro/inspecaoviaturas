import React, { useState, useEffect } from 'react';
import { useAuth } from '../lib/AuthContext'; 
import imageCompression from 'browser-image-compression';
import { runGoogleScript } from '../api/gasClient'; // Sua ponte com o GAS
import { photoService } from '../api/photoService'; // Seu upload Cloudinary

import { 
  ArrowLeft, ChevronRight, Loader2, X, Plus, 
  Users, Car, Shield 
} from 'lucide-react';
import CardGuarnicao from "../components/vistoria/CardGuarnicao";
import ChecklistGrupo from "../components/vistoria/ChecklistGrupo";

// --- CONFIGURAÇÕES DE CHECKLIST ---
const GRUPOS_ENTRADA = [
  { nome: "Documentação e Equipamentos", icon: <Shield size={16} />, itens: ["Documento da Viatura", "Estepe", "Chave de Roda", "Macaco", "Triângulo", "Extintor", "Giroscópio", "Sirene", "Rádio"] },
  { nome: "Estado Externo", icon: <Car size={16} />, itens: ["Pneus", "Capô", "Parachoque Dianteiro", "Parachoque Traseiro", "Lanternas", "Vidros e Portas", "Retrovisores"] },
  { nome: "Interior e Conforto", icon: <Users size={16} />, itens: ["Cinto", "Painel", "Bancos", "Limpeza Interna"] }
];

const Vistoria = ({ onBack, frotaInicial = [] }) => { 
  const { user } = useAuth();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [tipoVistoria, setTipoVistoria] = useState('ENTRADA'); // ENTRADA (PÁTIO) ou SAÍDA (SERVIÇO)
  const [fotosVistoria, setFotosVistoria] = useState([]);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  
  const [formData, setFormData] = useState({
    prefixo_vtr: '',
    placa_vtr: '',
    hodometro: '',
    motorista_re: user?.re || '', // Já tenta puxar do login
    motorista_nome: user?.nome || '',
    termo_aceite: false
  });

  const [checklist, setChecklist] = useState({});

  // --- LÓGICA DE SELEÇÃO DE VTR ---
  const handleVtrChange = (prefixo) => {
    const vtr = frotaInicial.find(v => v.PREFIXO === prefixo);
    if (vtr) {
      setFormData(prev => ({
        ...prev,
        prefixo_vtr: prefixo,
        placa_vtr: vtr.PLACA || '',
        // Se for SAÍDA, sugere o último KM da planilha
        hodometro: tipoVistoria === 'SAÍDA' ? String(vtr.ULTIMOKM || '') : ''
      }));
      
      // Alerta de Óleo visual para o policial
      if (vtr.ALERTA_OLEO) {
        alert(`⚠️ ATENÇÃO: VTR ${prefixo} está próxima da troca de óleo! (${vtr.MOTIVO_OLEO})`);
      }
    }
  };

  const handleAddFoto = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setUploadingPhoto(true);
    try {
      const options = { maxSizeMB: 0.2, maxWidthOrHeight: 1280 };
      const compressed = await imageCompression(file, options);
      const base64 = await imageCompression.getDataUrlFromFile(compressed);
      setFotosVistoria(prev => [...prev, base64]);
    } catch (err) {
      alert("Erro na foto.");
    } finally {
      setUploadingPhoto(false);
    }
  };

  // --- SALVAMENTO FINAL (MUDANÇA PARA GOOGLE SHEETS) ---
  const handleFinalizar = async () => {
    if (!formData.termo_aceite) return alert("Aceite o termo.");
    if (!formData.hodometro) return alert("Informe o KM.");
    setLoading(true);

    try {
      // 1. Upload Cloudinary (Retorna URLs separadas por " | ")
      let linksFotos = "Sem Fotos";
      if (fotosVistoria.length > 0) {
        const urls = [];
        for (const base64 of fotosVistoria) {
          const url = await photoService.uploadFoto(base64);
          urls.push(url);
        }
        linksFotos = urls.join(" | ");
      }

      // 2. Montar Payload para o GAS
      const payload = {
        action: 'saveVistoria', // Nome da função no seu GAS
        prefixo: formData.prefixo_vtr,
        km: Number(formData.hodometro),
        tipo: tipoVistoria,
        motorista_re: formData.motorista_re,
        motorista_nome: formData.motorista_nome,
        fotos: linksFotos,
        observacoes: Object.entries(checklist)
          .filter(([_, status]) => status === 'FALHA')
          .map(([item]) => item).join(", ") || "SEM ALTERAÇÕES"
      };

      // 3. Enviar para o Google Sheets
      const response = await runGoogleScript('salvarDadosVistoria', payload);

      if (response.status === 'success') {
        alert("✅ Vistoria registrada com sucesso na Planilha!");
        onBack();
      } else {
        throw new Error(response.message);
      }

    } catch (error) {
      console.error(error);
      alert("Erro ao salvar: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 pb-10 font-sans">
      {/* Header simplificado conforme seu estilo */}
      <header className="bg-slate-900 text-white p-5 sticky top-0 z-50 flex justify-between items-center">
        <button onClick={onBack}><ArrowLeft size={24}/></button>
        <div className="text-center">
            <h1 className="font-black text-[10px] uppercase tracking-widest">Inspeção de Viatura</h1>
            <p className="text-[9px] text-blue-400 font-bold uppercase">{tipoVistoria}</p>
        </div>
        <div className="w-6" />
      </header>

      <main className="max-w-xl mx-auto p-4 space-y-4">
        {/* Toggle Entrada/Saída */}
        <div className="flex bg-slate-200 p-1 rounded-xl">
          {['ENTRADA', 'SAÍDA'].map(t => (
            <button key={t} onClick={() => setTipoVistoria(t)}
              className={`flex-1 py-2 rounded-lg font-bold text-[10px] ${tipoVistoria === t ? 'bg-blue-600 text-white' : 'text-slate-50'}`}>
              {t === 'ENTRADA' ? 'ENTRADA (PÁTIO)' : 'SAÍDA (SERVIÇO)'}
            </button>
          ))}
        </div>

        {step === 1 ? (
          <div className="bg-white rounded-[2rem] p-6 shadow-xl space-y-4">
             <CardGuarnicao formData={formData} />
             
             <div className="grid grid-cols-2 gap-3">
               <div className="space-y-1">
                 <label className="text-[9px] font-black text-slate-400 uppercase ml-2">Prefixo</label>
                 <select className="w-full p-3 bg-slate-50 rounded-xl border border-slate-200 font-bold"
                   value={formData.prefixo_vtr}
                   onChange={(e) => handleVtrChange(e.target.value)}>
                   <option value="">SELECIONE</option>
                   {frotaInicial.map(v => (
                     <option key={v.PREFIXO} value={v.PREFIXO}>
                       {v.PREFIXO} {v.ALERTA_OLEO ? '⚠️' : ''}
                     </option>
                   ))}
                 </select>
               </div>

               <div className="space-y-1">
                 <label className="text-[9px] font-black text-slate-400 uppercase ml-2">KM Hodômetro</label>
                 <input type="number" className="w-full p-3 bg-slate-50 rounded-xl border border-slate-200 font-bold"
                   placeholder="000000"
                   value={formData.hodometro}
                   onChange={(e) => setFormData({...formData, hodometro: e.target.value})} />
               </div>
             </div>

             <button onClick={() => setStep(2)} disabled={!formData.prefixo_vtr || !formData.hodometro}
               className="w-full bg-blue-900 text-white p-4 rounded-2xl font-black text-xs uppercase flex justify-center items-center gap-2 disabled:bg-slate-300">
               Próxima Etapa <ChevronRight size={18}/>
             </button>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Seção de Fotos e Checklist permanecem similares, mas salvam no objeto 'checklist' */}
            {/* ... Seu código de Fotos e ChecklistGrupo aqui ... */}

            <button onClick={handleFinalizar} disabled={loading}
              className="w-full bg-green-600 text-white p-5 rounded-2xl font-black text-sm shadow-lg">
              {loading ? <Loader2 className="animate-spin mx-auto"/> : "FINALIZAR E ENVIAR PARA O P4"}
            </button>
          </div>
        )}
      </main>
    </div>
  );
};

export default Vistoria;
