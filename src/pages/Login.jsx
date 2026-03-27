import React, { useState } from 'react';
import { useAuth } from '../lib/AuthContext';
import { Loader2, ShieldCheck, Lock, User } from 'lucide-react';
import { db, collection, query, where, getDocs, updateDoc, doc } from '../lib/firebase';

const Login = () => {
  const { login } = useAuth();

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const [credentials, setCredentials] = useState({ matricula: '', password: '' });

  // 🔐 RESET SENHA
  const [showReset, setShowReset] = useState(false);
  const [resetStep, setResetStep] = useState(1);

  const [resetData, setResetData] = useState({
    matricula: '',
    nome_guerra: '',
    novaSenha: '',
    confirmarSenha: ''
  });

  const [userDocId, setUserDocId] = useState(null);

  // LOGIN
  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');

    const reLimpo = credentials.matricula.replace(/\D/g, '');

    if (!reLimpo || !credentials.password) {
      return setError('Preencha matrícula e senha.');
    }

    setLoading(true);

    try {
      const { needsPasswordChange } = await login(reLimpo, credentials.password);
      if (needsPasswordChange) {
        alert("⚠️ Senha padrão detectada. Altere sua senha.");
      }
    } catch {
      setError('Matrícula ou senha incorretos.');
    } finally {
      setLoading(false);
    }
  };

  // ETAPA 1: VALIDAR USUÁRIO
  const validarUsuario = async () => {
    if (!resetData.matricula || !resetData.nome_guerra) {
      return alert("Preencha todos os campos.");
    }

    const q = query(
      collection(db, "usuarios"),
      where("re", "==", resetData.matricula),
      where("nome_guerra", "==", resetData.nome_guerra.toUpperCase())
    );

    const snap = await getDocs(q);

    if (snap.empty) {
      return alert("Dados não conferem.");
    }

    setUserDocId(snap.docs[0].id);
    setResetStep(2);
  };

  // ETAPA 2: ALTERAR SENHA
  const alterarSenha = async () => {
    if (!resetData.novaSenha || !resetData.confirmarSenha) {
      return alert("Preencha os campos.");
    }

    if (resetData.novaSenha !== resetData.confirmarSenha) {
      return alert("Senhas não coincidem.");
    }

    await updateDoc(doc(db, "usuarios", userDocId), {
      senha: resetData.novaSenha
    });

    alert("Senha alterada com sucesso!");

    setShowReset(false);
    setResetStep(1);
    setResetData({ matricula:'', nome_guerra:'', novaSenha:'', confirmarSenha:'' });
  };

  return (
    <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center p-6">

      {/* HEADER */}
      <div className="mb-10 text-center">
        <div className="bg-blue-600 w-20 h-20 rounded-3xl flex items-center justify-center mx-auto mb-4">
          <ShieldCheck size={40} className="text-white" />
        </div>
        <h1 className="text-white font-black text-2xl uppercase">
          Garagem <span className="text-blue-500">1º BPM</span>
        </h1>
      </div>

      {/* LOGIN */}
      <div className="bg-white w-full max-w-sm rounded-[2.5rem] p-8">
        <form onSubmit={handleLogin} className="space-y-4">

          {error && <div className="text-red-600 text-xs">{error}</div>}

          <input
            placeholder="Matrícula"
            className="w-full p-4 rounded-xl bg-slate-100"
            value={credentials.matricula}
            onChange={(e) => setCredentials({...credentials, matricula: e.target.value})}
          />

          <input
            type="password"
            placeholder="Senha"
            className="w-full p-4 rounded-xl bg-slate-100"
            value={credentials.password}
            onChange={(e) => setCredentials({...credentials, password: e.target.value})}
          />

          <button className="w-full bg-slate-900 text-white py-4 rounded-xl">
            {loading ? <Loader2 className="animate-spin" /> : "Entrar"}
          </button>
        </form>

        {/* 🔥 BOTÃO ESQUECI */}
        <button
          onClick={() => setShowReset(true)}
          className="mt-4 text-xs text-blue-600 font-bold"
        >
          Esqueci minha senha
        </button>
      </div>

      {/* 🔐 MODAL RESET */}
      {showReset && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center">
          <div className="bg-white p-6 rounded-2xl w-full max-w-sm space-y-4">

            {resetStep === 1 && (
              <>
                <h2 className="font-bold">Validação</h2>

                <input
                  placeholder="Matrícula"
                  className="w-full p-3 bg-slate-100 rounded"
                  onChange={(e) => setResetData({...resetData, matricula: e.target.value})}
                />

                <input
                  placeholder="Nome de guerra"
                  className="w-full p-3 bg-slate-100 rounded"
                  onChange={(e) => setResetData({...resetData, nome_guerra: e.target.value})}
                />

                <button onClick={validarUsuario} className="w-full bg-blue-600 text-white p-3 rounded">
                  Validar
                </button>
              </>
            )}

            {resetStep === 2 && (
              <>
                <h2 className="font-bold">Nova Senha</h2>

                <input
                  type="password"
                  placeholder="Nova senha"
                  className="w-full p-3 bg-slate-100 rounded"
                  onChange={(e) => setResetData({...resetData, novaSenha: e.target.value})}
                />

                <input
                  type="password"
                  placeholder="Confirmar senha"
                  className="w-full p-3 bg-slate-100 rounded"
                  onChange={(e) => setResetData({...resetData, confirmarSenha: e.target.value})}
                />

                <button onClick={alterarSenha} className="w-full bg-green-600 text-white p-3 rounded">
                  Alterar senha
                </button>
              </>
            )}

            <button onClick={() => setShowReset(false)} className="w-full text-red-500 text-xs">
              Cancelar
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default Login;
