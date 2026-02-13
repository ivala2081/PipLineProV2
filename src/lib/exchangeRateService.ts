const CACHE_KEY = 'piplinepro:exchange-rates'
const TIMEOUT_MS = 5_000
const API_KEY = 'b8042fdeb5c8caf372397081'

/* ── Timeout helper (AbortSignal.timeout fallback) ────────────────── */

function fetchWithTimeout(url: string, timeoutMs: number): Promise<Response> {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeoutMs)
  return fetch(url, { signal: controller.signal }).finally(() =>
    clearTimeout(timer),
  )
}

/* ── Provider: ExchangeRate-API (pair conversion) ─────────────────── */

async function fetchFromExchangeRateApi(currency: string): Promise<number> {
  const res = await fetchWithTimeout(
    `https://v6.exchangerate-api.com/v6/${API_KEY}/pair/${currency}/TRY`,
    TIMEOUT_MS,
  )
  if (!res.ok) throw new Error(`exchangerate-api: ${res.status}`)
  const json = await res.json()
  if (json?.result !== 'success')
    throw new Error(`exchangerate-api error: ${json?.['error-type'] ?? 'unknown'}`)
  const rate = json?.conversion_rate
  if (typeof rate !== 'number' || rate <= 0)
    throw new Error('Invalid rate from exchangerate-api')
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

  try {
    const rate = await fetchFromExchangeRateApi(currency)
    setCachedRate(currency, rate)
    return rate
  } catch {
    // Fall back to cache when live request fails
  }

  // Live provider failed — use cached rate
  const cached = getCachedRate(currency)
  if (cached !== null) return cached

  throw new Error('Exchange rate request failed')
}
