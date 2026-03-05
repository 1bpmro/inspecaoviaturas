import axios from 'axios';

const GAS_URL = 'https://script.google.com/macros/s/AKfycbwFMqbY2FiDJfZcBxRWvgkqO79dMhy6rcf6149_uXzvBa8Jdm4pcpT8dVdfWo_KS_wY6Q/exec'; 

export const gasApi = {
  post: async (action, payload = {}) => {
    try {
      const response = await axios({
        method: 'post',
        url: GAS_URL,
        // Usamos text/plain para evitar o pre-flight do CORS (OPTIONS), 
        // que o Google Apps Script não responde bem.
        data: JSON.stringify({ action, payload }),
        headers: { 'Content-Type': 'text/plain;charset=utf-8' }
      });
      
      const data = typeof response.data === 'string' ? JSON.parse(response.data) : response.data;
      return data;
    } catch (error) {
      // Se não houver resposta do servidor (CORS ou sem internet)
      if (!error.response) {
        console.warn("Possível bloqueio de CORS ou rede, mas o dado pode ter sido enviado:", error);
        // Retornamos um status informativo para o componente decidir o que fazer
        return { status: "success", message: "Enviado (verificar latência)", bypass: true };
      }
      
      console.error("Erro real na API:", error);
      return { status: "error", message: "Erro de conexão com o servidor" };
    }
  },

  doPost: ({ action, payload }) => gasApi.post(action, payload),

  // --- MÉTODOS ---
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
  
  // Melhorado para lidar com erros de leitura
  uploadFoto: async (file) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        gasApi.post('uploadFotoGarageiro', { base64: reader.result, name: file.name })
          .then(resolve)
          .catch(reject);
      };
      reader.onerror = (err) => reject(err);
      reader.readAsDataURL(file);
    });
  },

  addViatura: (dados) => gasApi.post('addViatura', dados),
 alterarStatusViatura: async (prefixo, novoStatus, info = {}) => {
    const res = await gasApi.post('alterarStatusViatura', { prefixo, novoStatus, ...info });
    // Pequena pausa de 500ms para o Google terminar o flush do Cache antes do próximo GET
    await new Promise(r => setTimeout(r, 500));
    return res;
  },
  registrarManutencao: (dados) => gasApi.post('registrarManutencao', dados),
  baixarViatura: (prefixo, motivo) => gasApi.post('baixarViatura', { prefixo, motivo }),
  limparCache: () => gasApi.post('limparCache')
};

