import React, { useState } from 'react';
import { Key, X, Loader2, ShieldAlert, CheckCircle2 } from 'lucide-react';
import { gasApi } from '../api/gasClient'; 

const ModalTrocaSenha = ({ user, aoFechar }) => {
  const [dados, setDados] = useState({ atual: '', nova: '', confirma: '' });
  const [status, setStatus] = useState({ tipo: '', msg: '' });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleTrocar = async (e) => {
    e.preventDefault();
    setStatus({ tipo: '', msg: '' });

    if (dados.nova !== dados.confirma) {
      return setStatus({ tipo: 'erro', msg: 'AS SENHAS NOVAS NÃO COINCIDEM.' });
    }
    if (dados.nova.length < 4) {
      return setStatus({ tipo: 'erro', msg: 'A SENHA DEVE TER NO MÍNIMO 4 DÍGITOS.' });
    }
    if (dados.nova === '123456') {
      return setStatus({ tipo: 'erro', msg: 'VOCÊ NÃO PODE USAR A SENHA PADRÃO.' });
    }

    setIsSubmitting(true);

    try {
      const res = await gasApi.changePassword(user.re, dados.atual, dados.nova);
      if (res.status === 'success') {
        setStatus({ tipo: 'sucesso', msg: 'SENHA ALTERADA COM SUCESSO!' });
        setTimeout(aoFechar, 2000);
      } else {
        setStatus({ tipo: 'erro', msg: res.message || 'SENHA ATUAL INCORRETA.' });
      }
    } catch (err) {
      setStatus({ tipo: 'erro', msg: 'ERRO DE COMUNICAÇÃO COM O SERVIDOR.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center z-[100] p-4">
      <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-2xl w-full max-w-md overflow-hidden border-2 border-slate-200 dark:border-slate-800 animate-in zoom-in-95 duration-200">
        
        {/* CABEÇALHO TÁTICO */}
        <div className="bg-slate-900 p-6 text-white flex justify-between items-center border-b-4 border-blue-600">
          <div className="flex items-center gap-3">
            <div className="bg-blue-600 p-2 rounded-lg">
              <Key size={20} className="text-white" />
            </div>
            <div>
              <h3 className="text-sm font-black uppercase tracking-tighter">Segurança da Conta</h3>
              <p className="text-[10px] text-blue-400 font-bold uppercase tracking-widest">Alterar Senha de Acesso</p>
            </div>
          </div>
          <button onClick={aoFechar} className="text-slate-400 hover:text-white p-1">
            <X size={24} />
          </button>
        </div>

        <form onSubmit={handleTrocar} className="p-8 space-y-5">
          {/* MENSAGENS DE STATUS */}
          {status.msg && (
            <div className={`flex items-center gap-3 p-4 rounded-xl text-[11px] font-black uppercase tracking-tight ${
              status.tipo === 'erro' ? 'bg-red-50 text-red-700 border border-red-200' : 'bg-green-50 text-green-700 border border-green-200'
            }`}>
              {status.tipo === 'erro' ? <ShieldAlert size={18} /> : <CheckCircle2 size={18} />}
              {status.msg}
            </div>
          )}

          {/* INPUTS */}
          <div className="space-y-4">
            <div className="relative">
              <label className="text-[10px] font-black text-slate-400 uppercase absolute left-3 top-2">Senha Atual</label>
              <input 
                type="password" 
                required
                className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 pt-7 pb-3 px-3 rounded-xl focus:ring-2 focus:ring-blue-600 outline-none transition-all text-slate-800 dark:text-white"
                onChange={(e) => setDados({...dados, atual: e.target.value})}
              />
            </div>

            <div className="relative">
              <label className="text-[10px] font-black text-blue-600 uppercase absolute left-3 top-2">Nova Senha</label>
              <input 
                type="password" 
                required
                className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 pt-7 pb-3 px-3 rounded-xl focus:ring-2 focus:ring-blue-600 outline-none transition-all text-slate-800 dark:text-white"
                onChange={(e) => setDados({...dados, nova: e.target.value})}
              />
            </div>

            <div className="relative">
              <label className="text-[10px] font-black text-blue-600 uppercase absolute left-3 top-2">Confirmar Nova Senha</label>
              <input 
                type="password" 
                required
                className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 pt-7 pb-3 px-3 rounded-xl focus:ring-2 focus:ring-blue-600 outline-none transition-all text-slate-800 dark:text-white"
                onChange={(e) => setDados({...dados, confirma: e.target.value})}
              />
            </div>
          </div>

          <button 
            type="submit"
            disabled={isSubmitting}
            className="w-full bg-blue-700 hover:bg-blue-800 disabled:opacity-50 text-white font-black py-4 rounded-2xl shadow-lg flex items-center justify-center gap-2 transition-all active:scale-95 uppercase text-sm"
          >
            {isSubmitting ? <Loader2 className="animate-spin" size={20} /> : 'Atualizar Senha'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default ModalTrocaSenha;
