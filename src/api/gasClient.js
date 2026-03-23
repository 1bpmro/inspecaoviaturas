import axios from 'axios';
import { db } from '../lib/firebase';
import { doc, updateDoc } from 'firebase/firestore';

const GAS_URL = 'https://script.google.com/macros/s/AKfycbwFMqbY2FiDJfZcBxRWvgkqO79dMhy6rcf6149_uXzvBa8Jdm4pcpT8dVdfWo_KS_wY6Q/exec'; 

/**
 * Prepara o payload para o Google Sheets:
 * 1. Limpa Base64 (se houver)
 * 2. Converte Arrays de URLs em Strings separadas por " | "
 */
const preparePayload = (item) => {
  if (typeof item === 'string' && item.includes('base64,')) {
    return item.split('base64,')[1];
  }
  
  if (Array.isArray(item)) {
    if (typeof item[0] === 'string') return item.join(' | ');
    return item.map(preparePayload);
  }
  
  if (typeof item === 'object' && item !== null) {
    const newObj = {};
    for (const key in item) { newObj[key] = preparePayload(item[key]); }
    return newObj;
  }
  
  return item;
};

export const gasApi = {
  post: async (action, payload = {}) => {
    const optimizedPayload = preparePayload(payload);

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
        try { data = JSON.parse(data); } catch (e) { console.warn("Erro parse GAS:", data); }
      }

      return data;
    } catch (error) {
      console.error(`[GAS Error] ${action}`, error);
      return { status: "error", message: "Falha na conexão com o Batalhão." };
    }
  },

  // --- MÉTODOS DO GARAGEIRO (ADICIONADOS) ---
  
  /** Busca vistorias que estão com status AGUARDANDO/PÁTIO */
  getVistoriasPendentes: () => gasApi.post('getVistoriasPendentes'),

  // --- PODER DO GARAGEIRO ---
forcarAcaoViatura: (dados) => 
  gasApi.post('forcarAcaoViatura', dados),

  /** Finaliza a análise do garageiro e libera ou baixa a VTR */
  confirmarVistoriaGarageiro: (dados) => gasApi.post('confirmarVistoriaGarageiro', dados),

  // --- MÉTODOS DE VISTORIA (ENTREGA) ---
  saveVistoria: async (dados) => {
    return await gasApi.post('saveVistoria', dados);
  },

  // --- GESTÃO DE FROTA E STATUS ---
  alterarStatusViatura: async (prefixo, novoStatus, info = {}) => {
    const res = await gasApi.post('alterarStatusViatura', { prefixo, novoStatus, ...info });
    
    // Sincronia Firebase: Mantém o Dashboard Admin atualizado sem delay
    try {
      const vtrRef = doc(db, "viaturas", prefixo);
      await updateDoc(vtrRef, {
        status: novoStatus,
        ...info,
        atualizadoEm: new Date().toISOString()
      });
    } catch (e) { console.warn("Firebase Sync Offline"); }
    
    return res;
  },

  // --- SEGURANÇA E USUÁRIO ---
  changePassword: async (re, senhaAtual, novaSenha) => {
    return await gasApi.post('changePassword', { re, senhaAtual, novaSenha });
  },

  buscarMilitar: (re) => gasApi.post('buscarMilitar', { re }),
  getViaturas: () => gasApi.post('getViaturas'),
  getEfetivoCompleto: () => gasApi.post('getEfetivoCompleto'),
  registrarManutencao: (dados) => gasApi.post('registrarManutencao', dados),
};

// Disponibiliza no window para debug se necessário
window.gasApi = gasApi;
