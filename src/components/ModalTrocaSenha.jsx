import React, { useState } from 'react';
import { Key, X, Loader2, ShieldAlert, CheckCircle2 } from 'lucide-react';
import { useAuth } from '../lib/AuthContext'; // Importe o hook de autenticação
import { gasApi } from '../api/gasClient'; 

const ModalTrocaSenha = ({ user, aoFechar }) => {
  const { mudarSenha } = useAuth(); // Função que atualiza no Firebase
  const [dados, setDados] = useState({ atual: '', nova: '', confirma: '' });
  const [status, setStatus] = useState({ tipo: '', msg: '' });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleTrocar = async (e) => {
    e.preventDefault();
    setStatus({ tipo: '', msg: '' });

    // Validações de Regra de Negócio
    if (dados.nova !== dados.confirma) {
      return setStatus({ tipo: 'erro', msg: 'AS SENHAS NOVAS NÃO COINCIDEM.' });
    }
    if (dados.nova.length < 6) { // Firebase exige no mínimo 6 caracteres
      return setStatus({ tipo: 'erro', msg: 'A SENHA DEVE TER NO MÍNIMO 6 DÍGITOS.' });
    }
    if (dados.nova === '123456') {
      return setStatus({ tipo: 'erro', msg: 'VOCÊ NÃO PODE USAR A SENHA PADRÃO.' });
    }

    setIsSubmitting(true);

    try {
      // 1. Atualiza no Firebase Auth (via AuthContext)
      await mudarSenha(dados.nova);

      // 2. Sincroniza com o GAS (para manter o backup da planilha atualizado)
      // Passamos o RE e a nova senha
      const res = await gasApi.changePassword(user.re, dados.atual, dados.nova);
      
      setStatus({ tipo: 'sucesso', msg: 'SENHA ATUALIZADA EM TODOS OS SISTEMAS!' });
      
      // Delay para o militar ler a mensagem de sucesso
      setTimeout(aoFechar, 2000);
    } catch (err) {
      console.error("Erro ao trocar senha:", err);
      setStatus({ 
        tipo: 'erro', 
        msg: err.message?.includes('recent-login') 
          ? 'POR SEGURANÇA, FAÇA LOGIN NOVAMENTE ANTES DE MUDAR A SENHA.' 
          : 'ERRO AO ATUALIZAR. TENTE NOVAMENTE.' 
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center z-[100] p-4 animate-in fade-in duration-300">
      <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] shadow-2xl w-full max-w-md overflow-hidden border border-slate-200 dark:border-slate-800 animate-in zoom-in-95 duration-200">
        
        {/* HEADER */}
        <div className="bg-slate-900 p-6 text-white flex justify-between items-center border-b-4 border-blue-600">
          <div className="flex items-center gap-3">
            <div className="bg-blue-600 p-2 rounded-xl shadow-lg shadow-blue-900/20">
              <Key size={20} className="text-white" />
            </div>
            <div>
              <h3 className="text-sm font-black uppercase tracking-tighter italic">Segurança P4</h3>
              <p className="text-[9px] text-blue-400 font-bold uppercase tracking-[0.2em]">Criptografia de Acesso</p>
            </div>
          </div>
          <button onClick={aoFechar} className="text-slate-400 hover:text-white transition-colors">
            <X size={24} />
          </button>
        </div>

        <form onSubmit={handleTrocar} className="p-8 space-y-5">
          {status.msg && (
            <div className={`flex items-center gap-3 p-4 rounded-2xl text-[10px] font-black uppercase tracking-tight animate-in slide-in-from-top-2 ${
              status.tipo === 'erro' ? 'bg-red-50 text-red-700 border border-red-100' : 'bg-emerald-50 text-emerald-700 border border-emerald-100'
            }`}>
              {status.tipo === 'erro' ? <ShieldAlert size={18} /> : <CheckCircle2 size={18} />}
              <span className="flex-1">{status.msg}</span>
            </div>
          )}

          <div className="space-y-3">
            {/* O design de input que você criou é excelente, mantive a estrutura */}
            <div className="relative group">
              <label className="text-[9px] font-black text-slate-400 group-focus-within:text-blue-600 uppercase absolute left-4 top-3 transition-colors">Senha Atual</label>
              <input 
                type="password" 
                required
                placeholder="••••••"
                className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 pt-8 pb-3 px-4 rounded-2xl focus:ring-2 focus:ring-blue-600 focus:bg-white outline-none transition-all text-slate-800 dark:text-white font-mono"
                onChange={(e) => setDados({...dados, atual: e.target.value})}
              />
            </div>

            <div className="grid grid-cols-1 gap-3">
              <div className="relative group">
                <label className="text-[9px] font-black text-blue-600 uppercase absolute left-4 top-3">Nova Senha</label>
                <input 
                  type="password" 
                  required
                  placeholder="Mínimo 6 dígitos"
                  className="w-full bg-blue-50/30 border border-blue-100 pt-8 pb-3 px-4 rounded-2xl focus:ring-2 focus:ring-blue-600 focus:bg-white outline-none transition-all text-slate-800 font-mono"
                  onChange={(e) => setDados({...dados, nova: e.target.value})}
                />
              </div>

              <div className="relative group">
                <label className="text-[9px] font-black text-blue-600 uppercase absolute left-4 top-3">Confirmação</label>
                <input 
                  type="password" 
                  required
                  placeholder="Repita a nova senha"
                  className="w-full bg-blue-50/30 border border-blue-100 pt-8 pb-3 px-4 rounded-2xl focus:ring-2 focus:ring-blue-600 focus:bg-white outline-none transition-all text-slate-800 font-mono"
                  onChange={(e) => setDados({...dados, confirma: e.target.value})}
                />
              </div>
            </div>
          </div>

          <div className="pt-2">
            <button 
              type="submit"
              disabled={isSubmitting}
              className="w-full bg-slate-900 hover:bg-blue-700 disabled:opacity-50 text-white font-black py-4 rounded-2xl shadow-xl shadow-blue-900/20 flex items-center justify-center gap-3 transition-all active:scale-95 uppercase text-xs tracking-widest"
            >
              {isSubmitting ? (
                <> <Loader2 className="animate-spin" size={18} /> Processando... </>
              ) : (
                <> <Key size={18} /> Confirmar Alteração </>
              )}
            </button>
            <p className="text-center text-[8px] text-slate-400 font-bold uppercase mt-4 tracking-tighter">
              A senha será alterada para o acesso mobile e painel administrativo.
            </p>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ModalTrocaSenha;
