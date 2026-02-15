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
    host: '127.0.0.1', // Localhost only - secure default
    port: 5173,
    strictPort: true,
    // Only allow specific hosts - prevents DNS rebinding attacks
    allowedHosts: ['localhost', '127.0.0.1'],
    proxy: {
      '/tatum-api': {
        target: 'https://api.tatum.io',
        changeOrigin: true,
        rewrite: (p) => p.replace(/^\/tatum-api/, ''),
        // Add security headers
        configure: (proxy) => {
          proxy.on('proxyReq', (proxyReq) => {
            proxyReq.setHeader('X-Forwarded-Host', 'localhost')
          })
        },
      },
      '/trongrid-api': {
        target: 'https://api.trongrid.io',
        changeOrigin: true,
        rewrite: (p) => p.replace(/^\/trongrid-api/, ''),
      },
    },
  },
  // Security: prevent source map exposure in production
  build: {
    sourcemap: false, // Disable source maps in production
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: true, // Remove console.logs in production
        drop_debugger: true,
      },
    },
  },
})
