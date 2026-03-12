import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react' 
import path from 'path'

export default defineConfig({

  plugins: [react()],

  // nome do repositório no GitHub Pages
  base: '/inspecaoviaturas/',
 
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },

  build: {

    // garante pasta assets correta no GitHub Pages
    assetsDir: "assets",

    // limpa build anterior
    emptyOutDir: true,

    // melhora compatibilidade com celulares
    target: "es2018"

  },

  server: {
    port: 5173,
    open: true
  }

})
