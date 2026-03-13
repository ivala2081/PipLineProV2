import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'
import path from 'path'

export default defineConfig(({ mode }) => ({
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      strategies: 'injectManifest',
      srcDir: 'src',
      filename: 'sw.ts',
      includeAssets: [
        'favicon-64x64.png',
        'apple-touch-icon-180x180.png',
        'logo/logo-icon-dark.png',
        'logo/logo-icon-white.png',
      ],
      manifest: {
        name: 'PipLinePro',
        short_name: 'PipLinePro',
        description: 'Business Operations Platform',
        theme_color: '#ffffff',
        background_color: '#ffffff',
        display: 'standalone',
        orientation: 'portrait-primary',
        start_url: '/',
        scope: '/',
        icons: [
          {
            src: 'pwa-192x192.png',
            sizes: '192x192',
            type: 'image/png',
          },
          {
            src: 'pwa-512x512.png',
            sizes: '512x512',
            type: 'image/png',
          },
          {
            src: 'pwa-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable',
          },
        ],
      },
      injectManifest: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
      },
    }),
  ],
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
  },
  // Security: prevent source map exposure in production
  build: {
    sourcemap: false,
    minify: 'esbuild',
    rollupOptions: {
      output: {
        manualChunks: (id) => {
          if (!id.includes('node_modules')) return undefined

          // React core (react, react-dom, scheduler)
          if (id.includes('/react-dom/') || id.includes('/react/') || id.includes('/scheduler/')) {
            return 'vendor-react'
          }

          // React Router (v7 is large, separate chunk)
          if (id.includes('/react-router-dom/') || id.includes('/react-router/')) {
            return 'vendor-router'
          }

          // Supabase
          if (id.includes('/@supabase/')) {
            return 'vendor-supabase'
          }

          // TanStack Query
          if (id.includes('/@tanstack/')) {
            return 'vendor-query'
          }

          // Radix UI
          if (id.includes('/@radix-ui/')) {
            return 'vendor-ui'
          }

          // Sentry
          if (id.includes('/@sentry/')) {
            return 'vendor-sentry'
          }

          // i18n
          if (id.includes('/i18next') || id.includes('/react-i18next/')) {
            return 'vendor-i18n'
          }

          // Charts (recharts + d3 dependencies)
          if (id.includes('/recharts/') || id.includes('/d3-')) {
            return 'vendor-charts'
          }
        },
      },
    },
  },
  esbuild: {
    drop: mode === 'production' ? ['console', 'debugger'] : [],
  },
}))
