/**
 * Secure API Client
 *
 * Routes all third-party API calls through our Supabase Edge Function
 * to keep API keys secure and prevent exposure in the client bundle.
 */

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  throw new Error('Missing Supabase environment variables')
}

const SECURE_API_URL = `${SUPABASE_URL}/functions/v1/secure-api`

/**
 * Call the secure API Edge Function
 *
 * @param service - The service to call (tatum, gemini, exchangeRate, trongrid)
 * @param action - The action to perform
 * @param params - Parameters for the action
 * @returns The API response data
 */
export async function callSecureApi<T>(
  service: 'tatum' | 'gemini' | 'exchangeRate' | 'trongrid',
  action: string,
  params: Record<string, unknown> = {},
): Promise<T> {
  const response = await fetch(SECURE_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
    },
    body: JSON.stringify({
      service,
      action,
      params,
    }),
  })

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Request failed' }))
    throw new Error(error.error || `API request failed with status ${response.status}`)
  }

  return response.json()
}

/**
 * Convenience methods for each service
 */

export const tatumApi = {
  getPortfolio: (chain: string, address: string, tokenTypes?: string) =>
    callSecureApi('tatum', 'getPortfolio', { chain, address, tokenTypes }),

  getTransactions: (params: {
    chain: string
    address: string
    pageSize?: number
    offset?: number
    transactionDirection?: string
    transactionTypes?: string
  }) => callSecureApi('tatum', 'getTransactions', params),

  getTokenRate: (symbol: string, basePair = 'USD') =>
    callSecureApi<{ value: string }>('tatum', 'getTokenRate', { symbol, basePair }),

  getTronAccount: (address: string) => callSecureApi('tatum', 'getTronAccount', { address }),

  getTronTransactions: (address: string, next?: string) =>
    callSecureApi('tatum', 'getTronTransactions', { address, next }),

  getBitcoinBalance: (address: string) => callSecureApi('tatum', 'getBitcoinBalance', { address }),

  getBitcoinTransactions: (address: string, pageSize?: number, offset?: number) =>
    callSecureApi('tatum', 'getBitcoinTransactions', { address, pageSize, offset }),
}

export const tronGridApi = {
  getTrc20Transactions: (address: string, limit?: number, fingerprint?: string) =>
    callSecureApi('trongrid', 'getTrc20Transactions', { address, limit, fingerprint }),
}

export const geminiApi = {
  generateContent: (prompt: string, model = 'gemini-pro') =>
    callSecureApi('gemini', 'generateContent', { prompt, model }),
}

export const exchangeRateApi = {
  getLatestRates: (baseCurrency?: string, currencies?: string) =>
    callSecureApi('exchangeRate', 'getLatestRates', { baseCurrency, currencies }),
}
