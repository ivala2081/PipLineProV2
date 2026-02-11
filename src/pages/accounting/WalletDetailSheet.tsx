import { useTranslation } from 'react-i18next'
import { Copy, Camera, ArrowsClockwise } from '@phosphor-icons/react'
import type { Wallet } from '@/lib/database.types'
import { useWalletBalanceQuery } from '@/hooks/queries/useWalletBalanceQuery'
import { useWalletSnapshotsQuery } from '@/hooks/queries/useWalletSnapshotsQuery'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  Button,
  Tag,
  Skeleton,
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from '@ds'

const CHAIN_LABELS: Record<string, string> = {
  tron: 'TRON',
  ethereum: 'Ethereum',
  bsc: 'BSC',
  bitcoin: 'Bitcoin',
  solana: 'Solana',
}

function formatUsd(value: number): string {
  return value.toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })
}

interface WalletDetailSheetProps {
  wallet: Wallet | null
  onClose: () => void
}

export function WalletDetailSheet({ wallet, onClose }: WalletDetailSheetProps) {
  const { t } = useTranslation('pages')

  const { assets, totalUsd, isLoading: isBalanceLoading, refetch } = useWalletBalanceQuery(
    wallet?.id ?? '',
    wallet?.chain ?? '',
    wallet?.address ?? '',
    !!wallet,
  )

  const { snapshots, isLoading: isSnapshotsLoading, takeSnapshot, isTakingSnapshot } =
    useWalletSnapshotsQuery(
      wallet?.id ?? '',
      wallet?.chain ?? '',
      wallet?.address ?? '',
    )

  const handleCopy = () => {
    if (wallet) navigator.clipboard.writeText(wallet.address)
  }

  const sortedAssets = [...assets].sort((a, b) => b.usdValue - a.usdValue)

  return (
    <Sheet open={wallet !== null} onOpenChange={(open) => !open && onClose()}>
      <SheetContent side="right" className="w-full overflow-y-auto sm:max-w-lg">
        <SheetHeader>
          <SheetTitle>{wallet?.label ?? ''}</SheetTitle>
        </SheetHeader>

        {wallet && (
          <div className="mt-6 space-y-6">
            {/* Wallet Info */}
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Tag variant="default">
                  {CHAIN_LABELS[wallet.chain] ?? wallet.chain}
                </Tag>
              </div>
              <div className="flex items-center gap-2">
                <code className="break-all text-xs text-black/60">
                  {wallet.address}
                </code>
                <button
                  onClick={handleCopy}
                  className="shrink-0 text-black/30 transition hover:text-black/60"
                >
                  <Copy size={14} />
                </button>
              </div>
            </div>

            {/* Total Value */}
            <div className="rounded-xl border border-black/[0.06] bg-black/[0.015] px-4 py-3">
              <p className="text-[10px] font-medium uppercase tracking-wider text-black/35">
                {t('accounting.wallets.totalValue', 'Total Value')}
              </p>
              {isBalanceLoading ? (
                <Skeleton className="mt-1 h-8 w-32 rounded" />
              ) : (
                <p className="mt-0.5 text-2xl font-bold tabular-nums text-black/85">
                  ${formatUsd(totalUsd)}
                </p>
              )}
            </div>

            {/* Token Balances */}
            <div>
              <div className="mb-3 flex items-center justify-between">
                <h3 className="text-sm font-semibold text-black/70">
                  {t('accounting.wallets.balances')}
                </h3>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 gap-1 text-xs"
                  onClick={() => refetch()}
                >
                  <ArrowsClockwise size={12} />
                  {t('accounting.wallets.refresh')}
                </Button>
              </div>
              {isBalanceLoading ? (
                <div className="space-y-2">
                  {Array.from({ length: 3 }).map((_, i) => (
                    <Skeleton key={i} className="h-12 w-full rounded-lg" />
                  ))}
                </div>
              ) : sortedAssets.length === 0 ? (
                <p className="text-xs text-black/40">
                  {t('accounting.wallets.noBalances')}
                </p>
              ) : (
                <div className="divide-y divide-black/[0.04] rounded-xl border border-black/[0.06]">
                  {sortedAssets.map((asset, i) => {
                    const label =
                      asset.symbol ||
                      (asset.tokenAddress
                        ? `${asset.tokenAddress.slice(0, 8)}…`
                        : asset.type)
                    const bal = parseFloat(asset.balance)
                    return (
                      <div
                        key={i}
                        className="flex items-center justify-between px-4 py-3"
                      >
                        <div>
                          <span className="text-[13px] font-semibold text-black/80">
                            {label}
                          </span>
                          {asset.tokenAddress && (
                            <p className="text-[10px] text-black/25">
                              {asset.tokenAddress.slice(0, 12)}…{asset.tokenAddress.slice(-4)}
                            </p>
                          )}
                        </div>
                        <div className="text-right">
                          <p className="font-mono text-[13px] font-semibold tabular-nums text-black/85">
                            {bal.toLocaleString('en-US', { maximumFractionDigits: 6 })}
                          </p>
                          {asset.usdValue > 0 && (
                            <p className="font-mono text-[11px] tabular-nums text-black/40">
                              ${formatUsd(asset.usdValue)}
                            </p>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>

            {/* Snapshot History */}
            <div>
              <div className="mb-3 flex items-center justify-between">
                <h3 className="text-sm font-semibold text-black/70">
                  {t('accounting.wallets.snapshotHistory')}
                </h3>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-7 gap-1.5 text-xs"
                  onClick={() => takeSnapshot()}
                  disabled={isTakingSnapshot}
                >
                  {isTakingSnapshot ? (
                    <ArrowsClockwise size={12} className="animate-spin" />
                  ) : (
                    <Camera size={12} />
                  )}
                  {isTakingSnapshot
                    ? t('accounting.wallets.snapshotting')
                    : t('accounting.wallets.snapshot')}
                </Button>
              </div>

              {isSnapshotsLoading ? (
                <div className="space-y-2">
                  {Array.from({ length: 3 }).map((_, i) => (
                    <Skeleton key={i} className="h-5 w-full rounded" />
                  ))}
                </div>
              ) : snapshots.length === 0 ? (
                <p className="text-xs text-black/40">
                  {t('accounting.wallets.noSnapshots')}
                </p>
              ) : (
                <div className="overflow-x-auto rounded-xl border border-black/[0.06]">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-black/[0.015]">
                        <TableHead className="h-9 px-3 text-[11px] font-semibold uppercase tracking-wider text-black/40">
                          {t('accounting.wallets.snapshotDate')}
                        </TableHead>
                        <TableHead className="h-9 px-3 text-right text-[11px] font-semibold uppercase tracking-wider text-black/40">
                          USD
                        </TableHead>
                        <TableHead className="h-9 px-3 text-[11px] font-semibold uppercase tracking-wider text-black/40">
                          {t('accounting.wallets.tokens')}
                        </TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {snapshots.map((snap) => (
                        <TableRow key={snap.id}>
                          <TableCell className="px-3 py-2 text-[13px] text-black/70">
                            {new Date(snap.snapshot_date + 'T00:00:00').toLocaleDateString(
                              'tr-TR',
                              { day: 'numeric', month: 'short', year: 'numeric' },
                            )}
                          </TableCell>
                          <TableCell className="px-3 py-2 text-right font-mono text-[13px] font-semibold tabular-nums text-black/80">
                            {snap.total_usd > 0
                              ? `$${formatUsd(snap.total_usd)}`
                              : '—'}
                          </TableCell>
                          <TableCell className="px-3 py-2">
                            <div className="space-y-0.5">
                              {snap.balances.map((b, i) => (
                                <div
                                  key={i}
                                  className="flex items-center gap-2 text-xs"
                                >
                                  <span className="text-black/50">{b.token}</span>
                                  <span className="font-mono tabular-nums text-black/70">
                                    {parseFloat(b.balance).toLocaleString('en-US', {
                                      maximumFractionDigits: 4,
                                    })}
                                  </span>
                                </div>
                              ))}
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </div>
          </div>
        )}
      </SheetContent>
    </Sheet>
  )
}
