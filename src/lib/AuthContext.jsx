import React, { createContext, useContext, useState, useEffect } from 'react';
import { 
  signInWithEmailAndPassword, 
  onAuthStateChanged, 
  signOut,
  updatePassword 
} from 'firebase/auth';
import { auth, db, doc, getDoc, setDoc } from './firebase';

const AuthContext = createContext({});

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        try {
          // Busca os dados táticos do militar (Patente, Nome de Guerra, RE)
          const userDoc = await getDoc(doc(db, "usuarios", firebaseUser.uid));
          if (userDoc.exists()) {
            setUser({ uid: firebaseUser.uid, ...userDoc.data() });
          } else {
            // Caso seja um usuário novo ainda sem perfil no Firestore
            setUser({ 
              uid: firebaseUser.uid, 
              re: firebaseUser.email.split('@')[0],
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
    // Converte RE/Matrícula para o formato de e-mail do Firebase
    const email = `${matricula.trim().toLowerCase()}@pm.br`;
    const result = await signInWithEmailAndPassword(auth, email, senha);
    
    // Se a senha for a padrão, avisamos o app para forçar a troca
    const isFirstAccess = senha === '123456';
    return { user: result.user, needsPasswordChange: isFirstAccess };
  };

  const logout = () => signOut(auth);

  const mudarSenha = async (novaSenha) => {
    if (auth.currentUser) {
      await updatePassword(auth.currentUser, novaSenha);
      // Marca no banco que o militar já cumpriu a exigência de segurança
      await setDoc(doc(db, "usuarios", auth.currentUser.uid), {
        senhaAlterada: true,
        dataUltimaTroca: new Date().toISOString()
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
