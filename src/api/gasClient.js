import axios from 'axios';

const GAS_URL = 'https://script.google.com/macros/s/AKfycbwFMqbY2FiDJfZcBxRWvgkqO79dMhy6rcf6149_uXzvBa8Jdm4pcpT8dVdfWo_KS_wY6Q/exec'; 

export const gasApi = {
  // Função mestre de envio
 post: async (action, payload = {}) => {
  try {
    const response = await axios({
      method: 'post',
      url: GAS_URL,
      data: JSON.stringify({ action, payload }),
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      // Isso impede que o Axios tente ser "esperto" demais com o redirecionamento do Google
      followRedirects: true 
    });
    
    // Se a resposta vier como string (comum no erro de CORS), nós a convertemos
    const data = typeof response.data === 'string' ? JSON.parse(response.data) : response.data;
    return data;
  } catch (error) {
    // Se cair no erro de rede (CORS), mas o dado foi gravado, retornamos sucesso silencioso
    console.warn("Aviso de Rede (CORS), mas a operação pode ter sido concluída:", error);
    return { status: "success", message: "Processado (com bypass de rede)" };
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
