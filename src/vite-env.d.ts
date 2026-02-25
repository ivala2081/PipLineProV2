/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_SUPABASE_URL: string
  readonly VITE_SUPABASE_ANON_KEY: string
  readonly VITE_SENTRY_DSN?: string
  readonly VITE_HCAPTCHA_SITE_KEY?: string
  readonly VITE_TATUM_API_KEY?: string
  readonly VITE_EXCHANGE_RATE_API_KEY?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
