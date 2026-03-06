import axios from 'axios';

const GAS_URL = 'https://script.google.com/macros/s/AKfycbwFMqbY2FiDJfZcBxRWvgkqO79dMhy6rcf6149_uXzvBa8Jdm4pcpT8dVdfWo_KS_wY6Q/exec'; 

export const gasApi = {
  /**
   * Método base para todas as chamadas
   */
  post: async (action, payload = {}) => {
    const startTime = Date.now();
    try {
      console.log(`%c[API Request] ${action}`, 'color: #3b82f6; font-weight: bold;', payload);

      const response = await axios({
        method: 'post',
        url: GAS_URL,
        // O Google Apps Script lê o corpo do POST via e.postData.contents
        data: { action, payload }, 
        headers: { 'Content-Type': 'text/plain;charset=utf-8' }
      });

      // O GAS às vezes retorna a resposta como string dentro de um objeto
      let data = response.data;
      if (typeof data === 'string') {
        try { data = JSON.parse(data); } catch (e) { /* não era JSON */ }
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
      
      if (!error.response) {
        // Erro de rede (CORS ou sem internet)
        return { 
          status: "error", 
          message: "Falha de conexão: Verifique sua internet ou permissões de CORS." 
        };
      }
      return { status: "error", message: "Erro inesperado no servidor." };
    }
  },

  // --- MÉTODOS DE AUTENTICAÇÃO E PERFIL ---
  login: (re, senha) => gasApi.post('login', { re, senha }),
  checkProfile: (re) => gasApi.post('checkProfile', { re }),
  changePassword: (re, senhaAtual, novaSenha) => 
    gasApi.post('changePassword', { re, senhaAtual, novaSenha }),

  // --- VISTORIAS ---
  saveVistoria: (dados) => gasApi.post('saveVistoria', dados),
  getVistoriasPendentes: () => gasApi.post('getVistoriasPendentes'),
  confirmarVistoriaGarageiro: (dados) => gasApi.post('confirmarVistoriaGarageiro', dados),

  // --- VIATURAS ---
  getViaturas: () => gasApi.post('getViaturas'),
  addViatura: (dados) => gasApi.post('addViatura', dados),
  baixarViatura: (prefixo, motivo) => gasApi.post('baixarViatura', { prefixo, motivo }),
  alterarStatusViatura: async (prefixo, novoStatus, info = {}) => {
    const res = await gasApi.post('alterarStatusViatura', { prefixo, novoStatus, ...info });
    // Pequeno delay para garantir sincronia do banco de dados do Google
    await new Promise(r => setTimeout(r, 600));
    return res;
  },

  // --- MANUTENÇÃO E EFETIVO ---
  buscarMilitar: (re) => gasApi.post('buscarMilitar', { re }),
  getEfetivoCompleto: () => gasApi.post('getEfetivoCompleto'),
  
  /**
   * Registra manutenção geral (mecânica, elétrica, etc)
   */
  registrarManutencao: (dados) => gasApi.post('registrarManutencao', dados),

  /**
   * Método específico para o Modal de Troca de Óleo
   * O Payload aqui já vai com: prefixo, km_troca, foto (base64), militar_re
   */
  registrarTrocaOleo: (dados) => gasApi.post('registrarTrocaOleo', dados),

  // --- SISTEMA ---
  limparCache: () => gasApi.post('limparCache'),
};
