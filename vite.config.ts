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
    proxy: {
      '/tatum-api': {
        target: 'https://api.tatum.io/v4',
        changeOrigin: true,
        rewrite: (p) => p.replace(/^\/tatum-api/, ''),
      },
    },
  },
})
