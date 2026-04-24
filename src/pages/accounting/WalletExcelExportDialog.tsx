import { useState, useMemo, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import {
  DownloadSimple,
  SpinnerGap,
  Warning,
  CalendarBlank,
  CaretLeft,
  CaretRight,
  ListBullets,
  ChartBar,
} from '@phosphor-icons/react'
import { EyeSlash } from '@phosphor-icons/react'
import type { NormalizedTransfer } from '@/lib/tatumServiceSecure'
import { isKnownToken } from './WalletTransfersTable'
import {
  filterTransfersByDateRange,
  computeDailyClosings,
  exportWalletTransfersXlsx,
  exportWalletDailyClosingsXlsx,
} from '@/lib/csvExport/exportWalletXlsx'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, Button } from '@ds'
import { cn } from '@ds/utils'

/* ── Helpers ──────────────────────────────────────────── */

function toYMD(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

function getMonthRange(year: number, month: number): { from: string; to: string } {
  const start = new Date(year, month, 1)
  const end = new Date(year, month + 1, 0)
  return { from: toYMD(start), to: toYMD(end) }
}

const MONTH_NAMES_TR = [
  'Ocak',
  'Şubat',
  'Mart',
  'Nisan',
  'Mayıs',
  'Haziran',
  'Temmuz',
  'Ağustos',
  'Eylül',
  'Ekim',
  'Kasım',
  'Aralık',
]

const MONTH_NAMES_EN = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
]

/* ── Component ────────────────────────────────────────── */

type SelectionMode = 'month' | 'daily' | 'custom'
type ExportType = 'transfers' | 'daily-closing'

interface WalletExcelExportDialogProps {
  open: boolean
  onClose: () => void
  transfers: NormalizedTransfer[]
  currentBalances: Record<string, number>
  walletLabel: string
  walletAddress: string
  chain: string
  /** Are there more pages to fetch from the API? */
  hasMore: boolean
  /** Is the query currently fetching? */
  isFetching: boolean
  /** Fetch next page */
  loadMore: () => void
  /** Whether to hide fake tokens by default */
  defaultHideFakeTokens?: boolean
}

export function WalletExcelExportDialog({
  open,
  onClose,
  transfers,
  currentBalances,
  walletLabel,
  chain,
  hasMore,
  isFetching,
  loadMore,
  defaultHideFakeTokens = true,
}: WalletExcelExportDialogProps) {
  const { t, i18n } = useTranslation('pages')
  const isTr = i18n.language === 'tr'
  const monthNames = isTr ? MONTH_NAMES_TR : MONTH_NAMES_EN

  const now = new Date()
  const [exportType, setExportType] = useState<ExportType>('transfers')
  const [mode, setMode] = useState<SelectionMode>('month')
  const [selectedYear, setSelectedYear] = useState(now.getFullYear())
  const [selectedMonth, setSelectedMonth] = useState<number | null>(now.getMonth())

  // Daily
  const [selectedDate, setSelectedDate] = useState(toYMD(now))

  // Custom range
  const [customFrom, setCustomFrom] = useState('')
  const [customTo, setCustomTo] = useState('')

  const [hideFakeTokens, setHideFakeTokens] = useState(defaultHideFakeTokens)
  const [isExporting, setIsExporting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Filter out fake tokens when enabled
  const safeTransfers = useMemo(() => {
    if (!hideFakeTokens) return transfers
    return transfers.filter((tx) => isKnownToken(chain, tx.tokenAddress))
  }, [transfers, hideFakeTokens, chain])

  // Sync hideFakeTokens with parent when dialog opens
  useEffect(() => {
    if (open) setHideFakeTokens(defaultHideFakeTokens)
  }, [open, defaultHideFakeTokens])

  // Auto-fetch all pages when dialog is open
  useEffect(() => {
    if (open && hasMore && !isFetching) {
      loadMore()
    }
  }, [open, hasMore, isFetching, loadMore])

  // Computed date range
  const dateRange = useMemo(() => {
    if (mode === 'month' && selectedMonth !== null) {
      return getMonthRange(selectedYear, selectedMonth)
    }
    if (mode === 'daily' && selectedDate) {
      return { from: selectedDate, to: selectedDate }
    }
    if (mode === 'custom' && customFrom && customTo) {
      return { from: customFrom, to: customTo }
    }
    return null
  }, [mode, selectedYear, selectedMonth, selectedDate, customFrom, customTo])

  const displayLabel = useMemo(() => {
    if (!dateRange) return null
    if (mode === 'month' && selectedMonth !== null) {
      return `${monthNames[selectedMonth]} ${selectedYear}`
    }
    if (mode === 'daily' && selectedDate) {
      const d = new Date(selectedDate + 'T00:00:00')
      return d.toLocaleDateString(isTr ? 'tr-TR' : 'en-US', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      })
    }
    if (customFrom === '2020-01-01' && customTo === toYMD(now)) {
      return isTr ? 'Tüm Zamanlar' : 'All Time'
    }
    return `${dateRange.from} — ${dateRange.to}`
  }, [
    dateRange,
    mode,
    selectedMonth,
    selectedYear,
    selectedDate,
    monthNames,
    isTr,
    customFrom,
    customTo,
  ])

  // Count how many transfers match the selected range
  const matchCount = useMemo(() => {
    if (!dateRange) return 0
    return filterTransfersByDateRange(safeTransfers, dateRange.from, dateRange.to).length
  }, [safeTransfers, dateRange])

  const handleClose = () => {
    if (isExporting) return
    setExportType('transfers')
    setMode('month')
    setSelectedMonth(now.getMonth())
    setSelectedYear(now.getFullYear())
    setSelectedDate(toYMD(now))
    setCustomFrom('')
    setCustomTo('')
    setError(null)
    onClose()
  }

  const handleExport = async () => {
    if (!dateRange) return

    setIsExporting(true)
    setError(null)

    try {
      const filtered = filterTransfersByDateRange(safeTransfers, dateRange.from, dateRange.to)

      if (filtered.length === 0) {
        setError(
          isTr
            ? 'Seçilen tarih aralığında transfer bulunamadı.'
            : 'No transfers found in the selected date range.',
        )
        setIsExporting(false)
        return
      }

      const isAllTime = customFrom === '2020-01-01' && customTo === toYMD(now)
      const dateLabel =
        mode === 'month' && selectedMonth !== null
          ? `${selectedYear}-${String(selectedMonth + 1).padStart(2, '0')}`
          : mode === 'daily'
            ? selectedDate
            : isAllTime
              ? 'tum-zamanlar'
              : `${dateRange.from}_${dateRange.to}`

      if (exportType === 'transfers') {
        await exportWalletTransfersXlsx(filtered, walletLabel, chain, dateLabel)
      } else {
        const dailyClosings = computeDailyClosings(filtered, currentBalances)
        await exportWalletDailyClosingsXlsx(dailyClosings, walletLabel, chain, dateLabel)
      }

      handleClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Bir hata oluştu.')
    } finally {
      setIsExporting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent
        size="md"
        onInteractOutside={(e) => {
          if (isExporting) e.preventDefault()
        }}
      >
        <DialogHeader>
          <DialogTitle>{isTr ? 'Cüzdan Excel Dışa Aktarma' : 'Wallet Excel Export'}</DialogTitle>
          <DialogDescription>
            {isTr
              ? 'Seçilen tarih aralığındaki cüzdan transferlerini ve günlük kapanışları Excel dosyasına aktarın.'
              : 'Export wallet transfers and daily closings for the selected date range to Excel.'}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-md py-2">
          {/* Export type selector */}
          <div className="flex gap-xs">
            <button
              type="button"
              onClick={() => setExportType('transfers')}
              className={cn(
                'flex-1 flex items-center justify-center gap-1.5 rounded-lg border px-3 py-2.5 text-xs font-medium transition-colors',
                exportType === 'transfers'
                  ? 'border-brand/30 bg-brand/5 text-brand'
                  : 'border-black/10 bg-bg1 text-black/50 hover:border-black/20',
              )}
            >
              <ListBullets size={15} weight={exportType === 'transfers' ? 'bold' : 'regular'} />
              {isTr ? 'Transferler' : 'Transfers'}
            </button>
            <button
              type="button"
              onClick={() => setExportType('daily-closing')}
              className={cn(
                'flex-1 flex items-center justify-center gap-1.5 rounded-lg border px-3 py-2.5 text-xs font-medium transition-colors',
                exportType === 'daily-closing'
                  ? 'border-brand/30 bg-brand/5 text-brand'
                  : 'border-black/10 bg-bg1 text-black/50 hover:border-black/20',
              )}
            >
              <ChartBar size={15} weight={exportType === 'daily-closing' ? 'bold' : 'regular'} />
              {isTr ? 'Günlük Kapanış' : 'Daily Closing'}
            </button>
          </div>

          {/* Hide fake tokens toggle */}
          <button
            type="button"
            onClick={() => setHideFakeTokens((v) => !v)}
            className={cn(
              'flex w-full items-center justify-center gap-1.5 rounded-lg border px-3 py-2.5 text-xs font-medium transition-colors',
              hideFakeTokens
                ? 'border-brand/30 bg-brand/5 text-brand'
                : 'border-black/10 bg-bg1 text-black/50 hover:border-black/20',
            )}
          >
            <EyeSlash size={15} weight={hideFakeTokens ? 'bold' : 'regular'} />
            {isTr ? 'Sahte/Bilinmeyen Tokenleri Gizle' : 'Hide Fake/Unknown Tokens'}
          </button>

          {/* Date mode switcher */}
          <div className="flex gap-xs">
            {(['month', 'daily', 'custom'] as const).map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => setMode(m)}
                className={cn(
                  'flex-1 rounded-lg border px-3 py-2 text-xs font-medium transition-colors',
                  mode === m
                    ? 'border-brand/30 bg-brand/5 text-brand'
                    : 'border-black/10 bg-bg1 text-black/50 hover:border-black/20',
                )}
              >
                <CalendarBlank
                  size={14}
                  weight={mode === m ? 'fill' : 'regular'}
                  className="mr-1.5 inline-block"
                />
                {m === 'month'
                  ? isTr
                    ? 'Aylık'
                    : 'Monthly'
                  : m === 'daily'
                    ? isTr
                      ? 'Günlük'
                      : 'Daily'
                    : isTr
                      ? 'Özel Aralık'
                      : 'Custom Range'}
              </button>
            ))}
          </div>

          {/* Month selector */}
          {mode === 'month' && (
            <div className="space-y-sm">
              <div className="flex items-center justify-center gap-md">
                <button
                  type="button"
                  onClick={() => setSelectedYear((y) => y - 1)}
                  className="rounded-lg p-1.5 text-black/50 transition-colors hover:bg-black/5 hover:text-black"
                >
                  <CaretLeft size={16} weight="bold" />
                </button>
                <span className="text-sm font-semibold text-black/80">{selectedYear}</span>
                <button
                  type="button"
                  onClick={() => setSelectedYear((y) => y + 1)}
                  className="rounded-lg p-1.5 text-black/50 transition-colors hover:bg-black/5 hover:text-black"
                >
                  <CaretRight size={16} weight="bold" />
                </button>
              </div>

              <div className="grid grid-cols-4 gap-xs">
                {monthNames.map((name, idx) => {
                  const isSelected = selectedMonth === idx
                  const isCurrent = idx === now.getMonth() && selectedYear === now.getFullYear()
                  const isFuture =
                    selectedYear > now.getFullYear() ||
                    (selectedYear === now.getFullYear() && idx > now.getMonth())

                  return (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => {
                        setSelectedMonth(idx)
                        setError(null)
                      }}
                      disabled={isFuture}
                      className={cn(
                        'rounded-lg border px-2 py-2.5 text-xs font-medium transition-all',
                        isSelected
                          ? 'border-brand bg-brand/10 text-brand shadow-sm'
                          : isCurrent
                            ? 'border-brand/20 bg-brand/[0.03] text-black/70 hover:border-brand/40'
                            : 'border-black/10 text-black/60 hover:border-black/20 hover:bg-black/[0.02]',
                        isFuture && 'cursor-not-allowed opacity-30',
                      )}
                    >
                      {name}
                    </button>
                  )
                })}
              </div>
            </div>
          )}

          {/* Daily date picker */}
          {mode === 'daily' && (
            <div className="space-y-xs">
              <label className="text-xs font-medium text-black/50">
                {isTr ? 'Tarih Seçin' : 'Select Date'}
              </label>
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => {
                  setSelectedDate(e.target.value)
                  setError(null)
                }}
                className="h-9 w-full rounded-lg border border-black/10 bg-bg1 px-3 text-xs text-black transition-colors focus:border-brand/40 focus:outline-none"
              />
            </div>
          )}

          {/* Custom date range */}
          {mode === 'custom' && (
            <div className="space-y-sm">
              {/* All time button */}
              <button
                type="button"
                onClick={() => {
                  setCustomFrom('2020-01-01')
                  setCustomTo(toYMD(now))
                  setError(null)
                }}
                className={cn(
                  'w-full rounded-lg border px-3 py-2.5 text-xs font-medium transition-colors',
                  customFrom === '2020-01-01' && customTo === toYMD(now)
                    ? 'border-brand bg-brand/10 text-brand shadow-sm'
                    : 'border-black/10 text-black/50 hover:border-black/20 hover:bg-black/[0.02]',
                )}
              >
                {isTr ? 'Tüm Zamanlar' : 'All Time'}
              </button>

              <div className="flex items-end gap-sm">
                <div className="flex-1 space-y-xs">
                  <label className="text-xs font-medium text-black/50">
                    {isTr ? 'Başlangıç' : 'Start'}
                  </label>
                  <input
                    type="date"
                    value={customFrom}
                    onChange={(e) => {
                      setCustomFrom(e.target.value)
                      setError(null)
                    }}
                    className="h-9 w-full rounded-lg border border-black/10 bg-bg1 px-3 text-xs text-black transition-colors focus:border-brand/40 focus:outline-none"
                  />
                </div>
                <span className="pb-2 text-xs text-black/30">—</span>
                <div className="flex-1 space-y-xs">
                  <label className="text-xs font-medium text-black/50">
                    {isTr ? 'Bitiş' : 'End'}
                  </label>
                  <input
                    type="date"
                    value={customTo}
                    min={customFrom || undefined}
                    onChange={(e) => {
                      setCustomTo(e.target.value)
                      setError(null)
                    }}
                    className="h-9 w-full rounded-lg border border-black/10 bg-bg1 px-3 text-xs text-black transition-colors focus:border-brand/40 focus:outline-none"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Selected range display + match count */}
          {displayLabel && !error && !isExporting && (
            <div className="rounded-lg border border-brand/15 bg-brand/[0.03] px-3 py-2 text-center text-xs font-medium text-brand/80">
              {displayLabel}
              {matchCount > 0 && (
                <span className="ml-2 text-black/40">
                  ({matchCount} {isTr ? 'transfer' : 'transfers'})
                </span>
              )}
            </div>
          )}

          {/* Loading all pages */}
          {hasMore && (
            <div className="flex items-center gap-sm rounded-lg border border-orange-200 bg-orange-50 p-3">
              <SpinnerGap size={16} className="shrink-0 animate-spin text-orange-500" />
              <p className="text-xs text-orange-700">
                {isTr
                  ? `Tüm transferler yükleniyor… (${transfers.length} yüklendi)`
                  : `Loading all transfers… (${transfers.length} loaded)`}
              </p>
            </div>
          )}

          {/* No data at all */}
          {!hasMore && safeTransfers.length === 0 && (
            <div className="flex items-start gap-sm rounded-lg border border-orange-200 bg-orange-50 p-3">
              <Warning size={16} weight="fill" className="mt-0.5 shrink-0 text-orange-500" />
              <p className="text-xs text-orange-700">
                {isTr ? 'Henüz transfer verisi yüklenmemiş.' : 'No transfer data loaded yet.'}
              </p>
            </div>
          )}

          {/* Error message */}
          {error && (
            <div className="flex items-start gap-sm rounded-lg border border-red-200 bg-red-50 p-3">
              <Warning size={16} weight="fill" className="mt-0.5 shrink-0 text-red-500" />
              <p className="text-xs text-red-700">{error}</p>
            </div>
          )}

          {/* Export progress */}
          {isExporting && (
            <div className="flex items-center gap-sm rounded-lg border border-black/10 bg-black/[0.02] p-3">
              <SpinnerGap size={16} className="shrink-0 animate-spin text-brand" />
              <p className="text-xs text-black/60">
                {isTr ? 'Dışa aktarılıyor...' : 'Exporting...'}
              </p>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-sm pt-2">
          <Button variant="ghost" onClick={handleClose} disabled={isExporting}>
            {t('common.cancel', 'İptal')}
          </Button>
          <Button
            variant="filled"
            onClick={handleExport}
            disabled={!dateRange || isExporting || safeTransfers.length === 0 || hasMore}
          >
            <DownloadSimple size={16} weight="bold" />
            {isTr ? 'Dışa Aktar' : 'Export'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
