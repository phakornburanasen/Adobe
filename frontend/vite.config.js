import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  base: '/ADOBE/',
  server: {
    host: true,
    port: 3000,
    open: true,
  },
  preview: {
    host: 'localhost',
    port: 4173,
    open: true,
  },
})
