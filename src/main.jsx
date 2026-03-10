import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import './index.css'
import { AuthProvider } from './lib/AuthContext'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <AuthProvider>
      <App />
    </AuthProvider>
  </React.StrictMode>,
)

// REGISTRO DO SERVICE WORKER (Filtro para PWA)
// Este bloco faz com que o Chrome/Safari do celular reconheçam o site como App instalável.
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    // O navegador busca o arquivo 'sw.js' na raiz pública (pasta /public)
    navigator.serviceWorker.register('/sw.js').then(registration => {
      console.log('SW registrado com sucesso:', registration.scope);
    }).catch(error => {
      console.log('Falha ao registrar o SW:', error);
    });
  });
}
