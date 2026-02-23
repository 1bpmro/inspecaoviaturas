import React, { useState, useEffect } from 'react';
import { useAuth } from '../lib/AuthContext';
import { gasApi } from '../api/gasClient';
import { Camera, Save, AlertTriangle, ArrowLeft, Loader2, CheckCircle2 } from 'lucide-react';
import imageCompression from 'browser-image-compression';

const Vistoria = ({ onBack }) => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [viaturas, setViaturas] = useState([]);
  const [fotos, setFotos] = useState([]);
  
  // Estado do Formulário
  const [formData, setFormData] = useState({
    viatura_id: '',
    km_atual: '',
    tipo_servico: 'ENTRADA', // ENTRADA ou SAÍDA
    viatura_em_condicoes: true,
    houve_alteracoes: false,
    observacoes: '',
    checklist_luzes: 'OK',
    checklist_pneus: 'OK',
    checklist_oleo: 'OK',
    checklist_limpeza: 'OK',
    checklist_equipamentos: 'OK'
  });

  // Busca viaturas ao carregar
  useEffect(() => {
    const fetchViaturas = async () => {
      const res = await gasApi.getViaturas();
      if (res.status === 'success') setViaturas(res.data);
    };
    fetchViaturas();
  }, []);

  // Função para comprimir e converter imagem para Base64
  const handleFileChange = async (e) => {
    const files = Array.from(e.target.files);
    const options = { maxSizeMB: 0.8, maxWidthOrHeight: 1280, useWebWorker: true };
    
    setLoading(true);
    try {
      const compressedFiles = await Promise.all(
        files.map(async (file) => {
          const compressed = await imageCompression(file, options);
          return await imageCompression.getDataUrlFromFile(compressed);
        })
      );
      setFotos([...fotos, ...compressedFiles]);
    } catch (err) {
      alert("Erro ao processar fotos");
    }
    setLoading(false);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.viatura_id || !formData.km_atual) return alert("Preencha os campos obrigatórios");

    setLoading(true);
    const payload = {
      ...formData,
      policial_re: user.re,
      policial_nome: user.nome,
      fotos_vistoria: fotos // O Script vai receber os Base64 e salvar no Drive
    };

    const res = await gasApi.saveVistoria(payload);
    if (res.status === 'success') {
      alert("Vistoria enviada com sucesso!");
      onBack();
    } else {
      alert("Erro ao salvar: " + res.message);
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-white pb-20">
      <div className="bg-slate-800 text-white p-4 flex items-center gap-4 sticky top-0 z-10">
        <button onClick={onBack}><ArrowLeft /></button>
        <h1 className="font-bold uppercase">Nova Vistoria</h1>
      </div>

      <form onSubmit={handleSubmit} className="p-4 space-y-6">
        {/* Seleção de Viatura */}
        <section className="space-y-2">
          <label className="font-bold text-slate-700">Viatura (Prefixo/Placa)</label>
          <select 
            className="w-full p-3 border rounded-lg bg-slate-50"
            onChange={(e) => setFormData({...formData, viatura_id: e.target.value})}
            required
          >
            <option value="">Selecione a Viatura</option>
            {viaturas.map(v => (
              <option key={v.Placa} value={v.Prefixo}>{v.Prefixo} - {v.Placa}</option>
            ))}
          </select>
        </section>

        {/* KM e Tipo */}
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <label className="font-bold text-slate-700">KM Atual</label>
            <input 
              type="number" 
              className="w-full p-3 border rounded-lg bg-slate-50"
              onChange={(e) => setFormData({...formData, km_atual: e.target.value})}
              required
            />
          </div>
          <div className="space-y-2">
            <label className="font-bold text-slate-700">Operação</label>
            <select 
              className="w-full p-3 border rounded-lg bg-slate-50"
              onChange={(e) => setFormData({...formData, tipo_servico: e.target.value})}
            >
              <option value="ENTRADA">ENTRADA</option>
              <option value="SAÍDA">SAÍDA</option>
            </select>
          </div>
        </div>

        {/* Checklist Rápido */}
        <section className="bg-slate-50 p-4 rounded-xl border space-y-4">
          <h3 className="font-bold text-slate-800 flex items-center gap-2">
            <CheckCircle2 size={18} className="text-green-600" /> Checklist Geral
          </h3>
          {['luzes', 'pneus', 'oleo', 'equipamentos'].map(item => (
            <div key={item} className="flex items-center justify-between">
              <span className="capitalize text-slate-600">{item}</span>
              <select 
                className="p-1 border rounded"
                onChange={(e) => setFormData({...formData, [`checklist_${item}`]: e.target.value})}
              >
                <option value="OK">OK</option>
                <option value="AVARIA">AVARIA</option>
              </select>
            </div>
          ))}
        </section>

        {/* Ocorrência Grave */}
        <div className={`p-4 rounded-xl border-2 transition-colors ${formData.houve_alteracoes ? 'border-red-500 bg-red-50' : 'border-slate-200 bg-white'}`}>
          <label className="flex items-center gap-3 cursor-pointer">
            <input 
              type="checkbox" 
              className="w-6 h-6"
              onChange={(e) => setFormData({...formData, houve_alteracoes: e.target.checked})}
            />
            <div>
              <span className="font-bold text-slate-800">OCORRÊNCIA GRAVE / AVARIA?</span>
              <p className="text-xs text-slate-500">Isso impedirá a exclusão automática das fotos após 6 meses.</p>
            </div>
          </label>
        </div>

        {/* Fotos */}
        <section className="space-y-3">
          <label className="font-bold text-slate-700 flex items-center gap-2">
            <Camera size={20} /> Fotos da Vistoria ({fotos.length})
          </label>
          <input 
            type="file" 
            accept="image/*" 
            multiple 
            onChange={handleFileChange}
            className="hidden" 
            id="foto-upload"
          />
          <label 
            htmlFor="foto-upload"
            className="flex items-center justify-center p-8 border-2 border-dashed border-slate-300 rounded-xl bg-slate-50 text-slate-500 hover:bg-slate-100 cursor-pointer"
          >
            Clique para tirar fotos ou anexar
          </label>
          
          <div className="grid grid-cols-3 gap-2">
            {fotos.map((img, i) => (
              <img key={i} src={img} className="w-full h-24 object-cover rounded-lg border" alt="preview" />
            ))}
          </div>
        </section>

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-slate-800 text-white font-bold py-4 rounded-xl flex items-center justify-center gap-2"
        >
          {loading ? <Loader2 className="animate-spin" /> : <><Save /> SALVAR VISTORIA</>}
        </button>
      </form>
    </div>
  );
};

export default Vistoria;
