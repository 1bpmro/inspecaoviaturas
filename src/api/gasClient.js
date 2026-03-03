import axios from 'axios';

const GAS_URL = 'https://script.google.com/macros/s/AKfycbwFMqbY2FiDJfZcBxRWvgkqO79dMhy6rcf6149_uXzvBa8Jdm4pcpT8dVdfWo_KS_wY6Q/exec'; 

export const gasApi = {
  // Função mestre de envio
  post: async (action, payload = {}) => {
    try {
      const response = await axios.post(GAS_URL, JSON.stringify({
        action,
        payload
      }), { headers: { 'Content-Type': 'text/plain' } });
      return response.data;
    } catch (error) {
      console.error("Erro na chamada GAS:", error);
      return { status: "error", message: "Erro de conexão com o servidor PM" };
    }
  },

  // Alias para compatibilidade com chamadas que passam objeto único
  doPost: ({ action, payload }) => gasApi.post(action, payload),

  // --- ROTAS GERAIS ---
  login: (re, senha) => gasApi.post('login', { re, senha }),
  checkProfile: (re) => gasApi.post('checkProfile', { re }),
  
  // NOVA ROTA: Alteração de Senha (usada pelo ModalTrocaSenha)
  changePassword: (re, senhaAtual, novaSenha) => 
    gasApi.post('changePassword', { re, senhaAtual, novaSenha }),

  saveVistoria: (dados) => gasApi.post('saveVistoria', dados),
  getViaturas: () => gasApi.post('getViaturas'),
  buscarMilitar: (re) => gasApi.post('buscarMilitar', { re }),
  getEfetivoCompleto: () => gasApi.post('getEfetivoCompleto'),
  
  // --- ROTAS DO GARAGEIRO ---
  getVistoriasPendentes: () => gasApi.post('getVistoriasPendentes'),
  confirmarVistoriaGarageiro: (dados) => gasApi.post('confirmarVistoriaGarageiro', dados),
  uploadFoto: async (file) => {
    const reader = new FileReader();
    const base64Promise = new Promise((resolve) => {
      reader.onload = () => resolve(reader.result);
      reader.readAsDataURL(file);
    });
    const base64 = await base64Promise;
    return gasApi.post('uploadFotoGarageiro', { base64, name: file.name });
  },

  // --- ROTAS ADMINISTRATIVAS ---
  addViatura: (dados) => gasApi.post('addViatura', dados),

  alterarStatusViatura: (prefixo, novoStatus, info = {}) => 
    gasApi.post('alterarStatusViatura', { prefixo, novoStatus, ...info }),

  registrarManutencao: (dados) => gasApi.post('registrarManutencao', dados),
  
  baixarViatura: (prefixo, motivo) => gasApi.post('baixarViatura', { prefixo, motivo }),
  
  limparCache: () => gasApi.post('limparCache')
};
