import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import {
  Copy,
  Camera,
  ArrowsClockwise,
  Trash,
  ArrowRight,
  PencilSimple,
} from '@phosphor-icons/react'
import type { Wallet } from '@/lib/database.types'
import { useWalletBalanceQuery } from '@/hooks/queries/useWalletBalanceQuery'
import { useWalletSnapshotsQuery } from '@/hooks/queries/useWalletSnapshotsQuery'
import { useWalletTransfersQuery } from '@/hooks/queries/useWalletTransfersQuery'
import { WalletTransfersTable } from './WalletTransfersTable'
import { useToast } from '@/hooks/useToast'
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

const PREVIEW_TX_COUNT = 10

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
  onEdit?: (wallet: Wallet) => void
}

export function WalletDetailSheet({ wallet, onClose, onEdit }: WalletDetailSheetProps) {
  const { t } = useTranslation('pages')
  const navigate = useNavigate()

  const {
    assets,
    totalUsd,
    isLoading: isBalanceLoading,
    refetch,
  } = useWalletBalanceQuery(wallet?.id ?? '', wallet?.chain ?? '', wallet?.address ?? '', !!wallet)

  const { toast } = useToast()
  const {
    snapshots,
    isLoading: isSnapshotsLoading,
    takeSnapshot,
    isTakingSnapshot,
    deleteSnapshot,
    isDeleting,
  } = useWalletSnapshotsQuery(wallet?.id ?? '', wallet?.chain ?? '', wallet?.address ?? '')

  const txQuery = useWalletTransfersQuery(
    wallet?.id ?? '',
    wallet?.chain ?? '',
    wallet?.address ?? '',
    !!wallet,
  )

  const handleCopy = () => {
    if (wallet) navigator.clipboard.writeText(wallet.address)
  }

  const sortedAssets = [...assets]
    .filter((a) => a.usdValue > 0)
    .sort((a, b) => b.usdValue - a.usdValue)

  return (
    <Sheet open={wallet !== null} onOpenChange={(open) => !open && onClose()}>
      <SheetContent side="right" className="w-full overflow-y-auto sm:max-w-2xl">
        <SheetHeader>
          <div className="flex items-center justify-between">
            <SheetTitle>{wallet?.label ?? ''}</SheetTitle>
            {onEdit && wallet && (
              <Button
                variant="ghost"
                size="sm"
                className="gap-1.5 text-xs text-black/50 hover:text-black/80"
                onClick={() => onEdit(wallet)}
              >
                <PencilSimple size={14} />
                {t('accounting.actions.edit')}
              </Button>
            )}
          </div>
        </SheetHeader>

        {wallet && (
          <div className="mt-6 space-y-lg">
            {/* Wallet Info */}
            <div className="space-y-sm">
              <div className="flex items-center gap-sm">
                <Tag variant="default">{CHAIN_LABELS[wallet.chain] ?? wallet.chain}</Tag>
              </div>
              <div className="flex items-center gap-sm">
                <code className="break-all text-xs text-black/60">{wallet.address}</code>
                <button
                  onClick={handleCopy}
                  className="shrink-0 text-black/30 transition hover:text-black/60"
                >
                  <Copy size={14} />
                </button>
              </div>
            </div>

            {/* Total Value */}
            <div className="rounded-xl border border-black/10 bg-black/[0.015] px-5 py-4">
              <p className="text-xs font-medium uppercase tracking-wider text-black/35">
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
                  className="gap-1 text-xs"
                  onClick={() => refetch()}
                >
                  <ArrowsClockwise size={12} />
                  {t('accounting.wallets.refresh')}
                </Button>
              </div>
              {isBalanceLoading ? (
                <div className="space-y-sm">
                  {Array.from({ length: 3 }).map((_, i) => (
                    <Skeleton key={i} className="h-12 w-full rounded-lg" />
                  ))}
                </div>
              ) : sortedAssets.length === 0 ? (
                <p className="text-xs text-black/40">{t('accounting.wallets.noBalances')}</p>
              ) : (
                <div className="divide-y divide-black/5 rounded-xl border border-black/10">
                  {sortedAssets.map((asset, i) => {
                    const label =
                      asset.symbol ||
                      (asset.tokenAddress ? `${asset.tokenAddress.slice(0, 8)}…` : asset.type)
                    const bal = parseFloat(asset.balance)
                    return (
                      <div key={i} className="flex items-center justify-between px-4 py-3">
                        <div>
                          <span className="text-sm font-semibold text-black/80">{label}</span>
                          {asset.tokenAddress && (
                            <p className="text-xs text-black/25">
                              {asset.tokenAddress.slice(0, 12)}…{asset.tokenAddress.slice(-4)}
                            </p>
                          )}
                        </div>
                        <div className="text-right">
                          <p className="font-mono text-sm font-semibold tabular-nums text-black/85">
                            {bal.toLocaleString('en-US', { maximumFractionDigits: 6 })}
                          </p>
                          {asset.usdValue > 0 && (
                            <p className="font-mono text-xs tabular-nums text-black/40">
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

            {/* Transfer History (preview – last 10) */}
            <div>
              <div className="mb-3 flex items-center justify-between">
                <h3 className="text-sm font-semibold text-black/70">
                  {t('accounting.transfers.title', 'Transfers')}
                </h3>
                <Button
                  variant="ghost"
                  size="sm"
                  className="gap-1 text-xs"
                  onClick={() => txQuery.refetch()}
                >
                  <ArrowsClockwise size={12} />
                  {t('accounting.wallets.refresh')}
                </Button>
              </div>
              <WalletTransfersTable
                transfers={txQuery.transfers.slice(0, PREVIEW_TX_COUNT)}
                isLoading={txQuery.isLoading}
                hasMore={false}
                onLoadMore={() => {}}
                chain={wallet.chain}
                walletAddress={wallet.address}
              />
              {txQuery.transfers.length > 0 && (
                <div className="mt-3 flex justify-center">
                  <Button
                    variant="outline"
                    size="sm"
                    className="gap-1.5 text-xs"
                    onClick={() => {
                      onClose()
                      navigate(`/accounting/wallet/${wallet.id}/transfers`, {
                        state: { wallet },
                      })
                    }}
                  >
                    {t('accounting.transfers.viewAll', 'View All Transfers')}
                    <ArrowRight size={14} />
                  </Button>
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
                  className="gap-1.5 text-xs"
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
                <div className="space-y-sm">
                  {Array.from({ length: 3 }).map((_, i) => (
                    <Skeleton key={i} className="h-5 w-full rounded" />
                  ))}
                </div>
              ) : snapshots.length === 0 ? (
                <p className="text-xs text-black/40">{t('accounting.wallets.noSnapshots')}</p>
              ) : (
                <div className="rounded-xl border border-black/10">
                  <Table cardOnMobile>
                    <TableHeader>
                      <TableRow className="bg-black/[0.015]">
                        <TableHead className="text-xs font-semibold uppercase tracking-wider text-black/40">
                          {t('accounting.wallets.snapshotDate')}
                        </TableHead>
                        <TableHead className="text-right text-xs font-semibold uppercase tracking-wider text-black/40">
                          USD
                        </TableHead>
                        <TableHead className="text-xs font-semibold uppercase tracking-wider text-black/40">
                          {t('accounting.wallets.tokens')}
                        </TableHead>
                        <TableHead className="w-10" />
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {snapshots.map((snap) => (
                        <TableRow key={snap.id}>
                          <TableCell
                            className="text-sm text-black/70"
                            data-label={t('accounting.wallets.snapshotDate')}
                          >
                            {new Date(snap.snapshot_date + 'T00:00:00').toLocaleDateString(
                              'tr-TR',
                              { day: 'numeric', month: 'short', year: 'numeric' },
                            )}
                          </TableCell>
                          <TableCell
                            className="text-right font-mono text-sm font-semibold tabular-nums text-black/80"
                            data-label="USD"
                          >
                            {snap.total_usd > 0 ? `$${formatUsd(snap.total_usd)}` : '—'}
                          </TableCell>
                          <TableCell data-label={t('accounting.wallets.tokens')}>
                            <div className="space-y-0.5">
                              {snap.balances.map((b, i) => (
                                <div key={i} className="flex items-center gap-2 text-xs">
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
                          <TableCell isActions>
                            <Button
                              variant="borderless"
                              size="sm"
                              className="size-7 p-0 text-black/30 hover:text-red"
                              disabled={isDeleting}
                              onClick={async () => {
                                try {
                                  await deleteSnapshot(snap.id)
                                  toast({
                                    title: t('accounting.toast.snapshotDeleted'),
                                    variant: 'success',
                                  })
                                } catch (err) {
                                  toast({ title: (err as Error).message, variant: 'error' })
                                }
                              }}
                            >
                              <Trash size={14} />
                            </Button>
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
