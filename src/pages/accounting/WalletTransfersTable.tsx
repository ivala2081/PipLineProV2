import { useTranslation } from 'react-i18next'
import { ArrowDown, ArrowUp, ArrowSquareOut, ArrowRight } from '@phosphor-icons/react'
import type { NormalizedTransfer } from '@/lib/tatumService'
import { EXPLORER_TX_URL } from '@/lib/tatumService'
import {
  Tag,
  Skeleton,
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
  Button,
} from '@ds'

function truncateHash(hash: string): string {
  if (!hash || hash.length <= 16) return hash
  return `${hash.slice(0, 8)}…${hash.slice(-5)}`
}

function truncateAddr(addr: string): string {
  if (!addr || addr.length <= 16) return addr
  return `${addr.slice(0, 8)}…${addr.slice(-6)}`
}

function relativeTime(ts: number, lang: string): string {
  if (!ts) return '—'
  const now = Date.now()
  const diff = now - ts
  const seconds = Math.floor(diff / 1000)
  const minutes = Math.floor(seconds / 60)
  const hours = Math.floor(minutes / 60)
  const days = Math.floor(hours / 24)

  if (lang === 'tr') {
    if (days > 0) return `${days} gün önce`
    if (hours > 0) return `${hours} sa önce`
    if (minutes > 0) return `${minutes} dk önce`
    return 'şimdi'
  }

  if (days > 0) return `${days}d ago`
  if (hours > 0) return `${hours}h ago`
  if (minutes > 0) return `${minutes}m ago`
  return 'just now'
}

function formatAmount(amount: string, direction: 'in' | 'out'): string {
  const num = parseFloat(amount)
  if (isNaN(num)) return amount

  // Smart formatting: show more decimals for small amounts, fewer for large
  let maxDecimals = 2
  if (num < 0.01) maxDecimals = 6
  else if (num < 1) maxDecimals = 4
  else if (num >= 1000) maxDecimals = 2

  const formatted = num.toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: maxDecimals,
  })

  return direction === 'in' ? `+${formatted}` : `-${formatted}`
}

interface WalletTransfersTableProps {
  transfers: NormalizedTransfer[]
  isLoading: boolean
  hasMore: boolean
  onLoadMore: () => void
  chain: string
  walletAddress?: string
}

const TH =
  'h-8 px-3 text-xs font-semibold uppercase tracking-wider text-black/40 whitespace-nowrap'

export function WalletTransfersTable({
  transfers,
  isLoading,
  hasMore,
  onLoadMore,
  chain,
  walletAddress,
}: WalletTransfersTableProps) {
  const { t, i18n } = useTranslation('pages')
  const explorerBase = EXPLORER_TX_URL[chain] ?? ''

  if (isLoading && transfers.length === 0) {
    return (
      <div className="space-y-2">
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-10 w-full rounded-lg" />
        ))}
      </div>
    )
  }

  if (transfers.length === 0) {
    return (
      <p className="py-8 text-center text-xs text-black/40">
        {t('accounting.transfers.empty', 'No transfers found')}
      </p>
    )
  }

  return (
    <div>
      <div className="overflow-x-auto rounded-xl border border-black/10">
        <Table className="min-w-[820px]">
          <TableHeader>
            <TableRow className="bg-black/[0.015]">
              <TableHead className={TH}>
                Tx Hash
              </TableHead>
              <TableHead className={TH}>
                {t('accounting.transfers.date', 'Age')}
              </TableHead>
              <TableHead className={TH}>
                From
              </TableHead>
              <TableHead className={TH} />
              <TableHead className={TH}>
                To
              </TableHead>
              <TableHead className={`${TH} text-right`}>
                {t('accounting.transfers.amount', 'Amount')}
              </TableHead>
              <TableHead className={TH}>
                Token
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {transfers.map((tx, idx) => {
              // Derive from/to addresses
              const from = tx.fromAddress ?? (tx.direction === 'out' ? walletAddress : tx.counterAddress) ?? ''
              const to = tx.toAddress ?? (tx.direction === 'in' ? walletAddress : tx.counterAddress) ?? ''
              const isFromWallet = walletAddress ? from === walletAddress : tx.direction === 'out'
              const isToWallet = walletAddress ? to === walletAddress : tx.direction === 'in'

              return (
                <TableRow key={`${tx.hash}-${idx}`} className="hover:bg-black/[0.01]">
                  {/* Tx Hash */}
                  <TableCell className="px-3 py-2">
                    <a
                      href={`${explorerBase}${tx.hash}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 font-mono text-xs text-blue hover:underline"
                    >
                      {truncateHash(tx.hash)}
                      <ArrowSquareOut size={10} className="shrink-0" />
                    </a>
                  </TableCell>

                  {/* Age / Date */}
                  <TableCell className="px-3 py-2 text-xs text-black/50">
                    {relativeTime(tx.timestamp, i18n.language)}
                  </TableCell>

                  {/* From */}
                  <TableCell className="px-3 py-2">
                    <span
                      className={`font-mono text-xs ${isFromWallet ? 'font-medium text-black/70' : 'text-black/40'}`}
                      title={from}
                    >
                      {truncateAddr(from) || '—'}
                    </span>
                  </TableCell>

                  {/* Arrow */}
                  <TableCell className="px-1 py-2">
                    <ArrowRight size={12} className="text-black/20" />
                  </TableCell>

                  {/* To */}
                  <TableCell className="px-3 py-2">
                    <span
                      className={`font-mono text-xs ${isToWallet ? 'font-medium text-black/70' : 'text-black/40'}`}
                      title={to}
                    >
                      {truncateAddr(to) || '—'}
                    </span>
                  </TableCell>

                  {/* Amount */}
                  <TableCell className="px-3 py-2 text-right">
                    <span
                      className={`font-mono text-xs font-semibold tabular-nums ${
                        tx.direction === 'in' ? 'text-green' : 'text-red'
                      }`}
                    >
                      {formatAmount(tx.amount, tx.direction)}
                    </span>
                  </TableCell>

                  {/* Token */}
                  <TableCell className="px-3 py-2">
                    <div className="flex flex-col">
                      <span className="text-xs font-semibold text-black/70">
                        {tx.symbol}
                      </span>
                      {tx.tokenAddress && (
                        <span className="font-mono text-[10px] text-black/25">
                          {truncateAddr(tx.tokenAddress)}
                        </span>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              )
            })}
          </TableBody>
        </Table>
      </div>

      {hasMore && (
        <div className="mt-3 flex justify-center">
          <Button
            variant="outline"
            size="sm"
            className="h-8 text-xs"
            onClick={onLoadMore}
            disabled={isLoading}
          >
            {isLoading
              ? t('accounting.transfers.loading', 'Loading...')
              : t('accounting.transfers.loadMore', 'Load more')}
          </Button>
        </div>
      )}
    </div>
  )
}
