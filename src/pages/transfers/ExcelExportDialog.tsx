import { useState, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import {
  DownloadSimple,
  SpinnerGap,
  Warning,
  CalendarBlank,
  CaretLeft,
  CaretRight,
} from '@phosphor-icons/react'
import { useOrganization } from '@/app/providers/OrganizationProvider'
import {
  fetchAllTransfersForPeriod,
  resolveProfileNames,
  exportTransfersXlsx,
} from '@/lib/csvExport/exportTransfersXlsx'
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

interface ExcelExportDialogProps {
  open: boolean
  onClose: () => void
}

export function ExcelExportDialog({ open, onClose }: ExcelExportDialogProps) {
  const { t, i18n } = useTranslation('pages')
  const { currentOrg } = useOrganization()
  const isTr = i18n.language === 'tr'
  const monthNames = isTr ? MONTH_NAMES_TR : MONTH_NAMES_EN

  const now = new Date()
  const [mode, setMode] = useState<SelectionMode>('month')
  const [selectedYear, setSelectedYear] = useState(now.getFullYear())
  const [selectedMonth, setSelectedMonth] = useState<number | null>(now.getMonth())

  // Daily
  const [selectedDate, setSelectedDate] = useState(toYMD(now))

  // Custom range
  const [customFrom, setCustomFrom] = useState('')
  const [customTo, setCustomTo] = useState('')

  const [isExporting, setIsExporting] = useState(false)
  const [fetchedCount, setFetchedCount] = useState(0)
  const [error, setError] = useState<string | null>(null)

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
    return `${dateRange.from} — ${dateRange.to}`
  }, [dateRange, mode, selectedMonth, selectedYear, selectedDate, monthNames, isTr])

  const handleClose = () => {
    if (isExporting) return
    setMode('month')
    setSelectedMonth(now.getMonth())
    setSelectedYear(now.getFullYear())
    setSelectedDate(toYMD(now))
    setCustomFrom('')
    setCustomTo('')
    setError(null)
    setFetchedCount(0)
    onClose()
  }

  const handleExport = async () => {
    if (!currentOrg || !dateRange) return

    setIsExporting(true)
    setError(null)
    setFetchedCount(0)

    try {
      const transfers = await fetchAllTransfersForPeriod(
        currentOrg.id,
        dateRange.from,
        dateRange.to,
        (count) => setFetchedCount(count),
      )

      if (transfers.length === 0) {
        setError(t('transfers.export.noData', 'Seçilen tarih aralığında transfer bulunamadı.'))
        setIsExporting(false)
        return
      }

      const userIds = [
        ...new Set(
          transfers.flatMap((tr) => [tr.updated_by, tr.created_by]).filter(Boolean) as string[],
        ),
      ]
      const profileMap = await resolveProfileNames(userIds)

      const dateLabel =
        mode === 'month' && selectedMonth !== null
          ? `${selectedYear}-${String(selectedMonth + 1).padStart(2, '0')}`
          : mode === 'daily'
            ? selectedDate
            : `${dateRange.from}_${dateRange.to}`

      await exportTransfersXlsx(transfers, profileMap, currentOrg.name, dateLabel)

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
          <DialogTitle>{t('transfers.export.title', 'Excel Dışa Aktarma')}</DialogTitle>
          <DialogDescription>
            {t(
              'transfers.export.subtitle',
              'Seçilen tarih aralığındaki transferleri Excel dosyasına aktarın.',
            )}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-md py-2">
          {/* Mode switcher */}
          <div className="flex gap-xs">
            <button
              type="button"
              onClick={() => setMode('month')}
              className={cn(
                'flex-1 rounded-lg border px-3 py-2 text-xs font-medium transition-colors',
                mode === 'month'
                  ? 'border-brand/30 bg-brand/5 text-brand'
                  : 'border-black/10 bg-bg1 text-black/50 hover:border-black/20',
              )}
            >
              <CalendarBlank
                size={14}
                weight={mode === 'month' ? 'fill' : 'regular'}
                className="mr-1.5 inline-block"
              />
              {isTr ? 'Aylık' : 'Monthly'}
            </button>
            <button
              type="button"
              onClick={() => setMode('daily')}
              className={cn(
                'flex-1 rounded-lg border px-3 py-2 text-xs font-medium transition-colors',
                mode === 'daily'
                  ? 'border-brand/30 bg-brand/5 text-brand'
                  : 'border-black/10 bg-bg1 text-black/50 hover:border-black/20',
              )}
            >
              <CalendarBlank
                size={14}
                weight={mode === 'daily' ? 'fill' : 'regular'}
                className="mr-1.5 inline-block"
              />
              {isTr ? 'Günlük' : 'Daily'}
            </button>
            <button
              type="button"
              onClick={() => setMode('custom')}
              className={cn(
                'flex-1 rounded-lg border px-3 py-2 text-xs font-medium transition-colors',
                mode === 'custom'
                  ? 'border-brand/30 bg-brand/5 text-brand'
                  : 'border-black/10 bg-bg1 text-black/50 hover:border-black/20',
              )}
            >
              <CalendarBlank
                size={14}
                weight={mode === 'custom' ? 'fill' : 'regular'}
                className="mr-1.5 inline-block"
              />
              {isTr ? 'Özel Aralık' : 'Custom Range'}
            </button>
          </div>

          {/* Month selector */}
          {mode === 'month' && (
            <div className="space-y-sm">
              {/* Year navigation */}
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

              {/* Month grid */}
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
          )}

          {/* Selected range display */}
          {displayLabel && !error && !isExporting && (
            <div className="rounded-lg border border-brand/15 bg-brand/[0.03] px-3 py-2 text-center text-xs font-medium text-brand/80">
              {displayLabel}
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
                {fetchedCount > 0
                  ? t(
                      'transfers.export.fetchingTransfers',
                      'Transferler getiriliyor ({{count}})...',
                      {
                        count: fetchedCount,
                      },
                    )
                  : t('transfers.export.exporting', 'Dışa aktarılıyor...')}
              </p>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-sm pt-2">
          <Button variant="ghost" onClick={handleClose} disabled={isExporting}>
            {t('common.cancel', 'İptal')}
          </Button>
          <Button variant="filled" onClick={handleExport} disabled={!dateRange || isExporting}>
            <DownloadSimple size={16} weight="bold" />
            {t('transfers.export.export', 'Dışa Aktar')}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
