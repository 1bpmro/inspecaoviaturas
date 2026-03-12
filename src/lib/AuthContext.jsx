import React, { createContext, useContext, useState, useEffect } from 'react';
import { 
  signInWithEmailAndPassword, 
  onAuthStateChanged, 
  signOut,
  updatePassword 
} from 'firebase/auth';
import { auth, db } from './firebase';
import { doc, getDoc, setDoc } from 'firebase/firestore';

const AuthContext = createContext({});

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // Monitora o estado do login no Firebase
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        // Busca os dados complementares no Firestore (patente, nome, cargo)
        const userDoc = await getDoc(doc(db, "usuarios", firebaseUser.uid));
        if (userDoc.exists()) {
          setUser({ uid: firebaseUser.uid, ...userDoc.data() });
        } else {
          // Caso o usuário exista no Auth mas não no Firestore (fallback)
          setUser({ uid: firebaseUser.uid, re: firebaseUser.email.split('@')[0] });
        }
      } else {
        setUser(null);
      }
      setLoading(false);
    });
    return unsubscribe;
  }, []);

  // Função de Login adaptada para Matrícula
  const login = async (matricula, senha) => {
    // Transforma matrícula em um "e-mail" para o Firebase
    const email = `${matricula.trim()}@pm.br`;
    const result = await signInWithEmailAndPassword(auth, email, senha);
    
    // Verifica se é o primeiro acesso (senha 123456)
    const isFirstAccess = senha === '123456';
    
    return { user: result.user, needsPasswordChange: isFirstAccess };
  };

  const logout = () => signOut(auth);

  const mudarSenha = async (novaSenha) => {
    if (auth.currentUser) {
      await updatePassword(auth.currentUser, novaSenha);
      // Atualiza no Firestore que ele já mudou a senha (opcional)
      await setDoc(doc(db, "usuarios", auth.currentUser.uid), {
        senhaAlterada: true
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
