import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import path from 'path'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@ds': path.resolve(__dirname, './src/design-system'),
    },
  },
  server: {
    host: true,
    allowedHosts: true,
    proxy: {
      '/tatum-api': {
        target: 'https://api.tatum.io',
        changeOrigin: true,
        rewrite: (p) => p.replace(/^\/tatum-api/, ''),
      },
      '/trongrid-api': {
        target: 'https://api.trongrid.io',
        changeOrigin: true,
        rewrite: (p) => p.replace(/^\/trongrid-api/, ''),
      },
    },
  },
})
