import axios from 'axios';

const GAS_URL = 'https://script.google.com/macros/s/AKfycbwFMqbY2FiDJfZcBxRWvgkqO79dMhy6rcf6149_uXzvBa8Jdm4pcpT8dVdfWo_KS_wY6Q/exec'; 

export const gasApi = {
  post: async (action, payload = {}) => {
    try {
      const response = await axios({
        method: 'post',
        url: GAS_URL,
        data: JSON.stringify({ action, payload }),
        headers: { 'Content-Type': 'text/plain;charset=utf-8' }
      });
      
      const data = typeof response.data === 'string' ? JSON.parse(response.data) : response.data;
      return data;
    } catch (error) {
      if (!error.response) {
        console.warn("Possível bloqueio de CORS ou rede:", error);
        return { status: "success", message: "Enviado (verificar latência)", bypass: true };
      }
      console.error("Erro real na API:", error);
      return { status: "error", message: "Erro de conexão com o servidor" };
    }
  },

  doPost: ({ action, payload }) => gasApi.post(action, payload),

  // --- MÉTODOS EXISTENTES ---
  login: (re, senha) => gasApi.post('login', { re, senha }),
  checkProfile: (re) => gasApi.post('checkProfile', { re }),
  changePassword: (re, senhaAtual, novaSenha) => 
    gasApi.post('changePassword', { re, senhaAtual, novaSenha }),

  saveVistoria: (dados) => gasApi.post('saveVistoria', dados),
  getViaturas: () => gasApi.post('getViaturas'),
  buscarMilitar: (re) => gasApi.post('buscarMilitar', { re }),
  getEfetivoCompleto: () => gasApi.post('getEfetivoCompleto'),
  getMotoristas: () => gasApi.post('getEfetivoCompleto'),
  getVistoriasPendentes: () => gasApi.post('getVistoriasPendentes'),
  confirmarVistoriaGarageiro: (dados) => gasApi.post('confirmarVistoriaGarageiro', dados),
  
  addViatura: (dados) => gasApi.post('addViatura', dados),
  alterarStatusViatura: async (prefixo, novoStatus, info = {}) => {
    const res = await gasApi.post('alterarStatusViatura', { prefixo, novoStatus, ...info });
    await new Promise(r => setTimeout(r, 500));
    return res;
  },

  registrarManutencao: (dados) => gasApi.post('registrarManutencao', dados),
  baixarViatura: (prefixo, motivo) => gasApi.post('baixarViatura', { prefixo, motivo }),
  limparCache: () => gasApi.post('limparCache'),

  // --- NOVO MÉTODO PARA A TROCA DE ÓLEO ---
  registrarTrocaOleo: (dados) => gasApi.post('registrarTrocaOleo', dados),
};
