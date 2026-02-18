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
    host: '0.0.0.0', // Listen on all interfaces (needed for custom domain access)
    port: 5173,
    strictPort: false,
    allowedHosts: ['localhost', '127.0.0.1', 'erp.orderinvests.net', 'erp.orderinvest.net'],
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
    minify: 'esbuild', // esbuild is faster; use terser if you need drop_console
  },
})
