import '@/lib/sentry' // Init Sentry before anything else
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import '@/lib/i18n'
import '@/styles/index.css'
import { App } from '@/app/App'
import { pwaUpdateController } from '@/lib/pwaUpdateController'

// Register PWA service worker
if ('serviceWorker' in navigator) {
  import('virtual:pwa-register').then(({ registerSW }) => {
    const updateSW = registerSW({
      onNeedRefresh() {
        pwaUpdateController.setUpdateReady(updateSW)
      },
      onOfflineReady() {
        // App is ready for offline use
      },
    })
  })
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </StrictMode>,
)
