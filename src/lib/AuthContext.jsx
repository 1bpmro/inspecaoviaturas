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
      // 1. Tenta o login normal no Firebase
      const result = await signInWithEmailAndPassword(auth, email, senha);
      return { user: result.user, needsPasswordChange: senha === '123456' };

    } catch (error) {
      console.warn("Falha no Firebase, verificando planilha...", error.code);

      // 2. Se falhar no Firebase, checamos se a senha bate na Planilha (CASO DE RESET RECENTE)
      // Criamos uma função no gasApi para validar login se precisar, 
      // ou usamos a própria tentativa de buscar o militar.
      const checkGas = await gasApi.buscarMilitar(reProcessado);
      
      // Se o militar existe e a senha na planilha (que o GAS valida) bater:
      // Nota: Aqui você precisaria de uma rota no GAS tipo 'validarSenha' 
      // ou apenas tratar o erro 400 instruindo o usuário.
      
      throw error; // Repassa o erro para o componente de Login tratar (ex: "Senha Inválida")
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
