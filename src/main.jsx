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

// No seu src/main.jsx, mantenha o registro assim:
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    // O Vite mapeia public/sw.js para /sw.js no build final
    navigator.serviceWorker.register('/sw.js') 
      .then(reg => console.log('SW ok:', reg.scope))
      .catch(err => console.log('SW erro:', err));
  });
}
