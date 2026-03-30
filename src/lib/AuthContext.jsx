import React, { createContext, useContext, useState, useEffect } from 'react';
import { signInWithEmailAndPassword, onAuthStateChanged, signOut, updatePassword } from 'firebase/auth';
import { auth, db } from './firebase';
import { 
  doc, 
  getDoc, 
  setDoc, 
  serverTimestamp, 
  collection, 
  query, 
  where, 
  getDocs 
} from 'firebase/firestore';
import { gasApi } from '../api/gasClient';

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
          // 1. Extrai o RE do e-mail do usuário logado (ex: 100012345@pm.br)
          const reUsuario = firebaseUser.email?.split('@')[0];

          // 2. Busca no Firestore pelo campo "re" em vez do UID
          const q = query(
            collection(db, "usuarios"),
            where("re", "==", reUsuario)
          );
          
          const querySnapshot = await getDocs(q);

          if (!querySnapshot.empty) {
            // Encontrou o documento criado pelo Google Sheets (ID numérico)
            const userDoc = querySnapshot.docs[0];
            const dados = userDoc.data();
            
            setUser({ 
              uid: firebaseUser.uid, 
              docId: userDoc.id, // Este será o RE
              ...dados,
              nome: dados.nome_guerra || "Militar" 
            });
          } else {
            // Caso o militar esteja no Auth mas não tenha sido sincronizado no Firestore
            setUser({ 
              uid: firebaseUser.uid, 
              re: reUsuario || "---",
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
      const result = await signInWithEmailAndPassword(auth, email, senha);
      return { user: result.user, needsPasswordChange: senha === '123456' };
    } catch (error) {
      console.warn("Falha no login Firebase. Verificando Planilha...");

      // Tenta validar na planilha via GAS caso a senha tenha sido resetada lá
      try {
        const resGas = await gasApi.post('validarLoginPlanilha', { 
          re: reProcessado, 
          senha: senha 
        });

        if (resGas.status === "ok") {
          alert("Sincronizando sua nova senha com o sistema de segurança...");
          throw new Error("Senha atualizada na planilha! Aguarde 1 minuto para o Firebase processar.");
        }
      } catch (gasError) {
        console.error("Erro na validação GAS:", gasError);
      }

      throw error;
    }
  };

  const logout = () => signOut(auth);

  const mudarSenha = async (novaSenha) => {
    if (auth.currentUser) {
      const reUsuario = auth.currentUser.email.split('@')[0];

      // 1. Atualiza a senha no Firebase Auth (Login)
      await updatePassword(auth.currentUser, novaSenha);
      
      // 2. Atualiza o status no Firestore usando o RE como ID
      await setDoc(doc(db, "usuarios", reUsuario), {
        senhaAlterada: true,
        dataUltimaTroca: serverTimestamp() 
      }, { merge: true });

      // 3. Sincroniza de volta com a Planilha
      await gasApi.resetPassword(reUsuario, novaSenha);
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
