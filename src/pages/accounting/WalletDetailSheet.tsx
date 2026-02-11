import { useTranslation } from 'react-i18next'
import { Copy, Camera } from '@phosphor-icons/react'
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

interface WalletDetailSheetProps {
  wallet: Wallet | null
  onClose: () => void
}

export function WalletDetailSheet({ wallet, onClose }: WalletDetailSheetProps) {
  const { t } = useTranslation('pages')

  const { assets, isLoading: isBalanceLoading, refetch } = useWalletBalanceQuery(
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

            {/* Token Balances */}
            <div>
              <div className="mb-3 flex items-center justify-between">
                <h3 className="text-sm font-semibold text-black/70">
                  {t('accounting.wallets.balances')}
                </h3>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 text-xs"
                  onClick={() => refetch()}
                >
                  {t('accounting.wallets.refresh')}
                </Button>
              </div>
              {isBalanceLoading ? (
                <div className="space-y-2">
                  {Array.from({ length: 3 }).map((_, i) => (
                    <Skeleton key={i} className="h-5 w-full rounded" />
                  ))}
                </div>
              ) : assets.length === 0 ? (
                <p className="text-xs text-black/40">
                  {t('accounting.wallets.noBalances')}
                </p>
              ) : (
                <div className="divide-y divide-black/[0.06] rounded-lg border border-black/[0.06]">
                  {assets.map((asset, i) => (
                    <div
                      key={i}
                      className="flex items-center justify-between px-3 py-2.5"
                    >
                      <div>
                        <span className="text-[13px] font-medium text-black/80">
                          {asset.symbol || asset.type}
                        </span>
                        {asset.tokenAddress && (
                          <p className="text-[10px] text-black/30">
                            {asset.tokenAddress.slice(0, 10)}...
                          </p>
                        )}
                      </div>
                      <span className="font-mono text-[13px] font-semibold tabular-nums text-black/90">
                        {parseFloat(asset.balance).toLocaleString('tr-TR', {
                          maximumFractionDigits: 6,
                        })}
                      </span>
                    </div>
                  ))}
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
                  <Camera size={12} />
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
                <div className="overflow-x-auto rounded-lg border border-black/[0.06]">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-black/[0.015]">
                        <TableHead className="h-9 px-3 text-[11px] font-semibold uppercase tracking-wider text-black/40">
                          {t('accounting.wallets.snapshotDate')}
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
                          <TableCell className="px-3 py-2">
                            <div className="space-y-0.5">
                              {snap.balances.map((b, i) => (
                                <div
                                  key={i}
                                  className="flex items-center gap-2 text-xs"
                                >
                                  <span className="text-black/50">{b.token}</span>
                                  <span className="font-mono tabular-nums text-black/70">
                                    {parseFloat(b.balance).toLocaleString('tr-TR', {
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
