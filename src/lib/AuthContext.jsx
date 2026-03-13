import React, { createContext, useContext, useState, useEffect } from 'react';
import { signInWithEmailAndPassword, onAuthStateChanged, signOut, updatePassword } from 'firebase/auth';
import { auth, db, doc, getDoc, setDoc, serverTimestamp } from './firebase';

const AuthContext = createContext({});

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const isAuthenticated = !!user;

  // Normalização para aceitar ADMIN ou Admin
  const isAdmin = user?.nivelAcesso?.toUpperCase() === 'ADMIN';
  const isGarageiro = user?.nivelAcesso?.toUpperCase() === 'GARAGEIRO' || isAdmin;

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        try {
          const userDoc = await getDoc(doc(db, "usuarios", firebaseUser.uid));
          
          if (userDoc.exists()) {
            const dados = userDoc.data();
            // MAPEAMENTO TÁTICO: Garante que nome_guerra seja lido como nome
            setUser({ 
              uid: firebaseUser.uid, 
              ...dados,
              nome: dados.nome_guerra || "Militar" 
            });
          } else {
            // Caso o usuário exista no Auth mas não no Firestore
            setUser({ 
              uid: firebaseUser.uid, 
              re: firebaseUser.email?.split('@')[0] || "---",
              nome: "Militar",
              patente: "2° SGT PM",
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

    const result = await signInWithEmailAndPassword(auth, email, senha);
    const isFirstAccess = senha === '123456';
    
    return { user: result.user, needsPasswordChange: isFirstAccess };
  };

  const logout = () => signOut(auth);

  const mudarSenha = async (novaSenha) => {
    if (auth.currentUser) {
      await updatePassword(auth.currentUser, novaSenha);
      await setDoc(doc(db, "usuarios", auth.currentUser.uid), {
        senhaAlterada: true,
        dataUltimaTroca: serverTimestamp() 
      }, { merge: true });
    }
  };

  return (
    <AuthContext.Provider value={{ 
      user, isAuthenticated, login, logout, mudarSenha, loading, isAdmin, isGarageiro 
    }}>
      {!loading && children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
