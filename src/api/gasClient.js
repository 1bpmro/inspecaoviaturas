import axios from 'axios';

const GAS_URL = 'https://script.google.com/macros/s/AKfycbwFMqbY2FiDJfZcBxRWvgkqO79dMhy6rcf6149_uXzvBa8Jdm4pcpT8dVdfWo_KS_wY6Q/exec'; 

/**
 * Auxiliar para reduzir o tamanho do payload removendo metadados das imagens.
 * O Google Apps Script (Utilities.newBlob) prefere receber apenas a string Base64 pura.
 */
const cleanBase64 = (item) => {
  // Se for uma string, verifica se é um Base64 com metadados e limpa
  if (typeof item === 'string' && item.includes('base64,')) {
    return item.split('base64,')[1];
  }
  
  // Se for Array (como lista de fotos), limpa cada item recursivamente
  if (Array.isArray(item)) {
    return item.map(cleanBase64);
  }
  
  // Se for objeto (como o payload da vistoria), limpa as propriedades internas
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
    
    // MELHORIA: Limpeza automática de imagens para diminuir o payload e evitar erros no GAS
    const optimizedPayload = cleanBase64(payload);

    try {
      console.log(`%c[API Request] ${action}`, 'color: #3b82f6; font-weight: bold;', payload);
      
      const response = await axios({
        method: 'post',
        url: GAS_URL,
        // Enviamos como text/plain para evitar o Preflight do CORS (OPTIONS request) 
        // que o Google Apps Script não consegue processar corretamente.
        data: JSON.stringify({ action, payload: optimizedPayload }), 
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        // Timeout de 60s é ideal para processamento de fotos no Drive
        timeout: 60000 
      });

      let data = response.data;
      
      // Garante que a resposta seja um objeto JSON
      if (typeof data === 'string') {
        try { 
          data = JSON.parse(data); 
        } catch (e) { 
          console.warn("Resposta não é um JSON válido:", data);
        }
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
      
      const msg = error.code === 'ECONNABORTED' 
        ? "Servidor demorou muito a responder. Tente fotos menores ou aguarde." 
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
    // Delay estratégico para garantir sincronização da planilha antes de recarregar dados
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
