import { supabase } from '@/lib/supabase'

const CACHE_KEY = 'piplinepro:exchange-rates'
const TIMEOUT_MS = 5_000

/* ── Timeout helper ──────────────────────────────────────────────── */

function fetchWithTimeout(url: string, timeoutMs: number): Promise<Response> {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeoutMs)
  return fetch(url, { signal: controller.signal }).finally(() => clearTimeout(timer))
}

/* ── Provider 1: Edge Function (server-side, all providers, no CORS) ── */

async function fetchFromEdgeFunction(currency: string): Promise<number> {
  const { data, error } = await supabase.functions.invoke('secure-api', {
    body: {
      service: 'exchangeRate',
      action: 'getRate',
      params: { currency },
    },
  })
  if (error) throw error
  const rate = data?.rate
  if (typeof rate !== 'number' || rate <= 0) throw new Error('Invalid rate from edge function')
  return rate
}

/* ── Provider 2: Open ER API (browser-direct, free, CORS ok) ─────── */

async function fetchFromOpenErApi(currency: string): Promise<number> {
  const res = await fetchWithTimeout(`https://open.er-api.com/v6/latest/${currency}`, TIMEOUT_MS)
  if (!res.ok) throw new Error(`open-er-api: ${res.status}`)
  const json = await res.json()
  if (json?.result !== 'success') throw new Error('open-er-api: unsuccessful response')
  const rate = json?.rates?.TRY
  if (typeof rate !== 'number' || rate <= 0) throw new Error('Invalid rate from open-er-api')
  return rate
}

/* ── Provider 3: Fawazahmed0 CDN (browser-direct, free, CORS ok) ── */

async function fetchFromFawazahmed0(currency: string): Promise<number> {
  const from = currency.toLowerCase()
  const res = await fetchWithTimeout(
    `https://cdn.jsdelivr.net/npm/@fawazahmed0/currency-api@latest/v1/currencies/${from}.json`,
    TIMEOUT_MS,
  )
  if (!res.ok) throw new Error(`fawazahmed0: ${res.status}`)
  const json = await res.json()
  const rate = json?.[from]?.['try']
  if (typeof rate !== 'number' || rate <= 0) throw new Error('Invalid rate from fawazahmed0')
  return rate
}

/* ── localStorage cache (last-resort fallback) ───────────────────── */

function getCachedRate(currency: string): number | null {
  try {
    const raw = localStorage.getItem(CACHE_KEY)
    if (!raw) return null
    const cache = JSON.parse(raw) as Record<string, { rate: number; timestamp: number }>
    const entry = cache[currency]
    if (!entry) return null
    // Accept cache up to 24 hours
    if (Date.now() - entry.timestamp > 24 * 60 * 60 * 1000) return null
    return entry.rate
  } catch {
    return null
  }
}

function setCachedRate(currency: string, rate: number): void {
  try {
    const raw = localStorage.getItem(CACHE_KEY)
    const cache: Record<string, { rate: number; timestamp: number }> = raw ? JSON.parse(raw) : {}
    cache[currency] = { rate, timestamp: Date.now() }
    localStorage.setItem(CACHE_KEY, JSON.stringify(cache))
  } catch {
    // Ignore storage errors
  }
}

/* ── Public API ──────────────────────────────────────────────────── */

/**
 * Fetch exchange rate with automatic fallback chain:
 *  1. Edge Function  (server-side: ExchangeRate-API, Yahoo, TCMB, Open ER, Fawazahmed0)
 *  2. Open ER API    (browser-direct, free, CORS ok)
 *  3. Fawazahmed0    (browser-direct CDN, free, CORS ok)
 *  4. localStorage   (offline fallback, up to 24h)
 */
export async function fetchExchangeRate(currency: string): Promise<number> {
  if (currency === 'TL') return 1

  const providers: Array<{ name: string; fn: () => Promise<number> }> = [
    { name: 'Edge Function', fn: () => fetchFromEdgeFunction(currency) },
    { name: 'Open ER API', fn: () => fetchFromOpenErApi(currency) },
    { name: 'Fawazahmed0', fn: () => fetchFromFawazahmed0(currency) },
  ]

  for (const provider of providers) {
    try {
      const rate = await provider.fn()
      setCachedRate(currency, rate)
      return rate
    } catch {
      // Try next provider
    }
  }

  // Last resort: localStorage cache (up to 24h old)
  const cached = getCachedRate(currency)
  if (cached !== null) return cached

  throw new Error('All exchange rate providers failed and no cached rate available')
}
