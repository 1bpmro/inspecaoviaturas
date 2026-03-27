import React, { useState } from "react";
import { gasApi } from "../api/gasClient";

const ForgotPassword = ({ onBack }) => {
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false); // <--- AÇÃO DE SEGURANÇA 1

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

    setLoading(true); // <--- AÇÃO DE SEGURANÇA 2 (Trava)
    try {
      // Ajustado para o padrão gasApi.acao
      const res = await gasApi.validarUsuarioReset({
        re,
        nome_guerra: nome.toUpperCase().trim()
      });

      if (res?.status === "ok") {
        setStep(2);
      } else {
        alert(res?.message || "Dados não conferem com o registro do Batalhão.");
      }
    } catch (error) {
      alert("Falha de conexão com o servidor.");
    } finally {
      setLoading(false); // <--- AÇÃO DE SEGURANÇA 3 (Libera)
    }
  };

  // PASSO 2 → RESETAR SENHA
  const resetarSenha = async () => {
    if (!novaSenha || !confirmar) {
      alert("Preencha os campos de senha.");
      return;
    }

    if (novaSenha !== confirmar) {
      alert("As senhas digitadas não são iguais.");
      return;
    }

    setLoading(true);
    try {
      const res = await gasApi.resetPassword({
        re,
        novaSenha
      });

      if (res?.status === "ok") {
        alert("Senha alterada com sucesso! Use a nova senha para entrar.");
        onBack();
      } else {
        alert("Erro ao atualizar senha no banco de dados.");
      }
    } catch (error) {
      alert("Erro crítico ao processar o reset.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-900 text-white p-6">
      
      {step === 1 && (
        <div className="w-full max-w-md space-y-4">
          <h2 className="text-xl font-black text-center text-amber-500 uppercase tracking-wider">Recuperar Senha</h2>
          <p className="text-xs text-center text-slate-400">Valide seus dados para criar uma nova senha.</p>

          <input
            placeholder="MATRÍCULA (RE)"
            className="w-full p-3 rounded bg-slate-800 border border-slate-700 focus:border-amber-500 outline-none transition-all"
            value={re}
            onChange={e => setRe(e.target.value)}
            disabled={loading}
          />

          <input
            placeholder="NOME DE GUERRA"
            className="w-full p-3 rounded bg-slate-800 border border-slate-700 focus:border-amber-500 outline-none transition-all"
            value={nome}
            onChange={e => setNome(e.target.value)}
            disabled={loading}
          />

          <button 
            onClick={validarUsuario} 
            disabled={loading}
            className={`w-full p-3 rounded font-bold transition-all ${loading ? 'bg-slate-700 text-slate-500' : 'bg-amber-500 hover:bg-amber-600 text-slate-900'}`}
          >
            {loading ? "VALIDANDO..." : "VALIDAR"}
          </button>

          <button onClick={onBack} disabled={loading} className="w-full text-sm text-slate-400 hover:text-white">
            Voltar ao Login
          </button>
        </div>
      )}

      {step === 2 && (
        <div className="w-full max-w-md space-y-4">
          <h2 className="text-xl font-black text-center text-emerald-500 uppercase tracking-wider">Nova Senha</h2>
          <p className="text-xs text-center text-slate-400">Defina uma senha forte que você não esqueça.</p>

          <input
            type="password"
            placeholder="NOVA SENHA"
            className="w-full p-3 rounded bg-slate-800 border border-slate-700 focus:border-emerald-500 outline-none transition-all"
            value={novaSenha}
            onChange={e => setNovaSenha(e.target.value)}
            disabled={loading}
          />

          <input
            type="password"
            placeholder="CONFIRMAR SENHA"
            className="w-full p-3 rounded bg-slate-800 border border-slate-700 focus:border-emerald-500 outline-none transition-all"
            value={confirmar}
            onChange={e => setConfirmar(e.target.value)}
            disabled={loading}
          />

          <button 
            onClick={resetarSenha} 
            disabled={loading}
            className={`w-full p-3 rounded font-bold transition-all ${loading ? 'bg-slate-700 text-slate-500' : 'bg-emerald-500 hover:bg-emerald-600 text-white'}`}
          >
            {loading ? "ATUALIZANDO..." : "ATUALIZAR SENHA"}
          </button>
        </div>
      )}

    </div>
  );
};

export default ForgotPassword;
