import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { corsHeaders } from '../_shared/cors.ts'
import { createAdminClient } from '../_shared/supabase-admin.ts'

/* ── Config ─────────────────────────────────────────────────── */

const TATUM_API_KEY = Deno.env.get('TATUM_API_KEY') ?? ''
const TATUM_BASE_V4 = 'https://api.tatum.io/v4'
const TATUM_BASE_V3 = 'https://api.tatum.io/v3'
const V4_CHAINS = new Set(['ethereum', 'bsc', 'solana', 'polygon', 'celo', 'tezos', 'chiliz', 'tron', 'bitcoin'])
const STABLECOINS = new Set(['USDT', 'USDC', 'TUSD', 'DAI', 'BUSD', 'USDJ', 'USDD'])
const NATIVE_SYMBOL: Record<string, string> = {
  ethereum: 'ETH', bsc: 'BNB', solana: 'SOL', polygon: 'MATIC',
  celo: 'CELO', tezos: 'XTZ', chiliz: 'CHZ', tron: 'TRX', bitcoin: 'BTC',
}
const RATE_SYMBOL: Record<string, string> = {
  TRX: 'TRON', ETH: 'ETH', BTC: 'BTC', BNB: 'BNB',
  SOL: 'SOL', MATIC: 'MATIC', CELO: 'CELO', CHZ: 'CHZ', XTZ: 'XTZ',
}
const TRC20_KNOWN: Record<string, { symbol: string; decimals: number }> = {
  TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t: { symbol: 'USDT', decimals: 6 },
  TEkxiTehnzSmSe2XqrBj4w32RUN966rdz8: { symbol: 'USDC', decimals: 6 },
  TNUC9Qb1rRpS5CbWLmNMxXBjyFoydXjWFR: { symbol: 'WTRX', decimals: 6 },
  TSSMHYeV2uE9qYH95DqyoCuNCzEL1NvU3S: { symbol: 'SUN', decimals: 18 },
  TAFjULxiVgT4qWk6UZwjqwZXTSaGaqnVp4: { symbol: 'BTT', decimals: 18 },
  TKfjV9RNKJJCqPvBtK8L7Knykh7DNWvnYt: { symbol: 'WBTT', decimals: 6 },
  TCFLL5dx5ZJdKnWuesXxi1VPwjLVmWZZy9: { symbol: 'JST', decimals: 18 },
  TLa2f6VPqDgRE67v1736s7bJ8Ray5wYjU7: { symbol: 'WIN', decimals: 6 },
  TFczxzPhnThNSqr5by8tvxsdCFRRz6cPNq: { symbol: 'NFT', decimals: 6 },
  THb4CqiFdwNHsWsQCs4JhzwjMWys4aqCbF: { symbol: 'ADA', decimals: 6 },
  TN3W4H6rK2ce4vX9YnFQHwKENnHjoxb3m9: { symbol: 'BTC', decimals: 8 },
  THbVQp8kMjStKNnf2iCY6NEzThKMK5aBHg: { symbol: 'DOGE', decimals: 8 },
  TUpMhErZL2fhh4sVNULAbNKLokS4GjC1F4: { symbol: 'TUSD', decimals: 18 },
  TKkeiboTkxXKJpbmVFbv4a8ov5rAfRDMf9: { symbol: 'SUNDOG', decimals: 18 },
}

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

/** Well-known EVM token addresses for symbol resolution */
const EVM_KNOWN_TOKENS: Record<string, Record<string, string>> = {
  ethereum: {
    '0xdac17f958d2ee523a2206206994597c13d831ec7': 'USDT',
    '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48': 'USDC',
    '0x6b175474e89094c44da98b954eedeac495271d0f': 'DAI',
    '0x4fabb145d64652a948d72533023f6e7a623c7c53': 'BUSD',
    '0x2260fac5e5542a773aa44fbcfedf7c193bc2c599': 'WBTC',
  },
  bsc: {
    '0x55d398326f99059ff775485246999027b3197955': 'USDT',
    '0x8ac76a51cc950d9822d68b83fe1ad97b32cd580d': 'USDC',
    '0xe9e7cea3dedca5984780bafc599bd69add087d56': 'BUSD',
  },
  solana: {},
  polygon: {
    '0xc2132d05d31c914a87c6611c10748aeb04b58e8f': 'USDT',
    '0x2791bca1f2de4661ed88a30c99a7a9449aa84174': 'USDC',
  },
}

function resolveTokenSymbol(chain: string, tokenAddress?: string): string | undefined {
  if (!tokenAddress) return undefined
  const map = EVM_KNOWN_TOKENS[chain]
  if (!map) return undefined
  return map[tokenAddress.toLowerCase()]
}

/* ── Tatum helpers ──────────────────────────────────────────── */

interface Asset { symbol?: string; type: string; balance: string; tokenAddress?: string }

async function tatumFetch<T>(base: string, path: string, params: Record<string, string> = {}): Promise<T> {
  const url = new URL(`${base}${path}`)
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v)
  const res = await fetch(url.toString(), {
    headers: { accept: 'application/json', 'x-api-key': TATUM_API_KEY },
  })
  if (!res.ok) throw new Error(`Tatum ${res.status}: ${await res.text().catch(() => '')}`)
  return res.json()
}

interface V4PortfolioResponse {
  result: Array<{ chain: string; address: string; balance: string; decimals: number; tokenAddress?: string; type: string; symbol?: string; name?: string }>
  prevPage?: string
  nextPage?: string
}

async function fetchV4Portfolio(chain: string, address: string): Promise<Asset[]> {
  const v4Chain = toV4Chain(chain)
  const [nativeRes, fungibleRes] = await Promise.allSettled([
    tatumFetch<V4PortfolioResponse>(TATUM_BASE_V4, '/data/wallet/portfolio', { chain: v4Chain, addresses: address, tokenTypes: 'native' }),
    tatumFetch<V4PortfolioResponse>(TATUM_BASE_V4, '/data/wallet/portfolio', { chain: v4Chain, addresses: address, tokenTypes: 'fungible' }),
  ])
  const assets: Asset[] = []
  if (nativeRes.status === 'fulfilled') {
    for (const item of nativeRes.value.result ?? []) {
      assets.push({ ...item, symbol: item.symbol || NATIVE_SYMBOL[chain] || chain.toUpperCase() })
    }
  }
  if (fungibleRes.status === 'fulfilled') {
    for (const item of fungibleRes.value.result ?? []) {
      const knownSymbol = resolveTokenSymbol(chain, item.tokenAddress)
      assets.push({ ...item, symbol: item.symbol || knownSymbol })
    }
  }
  if (assets.length === 0 && nativeRes.status === 'rejected' && fungibleRes.status === 'rejected') {
    throw nativeRes.reason
  }
  return assets
}

function formatTrc20Balance(raw: string, decimals: number): string {
  if (decimals === 0) return raw
  const bi = BigInt(raw)
  const d = BigInt(10 ** decimals)
  const whole = bi / d
  const frac = bi % d
  if (frac === 0n) return whole.toString()
  return `${whole}.${frac.toString().padStart(decimals, '0').replace(/0+$/, '')}`
}

async function fetchTronBalance(address: string): Promise<Asset[]> {
  const data = await tatumFetch<{ balance: number; trc20?: Array<Record<string, string>> }>(
    TATUM_BASE_V3, `/tron/account/${address}`,
  )
  const assets: Asset[] = []
  if (data.balance != null) {
    assets.push({ type: 'native', symbol: 'TRX', balance: (data.balance / 1_000_000).toString() })
  }
  if (data.trc20) {
    for (const tokenObj of data.trc20) {
      for (const [tokenAddress, rawBalance] of Object.entries(tokenObj)) {
        const known = TRC20_KNOWN[tokenAddress]
        assets.push({
          type: 'fungible',
          symbol: known?.symbol,
          balance: formatTrc20Balance(rawBalance, known?.decimals ?? 0),
          tokenAddress,
        })
      }
    }
  }
  return assets
}

async function fetchBitcoinBalance(address: string): Promise<Asset[]> {
  const data = await tatumFetch<{ incoming: string; outgoing: string }>(
    TATUM_BASE_V3, `/bitcoin/address/balance/${address}`,
  )
  return [{ type: 'native', symbol: 'BTC', balance: (parseFloat(data.incoming) - parseFloat(data.outgoing)).toString() }]
}

async function getAssets(chain: string, address: string): Promise<Asset[]> {
  if (V4_CHAINS.has(chain)) {
    try {
      return await fetchV4Portfolio(chain, address)
    } catch (v4Error) {
      // V3 fallback for TRON and Bitcoin
      if (chain === 'tron') return fetchTronBalance(address)
      if (chain === 'bitcoin') return fetchBitcoinBalance(address)
      throw v4Error
    }
  }
  throw new Error(`Unsupported chain: ${chain}`)
}

async function getUsdRate(symbol: string): Promise<number> {
  if (!symbol) return 0
  if (STABLECOINS.has(symbol)) return 1
  const rateSymbol = RATE_SYMBOL[symbol]
  if (!rateSymbol) return 0
  try {
    const data = await tatumFetch<{ value: string }>(
      TATUM_BASE_V4,
      '/data/rate/symbol',
      { symbol: rateSymbol, basePair: 'USD' },
    )
    return parseFloat(data.value) || 0
  } catch { return 0 }
}

async function getAssetsWithUsd(chain: string, address: string): Promise<{ balances: { token: string; balance: string; tokenAddress?: string }[]; totalUsd: number }> {
  const assets = await getAssets(chain, address)

  // Collect unique native symbols for rate fetching
  const nativeSymbols = new Set<string>()
  for (const a of assets) {
    if (a.type === 'native' && a.symbol) nativeSymbols.add(a.symbol)
  }
  const rateEntries = await Promise.all(
    [...nativeSymbols].map(async (s) => [s, await getUsdRate(s)] as const),
  )
  const rates = new Map(rateEntries)

  let totalUsd = 0
  const balances = assets.map((a) => {
    const bal = parseFloat(a.balance) || 0
    if (a.symbol && STABLECOINS.has(a.symbol)) {
      totalUsd += bal
    } else if (a.type === 'native' && a.symbol) {
      totalUsd += bal * (rates.get(a.symbol) ?? 0)
    }
    return {
      token: a.symbol || a.type,
      balance: a.balance,
      tokenAddress: a.tokenAddress,
    }
  })

  return { balances, totalUsd: Math.round(totalUsd * 100) / 100 }
}

/* ── Main handler ───────────────────────────────────────────── */

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    if (!TATUM_API_KEY) {
      return new Response(JSON.stringify({ error: 'TATUM_API_KEY not configured' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const admin = createAdminClient()
    const today = new Date().toISOString().slice(0, 10)

    // Fetch all active wallets
    const { data: wallets, error: walletsErr } = await admin
      .from('wallets')
      .select('id, organization_id, chain, address')
      .eq('is_active', true)

    if (walletsErr) throw walletsErr
    if (!wallets || wallets.length === 0) {
      return new Response(JSON.stringify({ message: 'No active wallets', count: 0 }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    let successCount = 0
    const errors: string[] = []

    // Process wallets sequentially to avoid rate limits
    for (const wallet of wallets) {
      try {
        const { balances, totalUsd } = await getAssetsWithUsd(wallet.chain, wallet.address)

        const { error: upsertErr } = await admin.from('wallet_snapshots').upsert(
          {
            wallet_id: wallet.id,
            organization_id: wallet.organization_id,
            snapshot_date: today,
            balances,
            total_usd: totalUsd,
          },
          { onConflict: 'wallet_id,snapshot_date' },
        )

        if (upsertErr) throw upsertErr
        successCount++
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err)
        errors.push(`${wallet.id}: ${msg}`)
        console.error(`Failed snapshot for wallet ${wallet.id}:`, msg)
      }
    }

    return new Response(
      JSON.stringify({
        message: `Snapshotted ${successCount}/${wallets.length} wallets`,
        date: today,
        successCount,
        totalWallets: wallets.length,
        errors: errors.length > 0 ? errors : undefined,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    )
  } catch (err) {
    console.error('Unhandled error:', err)
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : 'Unexpected error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    )
  }
})
