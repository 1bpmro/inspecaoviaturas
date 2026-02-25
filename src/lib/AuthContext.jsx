import React, { createContext, useState, useContext, useEffect, useRef } from 'react';
import { gasApi } from '../api/gasClient';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const inactivityTimer = useRef(null);

  // 1. LOGOUT: Limpa tudo e para o cronômetro
  const logout = () => {
    setUser(null);
    sessionStorage.removeItem('1bpm_user_session');
    if (inactivityTimer.current) clearTimeout(inactivityTimer.current);
  };

  // 2. TIMER DE INATIVIDADE (5 MINUTOS)
  const resetInactivityTimer = () => {
    if (inactivityTimer.current) clearTimeout(inactivityTimer.current);
    
    inactivityTimer.current = setTimeout(() => {
      logout();
    }, 5 * 60 * 1000); 
  };

  // 3. EFEITO DE INICIALIZAÇÃO E MONITORAMENTO
  useEffect(() => {
    // IMPORTANTE: Não buscamos nada do storage no carregamento inicial.
    // Isso garante que o F5 deslogue você automaticamente, pois o 'user' começa como null.
    setLoading(false);

    if (user) {
      const events = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart'];
      const handleInteraction = () => resetInactivityTimer();

      events.forEach(event => window.addEventListener(event, handleInteraction));
      resetInactivityTimer();

      return () => {
        events.forEach(event => window.removeEventListener(event, handleInteraction));
        if (inactivityTimer.current) clearTimeout(inactivityTimer.current);
      };
    }
  }, [user]);

  // 4. FUNÇÃO DE LOGIN
  const login = async (re, senha) => {
    try {
      const res = await gasApi.login(re, senha);
      if (res.status === 'success') {
        // Setamos o usuário apenas na memória do React
        setUser(res.user);
        // Opcional: apenas para debug se precisar, mas o app não lerá isso no refresh
        sessionStorage.setItem('1bpm_user_session', JSON.stringify(res.user));
        return { success: true };
      } else {
        return { success: false, message: res.message || 'Falha no login' };
      }
    } catch (error) {
      return { success: false, message: 'Erro de conexão com a planilha' };
    }
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
