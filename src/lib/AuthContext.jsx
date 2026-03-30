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
          // 1. Extrai e normaliza o RE do e-mail
          let reBase = firebaseUser.email?.split('@')[0] || "";
          let reUsuario = reBase.trim().toLowerCase();

          console.log("Sistema: Tentando carregar perfil para o RE:", reUsuario);

          // 2. TENTATIVA A: Busca direta pelo ID (Caminho mais rápido)
          const userRef = doc(db, "usuarios", reUsuario);
          const userSnap = await getDoc(userRef);

          if (userSnap.exists()) {
            const dados = userSnap.data();
            console.log("Sucesso: Perfil carregado via ID direto.");
            setUser({ 
              uid: firebaseUser.uid, 
              ...dados,
              nome: dados.nome_guerra || "Militar" 
            });
          } else {
            // 3. TENTATIVA B: Busca via Query (Fallback se o ID do doc for diferente)
            console.warn("Aviso: Doc não achado pelo ID. Tentando busca por campo 're'...");
            const q = query(collection(db, "usuarios"), where("re", "==", reUsuario));
            const querySnapshot = await getDocs(q);

            if (!querySnapshot.empty) {
              const userDoc = querySnapshot.docs[0];
              const dados = userDoc.data();
              console.log("Sucesso: Perfil carregado via Query.");
              setUser({ 
                uid: firebaseUser.uid, 
                ...dados,
                nome: dados.nome_guerra || "Militar" 
              });
            } else {
              // 4. Se nada funcionar, define perfil básico para não quebrar o App
              console.error("Erro: Militar não encontrado no Firestore.");
              setUser({ 
                uid: firebaseUser.uid, 
                re: reUsuario,
                nome: "Militar",
                nivelAcesso: 'POLICIAL'
              });
            }
          }
        } catch (error) {
          console.error("Erro crítico ao carregar perfil:", error);
        }
      } else {
        setUser(null);
      }
      setLoading(false);
    });
    return unsubscribe;
  }, []);

  const login = async (matricula, senha) => {
    let reProcessado = String(matricula || "").trim().toLowerCase();
    if (reProcessado.length > 0 && reProcessado.length <= 6) {
      reProcessado = "1000" + reProcessado; 
    }
    const email = `${reProcessado}@pm.br`;

    try {
      const result = await signInWithEmailAndPassword(auth, email, senha);
      return { user: result.user, needsPasswordChange: senha === '123456' };
    } catch (error) {
      console.warn("Falha no login Firebase. Verificando Planilha...");

      try {
        const resGas = await gasApi.post('validarLoginPlanilha', { 
          re: reProcessado, 
          senha: senha 
        });

        if (resGas?.status === "ok") {
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
      const reUsuario = auth.currentUser.email.split('@')[0].toLowerCase();

      await updatePassword(auth.currentUser, novaSenha);
      
      // Atualiza usando o RE como ID para manter paridade com o GAS
      await setDoc(doc(db, "usuarios", reUsuario), {
        senhaAlterada: true,
        dataUltimaTroca: serverTimestamp() 
      }, { merge: true });

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
