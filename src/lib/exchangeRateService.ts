const CACHE_KEY = 'piplinepro:exchange-rates'
const TIMEOUT_MS = 5_000

/* ── Provider 1: freecurrencyapi.com ─────────────────────────────── */

async function fetchFromFreeCurrencyApi(currency: string): Promise<number> {
  const API_KEY = 'fca_live_uAWyzDUluOFKnf0tNW0wgIN29gmEygmI7kW4NT0P'
  const res = await fetch(
    `https://api.freecurrencyapi.com/v1/latest?apikey=${API_KEY}&base_currency=${currency}&currencies=TRY`,
    { signal: AbortSignal.timeout(TIMEOUT_MS) },
  )
  if (!res.ok) throw new Error(`freecurrencyapi: ${res.status}`)
  const json = await res.json()
  const rate = json?.data?.TRY
  if (typeof rate !== 'number' || rate <= 0)
    throw new Error('Invalid rate from freecurrencyapi')
  return rate
}

/* ── Provider 2: frankfurter.app (ECB data, no key needed) ───────── */

async function fetchFromFrankfurter(currency: string): Promise<number> {
  const res = await fetch(
    `https://api.frankfurter.app/latest?from=${currency}&to=TRY`,
    { signal: AbortSignal.timeout(TIMEOUT_MS) },
  )
  if (!res.ok) throw new Error(`frankfurter: ${res.status}`)
  const json = await res.json()
  const rate = json?.rates?.TRY
  if (typeof rate !== 'number' || rate <= 0)
    throw new Error('Invalid rate from frankfurter')
  return rate
}

/* ── localStorage cache (last-resort fallback) ───────────────────── */

function getCachedRate(currency: string): number | null {
  try {
    const raw = localStorage.getItem(CACHE_KEY)
    if (!raw) return null
    const cache = JSON.parse(raw) as Record<
      string,
      { rate: number; timestamp: number }
    >
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
    const cache: Record<string, { rate: number; timestamp: number }> = raw
      ? JSON.parse(raw)
      : {}
    cache[currency] = { rate, timestamp: Date.now() }
    localStorage.setItem(CACHE_KEY, JSON.stringify(cache))
  } catch {
    // Ignore storage errors
  }
}

/* ── Public API ──────────────────────────────────────────────────── */

export async function fetchExchangeRate(currency: string): Promise<number> {
  if (currency === 'TL') return 1

  const providers = [fetchFromFreeCurrencyApi, fetchFromFrankfurter]

  for (const provider of providers) {
    try {
      const rate = await provider(currency)
      setCachedRate(currency, rate)
      return rate
    } catch {
      // Try next provider
    }
  }

  // All live providers failed — use cached rate
  const cached = getCachedRate(currency)
  if (cached !== null) return cached

  throw new Error('All exchange rate providers failed')
}
