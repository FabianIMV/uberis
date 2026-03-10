import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/entities': { target: 'http://localhost:8000', changeOrigin: true },
      '/world':    { target: 'http://localhost:8000', changeOrigin: true },
      '/lineage':  { target: 'http://localhost:8000', changeOrigin: true },
      '/stats':    { target: 'http://localhost:8000', changeOrigin: true },
      '/interactions': { target: 'http://localhost:8000', changeOrigin: true },
      '/health':   { target: 'http://localhost:8000', changeOrigin: true },
      '/stream': {
        target: 'ws://localhost:8000',
        ws: true,
      },
    },
  },
})
