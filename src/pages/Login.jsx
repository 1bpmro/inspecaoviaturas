import React, { useState } from 'react';
import { useAuth } from '../lib/AuthContext';
import { Loader2, ShieldCheck, Lock, User, X } from 'lucide-react';
import { db, collection, query, where, getDocs, addDoc } from '../lib/firebase';
import { gasApi } from '../api/gasClient'; // Importe sua API do GAS

// 🔧 NORMALIZAÇÕES
const normalizarNome = (nome) => {
  return nome
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toUpperCase()
    .trim();
};

const normalizarRE = (re) => {
  let limpo = re.replace(/\D/g, '').trim();
  if (limpo.length > 0 && limpo.length <= 6) {
    limpo = "1000" + limpo;
  }
  return limpo;
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
      // Captura a mensagem de erro vinda do AuthContext (Sincronização ou Senha Errada)
      setError(err.message || 'Matrícula ou senha incorretos.');
    } finally {
      setLoading(false);
    }
  };

  // 🔍 VALIDAR USUÁRIO (PASSO 1)
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
      // Busca no Firestore para validar se o militar existe e o nome bate
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

      setResetStep(2);

    } catch (err) {
      setResetError("Erro ao validar dados.");
    } finally {
      setResetLoading(false);
    }
  };

  // 🔑 ALTERAR SENHA (PASSO 2 - VIA GAS PARA SINCRONIA TOTAL)
  const alterarSenha = async () => {
    setResetError('');

    if (!resetData.novaSenha || resetData.novaSenha.length < 6) {
      return setResetError("A senha deve ter no mínimo 6 dígitos.");
    }

    if (resetData.novaSenha !== resetData.confirmarSenha) {
      return setResetError("As senhas não coincidem.");
    }

    setResetLoading(true);

    try {
      const reLimpo = normalizarRE(resetData.matricula);

      // 🚀 O SEGREDO: Chama o GAS que atualiza Planilha + Firebase Admin
      const res = await gasApi.resetPassword(reLimpo, resetData.novaSenha);

      if (res.status === "ok") {
        // 🔐 LOG NO FIREBASE PARA AUDITORIA
        await addDoc(collection(db, "logs"), {
          tipo: "RESET_SENHA_SYNC",
          re: reLimpo,
          data: new Date().toISOString(),
          origem: "LOGIN_SCREEN"
        });

        alert("Senha atualizada! O sistema está sincronizando. Tente logar em instantes.");
        fecharModalReset();
      } else {
        setResetError(res.message || "Erro ao sincronizar senha.");
      }

    } catch (err) {
      setResetError("Erro na comunicação com o servidor.");
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
  };

  return (
    <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center p-6 font-sans">
      
      <div className="mb-10 text-center">
        <div className="bg-blue-600 w-20 h-20 rounded-3xl flex items-center justify-center mx-auto mb-4 shadow-lg shadow-blue-500/20">
          <ShieldCheck size={40} className="text-white" />
        </div>
        <h1 className="text-white font-black text-2xl uppercase tracking-tighter">
          Garagem <span className="text-blue-500">1º BPM</span>
        </h1>
      </div>

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
              type="text"
              placeholder="Matrícula (RE)"
              className="w-full p-4 pl-12 rounded-2xl bg-slate-100 focus:outline-blue-500 transition-all"
              value={credentials.matricula}
              onChange={(e) => setCredentials({...credentials, matricula: e.target.value})}
            />
          </div>

          <div className="relative">
            <Lock className="absolute left-4 top-4 text-slate-400" size={20} />
            <input
              type="password"
              placeholder="Senha"
              className="w-full p-4 pl-12 rounded-2xl bg-slate-100 focus:outline-blue-500 transition-all"
              value={credentials.password}
              onChange={(e) => setCredentials({...credentials, password: e.target.value})}
            />
          </div>

          <button 
            type="submit"
            disabled={loading}
            className="w-full bg-slate-900 text-white py-4 rounded-2xl font-bold flex items-center justify-center hover:bg-slate-800 transition-colors"
          >
            {loading ? <Loader2 className="animate-spin" size={24} /> : "ENTRAR"}
          </button>
        </form>

        <button
          onClick={() => setShowReset(true)}
          className="mt-6 w-full text-xs text-blue-600 font-black uppercase tracking-widest hover:text-blue-700 transition-colors"
        >
          Esqueci minha senha
        </button>
      </div>

      {showReset && (
        <div className="fixed inset-0 bg-slate-900/95 flex items-center justify-center p-6 z-50 backdrop-blur-sm">
          <div className="bg-white p-8 rounded-[2.5rem] w-full max-w-sm space-y-6 relative animate-in fade-in zoom-in duration-200">

            <button onClick={fecharModalReset} className="absolute right-6 top-6 text-slate-400 hover:text-slate-900">
              <X size={24} />
            </button>

            <div className="text-center">
              <h2 className="text-xl font-black">🔐 Recuperação</h2>
              <p className="text-slate-500 text-xs font-medium">Sincronização Planilha & App</p>
            </div>

            {resetError && (
              <div className="bg-red-50 text-red-600 p-3 rounded-xl text-xs font-bold text-center border border-red-100">
                {resetError}
              </div>
            )}

            {resetStep === 1 ? (
              <div className="space-y-3">
                <input 
                  placeholder="Matrícula" 
                  className="w-full p-4 bg-slate-100 rounded-2xl focus:outline-blue-500"
                  value={resetData.matricula}
                  onChange={(e) => setResetData({...resetData, matricula: e.target.value})}
                />
                <input 
                  placeholder="Nome de Guerra" 
                  className="w-full p-4 bg-slate-100 rounded-2xl focus:outline-blue-500"
                  value={resetData.nome_guerra}
                  onChange={(e) => setResetData({...resetData, nome_guerra: e.target.value})}
                />
                <button 
                  onClick={validarUsuario} 
                  disabled={resetLoading}
                  className="w-full bg-blue-600 text-white p-4 rounded-2xl font-bold hover:bg-blue-700 transition-colors flex items-center justify-center"
                >
                  {resetLoading ? <Loader2 className="animate-spin" /> : "VALIDAR DADOS"}
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                <p className="text-[10px] text-center text-slate-400 uppercase font-bold">Militar Validado! Defina a nova senha:</p>
                <input 
                  type="password" 
                  placeholder="Nova senha" 
                  className="w-full p-4 bg-slate-100 rounded-2xl focus:outline-green-500"
                  onChange={(e) => setResetData({...resetData, novaSenha: e.target.value})}
                />
                <input 
                  type="password" 
                  placeholder="Confirmar senha" 
                  className="w-full p-4 bg-slate-100 rounded-2xl focus:outline-green-500"
                  onChange={(e) => setResetData({...resetData, confirmarSenha: e.target.value})}
                />
                <button 
                  onClick={alterarSenha} 
                  disabled={resetLoading}
                  className="w-full bg-green-600 text-white p-4 rounded-2xl font-bold hover:bg-green-700 transition-colors flex items-center justify-center"
                >
                  {resetLoading ? <Loader2 className="animate-spin" /> : "CONFIRMAR E SINCRONIZAR"}
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
