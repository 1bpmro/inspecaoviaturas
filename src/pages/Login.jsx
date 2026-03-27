import React, { useState } from 'react';
import { useAuth } from '../lib/AuthContext';
import { Loader2, ShieldCheck, Lock, User, X } from 'lucide-react';
import { db, collection, query, where, getDocs, updateDoc, doc } from '../lib/firebase';

const Login = () => {
  const { login } = useAuth();

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [credentials, setCredentials] = useState({ matricula: '', password: '' });

  // 🔐 RESET SENHA
  const [showReset, setShowReset] = useState(false);
  const [resetStep, setResetStep] = useState(1);
  const [resetLoading, setResetLoading] = useState(false);
  const [userDocId, setUserDocId] = useState(null);

  const [resetData, setResetData] = useState({
    matricula: '',
    nome_guerra: '',
    novaSenha: '',
    confirmarSenha: ''
  });

  // LOGIN
  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');

    const reLimpo = credentials.matricula.replace(/\D/g, '').trim();

    if (!reLimpo || !credentials.password) {
      return setError('Preencha matrícula e senha.');
    }

    setLoading(true);
    try {
      const { needsPasswordChange } = await login(reLimpo, credentials.password);
      if (needsPasswordChange) {
        alert("⚠️ Senha padrão detectada. Altere sua senha no menu de perfil.");
      }
    } catch (err) {
      setError('Matrícula ou senha incorretos.');
    } finally {
      setLoading(false);
    }
  };

  // ETAPA 1: VALIDAR USUÁRIO NO FIREBASE
  const validarUsuario = async () => {
    const reLimpo = resetData.matricula.replace(/\D/g, '').trim();
    const nomeLimpo = resetData.nome_guerra.toUpperCase().trim();

    if (!reLimpo || !nomeLimpo) {
      return alert("Preencha matrícula e nome de guerra.");
    }

    setResetLoading(true);
    try {
      const q = query(
        collection(db, "usuarios"),
        where("re", "==", reLimpo),
        where("nome_guerra", "==", nomeLimpo)
      );

      const snap = await getDocs(q);

      if (snap.empty) {
        alert("Dados não conferem com nossos registros.");
      } else {
        setUserDocId(snap.docs[0].id);
        setResetStep(2);
      }
    } catch (err) {
      alert("Erro ao validar dados. Tente novamente.");
    } finally {
      setResetLoading(false);
    }
  };

  // ETAPA 2: ALTERAR SENHA
  const alterarSenha = async () => {
    if (!resetData.novaSenha || resetData.novaSenha.length < 4) {
      return alert("A senha deve ter pelo menos 4 caracteres.");
    }

    if (resetData.novaSenha !== resetData.confirmarSenha) {
      return alert("As senhas não coincidem.");
    }

    setResetLoading(true);
    try {
      await updateDoc(doc(db, "usuarios", userDocId), {
        senha: resetData.novaSenha
      });

      alert("Senha alterada com sucesso! Faça login agora.");
      fecharModalReset();
    } catch (err) {
      alert("Erro ao atualizar senha.");
    } finally {
      setResetLoading(false);
    }
  };

  const fecharModalReset = () => {
    setShowReset(false);
    setResetStep(1);
    setResetData({ matricula: '', nome_guerra: '', novaSenha: '', confirmarSenha: '' });
    setUserDocId(null);
  };

  return (
    <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center p-6 font-sans">
      
      {/* HEADER */}
      <div className="mb-10 text-center animate-in fade-in zoom-in duration-500">
        <div className="bg-blue-600 w-20 h-20 rounded-3xl flex items-center justify-center mx-auto mb-4 shadow-xl shadow-blue-500/20">
          <ShieldCheck size={40} className="text-white" />
        </div>
        <h1 className="text-white font-black text-2xl uppercase tracking-tighter">
          Garagem <span className="text-blue-500">1º BPM</span>
        </h1>
      </div>

      {/* CARD LOGIN */}
      <div className="bg-white w-full max-w-sm rounded-[2.5rem] p-8 shadow-2xl">
        <form onSubmit={handleLogin} className="space-y-4">
          {error && (
            <div className="bg-red-50 text-red-600 p-3 rounded-xl text-xs font-bold text-center border border-red-100">
              {error}
            </div>
          )}

          <div className="relative">
            <User className="absolute left-4 top-4 text-slate-400" size={20} />
            <input
              placeholder="Matrícula (RE)"
              className="w-full p-4 pl-12 rounded-2xl bg-slate-100 border-none focus:ring-2 focus:ring-blue-500 outline-none transition-all"
              value={credentials.matricula}
              onChange={(e) => setCredentials({...credentials, matricula: e.target.value})}
            />
          </div>

          <div className="relative">
            <Lock className="absolute left-4 top-4 text-slate-400" size={20} />
            <input
              type="password"
              placeholder="Senha"
              className="w-full p-4 pl-12 rounded-2xl bg-slate-100 border-none focus:ring-2 focus:ring-blue-500 outline-none transition-all"
              value={credentials.password}
              onChange={(e) => setCredentials({...credentials, password: e.target.value})}
            />
          </div>

          <button 
            disabled={loading}
            className="w-full bg-slate-900 hover:bg-slate-800 text-white py-4 rounded-2xl font-bold shadow-lg shadow-slate-900/20 transition-all flex items-center justify-center gap-2"
          >
            {loading ? <Loader2 className="animate-spin" size={20} /> : "ENTRAR NO SISTEMA"}
          </button>
        </form>

        <button
          onClick={() => setShowReset(true)}
          className="mt-6 w-full text-center text-xs text-blue-600 font-black uppercase tracking-widest hover:text-blue-700 transition-colors"
        >
          Esqueci minha senha
        </button>
      </div>

      {/* 🔐 MODAL RESET */}
      {showReset && (
        <div className="fixed inset-0 bg-slate-900/95 backdrop-blur-sm flex items-center justify-center p-6 z-50 animate-in fade-in duration-300">
          <div className="bg-white p-8 rounded-[2.5rem] w-full max-w-sm space-y-6 shadow-2xl relative">
            
            <button 
              onClick={fecharModalReset}
              className="absolute right-6 top-6 text-slate-400 hover:text-slate-600"
            >
              <X size={24} />
            </button>

            <div className="text-center">
              <h2 className="text-xl font-black text-slate-900 uppercase">
                {resetStep === 1 ? "Validar Identidade" : "Nova Senha"}
              </h2>
              <p className="text-xs text-slate-500 mt-1">
                {resetStep === 1 ? "Informe seus dados de registro." : "Crie uma senha de acesso rápido."}
              </p>
            </div>

            {resetStep === 1 ? (
              <div className="space-y-3">
                <input
                  placeholder="Matrícula"
                  className="w-full p-4 bg-slate-100 rounded-2xl outline-none focus:ring-2 focus:ring-blue-500"
                  value={resetData.matricula}
                  onChange={(e) => setResetData({...resetData, matricula: e.target.value})}
                />
                <input
                  placeholder="Nome de Guerra"
                  className="w-full p-4 bg-slate-100 rounded-2xl outline-none focus:ring-2 focus:ring-blue-500"
                  value={resetData.nome_guerra}
                  onChange={(e) => setResetData({...resetData, nome_guerra: e.target.value})}
                />
                <button 
                  onClick={validarUsuario} 
                  disabled={resetLoading}
                  className="w-full bg-blue-600 text-white p-4 rounded-2xl font-bold shadow-lg shadow-blue-600/20 flex items-center justify-center"
                >
                  {resetLoading ? <Loader2 className="animate-spin" /> : "VALIDAR DADOS"}
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                <input
                  type="password"
                  placeholder="Nova senha"
                  className="w-full p-4 bg-slate-100 rounded-2xl outline-none focus:ring-2 focus:ring-green-500"
                  onChange={(e) => setResetData({...resetData, novaSenha: e.target.value})}
                />
                <input
                  type="password"
                  placeholder="Confirmar senha"
                  className="w-full p-4 bg-slate-100 rounded-2xl outline-none focus:ring-2 focus:ring-green-500"
                  onChange={(e) => setResetData({...resetData, confirmarSenha: e.target.value})}
                />
                <button 
                  onClick={alterarSenha} 
                  disabled={resetLoading}
                  className="w-full bg-green-600 text-white p-4 rounded-2xl font-bold shadow-lg shadow-green-600/20 flex items-center justify-center"
                >
                  {resetLoading ? <Loader2 className="animate-spin" /> : "CONFIRMAR ALTERAÇÃO"}
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default Login;
