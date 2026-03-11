import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({

  plugins: [react()],

  // nome do repositório no GitHub
  base: '/inspecaoviaturas/',

  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },

  build: {

    // garante pasta de assets estável
    assetsDir: "assets",

    // melhora compatibilidade com celulares
    target: "es2018",

    // limpa build antigo
    emptyOutDir: true

  },

  server: {
    port: 5173,
    open: true
  }

})
