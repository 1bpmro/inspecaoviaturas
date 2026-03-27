import React, { createContext, useContext, useState, useEffect } from 'react';
import { signInWithEmailAndPassword, onAuthStateChanged, signOut, updatePassword } from 'firebase/auth';
import { auth, db } from './firebase';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { gasApi } from '../api/gasClient'; // Importe sua API do GAS

const AuthContext = createContext({});

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const isAdmin = user?.nivelAcesso?.toUpperCase() === 'ADMIN';
  const isGarageiro = user?.nivelAcesso?.toUpperCase() === 'GARAGEIRO' || isAdmin;

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        try {
          const userDoc = await getDoc(doc(db, "usuarios", firebaseUser.uid));
          if (userDoc.exists()) {
            const dados = userDoc.data();
            setUser({ 
              uid: firebaseUser.uid, 
              ...dados,
              nome: dados.nome_guerra || "Militar" 
            });
          } else {
            setUser({ 
              uid: firebaseUser.uid, 
              re: firebaseUser.email?.split('@')[0] || "---",
              nome: "Militar",
              nivelAcesso: 'POLICIAL'
            });
          }
        } catch (error) {
          console.error("Erro ao carregar perfil:", error);
        }
      } else {
        setUser(null);
      }
      setLoading(false);
    });
    return unsubscribe;
  }, []);

const login = async (matricula, senha) => {
  let reProcessado = String(matricula || "").trim();
  if (reProcessado.length > 0 && reProcessado.length <= 6) {
    reProcessado = "1000" + reProcessado; 
  }
  const email = `${reProcessado.toLowerCase()}@pm.br`;

  try {
    // 1. Tenta o login padrão (Firebase)
    const result = await signInWithEmailAndPassword(auth, email, senha);
    return { user: result.user, needsPasswordChange: senha === '123456' };

  } catch (error) {
    // 2. Se o Firebase der erro de senha (auth/wrong-password ou auth/invalid-credential)
    console.warn("Senha do Firebase desatualizada. Verificando Planilha...");

    // Chamamos uma nova função no GAS que vamos criar abaixo
    const resGas = await gasApi.post('validarLoginPlanilha', { 
      re: reProcessado, 
      senha: senha 
    });

    if (resGas.status === "ok") {
      // 🚀 VITÓRIA: A senha está certa na planilha! 
      // Agora você precisa de uma conta administrativa ou instruir o usuário 
      // a logar com a senha antiga no Firebase e mudar, OU usar um Token personalizado.
      
      // Para o seu nível atual, a solução mais simples é:
      alert("Sincronizando sua nova senha com o sistema de segurança...");
      
      // O ideal aqui é você ter um usuário "Master" no Firebase que possa 
      // resetar a senha via Cloud Function, mas por enquanto,
      // vamos apenas retornar um erro amigável que explique o delay:
      throw new Error("Senha resetada na planilha! Aguarde um minuto para a atualização.");
    }

    throw error; // Se nem na planilha bater, aí a senha está errada mesmo.
  }
};

  const logout = () => signOut(auth);

  const mudarSenha = async (novaSenha) => {
    if (auth.currentUser) {
      // Atualiza no Firebase Auth
      await updatePassword(auth.currentUser, novaSenha);
      
      // Atualiza no Firestore
      await setDoc(doc(db, "usuarios", auth.currentUser.uid), {
        senhaAlterada: true,
        dataUltimaTroca: serverTimestamp() 
      }, { merge: true });

      // Opcional: Atualizar na Planilha também para manter paridade total
      const re = auth.currentUser.email.split('@')[0];
      await gasApi.resetPassword(re, novaSenha);
    }
  };

  return (
    <AuthContext.Provider value={{ 
      user, isAuthenticated: !!user, login, logout, mudarSenha, loading, isAdmin, isGarageiro 
    }}>
      {!loading && children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
