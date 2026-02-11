import { useTranslation } from 'react-i18next'
import { Copy, Eye, Trash, Camera, ArrowsClockwise } from '@phosphor-icons/react'
import type { Wallet } from '@/lib/database.types'
import { useWalletBalanceQuery } from '@/hooks/queries/useWalletBalanceQuery'
import { useWalletSnapshotsQuery } from '@/hooks/queries/useWalletSnapshotsQuery'
import { Card, Button, Skeleton } from '@ds'

const CHAIN_META: Record<string, { label: string; color: string }> = {
  tron: { label: 'TRON', color: 'bg-red-500/10 text-red-600' },
  ethereum: { label: 'ETH', color: 'bg-blue-500/10 text-blue-600' },
  bsc: { label: 'BSC', color: 'bg-yellow-500/10 text-yellow-700' },
  bitcoin: { label: 'BTC', color: 'bg-orange-500/10 text-orange-600' },
  solana: { label: 'SOL', color: 'bg-purple-500/10 text-purple-600' },
}

function truncateAddress(addr: string) {
  if (addr.length <= 16) return addr
  return `${addr.slice(0, 6)}...${addr.slice(-4)}`
}

function formatUsd(value: number): string {
  return value.toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })
}

interface WalletCardProps {
  wallet: Wallet
  onViewDetail: () => void
  onDelete: () => void
}

export function WalletCard({ wallet, onViewDetail, onDelete }: WalletCardProps) {
  const { t } = useTranslation('pages')
  const { assets, totalUsd, isLoading: isBalanceLoading } = useWalletBalanceQuery(
    wallet.id,
    wallet.chain,
    wallet.address,
  )
  const { takeSnapshot, isTakingSnapshot } = useWalletSnapshotsQuery(
    wallet.id,
    wallet.chain,
    wallet.address,
  )

  const chainInfo = CHAIN_META[wallet.chain] ?? {
    label: wallet.chain.toUpperCase(),
    color: 'bg-black/5 text-black/60',
  }

  const handleCopy = () => {
    navigator.clipboard.writeText(wallet.address)
  }

  // Separate native from fungible, sort by USD value
  const sortedAssets = [...assets].sort((a, b) => b.usdValue - a.usdValue)

  return (
    <Card className="group flex flex-col overflow-hidden border border-black/[0.06] bg-bg1">
      {/* Header */}
      <div className="flex items-center justify-between px-5 pt-4 pb-2">
        <div className="flex items-center gap-2.5">
          <span className="text-sm font-semibold text-black/90">
            {wallet.label}
          </span>
          <span
            className={`inline-flex items-center rounded-md px-1.5 py-0.5 text-[10px] font-bold tracking-wide ${chainInfo.color}`}
          >
            {chainInfo.label}
          </span>
        </div>
        <Button
          variant="ghost"
          className="size-7 p-0 text-black/20 opacity-0 transition group-hover:opacity-100 hover:text-red-500"
          onClick={onDelete}
        >
          <Trash size={14} />
        </Button>
      </div>

      {/* Address */}
      <div className="flex items-center gap-1.5 px-5 pb-3">
        <code className="text-[11px] text-black/40">
          {truncateAddress(wallet.address)}
        </code>
        <button
          onClick={handleCopy}
          className="text-black/20 transition hover:text-black/50"
        >
          <Copy size={11} />
        </button>
      </div>

      {/* Total USD Value */}
      <div className="border-t border-black/[0.04] bg-black/[0.015] px-5 py-3">
        {isBalanceLoading ? (
          <Skeleton className="h-7 w-28 rounded" />
        ) : (
          <div>
            <p className="text-[10px] font-medium uppercase tracking-wider text-black/35">
              {t('accounting.wallets.totalValue', 'Total Value')}
            </p>
            <p className="mt-0.5 text-xl font-bold tabular-nums text-black/85">
              ${formatUsd(totalUsd)}
            </p>
          </div>
        )}
      </div>

      {/* Token List */}
      <div className="flex-1 px-5 py-3">
        {isBalanceLoading ? (
          <div className="space-y-2.5">
            <Skeleton className="h-4 w-full rounded" />
            <Skeleton className="h-4 w-3/4 rounded" />
          </div>
        ) : sortedAssets.length === 0 ? (
          <p className="text-xs text-black/35">
            {t('accounting.wallets.noBalances')}
          </p>
        ) : (
          <div className="space-y-2">
            {sortedAssets.slice(0, 4).map((asset, i) => {
              const label =
                asset.symbol ||
                (asset.tokenAddress
                  ? `${asset.tokenAddress.slice(0, 6)}…`
                  : asset.type)
              const bal = parseFloat(asset.balance)
              return (
                <div
                  key={i}
                  className="flex items-center justify-between"
                >
                  <span className="text-xs font-medium text-black/55">
                    {label}
                  </span>
                  <div className="text-right">
                    <span className="font-mono text-xs font-semibold tabular-nums text-black/80">
                      {bal.toLocaleString('en-US', { maximumFractionDigits: 4 })}
                    </span>
                    {asset.usdValue > 0 && (
                      <span className="ml-1.5 font-mono text-[10px] tabular-nums text-black/35">
                        ${formatUsd(asset.usdValue)}
                      </span>
                    )}
                  </div>
                </div>
              )
            })}
            {sortedAssets.length > 4 && (
              <p className="text-[10px] text-black/35">
                +{sortedAssets.length - 4} {t('accounting.wallets.moreTokens')}
              </p>
            )}
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="flex border-t border-black/[0.04]">
        <button
          onClick={onViewDetail}
          className="flex flex-1 items-center justify-center gap-1.5 py-2.5 text-[11px] font-medium text-black/45 transition hover:bg-black/[0.02] hover:text-black/70"
        >
          <Eye size={13} />
          {t('accounting.wallets.viewDetail')}
        </button>
        <div className="w-px bg-black/[0.04]" />
        <button
          onClick={() => takeSnapshot()}
          disabled={isTakingSnapshot}
          className="flex flex-1 items-center justify-center gap-1.5 py-2.5 text-[11px] font-medium text-black/45 transition hover:bg-black/[0.02] hover:text-black/70 disabled:opacity-40"
        >
          {isTakingSnapshot ? (
            <ArrowsClockwise size={13} className="animate-spin" />
          ) : (
            <Camera size={13} />
          )}
          {isTakingSnapshot
            ? t('accounting.wallets.snapshotting')
            : t('accounting.wallets.snapshot')}
        </button>
      </div>
    </Card>
  )
}
