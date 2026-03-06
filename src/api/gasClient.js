import axios from 'axios';

const GAS_URL = 'https://script.google.com/macros/s/AKfycbwFMqbY2FiDJfZcBxRWvgkqO79dMhy6rcf6149_uXzvBa8Jdm4pcpT8dVdfWo_KS_wY6Q/exec'; 

export const gasApi = {
  // Função genérica de post (mantida conforme seu padrão)
  post: async (action, payload = {}) => {
    const startTime = Date.now();
    try {
      console.log(`%c[API Request] ${action}`, 'color: #3b82f6; font-weight: bold;', payload);
      const response = await axios({
        method: 'post',
        url: GAS_URL,
        data: { action, payload }, 
        headers: { 'Content-Type': 'text/plain;charset=utf-8' }
      });

      let data = response.data;
      if (typeof data === 'string') {
        try { data = JSON.parse(data); } catch (e) { }
      }

      const duration = Date.now() - startTime;
      if (data.status === 'success') {
        console.log(`%c[API Success] ${action} (${duration}ms)`, 'color: #10b981; font-weight: bold;', data);
      } else {
        console.error(`%c[API Error Output] ${action}`, 'color: #ef4444; font-weight: bold;', data.message || data);
      }
      return data;
    } catch (error) {
      console.error(`%c[API Network Error] ${action}`, 'color: #ef4444; font-weight: bold;', error);
      return { status: "error", message: "Erro inesperado no servidor." };
    }
  },

  // Atalho para manter compatibilidade com o dashboard que enviamos
  doPost: (args) => gasApi.post(args.action, args.payload),

  login: (re, senha) => gasApi.post('login', { re, senha }),
  checkProfile: (re) => gasApi.post('checkProfile', { re }),
  
  // --- FUNÇÕES DE VISTORIA ---
  saveVistoria: (dados) => gasApi.post('saveVistoria', dados),
  getVistoriasPendentes: () => gasApi.post('getVistoriasPendentes'),
  
  // ESSA É A FUNÇÃO QUE FALTAVA PARA O COMANDANTE:
  getHistoricoVistorias: () => gasApi.post('getHistoricoVistorias'),

  confirmarVistoriaGarageiro: async (dados) => {
    const res = await gasApi.post('confirmarVistoriaGarageiro', dados);
    await new Promise(r => setTimeout(r, 1500)); 
    return res;
  },

  // --- GESTÃO DE FROTA ---
  getViaturas: () => gasApi.post('getViaturas'),
  addViatura: (dados) => gasApi.post('addViatura', dados),
  updateViatura: (dados) => gasApi.post('updateViatura', dados), // Adicionado para edição
  baixarViatura: (prefixo, motivo) => gasApi.post('baixarViatura', { prefixo, motivo }),
  alterarStatusViatura: async (prefixo, novoStatus, info = {}) => {
    const res = await gasApi.post('alterarStatusViatura', { prefixo, novoStatus, ...info });
    await new Promise(r => setTimeout(r, 800));
    return res;
  },

  // --- OUTROS ---
  buscarMilitar: (re) => gasApi.post('buscarMilitar', { re }),
  getEfetivoCompleto: () => gasApi.post('getEfetivoCompleto'),
  registrarManutencao: (dados) => gasApi.post('registrarManutencao', dados),
  registrarTrocaOleo: (dados) => gasApi.post('registrarTrocaOleo', dados),
  limparCache: () => gasApi.post('limparCache'),
};
