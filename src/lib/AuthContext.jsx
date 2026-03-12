import React, { createContext, useContext, useState, useEffect } from 'react';
import { 
  signInWithEmailAndPassword, 
  onAuthStateChanged, 
  signOut,
  updatePassword 
} from 'firebase/auth';
// Adicionado serverTimestamp na importação abaixo:
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
    // Tratamento preventivo para evitar erro de .trim() em valores vazios
    const re = String(matricula || "").trim().toLowerCase();
    const email = `${re}@pm.br`;
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
