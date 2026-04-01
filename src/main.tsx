import '@/lib/sentry' // Init Sentry before anything else
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import '@/lib/i18n'
import '@/styles/index.css'
import { supabase } from '@/lib/supabase'
import { App } from '@/app/App'
// Register PWA service worker with auto-update (checks every 15s)
if ('serviceWorker' in navigator) {
  import('virtual:pwa-register').then(({ registerSW }) => {
    registerSW({
      immediate: true,
      onRegisteredSW(_url, r) {
        if (r) setInterval(() => r.update(), 15_000)
      },
    })
  })
}

// Start auth session check before React renders — overlaps with mount time.
// Especially valuable when JWT is expired and needs a network refresh.
const sessionPromise = supabase.auth.getSession()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <App sessionPromise={sessionPromise} />
    </BrowserRouter>
  </StrictMode>,
)
