import React, { createContext, useContext, useState, useEffect } from 'react';
import { 
  signInWithEmailAndPassword, 
  onAuthStateChanged, 
  signOut,
  updatePassword 
} from 'firebase/auth';
import { auth, db, doc, getDoc, setDoc, serverTimestamp } from './firebase';

const AuthContext = createContext({});

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        try {
          const userDoc = await getDoc(doc(db, "usuarios", firebaseUser.uid));
          if (userDoc.exists()) {
            setUser({ uid: firebaseUser.uid, ...userDoc.data() });
          } else {
            setUser({ 
              uid: firebaseUser.uid, 
              re: firebaseUser.email?.split('@')[0] || "---",
              nome: "Militar",
              patente: "SD" 
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
    // 1. Limpa e garante que é string
    let reProcessado = String(matricula || "").trim();

    // 2. Lógica Inteligente: Se o policial digitar apenas 5 ou 6 dígitos, 
    // o sistema completa com "1000" para bater com o banco de dados.
    if (reProcessado.length > 0 && reProcessado.length <= 6) {
      reProcessado = "1000" + reProcessado; 
    }

    // 3. Monta o e-mail para o Firebase Auth
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
    <AuthContext.Provider value={{ user, login, logout, mudarSenha, loading }}>
      {!loading && children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
