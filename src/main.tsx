import '@/lib/sentry' // Init Sentry before anything else
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import '@/lib/i18n'
import '@/styles/index.css'
import { App } from '@/app/App'
// Register PWA service worker with auto-update (checks every 15s)
if ('serviceWorker' in navigator) {
  import('virtual:pwa-register').then(({ registerSW }) => {
    registerSW({ immediate: true, onRegisteredSW(_url, r) {
      if (r) setInterval(() => r.update(), 15_000)
    }})
  })
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </StrictMode>,
)
