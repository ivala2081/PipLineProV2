const API_KEY = import.meta.env.VITE_TATUM_API_KEY as string
const BASE_V4 = import.meta.env.DEV ? '/tatum-api/v4' : 'https://api.tatum.io/v4'
const BASE_V3 = import.meta.env.DEV ? '/tatum-api/v3' : 'https://api.tatum.io/v3'
const TIMEOUT_MS = 15_000

/* ── Chains supported by the v4 /data/wallet/portfolio endpoint ──── */

const V4_CHAINS = new Set([
  'ethereum',
  'bsc',
  'solana',
  'polygon',
  'celo',
  'tezos',
  'chiliz',
])

/* ── Types ──────────────────────────────────────────────────────── */

export interface PortfolioAsset {
  chain: string
  address: string
  balance: string
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

async function tatumFetch<T>(
  baseUrl: string,
  path: string,
  params: Record<string, string> = {},
): Promise<T> {
  if (!API_KEY) {
    throw new Error('VITE_TATUM_API_KEY is not configured. Add it to your .env file.')
  }

  const raw = `${baseUrl}${path}`
  const url = raw.startsWith('http') ? new URL(raw) : new URL(raw, window.location.origin)
  for (const [key, value] of Object.entries(params)) {
    url.searchParams.set(key, value)
  }

  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS)

  const res = await fetch(url.toString(), {
    headers: {
      accept: 'application/json',
      'x-api-key': API_KEY,
    },
    signal: controller.signal,
  }).finally(() => clearTimeout(timer))

  if (!res.ok) {
    const body = await res.text().catch(() => '')
    throw new Error(`Tatum API ${res.status}: ${body}`)
  }

  return res.json()
}

/* ── v4 portfolio (EVM + Solana + others) ─────────────────────────── */

interface V4PortfolioItem {
  chain: string
  address: string
  balance: string
  decimals: number
  tokenAddress?: string
  type: string
  name?: string
  symbol?: string
}

const NATIVE_SYMBOL: Record<string, string> = {
  ethereum: 'ETH',
  bsc: 'BNB',
  solana: 'SOL',
  polygon: 'MATIC',
  celo: 'CELO',
  tezos: 'XTZ',
  chiliz: 'CHZ',
}

async function fetchV4Portfolio(chain: string, address: string): Promise<PortfolioAsset[]> {
  const [nativeRes, fungibleRes] = await Promise.allSettled([
    tatumFetch<{ result: V4PortfolioItem[] }>(BASE_V4, '/data/wallet/portfolio', {
      chain,
      addresses: address,
      tokenTypes: 'native',
    }),
    tatumFetch<{ result: V4PortfolioItem[] }>(BASE_V4, '/data/wallet/portfolio', {
      chain,
      addresses: address,
      tokenTypes: 'fungible',
    }),
  ])

  const assets: PortfolioAsset[] = []

  if (nativeRes.status === 'fulfilled') {
    for (const item of nativeRes.value.result ?? []) {
      assets.push({ ...item, symbol: item.symbol || NATIVE_SYMBOL[chain] || chain.toUpperCase() })
    }
  }
  if (fungibleRes.status === 'fulfilled') {
    for (const item of fungibleRes.value.result ?? []) {
      assets.push(item)
    }
  }

  // If both calls failed, surface the error
  if (assets.length === 0 && nativeRes.status === 'rejected' && fungibleRes.status === 'rejected') {
    throw nativeRes.reason
  }

  return assets
}

/* ── v3 TRON fallback ─────────────────────────────────────────────── */

interface TronAccountResponse {
  balance: number
  trc20?: Array<Record<string, string>>
}

/** Well-known TRC-20 tokens: contract → { symbol, name, decimals } */
const TRC20_KNOWN: Record<string, { symbol: string; name: string; decimals: number }> = {
  TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t: { symbol: 'USDT', name: 'Tether USD', decimals: 6 },
  TEkxiTehnzSmSe2XqrBj4w32RUN966rdz8: { symbol: 'USDC', name: 'USD Coin', decimals: 6 },
  TNUC9Qb1rRpS5CbWLmNMxXBjyFoydXjWFR: { symbol: 'WTRX', name: 'Wrapped TRX', decimals: 6 },
  TSSMHYeV2uE9qYH95DqyoCuNCzEL1NvU3S: { symbol: 'SUN', name: 'SUN', decimals: 18 },
  TAFjULxiVgT4qWk6UZwjqwZXTSaGaqnVp4: { symbol: 'BTT', name: 'BitTorrent', decimals: 18 },
  TKfjV9RNKJJCqPvBtK8L7Knykh7DNWvnYt: { symbol: 'WBTT', name: 'Wrapped BTT', decimals: 6 },
  TCFLL5dx5ZJdKnWuesXxi1VPwjLVmWZZy9: { symbol: 'JST', name: 'JUST', decimals: 18 },
  TLa2f6VPqDgRE67v1736s7bJ8Ray5wYjU7: { symbol: 'WIN', name: 'WINkLink', decimals: 6 },
  TFczxzPhnThNSqr5by8tvxsdCFRRz6cPNq: { symbol: 'NFT', name: 'APENFT', decimals: 6 },
  THb4CqiFdwNHsWsQCs4JhzwjMWys4aqCbF: { symbol: 'ADA', name: 'Cardano', decimals: 6 },
  TN3W4H6rK2ce4vX9YnFQHwKENnHjoxb3m9: { symbol: 'BTC', name: 'Bitcoin', decimals: 8 },
  THbVQp8kMjStKNnf2iCY6NEzThKMK5aBHg: { symbol: 'DOGE', name: 'Dogecoin', decimals: 8 },
  TUpMhErZL2fhh4sVNULAbNKLokS4GjC1F4: { symbol: 'TUSD', name: 'TrueUSD', decimals: 18 },
  TKkeiboTkxXKJpbmVFbv4a8ov5rAfRDMf9: { symbol: 'SUNDOG', name: 'Sundog', decimals: 18 },
}

function formatTrc20Balance(rawBalance: string, decimals: number): string {
  if (decimals === 0) return rawBalance
  const raw = BigInt(rawBalance)
  const divisor = BigInt(10 ** decimals)
  const whole = raw / divisor
  const frac = raw % divisor
  if (frac === 0n) return whole.toString()
  const fracStr = frac.toString().padStart(decimals, '0').replace(/0+$/, '')
  return `${whole}.${fracStr}`
}

async function fetchTronBalance(address: string): Promise<PortfolioAsset[]> {
  const data = await tatumFetch<TronAccountResponse>(BASE_V3, `/tron/account/${address}`)
  const assets: PortfolioAsset[] = []

  // Native TRX (returned in sun → 1 TRX = 1_000_000 sun)
  if (data.balance != null) {
    assets.push({
      chain: 'tron-mainnet',
      address,
      balance: (data.balance / 1_000_000).toString(),
      decimals: 6,
      type: 'native',
      symbol: 'TRX',
      name: 'TRON',
    })
  }

  // TRC-20 tokens
  if (data.trc20) {
    for (const tokenObj of data.trc20) {
      for (const [tokenAddress, rawBalance] of Object.entries(tokenObj)) {
        const known = TRC20_KNOWN[tokenAddress]
        const decimals = known?.decimals ?? 0
        assets.push({
          chain: 'tron-mainnet',
          address,
          balance: formatTrc20Balance(rawBalance, decimals),
          decimals,
          type: 'fungible',
          symbol: known?.symbol,
          name: known?.name,
          tokenAddress,
        })
      }
    }
  }

  return assets
}

/* ── v3 Bitcoin fallback ──────────────────────────────────────────── */

interface BtcBalanceResponse {
  incoming: string
  outgoing: string
}

async function fetchBitcoinBalance(address: string): Promise<PortfolioAsset[]> {
  const data = await tatumFetch<BtcBalanceResponse>(BASE_V3, `/bitcoin/address/balance/${address}`)
  const balance = (parseFloat(data.incoming) - parseFloat(data.outgoing)).toString()

  return [
    {
      chain: 'bitcoin-mainnet',
      address,
      balance,
      decimals: 8,
      type: 'native',
      symbol: 'BTC',
      name: 'Bitcoin',
    },
  ]
}

/* ── Public API ──────────────────────────────────────────────────── */

export async function getWalletPortfolio(
  chain: string,
  address: string,
): Promise<PortfolioAsset[]> {
  if (V4_CHAINS.has(chain)) return fetchV4Portfolio(chain, address)
  if (chain === 'tron') return fetchTronBalance(address)
  if (chain === 'bitcoin') return fetchBitcoinBalance(address)

  throw new Error(`Unsupported chain: ${chain}`)
}

export async function getTransactionHistory(
  chain: string,
  address: string,
  pageSize = 20,
): Promise<TatumTransaction[]> {
  if (!V4_CHAINS.has(chain)) {
    throw new Error(`Transaction history not available for chain: ${chain}`)
  }

  const data = await tatumFetch<{ result: TatumTransaction[] }>(
    BASE_V4,
    '/data/transactions',
    { chain, addresses: address, pageSize: String(pageSize), transactionDirection: 'all' },
  )

  return data.result ?? []
}

export async function getTokenRate(
  symbol: string,
  basePair = 'USD',
): Promise<number> {
  const data = await tatumFetch<{ value: string }>(
    BASE_V3,
    '/tatum/rate/' + symbol,
    { basePair },
  )

  return parseFloat(data.value) || 0
}

/* ── USD valuation ───────────────────────────────────────────────── */

/** Symbols that represent a stablecoin pegged ~1:1 to USD */
const STABLECOINS = new Set(['USDT', 'USDC', 'TUSD', 'DAI', 'BUSD', 'USDJ', 'USDD'])

/** Maps our internal chain / native symbol to the Tatum rate API symbol */
const RATE_SYMBOL: Record<string, string> = {
  TRX: 'TRON',
  ETH: 'ETH',
  BTC: 'BTC',
  BNB: 'BNB',
  SOL: 'SOL',
  MATIC: 'MATIC',
  CELO: 'CELO',
  XTZ: 'XTZ',
}

/** In-memory rate cache: symbol → { usdPrice, fetchedAt } */
const rateCache = new Map<string, { usdPrice: number; fetchedAt: number }>()
const RATE_TTL = 5 * 60_000 // 5 minutes

async function getUsdRate(symbol: string): Promise<number> {
  if (!symbol) return 0
  if (STABLECOINS.has(symbol)) return 1

  const rateSymbol = RATE_SYMBOL[symbol]
  if (!rateSymbol) return 0

  const cached = rateCache.get(rateSymbol)
  if (cached && Date.now() - cached.fetchedAt < RATE_TTL) return cached.usdPrice

  try {
    const price = await getTokenRate(rateSymbol, 'USD')
    rateCache.set(rateSymbol, { usdPrice: price, fetchedAt: Date.now() })
    return price
  } catch {
    return cached?.usdPrice ?? 0
  }
}

export interface PortfolioAssetWithUsd extends PortfolioAsset {
  usdValue: number
}

export async function getWalletPortfolioWithUsd(
  chain: string,
  address: string,
): Promise<{ assets: PortfolioAssetWithUsd[]; totalUsd: number }> {
  const rawAssets = await getWalletPortfolio(chain, address)

  // Collect unique native symbols to fetch rates for
  const nativeSymbols = new Set<string>()
  for (const a of rawAssets) {
    if (a.type === 'native' && a.symbol) nativeSymbols.add(a.symbol)
  }

  // Fetch rates in parallel
  const rateEntries = await Promise.all(
    [...nativeSymbols].map(async (s) => [s, await getUsdRate(s)] as const),
  )
  const rates = new Map(rateEntries)

  let totalUsd = 0
  const assets: PortfolioAssetWithUsd[] = rawAssets.map((a) => {
    const bal = parseFloat(a.balance) || 0
    let usdValue = 0

    if (a.symbol && STABLECOINS.has(a.symbol)) {
      usdValue = bal
    } else if (a.type === 'native' && a.symbol) {
      usdValue = bal * (rates.get(a.symbol) ?? 0)
    }
    // Unknown fungible tokens without a known symbol → 0 USD

    totalUsd += usdValue
    return { ...a, usdValue }
  })

  return { assets, totalUsd }
}
