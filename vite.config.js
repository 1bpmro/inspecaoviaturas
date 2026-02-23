import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  base: '/inspecaoviaturas/', // DEVE SER O NOME DO SEU REPOSITÓRIO
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
})
