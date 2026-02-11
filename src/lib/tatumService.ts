const API_KEY = import.meta.env.VITE_TATUM_API_KEY as string
const BASE_URL = import.meta.env.DEV ? '/tatum-api' : 'https://api.tatum.io/v4'
const TIMEOUT_MS = 15_000

/* ── Chain mapping ──────────────────────────────────────────────── */

const CHAIN_MAP: Record<string, string> = {
  tron: 'tron-mainnet',
  ethereum: 'ethereum-mainnet',
  bsc: 'bsc-mainnet',
  bitcoin: 'bitcoin-mainnet',
  solana: 'solana-mainnet',
}

/* ── Types ──────────────────────────────────────────────────────── */

export interface PortfolioAsset {
  chain: string
  address: string
  balance: string
  denominatedBalance: string
  decimals: number
  tokenAddress?: string
  type: string
  name?: string
  symbol?: string
}

export interface TatumTransaction {
  chain: string
  hash: string
  address: string
  blockNumber: number
  timestamp: number
  amount: string
  tokenAddress?: string
  counterAddress?: string
  transactionType: string
  transactionSubtype: string
}

/* ── Helpers ─────────────────────────────────────────────────────── */

async function tatumFetch<T>(path: string, params: Record<string, string> = {}): Promise<T> {
  const url = new URL(`${BASE_URL}${path}`)
  for (const [key, value] of Object.entries(params)) {
    url.searchParams.set(key, value)
  }

  const res = await fetch(url.toString(), {
    headers: {
      accept: 'application/json',
      'x-api-key': API_KEY,
    },
    signal: AbortSignal.timeout(TIMEOUT_MS),
  })

  if (!res.ok) {
    const body = await res.text().catch(() => '')
    throw new Error(`Tatum API ${res.status}: ${body}`)
  }

  return res.json()
}

/* ── Public API ──────────────────────────────────────────────────── */

export async function getWalletPortfolio(
  chain: string,
  address: string,
): Promise<PortfolioAsset[]> {
  const tatumChain = CHAIN_MAP[chain]
  if (!tatumChain) throw new Error(`Unsupported chain: ${chain}`)

  const data = await tatumFetch<{ result: PortfolioAsset[] }>(
    '/data/wallet/portfolio',
    { chain: tatumChain, addresses: address, tokenTypes: 'fungible,nativeBalance' },
  )

  return data.result ?? []
}

export async function getTransactionHistory(
  chain: string,
  address: string,
  pageSize = 20,
): Promise<TatumTransaction[]> {
  const tatumChain = CHAIN_MAP[chain]
  if (!tatumChain) throw new Error(`Unsupported chain: ${chain}`)

  const data = await tatumFetch<{ result: TatumTransaction[] }>(
    '/data/transactions',
    { chain: tatumChain, addresses: address, pageSize: String(pageSize), transactionDirection: 'all' },
  )

  return data.result ?? []
}

export async function getTokenRate(
  symbol: string,
  basePair = 'USD',
): Promise<number> {
  const data = await tatumFetch<{ value: string }>(
    '/v3/tatum/rate/' + symbol,
    { basePair },
  )

  return parseFloat(data.value) || 0
}
