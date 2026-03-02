import React, { useState } from 'react';
import { useAuth } from '../lib/AuthContext';
import { User, LogOut, ShieldCheck, Key } from 'lucide-react';
import ModalTrocaSenha from './ModalTrocaSenha'; // O modal que criamos antes
import brasaoBpm from '../assets/icon-512.png';

const Header = () => {
  const { user, logout } = useAuth();
  const [showModal, setShowModal] = useState(false);
  const [menuAberto, setMenuAberto] = useState(false);

  if (!user) return null;

  return (
    <>
      <header className="bg-slate-900 border-b-4 border-blue-700 p-3 sticky top-0 z-40 shadow-lg">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          
          {/* LADO ESQUERDO: BRASÃO E NOME DO SISTEMA */}
          <div className="flex items-center gap-3">
            <img src={brasaoBpm} alt="1º BPM" className="h-10 w-10 object-contain shadow-blue-500/50" />
            <div className="hidden md:block">
              <h2 className="text-white font-black text-sm leading-none uppercase tracking-tighter">
                1º BPM - BATALHÃO RONDON
              </h2>
              <span className="text-blue-400 text-[9px] font-bold tracking-widest uppercase">
                Sistema de Inspeção de Viaturas
              </span>
            </div>
          </div>

          {/* LADO DIREITO: INFORMAÇÕES DO MILITAR */}
          <div className="relative flex items-center gap-4">
            <div className="text-right hidden sm:block">
              <p className="text-white font-bold text-xs uppercase leading-none">
                {user.patente} {user.nome}
              </p>
              <p className="text-blue-400 text-[10px] font-black uppercase opacity-80">
                RE {user.re} • {user.role}
              </p>
            </div>

            {/* BOTÃO DE PERFIL COM MENU */}
            <div className="relative">
              <button 
                onClick={() => setMenuAberto(!menuAberto)}
                className="bg-slate-800 p-2 rounded-full border border-slate-700 hover:border-blue-500 transition-all"
              >
                <User className="text-white" size={20} />
              </button>

              {menuAberto && (
                <div className="absolute right-0 mt-3 w-56 bg-white rounded-lg shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in slide-in-from-top-2">
                  <div className="p-4 bg-slate-50 border-b border-slate-200">
                    <p className="text-[10px] font-black text-slate-400 uppercase">Acesso Autenticado</p>
                    <p className="text-xs font-bold text-slate-700">{user.nome}</p>
                  </div>
                  
                  <button 
                    onClick={() => { setShowModal(true); setMenuAberto(false); }}
                    className="w-full flex items-center gap-3 px-4 py-3 text-sm text-slate-600 hover:bg-blue-50 hover:text-blue-700 transition-colors"
                  >
                    <Key size={16} /> Trocar Senha
                  </button>

                  <button 
                    onClick={logout}
                    className="w-full flex items-center gap-3 px-4 py-3 text-sm text-red-600 hover:bg-red-50 transition-colors border-t border-slate-100"
                  >
                    <LogOut size={16} /> Sair do Sistema
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* MODAL DE TROCA DE SENHA */}
      {showModal && <ModalTrocaSenha user={user} aoFechar={() => setShowModal(false)} />}
    </>
  );
};

export default Header;
