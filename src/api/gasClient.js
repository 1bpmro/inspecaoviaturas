import axios from 'axios';

const GAS_URL = 'https://script.google.com/macros/s/AKfycbzOee1PSrMdG5vWs-8u4mKej51gskUfGp_8YTdU_GJs6IQmFYQQy6qGXgIegjPLytuAGA/exec';

export const gasApi = {
  post: async (action, payload = {}) => {
    try {
      const response = await axios.post(GAS_URL, {
        action,
        payload
      }, { headers: { 'Content-Type': 'text/plain' } });
      return response.data;
    } catch (error) {
      return { status: "error", message: "Erro de conexão" };
    }
  },

  login: (re, senha) => gasApi.post('login', { re, senha }),
  checkProfile: (re) => gasApi.post('checkProfile', { re }),
  saveVistoria: (dados) => gasApi.post('saveVistoria', dados),
  getViaturas: (apenasEmServico) => gasApi.post('getViaturas', { apenasEmServico }),
  buscarMilitar: (re) => gasApi.post('buscarMilitar', { re }),
  
  /**
   * BUSCA DE EFETIVO COMPLETO PARA CACHE
   * Utilizada para tornar a busca de militares instantânea no frontend
   */
  getEfetivoCompleto: () => gasApi.post('getEfetivoCompleto'),
  
  // Rotas do Garageiro
  getVistoriasPendentes: () => gasApi.post('getVistoriasPendentes'),
  confirmarVistoriaGarageiro: (dados) => gasApi.post('confirmarVistoriaGarageiro', dados),
  alterarStatusViatura: (prefixo, novoStatus) => gasApi.post('alterarStatusViatura', { prefixo, novoStatus })
};
