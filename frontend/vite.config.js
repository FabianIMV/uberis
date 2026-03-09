import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/entities': 'http://localhost:8000',
      '/world': 'http://localhost:8000',
      '/lineage': 'http://localhost:8000',
      '/stream': {
        target: 'ws://localhost:8000',
        ws: true,
      },
    },
  },
})
