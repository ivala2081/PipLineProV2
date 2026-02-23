import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { corsHeaders, handleCors } from '../_shared/cors.ts'

/* ────────────────────────────────────────────────────────────────────
 * Secure API Proxy
 *
 * Handles API calls to third-party services without exposing API keys
 * to the client. Supports: Tatum, Gemini AI, Exchange Rate API.
 * ─────────────────────────────────────────────────────────────────── */

const TATUM_API_KEY = Deno.env.get('TATUM_API_KEY')
const GEMINI_API_KEY = Deno.env.get('GEMINI_API_KEY')
const EXCHANGE_RATE_API_KEY = Deno.env.get('EXCHANGE_RATE_API_KEY')

const TATUM_BASE_V4 = 'https://api.tatum.io/v4'
const TATUM_BASE_V3 = 'https://api.tatum.io/v3'
const TRONGRID_BASE = 'https://api.trongrid.io/v1'
const GEMINI_BASE = 'https://generativelanguage.googleapis.com/v1beta'
const EXCHANGE_RATE_BASE = 'https://api.freecurrencyapi.com/v1'

/* ── Response helpers ──────────────────────────────────────────────── */

function jsonResponse(body: unknown, status = 200, origin?: string): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders(origin), 'Content-Type': 'application/json' },
  })
}

function errorResponse(status: number, message: string, origin?: string): Response {
  return jsonResponse({ error: message }, status, origin)
}

/* ── Tatum API handlers ─────────────────────────────────────────────── */

async function handleTatumRequest(
  action: string,
  params: Record<string, unknown>,
  origin?: string,
): Promise<Response> {
  if (!TATUM_API_KEY) {
    return errorResponse(500, 'TATUM_API_KEY not configured', origin)
  }

  try {
    let url: URL
    const fetchOptions: RequestInit = {
      headers: {
        accept: 'application/json',
        'x-api-key': TATUM_API_KEY,
      },
    }

    switch (action) {
      case 'getPortfolio': {
        const { chain, address, tokenTypes } = params
        url = new URL(`${TATUM_BASE_V4}/data/wallet/portfolio`)
        url.searchParams.set('chain', String(chain))
        url.searchParams.set('addresses', String(address))
        url.searchParams.set('tokenTypes', String(tokenTypes || 'native,fungible'))
        break
      }

      case 'getTransactions': {
        const { chain, address, pageSize, offset, transactionDirection, transactionTypes } = params
        // Tatum deprecated /v4/data/transactions → use /v4/data/transaction/history
        url = new URL(`${TATUM_BASE_V4}/data/transaction/history`)
        url.searchParams.set('chain', String(chain))
        url.searchParams.set('addresses', String(address))
        url.searchParams.set('pageSize', String(pageSize || 50))
        url.searchParams.set('offset', String(offset || 0))
        url.searchParams.set('transactionDirection', String(transactionDirection || 'all'))
        url.searchParams.set('transactionTypes', String(transactionTypes || 'fungible,native'))
        break
      }

      case 'getTokenRate': {
        const { symbol, basePair } = params
        url = new URL(`${TATUM_BASE_V4}/data/rate/symbol`)
        url.searchParams.set('symbol', String(symbol))
        url.searchParams.set('basePair', String(basePair || 'USD'))
        break
      }

      case 'getTronAccount': {
        const { address } = params
        url = new URL(`${TATUM_BASE_V3}/tron/account/${address}`)
        break
      }

      case 'getTronTransactions': {
        const { address, next } = params
        url = new URL(`${TATUM_BASE_V3}/tron/transaction/account/${address}`)
        if (next) url.searchParams.set('next', String(next))
        break
      }

      case 'getBitcoinBalance': {
        const { address } = params
        url = new URL(`${TATUM_BASE_V3}/bitcoin/address/balance/${address}`)
        break
      }

      case 'getBitcoinTransactions': {
        const { address, pageSize, offset } = params
        url = new URL(`${TATUM_BASE_V3}/bitcoin/transaction/address/${address}`)
        url.searchParams.set('pageSize', String(pageSize || 50))
        url.searchParams.set('offset', String(offset || 0))
        break
      }

      default:
        return errorResponse(400, `Unknown Tatum action: ${action}`, origin)
    }

    const response = await fetch(url.toString(), fetchOptions)

    if (!response.ok) {
      const errorText = await response.text()
      console.error(`[Tatum] API error (${response.status}):`, errorText)
      // Return 502 for upstream errors so client doesn't confuse with auth issues
      return errorResponse(502, `Tatum API error (${response.status}): ${errorText}`, origin)
    }

    const data = await response.json()
    return jsonResponse(data, 200, origin)
  } catch (error) {
    console.error('[Tatum] Error:', error)
    return errorResponse(500, error instanceof Error ? error.message : 'Unknown error', origin)
  }
}

/* ── TronGrid API handlers (no API key needed) ─────────────────────── */

async function handleTronGridRequest(
  action: string,
  params: Record<string, unknown>,
  origin?: string,
): Promise<Response> {
  try {
    let url: URL

    switch (action) {
      case 'getTrc20Transactions': {
        const { address, limit, fingerprint } = params
        url = new URL(`${TRONGRID_BASE}/accounts/${address}/transactions/trc20`)
        url.searchParams.set('limit', String(limit || 200))
        if (fingerprint) url.searchParams.set('fingerprint', String(fingerprint))
        break
      }

      default:
        return errorResponse(400, `Unknown TronGrid action: ${action}`, origin)
    }

    const response = await fetch(url.toString(), {
      headers: { accept: 'application/json' },
    })

    if (!response.ok) {
      const errorText = await response.text()
      return errorResponse(response.status, `TronGrid API error: ${errorText}`, origin)
    }

    const data = await response.json()
    return jsonResponse(data, 200, origin)
  } catch (error) {
    console.error('[TronGrid] Error:', error)
    return errorResponse(500, error instanceof Error ? error.message : 'Unknown error', origin)
  }
}

/* ── Gemini AI API handlers ────────────────────────────────────────── */

async function handleGeminiRequest(
  action: string,
  params: Record<string, unknown>,
  origin?: string,
): Promise<Response> {
  if (!GEMINI_API_KEY) {
    return errorResponse(500, 'GEMINI_API_KEY not configured', origin)
  }

  try {
    let url: URL
    let fetchOptions: RequestInit

    switch (action) {
      case 'generateContent': {
        const { model, prompt } = params
        url = new URL(`${GEMINI_BASE}/models/${model || 'gemini-pro'}:generateContent`)
        url.searchParams.set('key', GEMINI_API_KEY)

        fetchOptions = {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ parts: [{ text: String(prompt) }] }],
          }),
        }
        break
      }

      default:
        return errorResponse(400, `Unknown Gemini action: ${action}`, origin)
    }

    const response = await fetch(url.toString(), fetchOptions)

    if (!response.ok) {
      const errorText = await response.text()
      return errorResponse(response.status, `Gemini API error: ${errorText}`, origin)
    }

    const data = await response.json()
    return jsonResponse(data, 200, origin)
  } catch (error) {
    console.error('[Gemini] Error:', error)
    return errorResponse(500, error instanceof Error ? error.message : 'Unknown error', origin)
  }
}

/* ── Exchange Rate API handlers ────────────────────────────────────── */

async function handleExchangeRateRequest(
  action: string,
  params: Record<string, unknown>,
  origin?: string,
): Promise<Response> {
  if (!EXCHANGE_RATE_API_KEY) {
    return errorResponse(500, 'EXCHANGE_RATE_API_KEY not configured', origin)
  }

  try {
    let url: URL

    switch (action) {
      case 'getLatestRates': {
        const { baseCurrency, currencies } = params
        url = new URL(`${EXCHANGE_RATE_BASE}/latest`)
        url.searchParams.set('apikey', EXCHANGE_RATE_API_KEY)
        if (baseCurrency) url.searchParams.set('base_currency', String(baseCurrency))
        if (currencies) url.searchParams.set('currencies', String(currencies))
        break
      }

      default:
        return errorResponse(400, `Unknown ExchangeRate action: ${action}`, origin)
    }

    const response = await fetch(url.toString(), {
      headers: { accept: 'application/json' },
    })

    if (!response.ok) {
      const errorText = await response.text()
      return errorResponse(response.status, `ExchangeRate API error: ${errorText}`, origin)
    }

    const data = await response.json()
    return jsonResponse(data, 200, origin)
  } catch (error) {
    console.error('[ExchangeRate] Error:', error)
    return errorResponse(500, error instanceof Error ? error.message : 'Unknown error', origin)
  }
}

/* ── Main handler ───────────────────────────────────────────────────── */

serve(async (req: Request) => {
  // Handle CORS preflight
  const corsResponse = handleCors(req)
  if (corsResponse) return corsResponse

  const origin = req.headers.get('origin') || undefined

  try {
    // Parse request body
    const { service, action, params } = (await req.json()) as {
      service: string
      action: string
      params: Record<string, unknown>
    }

    if (!service || !action) {
      return errorResponse(400, 'Missing service or action', origin)
    }

    // Route to appropriate handler
    switch (service) {
      case 'tatum':
        return handleTatumRequest(action, params || {}, origin)

      case 'trongrid':
        return handleTronGridRequest(action, params || {}, origin)

      case 'gemini':
        return handleGeminiRequest(action, params || {}, origin)

      case 'exchangeRate':
        return handleExchangeRateRequest(action, params || {}, origin)

      default:
        return errorResponse(400, `Unknown service: ${service}`, origin)
    }
  } catch (error) {
    console.error('[SecureAPI] Unhandled error:', error)
    return errorResponse(500, 'Internal server error', origin)
  }
})
