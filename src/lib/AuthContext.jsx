import React, { createContext, useState, useContext, useEffect, useRef } from 'react';
import { gasApi } from '../api/gasClient';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const inactivityTimer = useRef(null);

  // Função de logout original mantendo a limpeza do storage
  const logout = () => {
    setUser(null);
    sessionStorage.removeItem('1bpm_user_session');
    if (inactivityTimer.current) clearTimeout(inactivityTimer.current);
  };

  // Lógica para resetar o timer de inatividade (5 minutos)
  const resetInactivityTimer = () => {
    if (inactivityTimer.current) clearTimeout(inactivityTimer.current);
    
    inactivityTimer.current = setTimeout(() => {
      logout();
    }, 5 * 60 * 1000); // 5 minutos exatos
  };

  // Efeito para monitorar F5 e Inatividade
  useEffect(() => {
    // Detecta se a página foi recarregada (F5)
    // Se o tipo de navegação for 'reload', nós matamos a sessão
    const perfEntries = window.performance.getEntriesByType("navigation");
    const isReload = perfEntries.length > 0 && perfEntries[0].type === "reload";

    if (isReload) {
      sessionStorage.removeItem('1bpm_user_session');
      setUser(null);
    }

    setLoading(false);

    // Monitor de interações - só ativa se houver usuário logado
    if (user) {
      const events = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart'];
      
      const handleInteraction = () => resetInactivityTimer();

      events.forEach(event => {
        window.addEventListener(event, handleInteraction);
      });

      resetInactivityTimer(); // Inicia o timer

      return () => {
        events.forEach(event => {
          window.removeEventListener(event, handleInteraction);
        });
        if (inactivityTimer.current) clearTimeout(inactivityTimer.current);
      };
    }
  }, [user]);

  const login = async (re, senha) => {
    try {
      const res = await gasApi.login(re, senha);
      if (res.status === 'success') {
        setUser(res.user);
        // sessionStorage ajuda no isolamento da aba
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
