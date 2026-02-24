import axios from 'axios';

const GAS_URL = 'https://script.google.com/macros/s/AKfycbxqssl_yJzN1ugOIAve3D2_xkvJ4507AXmwsuBTAk3-jiuvYxk7AN-2dZfsr1D6cUyJ9A/exec';

export const gasApi = {
  // Função genérica para simplificar as chamadas
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
  
  buscarMilitar: (re) => gasApi.post('buscarMilitar', { re }) // Adicionado aqui!

  getVistoriasPendentes: () => gasApi.post('getVistoriasPendentes'),
  
  confirmarVistoriaGarageiro: (dados) => gasApi.post('confirmarVistoriaGarageiro', dados),
  
  alterarStatusViatura: (prefixo, novoStatus) => gasApi.post('alterarStatusViatura', { prefixo, novoStatus }),
};
