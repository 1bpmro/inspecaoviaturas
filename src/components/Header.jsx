import React, { useState, useRef, useEffect } from 'react';
import { useAuth } from '../lib/AuthContext';
import { User, LogOut, Key, Shield } from 'lucide-react';
import ModalTrocaSenha from './ModalTrocaSenha';
import brasaoBpm from '../assets/icon-512.png';

const Header = () => {
  const { user, logout } = useAuth();
  const [showModal, setShowModal] = useState(false);
  const [menuAberto, setMenuAberto] = useState(false);
  const menuRef = useRef(null);

  // Fecha o menu se clicar fora dele
  useEffect(() => {
    const handleClickFora = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setMenuAberto(false);
      }
    };
    document.addEventListener('mousedown', handleClickFora);
    return () => document.removeEventListener('mousedown', handleClickFora);
  }, []);

  if (!user) return null;

  return (
    <>
      <header className="bg-slate-900 border-b-4 border-blue-700 p-3 sticky top-0 z-40 shadow-xl">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          
          {/* LADO ESQUERDO: IDENTIDADE */}
          <div className="flex items-center gap-3">
            <div className="relative">
               <img src={brasaoBpm} alt="1º BPM" className="h-10 w-10 object-contain drop-shadow-[0_0_5px_rgba(59,130,246,0.5)]" />
               <div className="absolute -top-1 -right-1 bg-blue-600 rounded-full p-0.5 border border-slate-900">
                 <Shield size={8} className="text-white" />
               </div>
            </div>
            <div>
              <h2 className="text-white font-black text-xs md:text-sm leading-none uppercase tracking-tighter">
                1º BPM <span className="text-blue-500 md:inline hidden">- RONDON</span>
              </h2>
              <span className="text-slate-400 text-[8px] md:text-[9px] font-bold tracking-[0.2em] uppercase block mt-0.5">
                Vistorias VTR
              </span>
            </div>
          </div>

          {/* LADO DIREITO: MILITAR E MENU */}
          <div className="flex items-center gap-3 md:gap-4">
            <div className="text-right">
              <p className="text-white font-black text-[10px] md:text-xs uppercase leading-none">
                {user.patente} {user.nome?.split(' ').pop()} {/* Pega o último nome/nome de guerra */}
              </p>
              <p className="text-blue-500 text-[9px] font-bold uppercase opacity-90 hidden xs:block">
                RE {user.re}
              </p>
            </div>

            <div className="relative" ref={menuRef}>
              <button 
                onClick={() => setMenuAberto(!menuAberto)}
                className={`p-2 rounded-xl border transition-all duration-300 ${
                  menuAberto ? 'bg-blue-600 border-blue-400' : 'bg-slate-800 border-slate-700 hover:border-blue-500'
                }`}
              >
                <User className="text-white" size={18} />
              </button>

              {menuAberto && (
                <div className="absolute right-0 mt-3 w-60 bg-white rounded-2xl shadow-[0_20px_50px_rgba(0,0,0,0.3)] border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                  <div className="p-4 bg-slate-50 border-b border-slate-100">
                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Perfil Militar</p>
                    <p className="text-xs font-black text-slate-800 uppercase">{user.patente} {user.nome}</p>
                    <p className="text-[10px] font-bold text-blue-600">RE {user.re}</p>
                  </div>
                  
                  <div className="p-1">
                    <button 
                      onClick={() => { setShowModal(true); setMenuAberto(false); }}
                      className="w-full flex items-center gap-3 px-4 py-3 text-[11px] font-black uppercase text-slate-600 hover:bg-blue-50 hover:text-blue-700 transition-colors rounded-xl"
                    >
                      <Key size={14} className="text-blue-500" /> Alterar Senha de Acesso
                    </button>

                    <button 
                      onClick={logout}
                      className="w-full flex items-center gap-3 px-4 py-3 text-[11px] font-black uppercase text-red-600 hover:bg-red-50 transition-colors rounded-xl mt-1"
                    >
                      <LogOut size={14} /> Encerrar Sessão
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      {showModal && <ModalTrocaSenha user={user} onClose={() => setShowModal(false)} />}
    </>
  );
};

export default Header;
