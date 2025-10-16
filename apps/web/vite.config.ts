import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    host: true,
    allowedHosts: true // Allow all hosts for development flexibility
  },
  build: {
    outDir: 'dist',
    sourcemap: true
  }
})
