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

async function fetchFromEdgeFunction(from: string, to: string): Promise<number> {
  const { data, error } = await supabase.functions.invoke('secure-api', {
    body: {
      service: 'exchangeRate',
      action: 'getRate',
      params: { from, to },
    },
  })
  if (error) throw error
  const rate = data?.rate
  if (typeof rate !== 'number' || rate <= 0) throw new Error('Invalid rate from edge function')
  return rate
}

/* ── Provider 2: Open ER API (browser-direct, free, CORS ok) ─────── */

async function fetchFromOpenErApi(from: string, to: string): Promise<number> {
  const res = await fetchWithTimeout(`https://open.er-api.com/v6/latest/${from}`, TIMEOUT_MS)
  if (!res.ok) throw new Error(`open-er-api: ${res.status}`)
  const json = await res.json()
  if (json?.result !== 'success') throw new Error('open-er-api: unsuccessful response')
  const rate = json?.rates?.[to]
  if (typeof rate !== 'number' || rate <= 0) throw new Error('Invalid rate from open-er-api')
  return rate
}

/* ── Provider 3: Fawazahmed0 CDN (browser-direct, free, CORS ok) ── */

async function fetchFromFawazahmed0(from: string, to: string): Promise<number> {
  const fromLower = from.toLowerCase()
  const toLower = to.toLowerCase()
  const res = await fetchWithTimeout(
    `https://cdn.jsdelivr.net/npm/@fawazahmed0/currency-api@latest/v1/currencies/${fromLower}.json`,
    TIMEOUT_MS,
  )
  if (!res.ok) throw new Error(`fawazahmed0: ${res.status}`)
  const json = await res.json()
  const rate = json?.[fromLower]?.[toLower]
  if (typeof rate !== 'number' || rate <= 0) throw new Error('Invalid rate from fawazahmed0')
  return rate
}

/* ── localStorage cache (last-resort fallback) ───────────────────── */

function cacheKey(from: string, to: string): string {
  return `${from}_${to}`
}

function getCachedRate(from: string, to: string): number | null {
  try {
    const raw = localStorage.getItem(CACHE_KEY)
    if (!raw) return null
    const cache = JSON.parse(raw) as Record<string, { rate: number; timestamp: number }>
    const entry = cache[cacheKey(from, to)]
    if (!entry) return null
    // Accept cache up to 24 hours
    if (Date.now() - entry.timestamp > 24 * 60 * 60 * 1000) return null
    return entry.rate
  } catch {
    return null
  }
}

function setCachedRate(from: string, to: string, rate: number): void {
  try {
    const raw = localStorage.getItem(CACHE_KEY)
    const cache: Record<string, { rate: number; timestamp: number }> = raw ? JSON.parse(raw) : {}
    cache[cacheKey(from, to)] = { rate, timestamp: Date.now() }
    localStorage.setItem(CACHE_KEY, JSON.stringify(cache))
  } catch {
    // Ignore storage errors
  }
}

/* ── Public API ──────────────────────────────────────────────────── */

/**
 * Fetch exchange rate: how many units of `to` does 1 unit of `from` cost.
 * Falls back through: Edge Function → Open ER API → Fawazahmed0 → localStorage cache
 *
 * Examples:
 *   fetchExchangeRate('USD', 'TRY') → ~32.5  (1 USD = 32.5 TRY)
 *   fetchExchangeRate('USD', 'EGP') → ~48.2  (1 USD = 48.2 EGP)
 *   fetchExchangeRate('EUR', 'USD') → ~1.09  (1 EUR = 1.09 USD)
 *   fetchExchangeRate('TRY', 'TRY') → 1      (same currency)
 */
export async function fetchExchangeRate(from: string, to: string): Promise<number> {
  if (from === to) return 1

  const providers: Array<{ name: string; fn: () => Promise<number> }> = [
    { name: 'Edge Function', fn: () => fetchFromEdgeFunction(from, to) },
    { name: 'Open ER API', fn: () => fetchFromOpenErApi(from, to) },
    { name: 'Fawazahmed0', fn: () => fetchFromFawazahmed0(from, to) },
  ]

  for (const provider of providers) {
    try {
      const rate = await provider.fn()
      setCachedRate(from, to, rate)
      return rate
    } catch {
      // Try next provider
    }
  }

  // Last resort: localStorage cache (up to 24h old)
  const cached = getCachedRate(from, to)
  if (cached !== null) return cached

  throw new Error('All exchange rate providers failed and no cached rate available')
}
