import React, { useState } from 'react';
import { useAuth } from '../lib/AuthContext';
import { Loader2, ShieldCheck, Lock, User, X } from 'lucide-react';
import { db, collection, query, where, getDocs, updateDoc, doc, addDoc } from '../lib/firebase';

// 🔧 NORMALIZAÇÕES
const normalizarNome = (nome) => {
  return nome
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toUpperCase()
    .trim();
};

const normalizarRE = (re) => {
  const limpo = re.replace(/\D/g, '');
  return limpo.startsWith("10000") ? limpo.slice(5) : limpo;
};

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

  const [resetError, setResetError] = useState('');
  const [tentativas, setTentativas] = useState(0);
  const [bloqueadoAte, setBloqueadoAte] = useState(null);

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

    const reLimpo = normalizarRE(credentials.matricula);

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

  // 🔍 VALIDAR USUÁRIO
  const validarUsuario = async () => {
    setResetError('');

    if (bloqueadoAte && new Date() < bloqueadoAte) {
      return setResetError("Muitas tentativas. Aguarde 5 minutos.");
    }

    const reLimpo = normalizarRE(resetData.matricula);
    const nomeLimpo = normalizarNome(resetData.nome_guerra);

    if (!reLimpo || !nomeLimpo) {
      return setResetError("Preencha matrícula e nome de guerra.");
    }

    if (tentativas >= 5) {
      setBloqueadoAte(new Date(Date.now() + 5 * 60000));
      return setResetError("Limite atingido. Tente novamente em 5 minutos.");
    }

    setResetLoading(true);

    try {
      const q = query(
        collection(db, "usuarios"),
        where("re", "==", reLimpo)
      );

      const snap = await getDocs(q);

      const usuario = snap.docs.find(doc => {
        const data = doc.data();
        return normalizarNome(data.nome_guerra) === nomeLimpo;
      });

      if (!usuario) {
        setTentativas(t => t + 1);
        return setResetError("Dados não conferem com nossos registros.");
      }

      setUserDocId(usuario.id);
      setResetStep(2);

    } catch (err) {
      setResetError("Erro ao validar dados.");
    } finally {
      setResetLoading(false);
    }
  };

  // 🔑 ALTERAR SENHA
  const alterarSenha = async () => {
    setResetError('');

    if (!resetData.novaSenha) {
      return setResetError("Digite uma nova senha.");
    }

    if (resetData.novaSenha !== resetData.confirmarSenha) {
      return setResetError("As senhas não coincidem.");
    }

    setResetLoading(true);

    try {
      const reLimpo = normalizarRE(resetData.matricula);

      await updateDoc(doc(db, "usuarios", userDocId), {
        senha: resetData.novaSenha,
        forcarLogout: true,
        atualizadoEm: new Date().toISOString()
      });

      // 🔐 LOG
      await addDoc(collection(db, "logs"), {
        tipo: "RESET_SENHA",
        re: reLimpo,
        data: new Date().toISOString(),
        origem: "LOGIN_SCREEN"
      });

      alert("Senha alterada com sucesso!");
      fecharModalReset();

    } catch (err) {
      setResetError("Erro ao atualizar senha.");
    } finally {
      setResetLoading(false);
    }
  };

  const fecharModalReset = () => {
    setShowReset(false);
    setResetStep(1);
    setTentativas(0);
    setBloqueadoAte(null);
    setResetError('');
    setResetData({ matricula: '', nome_guerra: '', novaSenha: '', confirmarSenha: '' });
    setUserDocId(null);
  };

  return (
    <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center p-6 font-sans">
      
      <div className="mb-10 text-center">
        <div className="bg-blue-600 w-20 h-20 rounded-3xl flex items-center justify-center mx-auto mb-4">
          <ShieldCheck size={40} className="text-white" />
        </div>
        <h1 className="text-white font-black text-2xl uppercase">
          Garagem <span className="text-blue-500">1º BPM</span>
        </h1>
      </div>

      <div className="bg-white w-full max-w-sm rounded-[2.5rem] p-8 shadow-2xl">
        <form onSubmit={handleLogin} className="space-y-4">
          {error && (
            <div className="bg-red-50 text-red-600 p-3 rounded-xl text-xs font-bold text-center">
              {error}
            </div>
          )}

          <div className="relative">
            <User className="absolute left-4 top-4 text-slate-400" size={20} />
            <input
              placeholder="Matrícula (RE)"
              className="w-full p-4 pl-12 rounded-2xl bg-slate-100"
              value={credentials.matricula}
              onChange={(e) => setCredentials({...credentials, matricula: e.target.value})}
            />
          </div>

          <div className="relative">
            <Lock className="absolute left-4 top-4 text-slate-400" size={20} />
            <input
              type="password"
              placeholder="Senha"
              className="w-full p-4 pl-12 rounded-2xl bg-slate-100"
              value={credentials.password}
              onChange={(e) => setCredentials({...credentials, password: e.target.value})}
            />
          </div>

          <button className="w-full bg-slate-900 text-white py-4 rounded-2xl font-bold">
            {loading ? <Loader2 className="animate-spin" /> : "ENTRAR"}
          </button>
        </form>

        <button
          onClick={() => setShowReset(true)}
          className="mt-6 w-full text-xs text-blue-600 font-black uppercase"
        >
          Esqueci minha senha
        </button>
      </div>

      {showReset && (
        <div className="fixed inset-0 bg-slate-900/95 flex items-center justify-center p-6">
          <div className="bg-white p-8 rounded-[2.5rem] w-full max-w-sm space-y-6 relative">

            <button onClick={fecharModalReset} className="absolute right-6 top-6">
              <X />
            </button>

            <h2 className="text-xl font-black text-center">
              🔐 Recuperação de Acesso
            </h2>

            {resetError && (
              <div className="bg-red-50 text-red-600 p-3 rounded-xl text-xs font-bold text-center">
                {resetError}
              </div>
            )}

            {resetStep === 1 ? (
              <>
                <input placeholder="Matrícula" className="w-full p-4 bg-slate-100 rounded-2xl"
                  onChange={(e) => setResetData({...resetData, matricula: e.target.value})}
                />
                <input placeholder="Nome de Guerra" className="w-full p-4 bg-slate-100 rounded-2xl"
                  onChange={(e) => setResetData({...resetData, nome_guerra: e.target.value})}
                />
                <button onClick={validarUsuario} className="w-full bg-blue-600 text-white p-4 rounded-2xl">
                  {resetLoading ? "..." : "VALIDAR"}
                </button>
              </>
            ) : (
              <>
                <input type="password" placeholder="Nova senha" className="w-full p-4 bg-slate-100 rounded-2xl"
                  onChange={(e) => setResetData({...resetData, novaSenha: e.target.value})}
                />
                <input type="password" placeholder="Confirmar senha" className="w-full p-4 bg-slate-100 rounded-2xl"
                  onChange={(e) => setResetData({...resetData, confirmarSenha: e.target.value})}
                />
                <button onClick={alterarSenha} className="w-full bg-green-600 text-white p-4 rounded-2xl">
                  {resetLoading ? "..." : "CONFIRMAR"}
                </button>
              </>
            )}

          </div>
        </div>
      )}
    </div>
  );
};

export default Login;
