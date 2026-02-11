import { useTranslation } from 'react-i18next'
import { Copy, Eye, Trash, Camera } from '@phosphor-icons/react'
import type { Wallet } from '@/lib/database.types'
import { useWalletBalanceQuery } from '@/hooks/queries/useWalletBalanceQuery'
import { useWalletSnapshotsQuery } from '@/hooks/queries/useWalletSnapshotsQuery'
import { Card, Tag, Button, Skeleton } from '@ds'

const CHAIN_LABELS: Record<string, { label: string; color: string }> = {
  tron: { label: 'TRON', color: 'bg-red-100 text-red-700' },
  ethereum: { label: 'ETH', color: 'bg-blue-100 text-blue-700' },
  bsc: { label: 'BSC', color: 'bg-yellow-100 text-yellow-700' },
  bitcoin: { label: 'BTC', color: 'bg-orange-100 text-orange-700' },
  solana: { label: 'SOL', color: 'bg-purple-100 text-purple-700' },
}

function truncateAddress(addr: string) {
  if (addr.length <= 16) return addr
  return `${addr.slice(0, 8)}...${addr.slice(-6)}`
}

interface WalletCardProps {
  wallet: Wallet
  onViewDetail: () => void
  onDelete: () => void
}

export function WalletCard({ wallet, onViewDetail, onDelete }: WalletCardProps) {
  const { t } = useTranslation('pages')
  const { assets, isLoading: isBalanceLoading } = useWalletBalanceQuery(
    wallet.id,
    wallet.chain,
    wallet.address,
  )
  const { takeSnapshot, isTakingSnapshot } = useWalletSnapshotsQuery(
    wallet.id,
    wallet.chain,
    wallet.address,
  )

  const chainInfo = CHAIN_LABELS[wallet.chain] ?? {
    label: wallet.chain.toUpperCase(),
    color: 'bg-gray-100 text-gray-700',
  }

  const handleCopy = () => {
    navigator.clipboard.writeText(wallet.address)
  }

  return (
    <Card className="flex flex-col border border-black/[0.06] bg-bg1 p-5">
      {/* Header */}
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold text-black/90">
            {wallet.label}
          </span>
          <span
            className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold ${chainInfo.color}`}
          >
            {chainInfo.label}
          </span>
        </div>
        <Button
          variant="ghost"
          className="size-7 p-0 text-black/30 hover:text-red-500"
          onClick={onDelete}
        >
          <Trash size={14} />
        </Button>
      </div>

      {/* Address */}
      <div className="mb-4 flex items-center gap-1.5">
        <code className="text-xs text-black/50">
          {truncateAddress(wallet.address)}
        </code>
        <button
          onClick={handleCopy}
          className="text-black/30 transition hover:text-black/60"
        >
          <Copy size={12} />
        </button>
      </div>

      {/* Balances */}
      <div className="mb-4 flex-1">
        {isBalanceLoading ? (
          <div className="space-y-2">
            <Skeleton className="h-4 w-32 rounded" />
            <Skeleton className="h-3 w-24 rounded" />
          </div>
        ) : assets.length === 0 ? (
          <p className="text-xs text-black/40">
            {t('accounting.wallets.noBalances')}
          </p>
        ) : (
          <div className="space-y-1.5">
            {assets.slice(0, 4).map((asset, i) => (
              <div
                key={i}
                className="flex items-center justify-between text-xs"
              >
                <span className="text-black/60">
                  {asset.symbol || asset.type}
                </span>
                <span className="font-mono font-medium tabular-nums text-black/80">
                  {parseFloat(asset.balance).toLocaleString('tr-TR', {
                    maximumFractionDigits: 4,
                  })}
                </span>
              </div>
            ))}
            {assets.length > 4 && (
              <p className="text-[10px] text-black/40">
                +{assets.length - 4} {t('accounting.wallets.moreTokens')}
              </p>
            )}
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="flex gap-2">
        <Button
          variant="outline"
          size="sm"
          className="flex-1 gap-1.5 text-xs"
          onClick={onViewDetail}
        >
          <Eye size={12} />
          {t('accounting.wallets.viewDetail')}
        </Button>
        <Button
          variant="outline"
          size="sm"
          className="gap-1.5 text-xs"
          onClick={() => takeSnapshot()}
          disabled={isTakingSnapshot}
        >
          <Camera size={12} />
          {isTakingSnapshot
            ? t('accounting.wallets.snapshotting')
            : t('accounting.wallets.snapshot')}
        </Button>
      </div>
    </Card>
  )
}
