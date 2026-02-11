import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { corsHeaders } from '../_shared/cors.ts'
import { createAdminClient } from '../_shared/supabase-admin.ts'

/* ── Config ─────────────────────────────────────────────────── */

const TATUM_API_KEY = Deno.env.get('TATUM_API_KEY') ?? ''
const TATUM_BASE_V4 = 'https://api.tatum.io/v4'
const TATUM_BASE_V3 = 'https://api.tatum.io/v3'
const V4_CHAINS = new Set(['ethereum', 'bsc', 'solana', 'polygon', 'celo', 'tezos', 'chiliz'])
const STABLECOINS = new Set(['USDT', 'USDC', 'TUSD', 'DAI', 'BUSD', 'USDJ', 'USDD'])
const NATIVE_SYMBOL: Record<string, string> = {
  ethereum: 'ETH', bsc: 'BNB', solana: 'SOL', polygon: 'MATIC',
  celo: 'CELO', tezos: 'XTZ', chiliz: 'CHZ',
}
const RATE_SYMBOL: Record<string, string> = {
  TRX: 'TRON', ETH: 'ETH', BTC: 'BTC', BNB: 'BNB',
  SOL: 'SOL', MATIC: 'MATIC', CELO: 'CELO', XTZ: 'XTZ',
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

async function fetchV4Portfolio(chain: string, address: string): Promise<Asset[]> {
  const [nativeRes, fungibleRes] = await Promise.allSettled([
    tatumFetch<{ result: Asset[] }>(TATUM_BASE_V4, '/data/wallet/portfolio', { chain, addresses: address, tokenTypes: 'native' }),
    tatumFetch<{ result: Asset[] }>(TATUM_BASE_V4, '/data/wallet/portfolio', { chain, addresses: address, tokenTypes: 'fungible' }),
  ])
  const assets: Asset[] = []
  if (nativeRes.status === 'fulfilled') {
    for (const item of nativeRes.value.result ?? []) {
      assets.push({ ...item, symbol: item.symbol || NATIVE_SYMBOL[chain] || chain.toUpperCase() })
    }
  }
  if (fungibleRes.status === 'fulfilled') {
    for (const item of fungibleRes.value.result ?? []) assets.push(item)
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
  if (V4_CHAINS.has(chain)) return fetchV4Portfolio(chain, address)
  if (chain === 'tron') return fetchTronBalance(address)
  if (chain === 'bitcoin') return fetchBitcoinBalance(address)
  throw new Error(`Unsupported chain: ${chain}`)
}

async function getUsdRate(symbol: string): Promise<number> {
  if (!symbol) return 0
  if (STABLECOINS.has(symbol)) return 1
  const rateSymbol = RATE_SYMBOL[symbol]
  if (!rateSymbol) return 0
  try {
    const data = await tatumFetch<{ value: string }>(TATUM_BASE_V3, `/tatum/rate/${rateSymbol}`, { basePair: 'USD' })
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
