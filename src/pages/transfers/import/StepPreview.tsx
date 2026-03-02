import { useState, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import {
  CheckCircle,
  Warning,
  XCircle,
  CaretDown,
  CaretRight,
  CopySimple,
} from '@phosphor-icons/react'
import { Button } from '@ds'
import { cn } from '@ds/utils'
import type { ImportParseResult, ResolvedTransferRow } from '@/lib/csvImport/types'

interface StepPreviewProps {
  parseResult: ImportParseResult
  onConfirm: (rows: ResolvedTransferRow[]) => void
  onBack: () => void
}

type FilterTab = 'all' | 'valid' | 'warnings' | 'errors' | 'duplicates'

export function StepPreview({ parseResult, onConfirm, onBack }: StepPreviewProps) {
  const { t } = useTranslation('pages')
  const [activeFilter, setActiveFilter] = useState<FilterTab>('all')
  const [skipDuplicates, setSkipDuplicates] = useState(true)
  const [expandedRow, setExpandedRow] = useState<number | null>(null)
  const [showRates, setShowRates] = useState(false)

  const filteredRows = useMemo(() => {
    switch (activeFilter) {
      case 'valid':
        return parseResult.rows.filter((r) => r.isValid && !r.isDuplicate)
      case 'warnings':
        return parseResult.rows.filter((r) => r.issues.some((i) => i.severity === 'warning'))
      case 'errors':
        return parseResult.rows.filter((r) => !r.isValid)
      case 'duplicates':
        return parseResult.rows.filter((r) => r.isDuplicate)
      default:
        return parseResult.rows
    }
  }, [parseResult.rows, activeFilter])

  const importableRows = useMemo(() => {
    return parseResult.rows.filter((r) => r.isValid && (!skipDuplicates || !r.isDuplicate))
  }, [parseResult.rows, skipDuplicates])

  const handleConfirm = () => {
    onConfirm(importableRows)
  }

  const formatAmount = (val: number, currency: string) => {
    const formatted = Math.abs(val).toLocaleString('tr-TR', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })
    return `${val < 0 ? '-' : ''}${currency === 'USD' || currency === 'USDT' ? '$' : '₺'}${formatted}`
  }

  const sortedRates = useMemo(
    () => Array.from(parseResult.exchangeRates.entries()).sort(([a], [b]) => a.localeCompare(b)),
    [parseResult.exchangeRates],
  )

  return (
    <div className="flex flex-col gap-md">
      {/* Summary cards */}
      <div className="grid grid-cols-4 gap-md">
        <SummaryCard
          label={t('transfers.import.preview.totalRows', 'Total')}
          value={parseResult.totalRows}
          color="text-black/70"
          bg="bg-black/5"
        />
        <SummaryCard
          label={t('transfers.import.preview.valid', 'Valid')}
          value={parseResult.validRows}
          color="text-emerald-700"
          bg="bg-emerald-50"
        />
        <SummaryCard
          label={t('transfers.import.preview.warnings', 'Warnings')}
          value={parseResult.warningRows}
          color="text-amber-700"
          bg="bg-amber-50"
        />
        <SummaryCard
          label={t('transfers.import.preview.errors', 'Errors')}
          value={parseResult.errorRows}
          color="text-red-700"
          bg="bg-red-50"
        />
      </div>

      {/* Exchange rates collapsible */}
      {sortedRates.length > 0 && (
        <div className="rounded-lg border border-black/10">
          <button
            type="button"
            onClick={() => setShowRates(!showRates)}
            className="flex w-full items-center gap-sm px-3 py-2 text-left text-sm font-medium text-black/60 hover:bg-black/[0.02]"
          >
            {showRates ? <CaretDown size={14} /> : <CaretRight size={14} />}
            {t('transfers.import.preview.exchangeRates', 'Exchange Rates')} ({sortedRates.length})
          </button>
          {showRates && (
            <div className="grid grid-cols-4 gap-x-6 gap-y-1 border-t border-black/10 px-4 py-3">
              {sortedRates.map(([date, rate]) => (
                <div key={date} className="flex justify-between text-xs">
                  <span className="text-black/50">{date}</span>
                  <span className="font-mono text-black/70">{rate.toFixed(2)}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Filter tabs */}
      <div className="flex items-center gap-1 border-b border-black/10 pb-px">
        {(
          [
            ['all', 'All', parseResult.totalRows],
            ['valid', 'Valid', parseResult.validRows],
            ['warnings', 'Warnings', parseResult.warningRows],
            ['errors', 'Errors', parseResult.errorRows],
            ['duplicates', 'Duplicates', parseResult.duplicateRows],
          ] as const
        ).map(([key, label, count]) => (
          <button
            key={key}
            type="button"
            onClick={() => setActiveFilter(key)}
            className={cn(
              'rounded-t-md px-3 py-1.5 text-xs font-medium transition-colors',
              activeFilter === key
                ? 'border-b-2 border-black/80 text-black/80'
                : 'text-black/40 hover:text-black/60',
            )}
          >
            {label} ({count})
          </button>
        ))}
      </div>

      {/* Preview table */}
      <div className="max-h-[380px] overflow-auto rounded-lg border border-black/10">
        <table className="w-full text-xs">
          <thead className="sticky top-0 bg-black/[0.03]">
            <tr className="text-left text-black/50">
              <th className="px-2 py-2 font-medium">#</th>
              <th className="px-2 py-2 font-medium">Name</th>
              <th className="px-2 py-2 font-medium">Date</th>
              <th className="px-2 py-2 font-medium">Category</th>
              <th className="px-2 py-2 font-medium text-right">Amount</th>
              <th className="px-2 py-2 font-medium">Currency</th>
              <th className="px-2 py-2 font-medium">Type</th>
              <th className="px-2 py-2 font-medium text-center">Status</th>
            </tr>
          </thead>
          <tbody>
            {filteredRows.map((row) => (
              <PreviewRow
                key={row.rowIndex}
                row={row}
                isExpanded={expandedRow === row.rowIndex}
                onToggle={() => setExpandedRow(expandedRow === row.rowIndex ? null : row.rowIndex)}
                formatAmount={formatAmount}
              />
            ))}
            {filteredRows.length === 0 && (
              <tr>
                <td colSpan={8} className="px-4 py-8 text-center text-black/40">
                  No rows to display
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Skip duplicates */}
      {parseResult.duplicateRows > 0 && (
        <label className="flex items-center gap-sm text-sm text-black/60">
          <input
            type="checkbox"
            checked={skipDuplicates}
            onChange={(e) => setSkipDuplicates(e.target.checked)}
            className="rounded"
          />
          {t('transfers.import.preview.skipDuplicates', 'Skip duplicate rows')} (
          {parseResult.duplicateRows})
        </label>
      )}

      {/* Actions */}
      <div className="flex items-center justify-between pt-2">
        <Button variant="outline" onClick={onBack}>
          &larr; {t('transfers.import.steps.upload', 'Upload')}
        </Button>
        <Button variant="filled" onClick={handleConfirm} disabled={importableRows.length === 0}>
          {importableRows.length > 0
            ? `Import ${importableRows.length} rows`
            : t('transfers.import.preview.noValidRows', 'No valid rows to import')}
        </Button>
      </div>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

function SummaryCard({
  label,
  value,
  color,
  bg,
}: {
  label: string
  value: number
  color: string
  bg: string
}) {
  return (
    <div className={cn('rounded-lg px-4 py-3', bg)}>
      <p className="text-xs text-black/50">{label}</p>
      <p className={cn('text-xl font-semibold', color)}>{value}</p>
    </div>
  )
}

function PreviewRow({
  row,
  isExpanded,
  onToggle,
  formatAmount,
}: {
  row: ResolvedTransferRow
  isExpanded: boolean
  onToggle: () => void
  formatAmount: (val: number, currency: string) => string
}) {
  const hasIssues = row.issues.length > 0

  return (
    <>
      <tr
        onClick={hasIssues ? onToggle : undefined}
        className={cn(
          'border-t border-black/5 transition-colors',
          !row.isValid && 'bg-red-50/50',
          row.isValid && row.isDuplicate && 'bg-amber-50/50',
          hasIssues && 'cursor-pointer hover:bg-black/[0.02]',
        )}
      >
        <td className="px-2 py-1.5 text-black/40">{row.rowIndex}</td>
        <td className="max-w-[160px] truncate px-2 py-1.5 font-medium text-black/80">
          {row.fullName}
        </td>
        <td className="px-2 py-1.5 text-black/60">{row.raw.dateRaw}</td>
        <td className="px-2 py-1.5">
          <span
            className={cn(
              'inline-block rounded px-1.5 py-0.5 text-[10px] font-medium',
              row.isDeposit ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700',
            )}
          >
            {row.raw.categoryName}
          </span>
        </td>
        <td className="px-2 py-1.5 text-right font-mono text-black/70">
          {formatAmount(row.amount, row.currency)}
        </td>
        <td className="px-2 py-1.5 text-black/60">{row.currency}</td>
        <td className="px-2 py-1.5 text-black/60">{row.raw.typeName}</td>
        <td className="px-2 py-1.5 text-center">
          {!row.isValid ? (
            <XCircle size={16} weight="fill" className="inline text-red-500" />
          ) : row.isDuplicate ? (
            <CopySimple size={16} weight="fill" className="inline text-amber-500" />
          ) : row.issues.length > 0 ? (
            <Warning size={16} weight="fill" className="inline text-amber-500" />
          ) : (
            <CheckCircle size={16} weight="fill" className="inline text-emerald-500" />
          )}
        </td>
      </tr>
      {isExpanded && row.issues.length > 0 && (
        <tr className="bg-black/[0.02]">
          <td colSpan={8} className="px-4 py-2">
            <div className="flex flex-col gap-xs">
              {row.issues.map((issue, idx) => (
                <div
                  key={idx}
                  className={cn(
                    'flex items-center gap-sm text-xs',
                    issue.severity === 'error' ? 'text-red-600' : 'text-amber-600',
                  )}
                >
                  {issue.severity === 'error' ? (
                    <XCircle size={12} weight="fill" />
                  ) : (
                    <Warning size={12} weight="fill" />
                  )}
                  <span className="font-medium">{issue.field}:</span>
                  {issue.message}
                </div>
              ))}
            </div>
          </td>
        </tr>
      )}
    </>
  )
}
