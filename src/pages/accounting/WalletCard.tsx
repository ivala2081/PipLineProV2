import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { Copy, Eye, Trash, Camera, ArrowsClockwise, PencilSimple } from '@phosphor-icons/react'
import type { Wallet } from '@/lib/database.types'
import { useWalletBalanceQuery } from '@/hooks/queries/useWalletBalanceQuery'
import { useWalletSnapshotsQuery } from '@/hooks/queries/useWalletSnapshotsQuery'
import { useWalletTransfersQuery } from '@/hooks/queries/useWalletTransfersQuery'
import { Card, Button, Skeleton } from '@ds'

/* Spam token filter – matches WalletDailyClosing */
const KNOWN_TOKENS = new Set([
  'TRX',
  'USDT',
  'USDD',
  'USDC',
  'TUSD',
  'USDJ',
  'BTT',
  'JST',
  'SUN',
  'WIN',
  'NFT',
  'APENFT',
  'WTRX',
  'stUSDT',
  'BNB',
  'WBNB',
  'ETH',
  'WETH',
  'SOL',
  'BTC',
  'WBTC',
  'DAI',
  'BUSD',
])
function isLegitToken(sym: string): boolean {
  if (!sym) return false
  if (KNOWN_TOKENS.has(sym)) return true
  if (/^0x/i.test(sym)) return false
  if (/[\s.]|www|\.com|\.net|\.org|http/i.test(sym)) return false
  if (/^fungible$/i.test(sym)) return false
  if (sym.length > 10) return false
  return true
}

const CHAIN_META: Record<string, { label: string; color: string }> = {
  tron: { label: 'TRON', color: 'bg-red/10 text-red' },
  ethereum: { label: 'ETH', color: 'bg-blue/10 text-blue' },
  bsc: { label: 'BSC', color: 'bg-yellow/10 text-yellow' },
  bitcoin: { label: 'BTC', color: 'bg-orange/10 text-orange' },
  solana: { label: 'SOL', color: 'bg-purple/10 text-purple' },
}

function truncAddr(addr: string) {
  if (addr.length <= 16) return addr
  return `${addr.slice(0, 6)}...${addr.slice(-4)}`
}

function fmt(value: number, decimals = 2): string {
  return value.toLocaleString('en-US', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  })
}

interface WalletCardProps {
  wallet: Wallet
  onViewDetail: () => void
  onEdit: () => void
  onDelete: () => void
}

export function WalletCard({ wallet, onViewDetail, onEdit, onDelete }: WalletCardProps) {
  const { t } = useTranslation('pages')
  const {
    assets,
    totalUsd,
    isLoading: isBalanceLoading,
    error: balanceError,
  } = useWalletBalanceQuery(wallet.id, wallet.chain, wallet.address)
  const { takeSnapshot, isTakingSnapshot } = useWalletSnapshotsQuery(
    wallet.id,
    wallet.chain,
    wallet.address,
  )
  const txQuery = useWalletTransfersQuery(wallet.id, wallet.chain, wallet.address)

  const todaySummary = useMemo(() => {
    const now = new Date()
    const todayKey = `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, '0')}-${String(now.getUTCDate()).padStart(2, '0')}`

    const inByToken: Record<string, number> = {}
    const outByToken: Record<string, number> = {}

    for (const tx of txQuery.transfers) {
      if (tx.timestamp <= 0) continue
      const d = new Date(tx.timestamp)
      const key = `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}-${String(d.getUTCDate()).padStart(2, '0')}`
      if (key !== todayKey) continue

      const sym = tx.symbol || 'UNKNOWN'
      if (!isLegitToken(sym)) continue
      const amount = parseFloat(tx.amount) || 0
      if (tx.direction === 'in') {
        inByToken[sym] = (inByToken[sym] ?? 0) + amount
      } else {
        outByToken[sym] = (outByToken[sym] ?? 0) + amount
      }
    }

    const allSymbols = new Set([...Object.keys(inByToken), ...Object.keys(outByToken)])
    const netByToken: Record<string, number> = {}
    for (const sym of allSymbols) {
      netByToken[sym] = (inByToken[sym] ?? 0) - (outByToken[sym] ?? 0)
    }

    return { inByToken, outByToken, netByToken }
  }, [txQuery.transfers])

  const hasTodayData =
    Object.keys(todaySummary.inByToken).length > 0 ||
    Object.keys(todaySummary.outByToken).length > 0

  const chainInfo = CHAIN_META[wallet.chain] ?? {
    label: wallet.chain.toUpperCase(),
    color: 'bg-black/5 text-black/60',
  }

  const handleCopy = () => navigator.clipboard.writeText(wallet.address)

  const sortedAssets = [...assets]
    .filter((a) => a.usdValue > 0)
    .sort((a, b) => b.usdValue - a.usdValue)

  /* helper: render token amounts inline */
  const renderTokenAmounts = (
    byToken: Record<string, number>,
    sign: '+' | '-' | 'auto',
    colorClass: string,
  ) => {
    const entries = Object.entries(byToken).sort(([, a], [, b]) => Math.abs(b) - Math.abs(a))
    if (entries.length === 0) return <span className="text-black/15">—</span>
    return entries.map(([sym, amount]) => {
      const c = sign === 'auto' ? (amount >= 0 ? 'text-green' : 'text-red') : colorClass
      const prefix = sign === 'auto' ? (amount >= 0 ? '+' : '') : sign
      const displayValue = sign === '-' ? Math.abs(amount) : amount
      return (
        <span key={sym} className={`font-mono text-[12px] font-semibold tabular-nums ${c}`}>
          {prefix}
          {fmt(displayValue)}
          <span className="ml-0.5 text-[10px] font-medium opacity-50">{sym}</span>
        </span>
      )
    })
  }

  return (
    <Card padding="none" className="group overflow-hidden border border-black/[0.06] bg-bg1">
      {/* ── Main Row: Identity + Balance ── */}
      <div className="flex items-stretch">
        {/* Left: Identity */}
        <div className="flex min-w-0 flex-1 flex-col justify-center px-4 py-4">
          <div className="flex items-center gap-2">
            <span className="truncate text-[14px] font-semibold text-black/90">{wallet.label}</span>
            <span
              className={`shrink-0 rounded px-1.5 py-0.5 text-[10px] font-bold tracking-wide ${chainInfo.color}`}
            >
              {chainInfo.label}
            </span>
            <div className="ml-auto flex shrink-0 items-center gap-1 opacity-0 transition group-hover:opacity-100">
              <Button
                variant="ghost"
                className="size-6 p-0 text-black/15 hover:text-black/60"
                onClick={onEdit}
              >
                <PencilSimple size={13} />
              </Button>
              <Button
                variant="ghost"
                className="size-6 p-0 text-black/15 hover:text-red"
                onClick={onDelete}
              >
                <Trash size={13} />
              </Button>
            </div>
          </div>
          <div className="mt-1 flex items-center gap-1.5">
            <code className="truncate text-[11px] text-black/30">{truncAddr(wallet.address)}</code>
            <button onClick={handleCopy} className="shrink-0 text-black/15 transition hover:text-black/40">
              <Copy size={10} />
            </button>
          </div>
        </div>

        {/* Divider */}
        <div className="w-px self-stretch bg-black/[0.04]" />

        {/* Right: Balance */}
        <div className="flex w-[160px] shrink-0 flex-col justify-center px-4 py-4">
          <p className="text-[10px] font-medium uppercase tracking-wider text-black/25">
            {t('accounting.wallets.totalValue', 'Total Value')}
          </p>
          {isBalanceLoading ? (
            <Skeleton className="mt-1 h-6 w-20 rounded" />
          ) : balanceError ? (
            <p className="mt-0.5 text-xs text-red/80" title={balanceError}>API Error</p>
          ) : (
            <p className="mt-0.5 font-mono text-base font-bold tabular-nums text-black/85">
              ${fmt(totalUsd)}
            </p>
          )}
          {!isBalanceLoading && sortedAssets.length > 0 && (
            <div className="mt-1.5 flex flex-wrap gap-x-2 gap-y-0.5">
              {sortedAssets.slice(0, 2).map((asset, i) => {
                const label =
                  asset.symbol ||
                  (asset.tokenAddress ? `${asset.tokenAddress.slice(0, 6)}…` : asset.type)
                const bal = parseFloat(asset.balance)
                return (
                  <span key={i} className="text-[10px] text-black/40">
                    <span className="font-mono font-medium tabular-nums text-black/55">
                      {bal.toLocaleString('en-US', { maximumFractionDigits: 2 })}
                    </span>{' '}
                    {label}
                  </span>
                )
              })}
              {sortedAssets.length > 2 && (
                <span className="text-[10px] text-black/20">+{sortedAssets.length - 2}</span>
              )}
            </div>
          )}
        </div>
      </div>

      {/* ── Today's flow (full-width second row) ── */}
      {hasTodayData && (
        <div className="border-t border-black/[0.04] px-4 py-2.5">
          <p className="mb-1.5 text-[10px] font-medium uppercase tracking-wider text-black/25">
            {t('accounting.wallets.today', 'Today')}
          </p>
          <div className="space-y-1">
            {/* IN row */}
            <div className="flex items-center gap-2">
              <span className="w-8 shrink-0 text-[10px] font-bold uppercase text-green/60">IN</span>
              <div className="flex min-w-0 flex-wrap gap-x-3 gap-y-0.5">
                {renderTokenAmounts(todaySummary.inByToken, '+', 'text-green')}
              </div>
            </div>
            {/* OUT row */}
            <div className="flex items-center gap-2">
              <span className="w-8 shrink-0 text-[10px] font-bold uppercase text-red/60">OUT</span>
              <div className="flex min-w-0 flex-wrap gap-x-3 gap-y-0.5">
                {renderTokenAmounts(todaySummary.outByToken, '-', 'text-red')}
              </div>
            </div>
            {/* NET row */}
            <div className="flex items-center gap-2 border-t border-black/[0.04] pt-1">
              <span className="w-8 shrink-0 text-[10px] font-bold uppercase text-black/30">NET</span>
              <div className="flex min-w-0 flex-wrap gap-x-3 gap-y-0.5">
                {renderTokenAmounts(todaySummary.netByToken, 'auto', '')}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Actions ── */}
      <div className="flex border-t border-black/[0.04]">
        <button
          onClick={onViewDetail}
          className="flex flex-1 items-center justify-center gap-1.5 py-2 text-[11px] font-medium text-black/35 transition hover:bg-black/[0.02] hover:text-black/60"
        >
          <Eye size={12} />
          {t('accounting.wallets.viewDetail')}
        </button>
        <div className="w-px bg-black/[0.04]" />
        <button
          onClick={() => takeSnapshot()}
          disabled={isTakingSnapshot}
          className="flex flex-1 items-center justify-center gap-1.5 py-2 text-[11px] font-medium text-black/35 transition hover:bg-black/[0.02] hover:text-black/60 disabled:opacity-40"
        >
          {isTakingSnapshot ? (
            <ArrowsClockwise size={12} className="animate-spin" />
          ) : (
            <Camera size={12} />
          )}
          {isTakingSnapshot
            ? t('accounting.wallets.snapshotting')
            : t('accounting.wallets.snapshot')}
        </button>
      </div>
    </Card>
  )
}
