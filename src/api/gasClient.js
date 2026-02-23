import axios from 'axios';

// Sua URL atualizada do Google Apps Script
const GAS_URL = 'https://script.google.com/macros/s/AKfycbz6ize8YaZWkaQ9UblR1qd03u2ElQ0sacR-y1piPMkj3zP_ivdVK3LTjUoJOHYCdn89pw/exec';

export const gasApi = {
  /**
   * Realiza o login completo
   */
  login: async (re, senha) => {
    try {
      const response = await axios.post(GAS_URL, {
        action: 'login',
        payload: { re, senha }
      }, { headers: { 'Content-Type': 'text/plain' } });
      return response.data;
    } catch (error) {
      return { status: "error", message: "Erro ao conectar com o servidor" };
    }
  },

  /**
   * Checa o perfil do usuário (ADMIN, GARAGEIRO ou POLICIAL) 
   * apenas com o RE, para decidir se mostra o campo de senha.
   */
  checkProfile: async (re) => {
    try {
      const response = await axios.post(GAS_URL, {
        action: 'checkProfile',
        payload: { re }
      }, { headers: { 'Content-Type': 'text/plain' } });
      return response.data;
    } catch (error) {
      return { status: "error", message: "Erro ao verificar perfil" };
    }
  },

  /**
   * Envia os dados da vistoria e as fotos em Base64
   */
  saveVistoria: async (dados) => {
    try {
      const response = await axios.post(GAS_URL, {
        action: 'saveVistoria',
        payload: dados
      }, { headers: { 'Content-Type': 'text/plain' } });
      return response.data;
    } catch (error) {
      return { status: "error", message: "Erro ao salvar vistoria" };
    }
  },

  /**
   * Busca a lista de viaturas na planilha de Patrimônio
   */
  getViaturas: async () => {
    try {
      const response = await axios.post(GAS_URL, { 
        action: 'getViaturas' 
      }, { headers: { 'Content-Type': 'text/plain' } });
      return response.data;
    } catch (error) {
      return { status: "error", message: "Erro ao carregar viaturas" };
    }
  }
};
