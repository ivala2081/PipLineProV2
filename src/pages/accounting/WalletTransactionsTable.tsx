import { useTranslation } from 'react-i18next'
import { ArrowDown, ArrowUp, ArrowSquareOut } from '@phosphor-icons/react'
import type { NormalizedTransaction } from '@/lib/tatumService'
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

function truncateAddr(addr: string): string {
  if (!addr || addr.length <= 14) return addr
  return `${addr.slice(0, 6)}…${addr.slice(-4)}`
}

function formatTxDate(ts: number, lang: string): string {
  const locale = lang === 'tr' ? 'tr-TR' : 'en-US'
  return new Date(ts).toLocaleDateString(locale, {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

interface WalletTransactionsTableProps {
  transactions: NormalizedTransaction[]
  isLoading: boolean
  hasMore: boolean
  onLoadMore: () => void
  chain: string
}

export function WalletTransactionsTable({
  transactions,
  isLoading,
  hasMore,
  onLoadMore,
  chain,
}: WalletTransactionsTableProps) {
  const { t, i18n } = useTranslation('pages')
  const explorerBase = EXPLORER_TX_URL[chain] ?? ''

  if (isLoading && transactions.length === 0) {
    return (
      <div className="space-y-2">
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-10 w-full rounded-lg" />
        ))}
      </div>
    )
  }

  if (transactions.length === 0) {
    return (
      <p className="py-8 text-center text-xs text-black/40">
        {t('accounting.transactions.empty', 'No transactions found')}
      </p>
    )
  }

  return (
    <div>
      <div className="overflow-x-auto rounded-xl border border-black/10">
        <Table>
          <TableHeader>
            <TableRow className="bg-black/[0.015]">
              <TableHead className="h-8 px-3 text-xs font-semibold uppercase tracking-wider text-black/40">
                {t('accounting.transactions.date', 'Date')}
              </TableHead>
              <TableHead className="h-8 px-3 text-xs font-semibold uppercase tracking-wider text-black/40">
                {t('accounting.transactions.direction', 'Dir')}
              </TableHead>
              <TableHead className="h-8 px-3 text-right text-xs font-semibold uppercase tracking-wider text-black/40">
                {t('accounting.transactions.amount', 'Amount')}
              </TableHead>
              <TableHead className="h-8 px-3 text-xs font-semibold uppercase tracking-wider text-black/40">
                {t('accounting.transactions.counterparty', 'Counterparty')}
              </TableHead>
              <TableHead className="h-8 px-3 text-xs font-semibold uppercase tracking-wider text-black/40">
                {t('accounting.transactions.hash', 'Tx Hash')}
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {transactions.map((tx, idx) => (
              <TableRow key={`${tx.hash}-${idx}`}>
                <TableCell className="px-3 py-2 text-xs text-black/60">
                  {formatTxDate(tx.timestamp, i18n.language)}
                </TableCell>
                <TableCell className="px-3 py-2">
                  <span className={`inline-flex items-center gap-1 text-xs font-medium ${
                    tx.direction === 'in' ? 'text-green' : 'text-red'
                  }`}>
                    {tx.direction === 'in' ? (
                      <ArrowDown size={12} weight="bold" />
                    ) : (
                      <ArrowUp size={12} weight="bold" />
                    )}
                    {tx.direction.toUpperCase()}
                  </span>
                </TableCell>
                <TableCell className="px-3 py-2 text-right">
                  <span className={`font-mono text-xs font-semibold tabular-nums ${
                    tx.direction === 'in' ? 'text-green' : 'text-red'
                  }`}>
                    {tx.direction === 'in' ? '+' : '-'}
                    {parseFloat(tx.amount).toLocaleString('en-US', { maximumFractionDigits: 6 })}
                  </span>
                  <span className="ml-1 text-xs text-black/40">
                    {tx.symbol}
                  </span>
                </TableCell>
                <TableCell className="px-3 py-2 font-mono text-xs text-black/40">
                  {tx.counterAddress ? truncateAddr(tx.counterAddress) : '—'}
                </TableCell>
                <TableCell className="px-3 py-2">
                  <a
                    href={`${explorerBase}${tx.hash}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 font-mono text-xs text-blue hover:underline"
                  >
                    {truncateAddr(tx.hash)}
                    <ArrowSquareOut size={10} />
                  </a>
                </TableCell>
              </TableRow>
            ))}
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
              ? t('accounting.transactions.loading', 'Loading...')
              : t('accounting.transactions.loadMore', 'Load more')}
          </Button>
        </div>
      )}
    </div>
  )
}
