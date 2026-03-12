import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useAuth } from '../lib/AuthContext'; 
import imageCompression from 'browser-image-compression';

// Firebase - Importações essenciais
import { db, collection, addDoc, serverTimestamp } from '../lib/firebase';
import { photoService } from '../api/photoService'; 

// Componentes Visuais
import ModalComunitaria from "../components/vistoria/ModalComunitaria";
import CardGuarnicao from "../components/vistoria/CardGuarnicao";
import ChecklistGrupo from "../components/vistoria/ChecklistGrupo";

import { 
  ArrowLeft, ChevronRight, Loader2, X, Plus, 
  Users, Lock, Unlock, Car, Shield, Wrench 
} from 'lucide-react';

// --- CONFIGURAÇÕES ---
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
  maxSizeMB: 0.05,
  maxWidthOrHeight: 800,
  useWebWorker: true
};

const Vistoria = ({ onBack, frotaInicial = [] }) => { 
  const { user } = useAuth();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [tipoVistoria, setTipoVistoria] = useState('ENTRADA');
  const [fotosVistoria, setFotosVistoria] = useState([]);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  
  // Dados do formulário
  const [formData, setFormData] = useState({
    prefixo_vtr: '',
    placa_vtr: '',
    hodometro: '',
    tipo_servico: '',
    servico_detalhe: '',
    videomonitoramento: '',
    motorista_re: '',
    motorista_nome: '',
    comandante_re: '',
    comandante_nome: '',
    patrulheiro_re: '',
    patrulheiro_nome: '',
    termo_aceite: false
  });

  const [checklist, setChecklist] = useState({});

  // --- LÓGICA DE SELEÇÃO DE VTR ---
  const handleVtrChange = (prefixo) => {
    const vtr = frotaInicial.find(v => (v.PREFIXO || v.prefixo) === prefixo);
    if (vtr) {
      setFormData(prev => ({
        ...prev,
        prefixo_vtr: prefixo,
        placa_vtr: vtr.PLACA || vtr.placa || '',
        // Se for saída, ele já tenta puxar o KM antigo como referência
        hodometro: tipoVistoria === 'SAÍDA' ? String(vtr.ULTIMOKM || vtr.ultimo_km || '') : ''
      }));
    }
  };

  // --- CAPTURA DE FOTOS (CLOUDINARY + COMPRESSÃO) ---
  const handleAddFoto = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setUploadingPhoto(true);
    try {
      const compressed = await imageCompression(file, COMPRESSION_OPTIONS);
      const base64 = await imageCompression.getDataUrlFromFile(compressed);
      setFotosVistoria(prev => [...prev, base64]);
    } catch (err) {
      alert("Erro ao processar imagem");
    } finally {
      setUploadingPhoto(false);
    }
  };

  // --- SALVAMENTO NO FIREBASE ---
  const handleFinalizar = async () => {
    if (!formData.termo_aceite) return alert("Aceite o termo para continuar.");
    setLoading(true);

    try {
      // 1. Upload de fotos para o Cloudinary (via seu photoService)
      const urlsFotos = [];
      for (const fotoBase64 of fotosVistoria) {
        const url = await photoService.uploadFoto(fotoBase64);
        urlsFotos.push(url);
      }

      // 2. Preparar Resumo do Checklist
      const falhas = Object.entries(checklist)
        .filter(([_, status]) => status === 'FALHA')
        .map(([item]) => item);
      
      const resumoChecklist = falhas.length === 0 ? "SEM ALTERAÇÕES" : `FALHAS: ${falhas.join(", ")}`;

      // 3. Objeto Final para o Firebase
      const novaVistoria = {
        ...formData,
        tipo_vistoria: tipoVistoria,
        checklist_resumo: resumoChecklist,
        fotos: urlsFotos,
        militar_responsavel: `${user?.patente} ${user?.nome}`,
        unidade: "1º BPM",
        status_vtr: "PENDENTE_GARAGEIRO",
        data_hora: serverTimestamp(), // Data oficial do servidor Firebase
      };

      // 4. Gravação no Firestore
      await addDoc(collection(db, "vistorias"), novaVistoria);

      alert("Vistoria enviada com sucesso ao banco de dados!");
      onBack();
    } catch (error) {
      console.error("Erro Firebase:", error);
      alert("Erro ao salvar no Firebase. Verifique sua conexão.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 pb-10">
      <header className="bg-slate-900 text-white p-5 sticky top-0 z-50 flex justify-between items-center">
        <button onClick={onBack} className="p-2 bg-white/10 rounded-full"><ArrowLeft size={24}/></button>
        <h1 className="font-black text-xs uppercase tracking-widest">Nova Vistoria</h1>
        <div className="w-10" />
      </header>

      <main className="max-w-xl mx-auto p-4 space-y-4">
        {/* Seletor de Tipo */}
        <div className="flex bg-slate-200 p-1 rounded-2xl">
          {['ENTRADA', 'SAÍDA'].map(t => (
            <button 
              key={t} 
              onClick={() => setTipoVistoria(t)}
              className={`flex-1 py-3 rounded-xl font-black text-[10px] transition-all ${tipoVistoria === t ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-500'}`}
            >
              {t}
            </button>
          ))}
        </div>

        {step === 1 ? (
          <div className="bg-white rounded-[2.5rem] p-6 shadow-xl border border-slate-200 space-y-4">
             <CardGuarnicao formData={formData} />
             
             <div className="grid grid-cols-2 gap-2">
               <select 
                 className="vtr-input"
                 value={formData.prefixo_vtr}
                 onChange={(e) => handleVtrChange(e.target.value)}
               >
                 <option value="">VIATURA</option>
                 {frotaInicial.map(v => (
                   <option key={v.prefixo || v.PREFIXO} value={v.prefixo || v.PREFIXO}>
                     {v.prefixo || v.PREFIXO}
                   </option>
                 ))}
               </select>

               <input 
                 type="number" 
                 className="vtr-input" 
                 placeholder="HODÔMETRO"
                 value={formData.hodometro}
                 onChange={(e) => setFormData({...formData, hodometro: e.target.value})}
               />
             </div>

             <div className="space-y-3">
               <input 
                 type="tel" 
                 className="vtr-input w-full" 
                 placeholder="RE MOTORISTA"
                 value={formData.motorista_re}
                 onChange={(e) => setFormData({...formData, motorista_re: e.target.value})}
               />
               <input 
                 type="text" 
                 className="vtr-input w-full uppercase" 
                 placeholder="NOME MOTORISTA"
                 value={formData.motorista_nome}
                 onChange={(e) => setFormData({...formData, motorista_nome: e.target.value})}
               />
             </div>

             <button 
               onClick={() => setStep(2)}
               disabled={!formData.prefixo_vtr || !formData.motorista_nome}
               className="btn-tatico w-full disabled:opacity-50"
             >
               CHECKLIST E FOTOS <ChevronRight size={18}/>
             </button>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Seção de Fotos */}
            <div className="bg-white rounded-3xl p-5 border border-slate-200">
              <h3 className="text-[10px] font-black text-slate-400 mb-3 uppercase">Fotos da Vistoria</h3>
              <div className="grid grid-cols-4 gap-2">
                {fotosVistoria.map((foto, i) => (
                  <div key={i} className="relative aspect-square rounded-xl overflow-hidden border">
                    <img src={foto} className="w-full h-full object-cover" />
                    <button 
                      onClick={() => setFotosVistoria(prev => prev.filter((_, idx) => idx !== i))}
                      className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-1"
                    ><X size={10}/></button>
                  </div>
                ))}
                <label className="aspect-square rounded-xl border-2 border-dashed border-slate-300 flex items-center justify-center cursor-pointer">
                  {uploadingPhoto ? <Loader2 className="animate-spin text-blue-500"/> : <Plus className="text-slate-400"/>}
                  <input type="file" accept="image/*" capture="environment" className="hidden" onChange={handleAddFoto} />
                </label>
              </div>
            </div>

            {/* Checklist Dinâmico */}
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

            <label className="flex items-start gap-3 p-4 bg-white rounded-2xl border">
              <input 
                type="checkbox" 
                checked={formData.termo_aceite}
                onChange={(e) => setFormData({...formData, termo_aceite: e.target.checked})}
                className="mt-1"
              />
              <span className="text-[10px] font-bold text-slate-500 uppercase">
                Confirmo que realizei a vistoria física e as informações são verídicas.
              </span>
            </label>

            <div className="flex gap-2">
              <button onClick={() => setStep(1)} className="flex-1 bg-slate-200 p-4 rounded-2xl font-black text-xs uppercase">Voltar</button>
              <button 
                onClick={handleFinalizar}
                disabled={loading}
                className="btn-tatico flex-[2]"
              >
                {loading ? <Loader2 className="animate-spin mx-auto"/> : "SALVAR NO FIREBASE"}
              </button>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default Vistoria;
