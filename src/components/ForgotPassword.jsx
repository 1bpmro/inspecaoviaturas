import React, { useState } from "react";
import { gasApi } from "../api/gasClient";

const ForgotPassword = ({ onBack }) => {
  const [step, setStep] = useState(1);

  const [re, setRe] = useState("");
  const [nome, setNome] = useState("");

  const [novaSenha, setNovaSenha] = useState("");
  const [confirmar, setConfirmar] = useState("");

  // PASSO 1 → VALIDAR
  const validarUsuario = async () => {
    if (!re || !nome) {
      alert("Preencha todos os campos");
      return;
    }

    const res = await gasApi.post("validarUsuarioReset", {
      re,
      nome_guerra: nome.toUpperCase()
    });

    if (res?.status === "ok") {
      setStep(2);
    } else {
      alert("Dados não conferem");
    }
  };

  // PASSO 2 → RESETAR SENHA
  const resetarSenha = async () => {
    if (!novaSenha || !confirmar) {
      alert("Preencha os campos");
      return;
    }

    if (novaSenha !== confirmar) {
      alert("Senhas não conferem");
      return;
    }

    const res = await gasApi.post("resetPassword", {
      re,
      novaSenha
    });

    if (res?.status === "ok") {
      alert("Senha alterada com sucesso");
      onBack();
    } else {
      alert("Erro ao atualizar senha");
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-900 text-white p-6">
      
      {step === 1 && (
        <div className="w-full max-w-md space-y-4">
          <h2 className="text-xl font-black text-center">Recuperar Senha</h2>

          <input
            placeholder="MATRÍCULA (RE)"
            className="w-full p-3 rounded bg-slate-800"
            value={re}
            onChange={e => setRe(e.target.value)}
          />

          <input
            placeholder="NOME DE GUERRA"
            className="w-full p-3 rounded bg-slate-800"
            value={nome}
            onChange={e => setNome(e.target.value)}
          />

          <button onClick={validarUsuario} className="w-full bg-amber-500 p-3 rounded font-bold">
            Validar
          </button>

          <button onClick={onBack} className="w-full text-sm text-slate-400">
            Voltar
          </button>
        </div>
      )}

      {step === 2 && (
        <div className="w-full max-w-md space-y-4">
          <h2 className="text-xl font-black text-center">Nova Senha</h2>

          <input
            type="password"
            placeholder="NOVA SENHA"
            className="w-full p-3 rounded bg-slate-800"
            value={novaSenha}
            onChange={e => setNovaSenha(e.target.value)}
          />

          <input
            type="password"
            placeholder="CONFIRMAR SENHA"
            className="w-full p-3 rounded bg-slate-800"
            value={confirmar}
            onChange={e => setConfirmar(e.target.value)}
          />

          <button onClick={resetarSenha} className="w-full bg-green-500 p-3 rounded font-bold">
            Atualizar Senha
          </button>
        </div>
      )}

    </div>
  );
};

export default ForgotPassword;
