import axios from 'axios';

const GAS_URL = 'https://script.google.com/macros/s/AKfycbwhniNcqyH771_3raryiJTEVrurKW6o40_n_ffHYnXj9aRK0arPDpkhRJ6XbH00tgSC_Q/exec';

export const gasApi = {
  // Ajustado para garantir que a estrutura action/payload chegue correta ao GAS
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
  getEfetivoCompleto: () => gasApi.post('getEfetivoCompleto'),
  
  // Rotas do Garageiro
  getVistoriasPendentes: () => gasApi.post('getVistoriasPendentes'),
  confirmarVistoriaGarageiro: (dados) => gasApi.post('confirmarVistoriaGarageiro', dados),
  alterarStatusViatura: (prefixo, novoStatus) => gasApi.post('alterarStatusViatura', { prefixo, novoStatus }),

  /**
   * NOVA: Faz o upload da foto de avaria tirada pelo garageiro
   */
  uploadFoto: async (file) => {
    const reader = new FileReader();
    const base64Promise = new Promise((resolve) => {
      reader.onload = () => resolve(reader.result);
      reader.readAsDataURL(file);
    });
    const base64 = await base64Promise;
    return gasApi.post('uploadFotoGarageiro', { base64, name: file.name });
  }
};
