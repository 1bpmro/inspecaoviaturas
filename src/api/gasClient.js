import axios from 'axios';
import { db } from '../lib/firebase';
import { doc, updateDoc } from 'firebase/firestore';

const GAS_URL = 'https://script.google.com/macros/s/AKfycbwFMqbY2FiDJfZcBxRWvgkqO79dMhy6rcf6149_uXzvBa8Jdm4pcpT8dVdfWo_KS_wY6Q/exec'; 

/**
 * Mantemos para segurança caso algum dado Base64 escape 
 * (ex: assinaturas ou pequenas fotos de perfil que não vão pro Cloudinary)
 */
const cleanBase64 = (item) => {
  if (typeof item === 'string' && item.includes('base64,')) {
    return item.split('base64,')[1];
  }
  if (Array.isArray(item)) return item.map(cleanBase64);
  if (typeof item === 'object' && item !== null) {
    const newObj = {};
    for (const key in item) { newObj[key] = cleanBase64(item[key]); }
    return newObj;
  }
  return item;
};

export const gasApi = {
  post: async (action, payload = {}) => {
    const startTime = Date.now();
    const optimizedPayload = cleanBase64(payload);

    try {
      const response = await axios({
        method: 'post',
        url: GAS_URL,
        data: JSON.stringify({ action, payload: optimizedPayload }), 
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        timeout: 60000 
      });

      let data = response.data;
      if (typeof data === 'string') {
        try { data = JSON.parse(data); } catch (e) { console.warn("Erro parse JSON GAS:", data); }
      }

      console.log(`%c[GAS API] ${action} (${Date.now() - startTime}ms)`, 'color: #3b82f6; font-weight: bold;', data);
      return data;

    } catch (error) {
      console.error(`[GAS Network Error] ${action}`, error);
      return { status: "error", message: "Erro de conexão com o servidor da Planilha." };
    }
  },

  // --- MÉTODOS DE VISTORIA ---
  saveVistoria: (dados) => gasApi.post('saveVistoria', dados),
  
  // --- GESTÃO DE FROTA COM SINCRONIA FIREBASE ---
  alterarStatusViatura: async (prefixo, novoStatus, info = {}) => {
    // 1. Atualiza na Planilha (Registro Histórico)
    const res = await gasApi.post('alterarStatusViatura', { prefixo, novoStatus, ...info });
    
    // 2. Sincroniza no Firebase (Visualização em Tempo Real)
    try {
      const vtrRef = doc(db, "viaturas", prefixo);
      await updateDoc(vtrRef, {
        status: novoStatus,
        ultimaAtualizacao: new Date().toISOString(),
        ...info
      });
    } catch (e) {
      console.warn("Vtr não monitorada no Firebase, atualizada apenas na planilha.");
    }
    
    await new Promise(r => setTimeout(r, 800));
    return res;
  },

  // --- DEMAIS MÉTODOS ---
  getViaturas: () => gasApi.post('getViaturas'),
  registrarManutencao: (dados) => gasApi.post('registrarManutencao', dados),
  changePassword: (re, atual, nova) => gasApi.post('changePassword', { re, atual, nova }),
  buscarMilitar: (re) => gasApi.post('buscarMilitar', { re }),
};
