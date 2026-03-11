import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { corsHeaders, handleCors } from '../_shared/cors.ts'
import { z, parseBody } from '../_shared/validation.ts'

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
const SOLANA_RPC = 'https://solana-mainnet.gateway.tatum.io/'
const TRONGRID_BASE = 'https://api.trongrid.io/v1'
const GEMINI_BASE = 'https://generativelanguage.googleapis.com/v1beta'
const EXCHANGE_RATE_BASE = 'https://api.freecurrencyapi.com/v1'

/* ── Input schema ──────────────────────────────────────────────────── */

const SecureApiBodySchema = z.object({
  service: z.enum(['tatum', 'trongrid', 'gemini', 'exchangeRate'], {
    errorMap: () => ({ message: 'service must be one of: tatum, trongrid, gemini, exchangeRate' }),
  }),
  action: z.string().min(1, 'action is required'),
  params: z.record(z.unknown()).optional().default({}),
})

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

      case 'getSolanaSignatures': {
        const { address, limit, before } = params
        url = new URL(SOLANA_RPC)
        fetchOptions.method = 'POST'
        ;(fetchOptions.headers as Record<string, string>)['Content-Type'] = 'application/json'
        fetchOptions.body = JSON.stringify({
          jsonrpc: '2.0',
          id: 1,
          method: 'getSignaturesForAddress',
          params: [
            String(address),
            {
              limit: Number(limit) || 50,
              ...(before ? { before: String(before) } : {}),
            },
          ],
        })
        break
      }

      case 'getSolanaTransactionBatch': {
        const sigs = (params.signatures ?? []) as string[]
        url = new URL(SOLANA_RPC)
        fetchOptions.method = 'POST'
        ;(fetchOptions.headers as Record<string, string>)['Content-Type'] = 'application/json'
        fetchOptions.body = JSON.stringify(
          sigs.map((sig, i) => ({
            jsonrpc: '2.0',
            id: i,
            method: 'getTransaction',
            params: [sig, { encoding: 'jsonParsed', maxSupportedTransactionVersion: 0 }],
          })),
        )
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

async function fetchRateExchangeRateApi(currency: string): Promise<number> {
  if (!EXCHANGE_RATE_API_KEY) throw new Error('No API key')
  const res = await fetch(
    `https://v6.exchangerate-api.com/v6/${EXCHANGE_RATE_API_KEY}/pair/${currency}/TRY`,
  )
  if (!res.ok) throw new Error(`exchangerate-api: ${res.status}`)
  const json = await res.json()
  if (json?.result !== 'success') throw new Error('exchangerate-api error')
  const rate = json?.conversion_rate
  if (typeof rate !== 'number' || rate <= 0) throw new Error('Invalid rate')
  return rate
}

async function fetchRateYahooFinance(currency: string): Promise<number> {
  const symbol = `${currency}TRY=X`
  const res = await fetch(
    `https://query1.finance.yahoo.com/v8/finance/chart/${symbol}?interval=1d&range=1d`,
  )
  if (!res.ok) throw new Error(`yahoo: ${res.status}`)
  const json = await res.json()
  const rate = json?.chart?.result?.[0]?.meta?.regularMarketPrice
  if (typeof rate !== 'number' || rate <= 0) throw new Error('Invalid rate')
  return rate
}

async function fetchRateTcmb(currency: string): Promise<number> {
  const res = await fetch('https://www.tcmb.gov.tr/kurlar/today.xml')
  if (!res.ok) throw new Error(`tcmb: ${res.status}`)
  const text = await res.text()
  // Parse XML to find currency rate
  const regex = new RegExp(
    `<Currency[^>]*CurrencyCode="${currency}"[^>]*>[\\s\\S]*?<BanknoteSelling>([\\d.]+)</BanknoteSelling>`,
  )
  const match = text.match(regex)
  if (!match?.[1]) throw new Error(`tcmb: rate not found for ${currency}`)
  const rate = parseFloat(match[1])
  if (isNaN(rate) || rate <= 0) throw new Error('Invalid rate from TCMB')
  return rate
}

async function fetchRateOpenErApi(currency: string): Promise<number> {
  const res = await fetch(`https://open.er-api.com/v6/latest/${currency}`)
  if (!res.ok) throw new Error(`open-er-api: ${res.status}`)
  const json = await res.json()
  if (json?.result !== 'success') throw new Error('open-er-api error')
  const rate = json?.rates?.TRY
  if (typeof rate !== 'number' || rate <= 0) throw new Error('Invalid rate')
  return rate
}

async function fetchRateFawazahmed0(currency: string): Promise<number> {
  const from = currency.toLowerCase()
  const res = await fetch(
    `https://cdn.jsdelivr.net/npm/@fawazahmed0/currency-api@latest/v1/currencies/${from}.json`,
  )
  if (!res.ok) throw new Error(`fawazahmed0: ${res.status}`)
  const json = await res.json()
  const rate = json?.[from]?.['try']
  if (typeof rate !== 'number' || rate <= 0) throw new Error('Invalid rate')
  return rate
}

async function handleExchangeRateRequest(
  action: string,
  params: Record<string, unknown>,
  origin?: string,
): Promise<Response> {
  try {
    switch (action) {
      case 'getRate': {
        const currency = String(params.currency || 'USD')
        if (currency === 'TL') return jsonResponse({ rate: 1 }, 200, origin)

        const providers = [
          { name: 'ExchangeRate-API', fn: () => fetchRateExchangeRateApi(currency) },
          { name: 'Yahoo Finance', fn: () => fetchRateYahooFinance(currency) },
          { name: 'TCMB', fn: () => fetchRateTcmb(currency) },
          { name: 'Open ER API', fn: () => fetchRateOpenErApi(currency) },
          { name: 'Fawazahmed0', fn: () => fetchRateFawazahmed0(currency) },
        ]

        for (const provider of providers) {
          try {
            const rate = await provider.fn()
            return jsonResponse({ rate, provider: provider.name }, 200, origin)
          } catch {
            // Try next
          }
        }
        return errorResponse(502, 'All exchange rate providers failed', origin)
      }

      case 'getLatestRates': {
        // Legacy: forward to freecurrencyapi
        if (!EXCHANGE_RATE_API_KEY) {
          return errorResponse(500, 'EXCHANGE_RATE_API_KEY not configured', origin)
        }
        const { baseCurrency, currencies } = params
        const url = new URL(`${EXCHANGE_RATE_BASE}/latest`)
        url.searchParams.set('apikey', EXCHANGE_RATE_API_KEY)
        if (baseCurrency) url.searchParams.set('base_currency', String(baseCurrency))
        if (currencies) url.searchParams.set('currencies', String(currencies))

        const response = await fetch(url.toString(), {
          headers: { accept: 'application/json' },
        })
        if (!response.ok) {
          const errorText = await response.text()
          return errorResponse(response.status, `ExchangeRate API error: ${errorText}`, origin)
        }
        const data = await response.json()
        return jsonResponse(data, 200, origin)
      }

      default:
        return errorResponse(400, `Unknown ExchangeRate action: ${action}`, origin)
    }
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
    // Parse & validate request body
    const { data: body, error: validationError } = await parseBody(
      req,
      SecureApiBodySchema,
      corsHeaders(origin),
    )
    if (validationError) return validationError

    const { service, action, params } = body

    // Route to appropriate handler
    switch (service) {
      case 'tatum':
        return handleTatumRequest(action, params, origin)

      case 'trongrid':
        return handleTronGridRequest(action, params, origin)

      case 'gemini':
        return handleGeminiRequest(action, params, origin)

      case 'exchangeRate':
        return handleExchangeRateRequest(action, params, origin)
    }
  } catch (error) {
    console.error('[SecureAPI] Unhandled error:', error)
    return errorResponse(500, 'Internal server error', origin)
  }
})
