const API_KEY = import.meta.env.VITE_TATUM_API_KEY as string
const BASE_V4 = import.meta.env.DEV ? '/tatum-api/v4' : 'https://api.tatum.io/v4'
const BASE_V3 = import.meta.env.DEV ? '/tatum-api/v3' : 'https://api.tatum.io/v3'
const TIMEOUT_MS = 30_000

/* ── V4 chain name mapping ──────────────────────────────────────── */

/** Our internal chain names (stored in DB) — all routed through V4 Data API */
const V4_CHAINS = new Set([
  'ethereum',
  'bsc',
  'solana',
  'polygon',
  'celo',
  'tezos',
  'chiliz',
  'tron',
  'bitcoin',
])

/** Tatum V4 API requires "-mainnet" suffix */
const V4_CHAIN_MAP: Record<string, string> = {
  ethereum: 'ethereum-mainnet',
  bsc: 'bsc-mainnet',
  solana: 'solana-mainnet',
  polygon: 'polygon-mainnet',
  celo: 'celo-mainnet',
  tezos: 'tezos-mainnet',
  chiliz: 'chiliz-mainnet',
  tron: 'tron-mainnet',
  bitcoin: 'bitcoin-mainnet',
}

function toV4Chain(chain: string): string {
  return V4_CHAIN_MAP[chain] ?? chain
}

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
  transactionIndex?: number
  tokenId?: string
}

/** Unified transaction shape across all chains */
export interface NormalizedTransaction {
  hash: string
  chain: string
  timestamp: number
  direction: 'in' | 'out'
  amount: string
  symbol: string
  tokenAddress?: string
  counterAddress?: string
  blockNumber?: number
}

/** Block explorer URLs per chain */
export const EXPLORER_TX_URL: Record<string, string> = {
  tron: 'https://tronscan.org/#/transaction/',
  ethereum: 'https://etherscan.io/tx/',
  bsc: 'https://bscscan.com/tx/',
  bitcoin: 'https://mempool.space/tx/',
  solana: 'https://solscan.io/tx/',
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

/* ── Well-known token symbols (EVM chains) ──────────────────────── */

/** ERC-20 / BEP-20 token address → symbol for common tokens */
const EVM_KNOWN_TOKENS: Record<string, Record<string, string>> = {
  ethereum: {
    '0xdac17f958d2ee523a2206206994597c13d831ec7': 'USDT',
    '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48': 'USDC',
    '0x6b175474e89094c44da98b954eedeac495271d0f': 'DAI',
    '0x4fabb145d64652a948d72533023f6e7a623c7c53': 'BUSD',
    '0x2260fac5e5542a773aa44fbcfedf7c193bc2c599': 'WBTC',
    '0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2': 'WETH',
  },
  bsc: {
    '0x55d398326f99059ff775485246999027b3197955': 'USDT',
    '0x8ac76a51cc950d9822d68b83fe1ad97b32cd580d': 'USDC',
    '0xe9e7cea3dedca5984780bafc599bd69add087d56': 'BUSD',
    '0x1af3f329e8be154074d8769d1ffa4ee058b1dbc3': 'DAI',
    '0xbb4cdb9cbd36b01bd1cbaebf2de08d9173bc095c': 'WBNB',
  },
  solana: {},
  polygon: {
    '0xc2132d05d31c914a87c6611c10748aeb04b58e8f': 'USDT',
    '0x2791bca1f2de4661ed88a30c99a7a9449aa84174': 'USDC',
    '0x8f3cf7ad23cd3cadbd9735aff958023239c6a063': 'DAI',
  },
  tron: {
    'TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t': 'USDT',
    'TEkxiTehnzSmSe2XqrBj4w32RUN966rdz8': 'USDC',
    'TNUC9Qb1rRpS5CbWLmNMxXBjyFoydXjWFR': 'WTRX',
    'TSSMHYeV2uE9qYH95DqyoCuNCzEL1NvU3S': 'SUN',
    'TAFjULxiVgT4qWk6UZwjqwZXTSaGaqnVp4': 'BTT',
    'TUpMhErZL2fhh4sVNULAbNKLokS4GjC1F4': 'TUSD',
  },
  bitcoin: {},
}

function resolveTokenSymbol(chain: string, tokenAddress?: string): string | undefined {
  if (!tokenAddress) return undefined
  const map = EVM_KNOWN_TOKENS[chain]
  if (!map) return undefined
  // TRON uses base58 (case-sensitive), EVM uses hex (case-insensitive)
  return map[tokenAddress] ?? map[tokenAddress.toLowerCase()]
}

/* ── v4 portfolio (EVM + Solana + others) ─────────────────────────── */

interface V4PortfolioResponse {
  result: V4PortfolioItem[]
  prevPage?: string
  nextPage?: string
}

interface V4PortfolioItem {
  chain: string
  address: string
  balance: string
  denominatedBalance?: string
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
  tron: 'TRX',
  bitcoin: 'BTC',
}

async function fetchV4Portfolio(chain: string, address: string): Promise<PortfolioAsset[]> {
  const v4Chain = toV4Chain(chain)

  const [nativeRes, fungibleRes] = await Promise.allSettled([
    tatumFetch<V4PortfolioResponse>(BASE_V4, '/data/wallet/portfolio', {
      chain: v4Chain,
      addresses: address,
      tokenTypes: 'native',
    }),
    tatumFetch<V4PortfolioResponse>(BASE_V4, '/data/wallet/portfolio', {
      chain: v4Chain,
      addresses: address,
      tokenTypes: 'fungible',
    }),
  ])

  const assets: PortfolioAsset[] = []

  if (nativeRes.status === 'fulfilled') {
    for (const item of nativeRes.value.result ?? []) {
      assets.push({
        ...item,
        symbol: item.symbol || NATIVE_SYMBOL[chain] || chain.toUpperCase(),
      })
    }
  }
  if (fungibleRes.status === 'fulfilled') {
    for (const item of fungibleRes.value.result ?? []) {
      const knownSymbol = resolveTokenSymbol(chain, item.tokenAddress)
      assets.push({
        ...item,
        symbol: item.symbol || knownSymbol,
      })
    }
  }

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
      chain: 'tron',
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
          chain: 'tron',
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
      chain: 'bitcoin',
      address,
      balance,
      decimals: 8,
      type: 'native',
      symbol: 'BTC',
      name: 'Bitcoin',
    },
  ]
}

/* ── v3 TRON transaction history ─────────────────────────────────── */

interface TronRawTx {
  txID: string
  blockNumber?: number
  rawData?: {
    contract?: Array<{
      parameter?: {
        value?: {
          amount?: number
          owner_address?: string
          ownerAddressBase58?: string
          to_address?: string
          toAddressBase58?: string
          contract_address?: string
        }
      }
      type?: string
    }>
    timestamp?: number
  }
  ret?: Array<{ contractRet?: string }>
}

interface TronTrc20Tx {
  transaction_id: string
  token_info?: { symbol?: string; address?: string; decimals?: number; name?: string }
  block_timestamp?: number
  from: string
  to: string
  type?: string
  value?: string
}

/* ── helpers to normalize raw TRON responses ──────────────────────── */

function normalizeTronNativeTxs(
  rawTxs: TronRawTx[],
  address: string,
): NormalizedTransaction[] {
  const txs: NormalizedTransaction[] = []
  for (const tx of rawTxs) {
    const contract = tx.rawData?.contract?.[0]
    const val = contract?.parameter?.value
    if (!val || !tx.txID) continue

    const from = val.ownerAddressBase58 ?? val.owner_address ?? ''
    const to = val.toAddressBase58 ?? val.to_address ?? ''
    const direction: 'in' | 'out' = from === address ? 'out' : 'in'
    const amount = val.amount != null ? (val.amount / 1_000_000).toString() : '0'

    txs.push({
      hash: tx.txID,
      chain: 'tron',
      timestamp: tx.rawData?.timestamp ?? 0,
      direction,
      amount,
      symbol: 'TRX',
      counterAddress: direction === 'out' ? to : from,
      blockNumber: tx.blockNumber,
    })
  }
  return txs
}

function normalizeTronTrc20Txs(
  rawTxs: TronTrc20Tx[],
  address: string,
): NormalizedTransaction[] {
  const txs: NormalizedTransaction[] = []
  for (const tx of rawTxs) {
    if (!tx.transaction_id) continue
    const from = tx.from ?? ''
    const to = tx.to ?? ''
    const direction: 'in' | 'out' = from === address ? 'out' : 'in'
    const decimals = tx.token_info?.decimals ?? 0
    const amount = tx.value ? formatTrc20Balance(tx.value, decimals) : '0'

    txs.push({
      hash: tx.transaction_id,
      chain: 'tron',
      timestamp: tx.block_timestamp ?? 0,
      direction,
      amount,
      symbol: tx.token_info?.symbol ?? 'UNKNOWN',
      tokenAddress: tx.token_info?.address,
      counterAddress: direction === 'out' ? to : from,
    })
  }
  return txs
}

/* ── TRON cursor encoding ─────────────────────────────────────────── */

/** Encode native + trc20 cursors into a single string */
function encodeTronCursor(nativeNext?: string, trc20Next?: string): string | undefined {
  if (!nativeNext && !trc20Next) return undefined
  return btoa(JSON.stringify({ n: nativeNext ?? '', t: trc20Next ?? '' }))
}

function decodeTronCursor(cursor?: string): { nativeNext?: string; trc20Next?: string } {
  if (!cursor) return {}
  try {
    const { n, t } = JSON.parse(atob(cursor))
    return { nativeNext: n || undefined, trc20Next: t || undefined }
  } catch {
    return {}
  }
}

/* ── Paginated TRON fetch (native + TRC-20 in parallel) ──────────── */

async function fetchTronTransactions(
  address: string,
  cursor?: string,
): Promise<{ txs: NormalizedTransaction[]; nextCursor?: string }> {
  const { nativeNext, trc20Next } = decodeTronCursor(cursor)

  // On first call (!cursor) fetch both; on subsequent calls only fetch endpoints that still have pages
  const isFirstCall = !cursor
  const shouldFetchNative = isFirstCall || !!nativeNext
  const shouldFetchTrc20 = isFirstCall || !!trc20Next

  const nativeParams: Record<string, string> = {}
  if (nativeNext) nativeParams.next = nativeNext

  const trc20Params: Record<string, string> = {}
  if (trc20Next) trc20Params.next = trc20Next

  const [nativeRes, trc20Res] = await Promise.allSettled([
    shouldFetchNative
      ? tatumFetch<{ transactions?: TronRawTx[]; next?: string }>(
          BASE_V3,
          `/tron/transaction/account/${address}`,
          nativeParams,
        )
      : Promise.resolve({ transactions: [] as TronRawTx[], next: undefined }),
    shouldFetchTrc20
      ? tatumFetch<{ transactions?: TronTrc20Tx[]; next?: string }>(
          BASE_V3,
          `/tron/transaction/account/${address}/trc20`,
          trc20Params,
        )
      : Promise.resolve({ transactions: [] as TronTrc20Tx[], next: undefined }),
  ])

  const txs: NormalizedTransaction[] = []

  const newNativeNext = nativeRes.status === 'fulfilled' ? nativeRes.value.next : undefined
  const newTrc20Next = trc20Res.status === 'fulfilled' ? trc20Res.value.next : undefined

  if (nativeRes.status === 'fulfilled') {
    txs.push(...normalizeTronNativeTxs(nativeRes.value.transactions ?? [], address))
  }
  if (trc20Res.status === 'fulfilled') {
    txs.push(...normalizeTronTrc20Txs(trc20Res.value.transactions ?? [], address))
  }

  txs.sort((a, b) => b.timestamp - a.timestamp)

  return { txs, nextCursor: encodeTronCursor(newNativeNext, newTrc20Next) }
}

/* ── v3 Bitcoin transaction history ─────────────────────────────── */

interface BtcTx {
  hash: string
  blockNumber?: number
  time?: number
  inputs?: Array<{ coin?: { address?: string; value?: number } }>
  outputs?: Array<{ address?: string; value?: number }>
  fee?: string
}

async function fetchBitcoinTransactions(
  address: string,
  pageSize = 50,
  offset = 0,
): Promise<{ txs: NormalizedTransaction[]; hasMore: boolean }> {
  const data = await tatumFetch<BtcTx[]>(
    BASE_V3,
    `/bitcoin/transaction/address/${address}`,
    { pageSize: String(pageSize), offset: String(offset) },
  )

  const txs: NormalizedTransaction[] = []

  for (const tx of data ?? []) {
    if (!tx.hash) continue

    const isInput = tx.inputs?.some((inp) => inp.coin?.address === address)
    const direction: 'in' | 'out' = isInput ? 'out' : 'in'

    let amount = 0
    if (direction === 'out') {
      for (const out of tx.outputs ?? []) {
        if (out.address !== address && out.value) amount += out.value
      }
    } else {
      for (const out of tx.outputs ?? []) {
        if (out.address === address && out.value) amount += out.value
      }
    }

    let counterAddress: string | undefined
    if (direction === 'out') {
      counterAddress = tx.outputs?.find((o) => o.address !== address)?.address
    } else {
      counterAddress = tx.inputs?.[0]?.coin?.address
    }

    txs.push({
      hash: tx.hash,
      chain: 'bitcoin',
      timestamp: (tx.time ?? 0) * 1000, // BTC V3 returns seconds
      direction,
      amount: amount.toString(),
      symbol: 'BTC',
      counterAddress,
      blockNumber: tx.blockNumber,
    })
  }

  return { txs, hasMore: data?.length === pageSize }
}

/* ── v4 transaction history (EVM + Solana) ──────────────────────── */

function normalizeV4Transactions(
  v4Txs: TatumTransaction[],
  chain: string,
  address: string,
): NormalizedTransaction[] {
  return v4Txs.map((tx) => {
    // V4 uses transactionSubtype: 'incoming' | 'outgoing' | 'zero-transfer'
    const direction: 'in' | 'out' =
      tx.transactionSubtype === 'outgoing' ? 'out' : 'in'

    // Amount can be negative for outgoing — normalize to absolute value
    const rawAmount = parseFloat(tx.amount) || 0
    const absAmount = Math.abs(rawAmount).toString()

    // Resolve symbol: V4 response may not include symbol
    let symbol = ''
    if (tx.transactionType === 'native') {
      symbol = NATIVE_SYMBOL[chain] ?? chain.toUpperCase()
    } else if (tx.tokenAddress) {
      symbol = resolveTokenSymbol(chain, tx.tokenAddress) ?? `${tx.tokenAddress.slice(0, 6)}…`
    } else {
      symbol = tx.transactionType
    }

    return {
      hash: tx.hash,
      chain,
      // V4 timestamps are already in milliseconds
      timestamp: tx.timestamp,
      direction,
      amount: absAmount,
      symbol,
      tokenAddress: tx.tokenAddress,
      counterAddress: tx.counterAddress,
      blockNumber: tx.blockNumber,
    }
  })
}

/* ── Public API ──────────────────────────────────────────────────── */

export async function getWalletPortfolio(
  chain: string,
  address: string,
): Promise<PortfolioAsset[]> {
  if (V4_CHAINS.has(chain)) {
    try {
      return await fetchV4Portfolio(chain, address)
    } catch (v4Error) {
      // V3 fallback for TRON and Bitcoin if V4 fails
      if (chain === 'tron') return fetchTronBalance(address)
      if (chain === 'bitcoin') return fetchBitcoinBalance(address)
      throw v4Error
    }
  }

  throw new Error(`Unsupported chain: ${chain}`)
}

export interface TransactionHistoryResult {
  transactions: NormalizedTransaction[]
  nextCursor?: string
  hasMore: boolean
}

export async function getTransactionHistory(
  chain: string,
  address: string,
  pageSize = 50,
  cursor?: string,
): Promise<TransactionHistoryResult> {
  // TRON: use V3 directly – V4 /data/transactions does NOT return TRC-20 token transfers
  if (chain === 'tron') {
    const { txs, nextCursor } = await fetchTronTransactions(address, cursor)
    return { transactions: txs, nextCursor, hasMore: !!nextCursor }
  }

  // Bitcoin: use V3 directly
  if (chain === 'bitcoin') {
    const offset = parseInt(cursor ?? '0') || 0
    const { txs, hasMore } = await fetchBitcoinTransactions(address, pageSize, offset)
    return {
      transactions: txs,
      nextCursor: hasMore ? String(offset + pageSize) : undefined,
      hasMore,
    }
  }

  if (V4_CHAINS.has(chain)) {
    const v4Chain = toV4Chain(chain)
    const offset = parseInt(cursor ?? '0') || 0

    const params: Record<string, string> = {
      chain: v4Chain,
      addresses: address,
      pageSize: String(pageSize),
      offset: String(offset),
      transactionDirection: 'all',
    }

    // V4 response can be a flat array or { result: [...] }
    const raw = await tatumFetch<TatumTransaction[] | { result: TatumTransaction[] }>(
      BASE_V4,
      '/data/transactions',
      params,
    )

    const txs = Array.isArray(raw) ? raw : (raw.result ?? [])
    return {
      transactions: normalizeV4Transactions(txs, chain, address),
      nextCursor: txs.length === pageSize ? String(offset + pageSize) : undefined,
      hasMore: txs.length === pageSize,
    }
  }

  throw new Error(`Unsupported chain for transactions: ${chain}`)
}


export async function getTokenRate(
  symbol: string,
  basePair = 'USD',
): Promise<number> {
  const data = await tatumFetch<{ value: string }>(
    BASE_V4,
    '/data/rate/symbol',
    { symbol, basePair },
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
  CHZ: 'CHZ',
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

    totalUsd += usdValue
    return { ...a, usdValue }
  })

  return { assets, totalUsd }
}
