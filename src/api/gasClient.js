import axios from 'axios';

const GAS_URL = 'https://script.google.com/macros/s/AKfycbwFMqbY2FiDJfZcBxRWvgkqO79dMhy6rcf6149_uXzvBa8Jdm4pcpT8dVdfWo_KS_wY6Q/exec'; 

// Auxiliar para reduzir o tamanho do payload removendo metadados das imagens
const cleanBase64 = (item) => {
  if (typeof item === 'string' && item.startsWith('data:image')) {
    return item.split(',')[1]; // Remove o "data:image/jpeg;base64,"
  }
  if (Array.isArray(item)) {
    return item.map(cleanBase64);
  }
  if (typeof item === 'object' && item !== null) {
    const newObj = {};
    for (const key in item) {
      newObj[key] = cleanBase64(item[key]);
    }
    return newObj;
  }
  return item;
};

export const gasApi = {
  post: async (action, payload = {}) => {
    const startTime = Date.now();
    
    // MELHORIA 1: Limpeza automática de imagens para diminuir o payload
    const optimizedPayload = cleanBase64(payload);

    try {
      console.log(`%c[API Request] ${action}`, 'color: #3b82f6; font-weight: bold;', payload);
      
      const response = await axios({
        method: 'post',
        url: GAS_URL,
        // MELHORIA 2: Enviamos como texto puro para evitar problemas de CORS no Google Apps Script
        data: JSON.stringify({ action, payload: optimizedPayload }), 
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        // MELHORIA 3: Aumento do tempo limite para 60 segundos (essencial para fotos)
        timeout: 60000 
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
      
      // Mensagem mais amigável para erro de timeout
      const msg = error.code === 'ECONNABORTED' 
        ? "Servidor demorou muito a responder. Tente fotos menores." 
        : "Erro de conexão com o servidor do Google.";
        
      return { status: "error", message: msg };
    }
  },

  doPost: (args) => gasApi.post(args.action, args.payload),
  login: (re, senha) => gasApi.post('login', { re, senha }),
  checkProfile: (re) => gasApi.post('checkProfile', { re }),
  
  // --- FUNÇÕES DE VISTORIA ---
  saveVistoria: (dados) => gasApi.post('saveVistoria', dados),
  getVistoriasPendentes: () => gasApi.post('getVistoriasPendentes'),
  getHistoricoVistorias: () => gasApi.post('getHistoricoVistorias'),

  confirmarVistoriaGarageiro: async (dados) => {
    const res = await gasApi.post('confirmarVistoriaGarageiro', dados);
    await new Promise(r => setTimeout(r, 1500)); 
    return res;
  },

  // --- GESTÃO DE FROTA ---
  getViaturas: () => gasApi.post('getViaturas'),
  addViatura: (dados) => gasApi.post('addViatura', dados),
  updateViatura: (dados) => gasApi.post('updateViatura', dados),
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
