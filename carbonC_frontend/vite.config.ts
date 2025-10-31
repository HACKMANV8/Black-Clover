import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  base: '/Black-Clover/',
  plugins: [react()],
  server: {
    proxy: {
      '/api': {
        target: 'https://carbon-app-8hwl.onrender.com',
        changeOrigin: true,
        secure: false,
      }
    }
  }
})
