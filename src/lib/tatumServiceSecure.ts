/**
 * Tatum Service (Secure Version)
 *
 * All API calls route through Supabase Edge Function to keep API keys secure.
 * This file replaces the direct API calls in tatumService.ts
 */

import { tatumApi } from '@/lib/secureApi'

/* ── V4 chain name mapping ──────────────────────────────────────── */

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

export interface NormalizedTransfer {
  hash: string
  chain: string
  timestamp: number
  direction: 'in' | 'out'
  amount: string
  symbol: string
  tokenAddress?: string
  counterAddress?: string
  fromAddress?: string
  toAddress?: string
  blockNumber?: number
}

export const EXPLORER_TX_URL: Record<string, string> = {
  tron: 'https://tronscan.org/#/transaction/',
  ethereum: 'https://etherscan.io/tx/',
  bsc: 'https://bscscan.com/tx/',
  bitcoin: 'https://mempool.space/tx/',
  solana: 'https://solscan.io/tx/',
}

/* ── Well-known token symbols ─────────────────────────────────── */

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
    TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t: 'USDT',
    TEkxiTehnzSmSe2XqrBj4w32RUN966rdz8: 'USDC',
    TNUC9Qb1rRpS5CbWLmNMxXBjyFoydXjWFR: 'WTRX',
    TSSMHYeV2uE9qYH95DqyoCuNCzEL1NvU3S: 'SUN',
    TAFjULxiVgT4qWk6UZwjqwZXTSaGaqnVp4: 'BTT',
    TUpMhErZL2fhh4sVNULAbNKLokS4GjC1F4: 'TUSD',
  },
  bitcoin: {},
}

function resolveTokenSymbol(chain: string, tokenAddress?: string): string | undefined {
  if (!tokenAddress) return undefined
  const map = EVM_KNOWN_TOKENS[chain]
  if (!map) return undefined
  return map[tokenAddress] ?? map[tokenAddress.toLowerCase()]
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

/* ── Portfolio fetching ─────────────────────────────────────────── */

interface V4PortfolioResponse {
  result: Array<{
    chain: string
    address: string
    balance: string
    decimals: number
    tokenAddress?: string
    type: string
    symbol?: string
    name?: string
  }>
  prevPage?: string
  nextPage?: string
}

async function fetchV4Portfolio(chain: string, address: string): Promise<PortfolioAsset[]> {
  const v4Chain = toV4Chain(chain)

  const [nativeRes, fungibleRes] = await Promise.allSettled([
    tatumApi.getPortfolio(v4Chain, address, 'native') as Promise<V4PortfolioResponse>,
    tatumApi.getPortfolio(v4Chain, address, 'fungible') as Promise<V4PortfolioResponse>,
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

interface TronAccountResponse {
  balance: number
  trc20?: Array<Record<string, string>>
}

async function fetchTronBalance(address: string): Promise<PortfolioAsset[]> {
  const data = (await tatumApi.getTronAccount(address)) as TronAccountResponse
  const assets: PortfolioAsset[] = []

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

interface BtcBalanceResponse {
  incoming: string
  outgoing: string
}

async function fetchBitcoinBalance(address: string): Promise<PortfolioAsset[]> {
  const data = (await tatumApi.getBitcoinBalance(address)) as BtcBalanceResponse
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

export async function getWalletPortfolio(
  chain: string,
  address: string,
): Promise<PortfolioAsset[]> {
  if (V4_CHAINS.has(chain)) {
    try {
      return await fetchV4Portfolio(chain, address)
    } catch (v4Error) {
      if (chain === 'tron') return fetchTronBalance(address)
      if (chain === 'bitcoin') return fetchBitcoinBalance(address)
      throw v4Error
    }
  }

  throw new Error(`Unsupported chain: ${chain}`)
}

/* ── Transaction history ────────────────────────────────────────── */

export interface TransferHistoryResult {
  transfers: NormalizedTransfer[]
  nextCursor?: string
  hasMore: boolean
}

function normalizeV4Transfers(v4Txs: TatumTransaction[], chain: string): NormalizedTransfer[] {
  return v4Txs.map((tx) => {
    const direction: 'in' | 'out' = tx.transactionSubtype === 'outgoing' ? 'out' : 'in'

    const rawAmount = parseFloat(tx.amount) || 0
    const absAmount = Math.abs(rawAmount).toString()

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

export async function getTransferHistory(
  chain: string,
  address: string,
  pageSize = 50,
  cursor?: string,
): Promise<TransferHistoryResult> {
  // Handle Bitcoin
  if (chain === 'bitcoin') {
    interface BtcTx {
      hash?: string
      time?: number
      blockNumber?: number
      inputs?: Array<{ coin?: { address?: string } }>
      outputs?: Array<{ address?: string; value?: number }>
    }
    const offset = parseInt(cursor ?? '0') || 0
    const data = (await tatumApi.getBitcoinTransactions(address, pageSize, offset)) as BtcTx[]

    const transfers: NormalizedTransfer[] = []
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

      transfers.push({
        hash: tx.hash,
        chain: 'bitcoin',
        timestamp: (tx.time ?? 0) * 1000,
        direction,
        amount: amount.toString(),
        symbol: 'BTC',
        counterAddress,
        blockNumber: tx.blockNumber,
      })
    }

    return {
      transfers,
      nextCursor: data?.length === pageSize ? String(offset + pageSize) : undefined,
      hasMore: data?.length === pageSize,
    }
  }

  // Handle other V4 chains
  if (V4_CHAINS.has(chain)) {
    const v4Chain = toV4Chain(chain)
    const offset = parseInt(cursor ?? '0') || 0

    const raw = (await tatumApi.getTransactions({
      chain: v4Chain,
      address,
      pageSize,
      offset,
      transactionDirection: 'all',
      transactionTypes: 'fungible,native',
    })) as TatumTransaction[] | { result: TatumTransaction[] }

    const txs = Array.isArray(raw) ? raw : (raw.result ?? [])
    return {
      transfers: normalizeV4Transfers(txs, chain),
      nextCursor: txs.length === pageSize ? String(offset + pageSize) : undefined,
      hasMore: txs.length === pageSize,
    }
  }

  throw new Error(`Unsupported chain for transfers: ${chain}`)
}

/* ── USD valuation ────────────────────────────────────────────────── */

const STABLECOINS = new Set(['USDT', 'USDC', 'TUSD', 'DAI', 'BUSD', 'USDJ', 'USDD'])

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

const rateCache = new Map<string, { usdPrice: number; fetchedAt: number }>()
const RATE_TTL = 60_000
const inflightRates = new Map<string, Promise<number>>()

async function getUsdRate(symbol: string): Promise<number> {
  if (!symbol) return 0
  if (STABLECOINS.has(symbol)) return 1

  const rateSymbol = RATE_SYMBOL[symbol]
  if (!rateSymbol) return 0

  const cached = rateCache.get(rateSymbol)
  if (cached && Date.now() - cached.fetchedAt < RATE_TTL) return cached.usdPrice

  const inflight = inflightRates.get(rateSymbol)
  if (inflight) return inflight

  const request = tatumApi
    .getTokenRate(rateSymbol, 'USD')
    .then((data) => {
      const price = parseFloat(data.value) || 0
      rateCache.set(rateSymbol, { usdPrice: price, fetchedAt: Date.now() })
      return price
    })
    .catch(() => cached?.usdPrice ?? 0)
    .finally(() => {
      inflightRates.delete(rateSymbol)
    })

  inflightRates.set(rateSymbol, request)
  return request
}

export interface PortfolioAssetWithUsd extends PortfolioAsset {
  usdValue: number
}

export interface PortfolioResult {
  assets: PortfolioAssetWithUsd[]
  totalUsd: number
  warnings: string[]
}

export async function getWalletPortfolioWithUsd(
  chain: string,
  address: string,
): Promise<PortfolioResult> {
  const warnings: string[] = []
  const rawAssets = await getWalletPortfolio(chain, address)

  const nativeSymbols = new Set<string>()
  for (const a of rawAssets) {
    if (a.type === 'native' && a.symbol) nativeSymbols.add(a.symbol)
  }

  const rateEntries = await Promise.all(
    [...nativeSymbols].map(async (s) => {
      const rate = await getUsdRate(s)
      if (rate === 0) warnings.push(`Could not fetch USD rate for ${s}`)
      return [s, rate] as const
    }),
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

  return { assets, totalUsd, warnings }
}
