import React, { useState } from 'react';
import { useAuth } from '../lib/AuthContext'; 
import imageCompression from 'browser-image-compression';

// Firebase - Importações unificadas
import { 
  db, collection, addDoc, serverTimestamp, 
  doc, updateDoc, query, where, getDocs 
} from '../lib/firebase';
import { photoService } from '../api/photoService'; 

// Componentes Visuais
import CardGuarnicao from "../components/vistoria/CardGuarnicao";
import ChecklistGrupo from "../components/vistoria/ChecklistGrupo";

import { 
  ArrowLeft, ChevronRight, Loader2, X, Plus, 
  Users, Car, Shield 
} from 'lucide-react';

// --- CONFIGURAÇÕES DE CHECKLIST ---
const GRUPOS_ENTRADA = [
  {
    nome: "Documentação e Equipamentos",
    icon: <Shield size={16} />,
    itens: ["Documento da Viatura", "Estepe", "Chave de Roda", "Macaco", "Triângulo", "Extintor", "Giroscópio", "Sirene", "Rádio"]
  },
  {
    nome: "Estado Externo",
    icon: <Car size={16} />,
    itens: ["Pneus", "Capô", "Paralama Dianteiro", "Paralama Traseiro", "Parachoque Dianteiro", "Parachoque Traseiro", "Lanternas", "Caçamba", "Vidros e Portas", "Retrovisor Externo", "Maçanetas", "Para-brisas", "Protetor Dianteiro"]
  },
  {
    nome: "Interior e Conforto",
    icon: <Users size={16} />,
    itens: ["Cinto", "Retrovisor Interno", "Painel de Instrumentos", "Bancos", "Forro Interno", "Tapetes", "Regulador dos Bancos", "Porta Traseira", "Porta Dianteira"]
  }
];

const COMPRESSION_OPTIONS = {
  maxSizeMB: 0.1, // Aumentei levemente para manter leitura do odômetro na foto
  maxWidthOrHeight: 1024,
  useWebWorker: true
};

const Vistoria = ({ onBack, frotaInicial = [] }) => { 
  const { user } = useAuth();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [tipoVistoria, setTipoVistoria] = useState('ENTRADA');
  const [fotosVistoria, setFotosVistoria] = useState([]);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  
  const [formData, setFormData] = useState({
    prefixo_vtr: '',
    placa_vtr: '',
    hodometro: '',
    motorista_re: '',
    motorista_nome: '',
    termo_aceite: false
  });

  const [checklist, setChecklist] = useState({});

  // --- LÓGICA DE SELEÇÃO DE VTR ---
  const handleVtrChange = (prefixo) => {
    const vtr = frotaInicial.find(v => (v.prefixo === prefixo || v.PREFIXO === prefixo));
    if (vtr) {
      setFormData(prev => ({
        ...prev,
        prefixo_vtr: prefixo,
        placa_vtr: vtr.placa || vtr.PLACA || '',
        hodometro: tipoVistoria === 'SAÍDA' ? String(vtr.ultimo_km || vtr.ULTIMOKM || '') : ''
      }));
    }
  };

  // --- CAPTURA DE FOTOS COM COMPRESSÃO ---
  const handleAddFoto = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setUploadingPhoto(true);
    try {
      const compressed = await imageCompression(file, COMPRESSION_OPTIONS);
      const base64 = await imageCompression.getDataUrlFromFile(compressed);
      setFotosVistoria(prev => [...prev, base64]);
    } catch (err) {
      alert("Erro ao processar imagem. Tente novamente.");
    } finally {
      setUploadingPhoto(false);
    }
  };

  // --- SALVAMENTO FINAL ---
  const handleFinalizar = async () => {
    if (!formData.termo_aceite) return alert("É necessário aceitar o termo de responsabilidade.");
    if (!formData.hodometro) return alert("Informe o KM atual da viatura.");
    setLoading(true);

    try {
      // 1. Upload das Fotos para o Cloudinary
      const urlsFotos = [];
      for (const fotoBase64 of fotosVistoria) {
        const url = await photoService.uploadFoto(fotoBase64);
        urlsFotos.push(url);
      }

      // 2. Processamento do Checklist
      const falhas = Object.entries(checklist)
        .filter(([_, status]) => status === 'FALHA')
        .map(([item]) => item);
      
      const resumoChecklist = falhas.length === 0 ? "SEM ALTERAÇÕES" : `FALHAS: ${falhas.join(", ")}`;

      // 3. Objeto de Vistoria
      const novaVistoria = {
        ...formData,
        hodometro: Number(formData.hodometro),
        tipo_vistoria: tipoVistoria,
        checklist_resumo: resumoChecklist,
        checklist_detalhado: checklist,
        fotos: urlsFotos,
        militar_responsavel: `${user?.patente || ''} ${user?.nome || ''}`,
        re_responsavel: user?.re || 'N/A',
        unidade: "1º BPM",
        status_vtr: "PENDENTE_GARAGEIRO",
        data_hora: serverTimestamp(),
      };

      // 4. Salva o Registro de Vistoria
      await addDoc(collection(db, "vistorias"), novaVistoria);

      // 5. Atualiza o Estado da Viatura na Coleção 'viaturas'
      const vtrQuery = query(collection(db, "viaturas"), where("prefixo", "==", formData.prefixo_vtr));
      const vtrSnap = await getDocs(vtrQuery);
      
      if (!vtrSnap.empty) {
        const vtrDocId = vtrSnap.docs[0].id;
        await updateDoc(doc(db, "viaturas", vtrDocId), {
          ultimo_km: Number(formData.hodometro),
          status: tipoVistoria === 'ENTRADA' ? 'DISPONÍVEL' : 'EM SERVIÇO',
          ultima_atualizacao: serverTimestamp(),
          ultima_vistoria_por: user?.re || 'N/A'
        });
      }

      alert("Vistoria finalizada! Viatura atualizada no pátio.");
      onBack();
    } catch (error) {
      console.error("Erro ao finalizar:", error);
      alert("Erro ao salvar. Verifique sua conexão.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 pb-10">
      {/* Header Fixo */}
      <header className="bg-slate-900 text-white p-5 sticky top-0 z-50 flex justify-between items-center shadow-lg">
        <button onClick={onBack} className="p-2 bg-white/10 hover:bg-white/20 rounded-full transition-colors">
          <ArrowLeft size={24}/>
        </button>
        <div className="text-center">
            <h1 className="font-black text-[10px] uppercase tracking-[0.2em]">Nova Inspeção</h1>
            <p className="text-[9px] text-blue-400 font-bold uppercase">{tipoVistoria}</p>
        </div>
        <div className="w-10" />
      </header>

      <main className="max-w-xl mx-auto p-4 space-y-4">
        {/* Seletor Entrada/Saída */}
        <div className="flex bg-slate-200 p-1.5 rounded-2xl">
          {['ENTRADA', 'SAÍDA'].map(t => (
            <button 
              key={t} 
              onClick={() => { setTipoVistoria(t); setStep(1); }}
              className={`flex-1 py-3 rounded-xl font-black text-[10px] transition-all duration-300 ${tipoVistoria === t ? 'bg-blue-600 text-white shadow-md scale-[1.02]' : 'text-slate-500 hover:text-slate-700'}`}
            >
              {t}
            </button>
          ))}
        </div>

        {step === 1 ? (
          <div className="bg-white rounded-[2.5rem] p-6 shadow-xl border border-slate-200 space-y-5 animate-in slide-in-from-right-4 duration-300">
             <CardGuarnicao formData={formData} />
             
             <div className="grid grid-cols-2 gap-3">
               <div className="space-y-1">
                 <label className="text-[9px] font-black text-slate-400 uppercase ml-2">Viatura</label>
                 <select 
                   className="vtr-input bg-slate-50"
                   value={formData.prefixo_vtr}
                   onChange={(e) => handleVtrChange(e.target.value)}
                 >
                   <option value="">SELECIONE</option>
                   {frotaInicial.map(v => (
                     <option key={v.prefixo || v.PREFIXO} value={v.prefixo || v.PREFIXO}>
                       {v.prefixo || v.PREFIXO}
                     </option>
                   ))}
                 </select>
               </div>

               <div className="space-y-1">
                 <label className="text-[9px] font-black text-slate-400 uppercase ml-2">KM Atual</label>
                 <input 
                   type="number" 
                   className="vtr-input bg-slate-50" 
                   placeholder="000000"
                   value={formData.hodometro}
                   onChange={(e) => setFormData({...formData, hodometro: e.target.value})}
                 />
               </div>
             </div>

             <div className="space-y-3 pt-2">
               <input 
                 type="tel" 
                 className="vtr-input w-full" 
                 placeholder="RE DO MOTORISTA"
                 value={formData.motorista_re}
                 onChange={(e) => setFormData({...formData, motorista_re: e.target.value})}
               />
               <input 
                 type="text" 
                 className="vtr-input w-full uppercase" 
                 placeholder="NOME COMPLETO DO MOTORISTA"
                 value={formData.motorista_nome}
                 onChange={(e) => setFormData({...formData, motorista_nome: e.target.value})}
               />
             </div>

             <button 
               onClick={() => setStep(2)}
               disabled={!formData.prefixo_vtr || !formData.motorista_nome || !formData.hodometro}
               className="btn-tatico w-full mt-4 disabled:bg-slate-300"
             >
               CHECKLIST E FOTOS <ChevronRight size={18} className="ml-1"/>
             </button>
          </div>
        ) : (
          <div className="space-y-5 animate-in slide-in-from-right-4 duration-300">
            {/* Seção de Fotos */}
            <div className="bg-white rounded-[2rem] p-5 shadow-md border border-slate-200">
              <h3 className="text-[10px] font-black text-slate-400 mb-4 uppercase tracking-widest">Registros Visuais</h3>
              <div className="grid grid-cols-4 gap-3">
                {fotosVistoria.map((foto, i) => (
                  <div key={i} className="relative aspect-square rounded-2xl overflow-hidden border-2 border-slate-100 shadow-sm">
                    <img src={foto} className="w-full h-full object-cover" alt="Evidência" />
                    <button 
                      onClick={() => setFotosVistoria(prev => prev.filter((_, idx) => idx !== i))}
                      className="absolute top-1 right-1 bg-red-600 text-white rounded-full p-1 shadow-lg"
                    ><X size={12}/></button>
                  </div>
                ))}
                <label className="aspect-square rounded-2xl border-2 border-dashed border-blue-200 flex flex-col items-center justify-center bg-blue-50/50 text-blue-600 cursor-pointer hover:bg-blue-50 transition-colors">
                  {uploadingPhoto ? <Loader2 className="animate-spin" size={20}/> : <Plus size={24}/>}
                  <input type="file" accept="image/*" capture="environment" className="hidden" onChange={handleAddFoto} />
                </label>
              </div>
            </div>

            {/* Checklist em Grupos */}
            <div className="space-y-3">
                {GRUPOS_ENTRADA.map(grupo => (
                <ChecklistGrupo 
                    key={grupo.nome}
                    titulo={grupo.nome}
                    itens={grupo.itens}
                    checklist={checklist}
                    onToggle={(item) => setChecklist(prev => ({
                    ...prev,
                    [item]: prev[item] === 'FALHA' ? 'OK' : 'FALHA'
                    }))}
                />
                ))}
            </div>

            {/* Termo de Responsabilidade */}
            <label className="flex items-start gap-3 p-5 bg-amber-50 rounded-3xl border border-amber-100 shadow-sm cursor-pointer active:scale-[0.98] transition-transform">
              <input 
                type="checkbox" 
                checked={formData.termo_aceite}
                onChange={(e) => setFormData({...formData, termo_aceite: e.target.checked})}
                className="mt-1 w-5 h-5 rounded-md border-amber-300 text-amber-600"
              />
              <span className="text-[10px] font-bold text-amber-800 uppercase leading-relaxed">
                Declaro que os dados informados condizem com o estado real da viatura {formData.prefixo_vtr} no ato desta inspeção.
              </span>
            </label>

            {/* Botões de Ação */}
            <div className="flex gap-3 pt-4">
              <button 
                onClick={() => setStep(1)} 
                className="flex-1 bg-white border-2 border-slate-200 p-4 rounded-[1.5rem] font-black text-[10px] uppercase text-slate-500 hover:bg-slate-50 transition-colors"
              >
                Revisar Dados
              </button>
              <button 
                onClick={handleFinalizar}
                disabled={loading || !formData.termo_aceite}
                className="btn-tatico flex-[2] shadow-blue-900/20"
              >
                {loading ? <Loader2 className="animate-spin"/> : "FINALIZAR INSPEÇÃO"}
              </button>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default Vistoria;
