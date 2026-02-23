import React, { createContext, useState, useContext, useEffect } from 'react';
import { gasApi } from '../api/gasClient';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // Ao carregar o app, verifica se já existe um login salvo no navegador
  useEffect(() => {
    const savedUser = localStorage.getItem('1bpm_user_session');
    if (savedUser) {
      setUser(JSON.parse(savedUser));
    }
    setLoading(false);
  }, []);

  const login = async (re, senha) => {
    try {
      const res = await gasApi.login(re, senha);
      if (res.status === 'success') {
        setUser(res.user);
        // Salva a sessão localmente para não precisar logar toda hora
        localStorage.setItem('1bpm_user_session', JSON.stringify(res.user));
        return { success: true };
      } else {
        return { success: false, message: res.message || 'Falha no login' };
      }
    } catch (error) {
      return { success: false, message: 'Erro de conexão com a planilha' };
    }
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('1bpm_user_session');
  };

  return (
    <AuthContext.Provider value={{ 
      user, 
      login, 
      logout, 
      loading, 
      isAuthenticated: !!user,
      isAdmin: user?.role === 'ADMIN',
      isGarageiro: user?.role === 'GARAGEIRO'
    }}>
      {!loading && children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth deve ser usado dentro de um AuthProvider');
  }
  return context;
};
