import { useState, useEffect, useMemo } from 'react'
import { useParams, useLocation, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import {
  ArrowLeft,
  ArrowsClockwise,
  Copy,
  CaretLeft,
  CaretRight,
  List,
  CalendarBlank,
} from '@phosphor-icons/react'
import { useWalletsQuery } from '@/hooks/queries/useWalletsQuery'
import { useWalletTransfersQuery } from '@/hooks/queries/useWalletTransfersQuery'
import { useWalletBalanceQuery } from '@/hooks/queries/useWalletBalanceQuery'
import { WalletTransfersTable } from './WalletTransfersTable'
import { WalletDailyClosing } from './WalletDailyClosing'
import { Button, Tag, Skeleton } from '@ds'
import type { Wallet } from '@/lib/database.types'

const CHAIN_LABELS: Record<string, string> = {
  tron: 'TRON',
  ethereum: 'Ethereum',
  bsc: 'BSC',
  bitcoin: 'Bitcoin',
  solana: 'Solana',
}

const PAGE_SIZE_OPTIONS = [25, 50, 100, 200] as const
const DEFAULT_PAGE_SIZE = 50

export function WalletTransfersPage() {
  const { walletId } = useParams<{ walletId: string }>()
  const location = useLocation()
  const navigate = useNavigate()
  const { t } = useTranslation('pages')

  const stateWallet = (location.state as { wallet?: Wallet } | null)?.wallet
  const { wallets, isLoading: isWalletsLoading } = useWalletsQuery()
  const wallet = stateWallet ?? wallets.find((w) => w.id === walletId) ?? null

  const txQuery = useWalletTransfersQuery(
    wallet?.id ?? '',
    wallet?.chain ?? '',
    wallet?.address ?? '',
    !!wallet,
  )

  const balanceQuery = useWalletBalanceQuery(
    wallet?.id ?? '',
    wallet?.chain ?? '',
    wallet?.address ?? '',
    !!wallet,
  )

  // Convert assets array to { symbol: balance } map for daily closing
  const currentBalances = useMemo(() => {
    const map: Record<string, number> = {}
    for (const asset of balanceQuery.assets) {
      const sym = asset.symbol || asset.type || 'UNKNOWN'
      const val = parseFloat(asset.balance)
      if (!isFinite(val)) continue
      map[sym] = (map[sym] ?? 0) + val
    }
    return map
  }, [balanceQuery.assets])

  const [view, setView] = useState<'transfers' | 'daily'>('transfers')
  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE)

  // When in daily view, auto-fetch all pages so we have complete data
  useEffect(() => {
    if (view === 'daily' && txQuery.hasMore && !txQuery.isLoading) {
      txQuery.loadMore()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- txQuery object identity changes; we only care about hasMore, isLoading, loadMore
  }, [view, txQuery.hasMore, txQuery.isLoading])

  const totalLoaded = txQuery.transfers.length
  const start = (currentPage - 1) * pageSize
  const end = start + pageSize
  const pageTxs = txQuery.transfers.slice(start, end)

  // Known page count so far (may grow as more data is fetched)
  const loadedPages = Math.ceil(totalLoaded / pageSize) || 1
  const totalPages = txQuery.hasMore ? loadedPages + 1 : loadedPages

  // Auto-fetch more from API when user navigates beyond loaded data
  useEffect(() => {
    if (end > totalLoaded && txQuery.hasMore && !txQuery.isLoading) {
      txQuery.loadMore()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- txQuery/end intentionally partial
  }, [currentPage, totalLoaded, end, txQuery.hasMore, txQuery.isLoading])

  const handleCopy = () => {
    if (wallet) navigator.clipboard.writeText(wallet.address)
  }

  const goToPage = (page: number) => {
    setCurrentPage(page)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  if (!wallet && isWalletsLoading) {
    return (
      <div className="space-y-md">
        <Skeleton className="h-8 w-48 rounded" />
        <Skeleton className="h-4 w-72 rounded" />
        <Skeleton className="h-64 w-full rounded-xl" />
      </div>
    )
  }

  if (!wallet) {
    return (
      <div className="flex flex-col items-center gap-md py-20">
        <p className="text-sm text-black/50">
          {t('accounting.transfers.walletNotFound', 'Wallet not found')}
        </p>
        <Button variant="outline" size="sm" onClick={() => navigate('/accounting')}>
          <ArrowLeft size={14} />
          {t('accounting.transfers.backToAccounting', 'Back to Accounting')}
        </Button>
      </div>
    )
  }

  // Build visible page numbers: show at most 7 pages around current
  const pageNumbers: number[] = []
  const maxVisible = 7
  let pageStart = Math.max(1, currentPage - Math.floor(maxVisible / 2))
  const pageEnd = Math.min(totalPages, pageStart + maxVisible - 1)
  if (pageEnd - pageStart + 1 < maxVisible) {
    pageStart = Math.max(1, pageEnd - maxVisible + 1)
  }
  for (let i = pageStart; i <= pageEnd; i++) {
    pageNumbers.push(i)
  }

  return (
    <div className="space-y-lg">
      {/* Header */}
      <div className="flex items-center gap-sm">
        <Button
          variant="ghost"
          size="sm"
          className="size-8 p-0"
          onClick={() => navigate('/accounting')}
        >
          <ArrowLeft size={18} />
        </Button>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-sm">
            <h1 className="text-2xl font-semibold">{wallet.label}</h1>
            <Tag variant="default">{CHAIN_LABELS[wallet.chain] ?? wallet.chain}</Tag>
          </div>
          <div className="mt-1 flex items-center gap-sm">
            <code className="truncate text-xs text-black/50">{wallet.address}</code>
            <button
              onClick={handleCopy}
              className="shrink-0 text-black/30 transition hover:text-black/60"
            >
              <Copy size={12} />
            </button>
          </div>
        </div>
        <Button
          variant="ghost"
          size="sm"
          className="gap-1 text-xs"
          onClick={() => txQuery.refetch()}
        >
          <ArrowsClockwise size={14} />
          {t('accounting.wallets.refresh')}
        </Button>
      </div>

      {/* View toggle + info bar */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-sm">
          {/* Toggle buttons */}
          <div className="flex gap-0.5 rounded-lg border border-black/10 p-0.5">
            <button
              onClick={() => setView('transfers')}
              className={`inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition ${
                view === 'transfers'
                  ? 'bg-black/[0.07] text-black/80'
                  : 'text-black/40 hover:text-black/60'
              }`}
            >
              <List size={13} />
              {t('accounting.transfers.title', 'Transfers')}
            </button>
            <button
              onClick={() => setView('daily')}
              className={`inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition ${
                view === 'daily'
                  ? 'bg-black/[0.07] text-black/80'
                  : 'text-black/40 hover:text-black/60'
              }`}
            >
              <CalendarBlank size={13} />
              {t('accounting.transfers.dailyClosing', 'Daily Closing')}
            </button>
          </div>

          {/* Transfer count */}
          {!txQuery.isLoading && (
            <span className="text-xs text-black/40">
              {totalLoaded}
              {txQuery.hasMore ? '+' : ''}{' '}
              {t('accounting.transfers.title', 'transfers').toLowerCase()}
              {view === 'daily' && txQuery.hasMore && (
                <span className="ml-1 text-orange">
                  ({t('accounting.transfers.loadingAll', 'loading all…')})
                </span>
              )}
            </span>
          )}
        </div>

        {view === 'transfers' && totalPages > 1 && (
          <p className="text-xs text-black/40">
            {t('accounting.transfers.pageInfo', 'Page {{current}} of {{total}}', {
              current: currentPage,
              total: txQuery.hasMore ? `${totalPages}+` : totalPages,
            })}
          </p>
        )}
      </div>

      {/* Content: Transfers table OR Daily Closing */}
      {view === 'transfers' ? (
        <>
          <WalletTransfersTable
            transfers={pageTxs}
            isLoading={txQuery.isLoading && pageTxs.length === 0}
            hasMore={false}
            onLoadMore={() => {}}
            chain={wallet.chain}
            walletAddress={wallet.address}
          />

          {/* Pagination controls */}
          <div className="flex items-center justify-between">
            {/* Page size selector */}
            <div className="flex items-center gap-sm">
              <span className="text-xs text-black/40">
                {t('accounting.transfers.perPage', 'Per page')}:
              </span>
              <div className="flex gap-0.5 rounded-lg border border-black/10 p-0.5">
                {PAGE_SIZE_OPTIONS.map((size) => (
                  <button
                    key={size}
                    onClick={() => {
                      setPageSize(size)
                      setCurrentPage(1)
                    }}
                    className={`rounded-md px-2.5 py-1 text-xs font-medium transition ${
                      size === pageSize
                        ? 'bg-black/[0.07] text-black/80'
                        : 'text-black/40 hover:text-black/60'
                    }`}
                  >
                    {size}
                  </button>
                ))}
              </div>
            </div>

            {/* Page numbers */}
            {totalPages > 1 && (
              <div className="flex items-center gap-xs">
                <Button
                  variant="ghost"
                  size="sm"
                  className="size-8 p-0"
                  disabled={currentPage === 1}
                  onClick={() => goToPage(currentPage - 1)}
                >
                  <CaretLeft size={16} />
                </Button>

                {pageStart > 1 && (
                  <>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="size-8 p-0 text-xs"
                      onClick={() => goToPage(1)}
                    >
                      1
                    </Button>
                    {pageStart > 2 && <span className="px-1 text-xs text-black/30">...</span>}
                  </>
                )}

                {pageNumbers.map((page) => (
                  <Button
                    key={page}
                    variant={page === currentPage ? 'filled' : 'ghost'}
                    size="sm"
                    className="size-8 p-0 text-xs"
                    onClick={() => goToPage(page)}
                  >
                    {page}
                  </Button>
                ))}

                {pageEnd < totalPages && (
                  <>
                    {pageEnd < totalPages - 1 && (
                      <span className="px-1 text-xs text-black/30">...</span>
                    )}
                    <Button
                      variant="ghost"
                      size="sm"
                      className="size-8 p-0 text-xs"
                      onClick={() => goToPage(totalPages)}
                    >
                      {totalPages}
                    </Button>
                  </>
                )}

                <Button
                  variant="ghost"
                  size="sm"
                  className="size-8 p-0"
                  disabled={currentPage >= totalPages}
                  onClick={() => goToPage(currentPage + 1)}
                >
                  <CaretRight size={16} />
                </Button>
              </div>
            )}
          </div>
        </>
      ) : (
        <WalletDailyClosing
          transfers={txQuery.transfers}
          isLoading={txQuery.isLoading && txQuery.transfers.length === 0}
          currentBalances={currentBalances}
        />
      )}
    </div>
  )
}
