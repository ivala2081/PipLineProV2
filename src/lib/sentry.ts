import * as Sentry from '@sentry/react'

const dsn = import.meta.env.VITE_SENTRY_DSN

if (dsn) {
  Sentry.init({
    dsn,
    environment: import.meta.env.DEV ? 'development' : 'production',
    enabled: !import.meta.env.DEV,
    integrations: [Sentry.browserTracingIntegration(), Sentry.replayIntegration()],
    tracesSampleRate: 0.2,
    replaysSessionSampleRate: 0,
    replaysOnErrorSampleRate: 1.0,
  })
}

export { Sentry }
