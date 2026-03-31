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
  /** Método Base para chamadas POST */
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

  // --- MÉTODOS DO GARAGEIRO ---
  getVistoriasPendentes: () => gasApi.post('getVistoriasPendentes'),

  /** * BUSCA UNIFICADA: Busca dados fixos na PATRIMONIO 
   * e a guarnição atual na PAINEL 
   */
  getDadosCompletosVtr: (prefixo) => gasApi.post('getDadosCompletosVtr', { prefixo }),

  // --- MÉTODOS DO GARAGEIRO ---
  getVistoriasPendentes: () => gasApi.post('getVistoriasPendentes'),

  /** SOLUÇÃO DO ERRO: Busca a última vistoria de uma VTR específica */
  getUltimaVistoria: (prefixo) => gasApi.post('getUltimaVistoria', { prefixo }),

  /** Finaliza a análise do garageiro e libera ou baixa a VTR */
  confirmarVistoriaGarageiro: (dados) => gasApi.post('confirmarVistoriaGarageiro', dados),

  /** Força uma ação administrativa na viatura */
  forcarAcaoViatura: async (dados) => {
    const res = await gasApi.post('forcarAcaoViatura', dados);
    if (res?.status === "success" || res?.status === "ok") {
      try {
        const vtrRef = doc(db, "viaturas", dados.prefixo);
        await updateDoc(vtrRef, {
          status: dados.acao === "LIBERAR" ? "DISPONIVEL" : "MANUTENCAO",
          atualizadoEm: new Date().toISOString()
        });
      } catch (e) { console.warn("Firebase Sync (garageiro) falhou"); }
    }
    return res;
  },

  // --- VISTORIAS E MANUTENÇÃO ---
  saveVistoria: (dados) => gasApi.post('saveVistoria', dados),
  registrarManutencao: (dados) => gasApi.post('registrarManutencao', dados),
  getViaturas: () => gasApi.post('getViaturas'),

  // --- EFETIVO E SEGURANÇA ---
  getEfetivo: () => gasApi.post('getEfetivoCompleto'), // Apelido para facilitar
  getEfetivoCompleto: () => gasApi.post('getEfetivoCompleto'),
  buscarMilitar: (re) => gasApi.post('buscarMilitar', { re }),

  /** Validação de RE + Nome de Guerra para Reset */
  validarUsuarioReset: (re, nome_guerra) => 
    gasApi.post('validarUsuarioReset', { re, nome_guerra }),

  /** Reset final de senha na planilha */
  resetPassword: (re, novaSenha) => 
    gasApi.post('resetPassword', { re, novaSenha }),

  /** Troca de senha logado */
  changePassword: (re, senhaAtual, novaSenha) => 
    gasApi.post('changePassword', { re, senhaAtual, novaSenha }),

  // --- GESTÃO DE FROTA ---
  alterarStatusViatura: async (prefixo, novoStatus, info = {}) => {
    const res = await gasApi.post('alterarStatusViatura', { prefixo, novoStatus, ...info });
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
};

// Debug no console do navegador
window.gasApi = gasApi;
