import axios from 'axios';

const GAS_URL = 'https://script.google.com/macros/s/AKfycbyvHuSu3NC11cPaYfgnSlB_MvTyeGvnK1NJeeHZafZyTqCDoSENTGHRr8XFIABYEVKq2g/exec';

export const gasApi = {
  login: async (re, senha) => {
    try {
      const response = await axios.post(GAS_URL, {
        action: 'login',
        payload: { re, senha }
      }, { headers: { 'Content-Type': 'text/plain' } });
      return response.data;
    } catch (error) {
      return { status: "error", message: "Erro ao conectar com o servidor" };
    }
  },

  saveVistoria: async (dados) => {
    const response = await axios.post(GAS_URL, {
      action: 'saveVistoria',
      payload: dados
    }, { headers: { 'Content-Type': 'text/plain' } });
    return response.data;
  },

  getViaturas: async () => {
    const response = await axios.post(GAS_URL, { action: 'getViaturas' }, 
    { headers: { 'Content-Type': 'text/plain' } });
    return response.data;
  }
};
