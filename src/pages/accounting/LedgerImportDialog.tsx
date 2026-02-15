import { useState, useRef, useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import {
  UploadSimple,
  File,
  Warning,
  CheckCircle,
  XCircle,
  SpinnerGap,
  ArrowRight,
  ArrowLeft,
} from '@phosphor-icons/react'
import { useImportLedgerEntries } from '@/hooks/queries/useImportLedgerEntries'
import { parseLedgerCsv } from '@/lib/csvImport/parseLedgerCsv'
import type {
  LedgerParsedRow,
  LedgerImportParseResult,
  LedgerImportProgress,
} from '@/lib/csvImport/ledgerTypes'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, Button } from '@ds'
import { cn } from '@ds/utils'

/* ── Types ──────────────────────────────────────────── */

type ImportStep = 'upload' | 'preview' | 'results'

const STEPS: ImportStep[] = ['upload', 'preview', 'results']
const STEP_KEYS = [
  'accounting.import.steps.upload',
  'accounting.import.steps.preview',
  'accounting.import.steps.results',
] as const
const STEP_FALLBACKS = ['Upload', 'Preview', 'Results']

/* ── Props ──────────────────────────────────────────── */

interface LedgerImportDialogProps {
  open: boolean
  onClose: () => void
}

/* ── Main Dialog ────────────────────────────────────── */

export function LedgerImportDialog({ open, onClose }: LedgerImportDialogProps) {
  const { t } = useTranslation('pages')
  const { importLedgerEntries } = useImportLedgerEntries()

  const [step, setStep] = useState<ImportStep>('upload')
  const [parseResult, setParseResult] = useState<LedgerImportParseResult | null>(null)
  const [progress, setProgress] = useState<LedgerImportProgress>({
    phase: 'idle',
    totalRows: 0,
    insertedRows: 0,
    failedRows: 0,
    currentBatch: 0,
    totalBatches: 0,
    errors: [],
  })

  const handleClose = () => {
    if (progress.phase === 'inserting') return // prevent closing during import
    setStep('upload')
    setParseResult(null)
    setProgress({
      phase: 'idle',
      totalRows: 0,
      insertedRows: 0,
      failedRows: 0,
      currentBatch: 0,
      totalBatches: 0,
      errors: [],
    })
    onClose()
  }

  const handleParsed = useCallback((result: LedgerImportParseResult) => {
    setParseResult(result)
    setStep('preview')
  }, [])

  const handleImport = useCallback(
    async (rows: LedgerParsedRow[]) => {
      setProgress({
        phase: 'inserting',
        totalRows: rows.length,
        insertedRows: 0,
        failedRows: 0,
        currentBatch: 0,
        totalBatches: Math.ceil(rows.length / 50),
        errors: [],
      })

      try {
        const result = await importLedgerEntries({
          rows,
          onProgress: setProgress,
        })

        setProgress((prev) => ({
          ...prev,
          phase: 'done',
          insertedRows: result.insertedCount,
          failedRows: result.errors.length,
          errors: result.errors,
        }))
      } catch (err) {
        setProgress((prev) => ({
          ...prev,
          phase: 'error',
          errors: [
            ...prev.errors,
            {
              rowIndex: 0,
              message: err instanceof Error ? err.message : 'Unknown error',
            },
          ],
        }))
      }

      setStep('results')
    },
    [importLedgerEntries],
  )

  const currentStepIndex = STEPS.indexOf(step)

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent
        size="xl"
        className="max-h-[90vh] overflow-y-auto"
        onInteractOutside={(e) => {
          if (progress.phase === 'inserting') e.preventDefault()
        }}
      >
        <DialogHeader>
          <DialogTitle>{t('accounting.import.title', 'Import Ledger Entries')}</DialogTitle>
          <DialogDescription>
            {t('accounting.import.subtitle', 'Upload a CSV file to bulk-import accounting entries')}
          </DialogDescription>
        </DialogHeader>

        {/* Step indicator */}
        <div className="flex items-center justify-center gap-2 py-4">
          {STEPS.map((s, idx) => (
            <div key={s} className="flex items-center gap-2">
              <div
                className={cn(
                  'flex size-7 items-center justify-center rounded-full text-xs font-medium transition-colors',
                  idx <= currentStepIndex ? 'bg-black/80 text-white' : 'bg-black/10 text-black/40',
                )}
              >
                {idx + 1}
              </div>
              <span
                className={cn(
                  'hidden text-xs font-medium sm:inline',
                  idx <= currentStepIndex ? 'text-black/70' : 'text-black/30',
                )}
              >
                {t(STEP_KEYS[idx], STEP_FALLBACKS[idx])}
              </span>
              {idx < STEPS.length - 1 && (
                <div
                  className={cn('h-px w-8', idx < currentStepIndex ? 'bg-black/30' : 'bg-black/10')}
                />
              )}
            </div>
          ))}
        </div>

        {/* Step content */}
        {step === 'upload' && <StepUpload onParsed={handleParsed} />}
        {step === 'preview' && parseResult && (
          <StepPreview
            parseResult={parseResult}
            isImporting={progress.phase === 'inserting'}
            progress={progress}
            onImport={handleImport}
            onBack={() => {
              setStep('upload')
              setParseResult(null)
            }}
          />
        )}
        {step === 'results' && <StepResults progress={progress} onClose={handleClose} />}
      </DialogContent>
    </Dialog>
  )
}

/* ================================================================== */
/*  Step 1: Upload                                                     */
/* ================================================================== */

function StepUpload({ onParsed }: { onParsed: (result: LedgerImportParseResult) => void }) {
  const { t } = useTranslation('pages')
  const inputRef = useRef<HTMLInputElement>(null)
  const [isDragging, setIsDragging] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [fileName, setFileName] = useState<string | null>(null)
  const [rowCount, setRowCount] = useState(0)
  const [parsed, setParsed] = useState(false)
  const [result, setResult] = useState<LedgerImportParseResult | null>(null)

  const processFile = useCallback(
    (file: globalThis.File) => {
      setError(null)
      setParsed(false)

      if (!file.name.endsWith('.csv')) {
        setError(t('accounting.import.upload.invalidFile', 'Please select a .csv file'))
        return
      }

      setFileName(file.name)

      const reader = new FileReader()
      reader.onload = (e) => {
        const text = e.target?.result as string
        try {
          const parsed = parseLedgerCsv(text)
          setRowCount(parsed.rows.length)
          setParsed(true)
          setResult(parsed)
        } catch (err) {
          setError(
            err instanceof Error
              ? err.message
              : t('accounting.import.upload.parseError', 'Failed to parse CSV'),
          )
        }
      }
      reader.onerror = () => {
        setError(t('accounting.import.upload.parseError', 'Failed to read file'))
      }
      reader.readAsText(file, 'utf-8')
    },
    [t],
  )

  return (
    <div className="flex flex-col items-center gap-6 py-4">
      {/* Drop zone */}
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        onDragOver={(e) => {
          e.preventDefault()
          setIsDragging(true)
        }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={(e) => {
          e.preventDefault()
          setIsDragging(false)
          const file = e.dataTransfer.files[0]
          if (file) processFile(file)
        }}
        className={cn(
          'flex w-full flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed p-12 transition-colors',
          isDragging
            ? 'border-black/30 bg-black/5'
            : 'border-black/10 hover:border-black/20 hover:bg-black/[0.02]',
          error && 'border-red-300 bg-red-50/50',
        )}
      >
        {parsed ? (
          <File size={40} weight="duotone" className="text-black/30" />
        ) : (
          <UploadSimple size={40} weight="duotone" className="text-black/30" />
        )}
        <div className="text-center">
          <p className="text-sm font-medium text-black/70">
            {t('accounting.import.upload.dropzone', 'Drop a CSV file here, or click to browse')}
          </p>
          <p className="mt-1 text-xs text-black/40">
            {t('accounting.import.upload.hint', 'Google Sheets CSV export (.csv)')}
          </p>
        </div>
      </button>

      <input
        ref={inputRef}
        type="file"
        accept=".csv"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0]
          if (file) processFile(file)
        }}
      />

      {/* File info */}
      {fileName && !error && (
        <div className="flex w-full items-center gap-3 rounded-lg border border-black/10 bg-black/[0.02] px-4 py-3">
          <File size={20} className="text-black/40" />
          <div className="flex-1">
            <p className="text-sm font-medium text-black/80">{fileName}</p>
            <p className="text-xs text-black/50">
              {t('accounting.import.upload.rowsDetected', '{{count}} entries detected', {
                count: rowCount,
              })}
            </p>
          </div>
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="flex w-full items-start gap-3 rounded-lg border border-red-200 bg-red-50 px-4 py-3">
          <Warning size={20} className="mt-0.5 shrink-0 text-red-500" />
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}

      {/* Next button */}
      <div className="flex w-full justify-end">
        <Button variant="filled" onClick={() => result && onParsed(result)} disabled={!parsed}>
          {t('accounting.import.steps.preview', 'Preview')}
          <ArrowRight size={14} weight="bold" />
        </Button>
      </div>
    </div>
  )
}

/* ================================================================== */
/*  Step 2: Preview                                                    */
/* ================================================================== */

function StepPreview({
  parseResult,
  isImporting,
  progress,
  onImport,
  onBack,
}: {
  parseResult: LedgerImportParseResult
  isImporting: boolean
  progress: LedgerImportProgress
  onImport: (rows: LedgerParsedRow[]) => void
  onBack: () => void
}) {
  const { t } = useTranslation('pages')
  const [filter, setFilter] = useState<'all' | 'valid' | 'errors'>('all')
  const [expandedRow, setExpandedRow] = useState<number | null>(null)

  const validRows = parseResult.rows.filter((r) => r.isValid)
  const errorRows = parseResult.rows.filter((r) => !r.isValid)

  const filteredRows =
    filter === 'valid' ? validRows : filter === 'errors' ? errorRows : parseResult.rows

  const formatAmount = (n: number) =>
    n.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

  return (
    <div className="space-y-4">
      {/* Summary cards */}
      <div className="grid grid-cols-3 gap-3">
        <SummaryCard
          label={t('accounting.import.preview.total', 'Total')}
          value={parseResult.rows.length}
          className="bg-black/[0.02]"
        />
        <SummaryCard
          label={t('accounting.import.preview.valid', 'Valid')}
          value={parseResult.validRows}
          className="bg-emerald-50 text-emerald-700"
        />
        <SummaryCard
          label={t('accounting.import.preview.errors', 'Errors')}
          value={parseResult.errorRows}
          className="bg-red-50 text-red-700"
        />
      </div>

      {/* Filter tabs */}
      <div className="flex gap-1">
        {(['all', 'valid', 'errors'] as const).map((f) => {
          const count =
            f === 'all'
              ? parseResult.rows.length
              : f === 'valid'
                ? parseResult.validRows
                : parseResult.errorRows
          return (
            <button
              key={f}
              type="button"
              onClick={() => setFilter(f)}
              className={cn(
                'rounded-md px-3 py-1.5 text-xs font-medium transition-colors',
                filter === f
                  ? 'bg-black/80 text-white'
                  : 'bg-black/5 text-black/60 hover:bg-black/10',
              )}
            >
              {t(`accounting.import.preview.filter.${f}`, f)} ({count})
            </button>
          )
        })}
      </div>

      {/* Preview table */}
      <div className="max-h-[380px] overflow-auto rounded-lg border border-black/10">
        <table className="w-full text-left text-xs">
          <thead className="sticky top-0 bg-white">
            <tr className="border-b border-black/10">
              <th className="whitespace-nowrap px-3 py-2 font-semibold text-black/40">#</th>
              <th className="whitespace-nowrap px-3 py-2 font-semibold text-black/40">
                {t('accounting.columns.description', 'Description')}
              </th>
              <th className="whitespace-nowrap px-3 py-2 font-semibold text-black/40">
                {t('accounting.columns.type', 'Type')}
              </th>
              <th className="whitespace-nowrap px-3 py-2 font-semibold text-black/40">
                {t('accounting.columns.direction', 'Dir')}
              </th>
              <th className="whitespace-nowrap px-3 py-2 text-right font-semibold text-black/40">
                {t('accounting.columns.amount', 'Amount')}
              </th>
              <th className="whitespace-nowrap px-3 py-2 font-semibold text-black/40">
                {t('accounting.columns.currency', 'Cur')}
              </th>
              <th className="whitespace-nowrap px-3 py-2 font-semibold text-black/40">
                {t('accounting.columns.register', 'Register')}
              </th>
              <th className="whitespace-nowrap px-3 py-2 font-semibold text-black/40">
                {t('accounting.import.preview.dateCol', 'Date')}
              </th>
              <th className="whitespace-nowrap px-3 py-2 font-semibold text-black/40">
                {t('accounting.import.preview.status', 'Status')}
              </th>
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
          </tbody>
        </table>
      </div>

      {/* Import progress bar (shown during import) */}
      {isImporting && (
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-sm text-black/60">
            <SpinnerGap size={16} className="animate-spin" />
            <span>
              {t('accounting.import.importing', 'Importing...')} —{' '}
              {t('accounting.import.batch', 'Batch {{current}} of {{total}}', {
                current: progress.currentBatch,
                total: progress.totalBatches,
              })}
            </span>
          </div>
          <div className="h-2 w-full overflow-hidden rounded-full bg-black/10">
            <div
              className="h-full rounded-full bg-black/70 transition-all duration-300"
              style={{
                width: `${progress.totalRows > 0 ? (progress.insertedRows / progress.totalRows) * 100 : 0}%`,
              }}
            />
          </div>
          <p className="text-xs text-black/50">
            {progress.insertedRows} / {progress.totalRows}
          </p>
        </div>
      )}

      {/* Actions */}
      <div className="flex justify-between">
        <Button variant="outline" onClick={onBack} disabled={isImporting}>
          <ArrowLeft size={14} weight="bold" />
          {t('accounting.import.back', 'Back')}
        </Button>
        <Button
          variant="filled"
          onClick={() => onImport(validRows)}
          disabled={validRows.length === 0 || isImporting}
        >
          {isImporting ? (
            <>
              <SpinnerGap size={14} className="animate-spin" />
              {t('accounting.import.importing', 'Importing...')}
            </>
          ) : (
            t('accounting.import.importButton', 'Import {{count}} entries', {
              count: validRows.length,
            })
          )}
        </Button>
      </div>
    </div>
  )
}

/* ── Preview Row ──────────────────────────────────────── */

function PreviewRow({
  row,
  isExpanded,
  onToggle,
  formatAmount,
}: {
  row: LedgerParsedRow
  isExpanded: boolean
  onToggle: () => void
  formatAmount: (n: number) => string
}) {
  const hasIssues = row.issues.length > 0

  return (
    <>
      <tr
        onClick={hasIssues ? onToggle : undefined}
        className={cn(
          'border-b border-black/5 transition-colors',
          !row.isValid && 'bg-red-50/50',
          row.isValid && row.issues.length > 0 && 'bg-amber-50/50',
          hasIssues && 'cursor-pointer hover:bg-black/[0.03]',
        )}
      >
        <td className="px-3 py-2 text-black/40">{row.rowIndex}</td>
        <td className="max-w-[200px] truncate px-3 py-2 font-medium text-black/80">
          {row.description}
        </td>
        <td className="px-3 py-2">
          <span
            className={cn(
              'rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase',
              row.entryType === 'TRANSFER'
                ? 'bg-blue-100 text-blue-700'
                : 'bg-black/5 text-black/60',
            )}
          >
            {row.entryType}
          </span>
        </td>
        <td className="px-3 py-2">
          <span
            className={cn(
              'text-[10px] font-bold uppercase',
              row.direction === 'in' ? 'text-emerald-600' : 'text-red-500',
            )}
          >
            {row.direction}
          </span>
        </td>
        <td className="whitespace-nowrap px-3 py-2 text-right font-mono text-black/80">
          {row.direction === 'in' ? '+' : '-'}
          {formatAmount(row.amount)}
        </td>
        <td className="px-3 py-2 text-black/60">{row.currency}</td>
        <td className="px-3 py-2 text-black/60">{row.register}</td>
        <td className="whitespace-nowrap px-3 py-2 text-black/60">{row.entryDate}</td>
        <td className="px-3 py-2">
          {row.isValid && row.issues.length === 0 && (
            <CheckCircle size={16} weight="fill" className="text-emerald-500" />
          )}
          {row.isValid && row.issues.length > 0 && (
            <Warning size={16} weight="fill" className="text-amber-500" />
          )}
          {!row.isValid && <XCircle size={16} weight="fill" className="text-red-500" />}
        </td>
      </tr>
      {isExpanded && hasIssues && (
        <tr className="bg-black/[0.02]">
          <td colSpan={9} className="px-6 py-3">
            <div className="space-y-1">
              {row.issues.map((issue, idx) => (
                <div key={idx} className="flex items-center gap-2 text-xs">
                  <span
                    className={cn(
                      'rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase',
                      issue.severity === 'error'
                        ? 'bg-red-100 text-red-700'
                        : 'bg-amber-100 text-amber-700',
                    )}
                  >
                    {issue.severity}
                  </span>
                  <span className="font-medium text-black/50">{issue.field}:</span>
                  <span className="text-black/70">{issue.message}</span>
                </div>
              ))}
            </div>
          </td>
        </tr>
      )}
    </>
  )
}

/* ── Summary Card ─────────────────────────────────────── */

function SummaryCard({
  label,
  value,
  className,
}: {
  label: string
  value: number
  className?: string
}) {
  return (
    <div className={cn('rounded-lg px-4 py-3 text-center', className)}>
      <p className="text-2xl font-bold">{value}</p>
      <p className="mt-1 text-xs font-medium opacity-60">{label}</p>
    </div>
  )
}

/* ================================================================== */
/*  Step 3: Results                                                    */
/* ================================================================== */

function StepResults({
  progress,
  onClose,
}: {
  progress: LedgerImportProgress
  onClose: () => void
}) {
  const { t } = useTranslation('pages')
  const allFailed = progress.insertedRows === 0 && progress.failedRows > 0
  const partial = progress.insertedRows > 0 && progress.failedRows > 0
  const success = progress.insertedRows > 0 && progress.failedRows === 0

  return (
    <div className="flex flex-col items-center gap-6 py-8">
      {/* Icon */}
      {allFailed && <XCircle size={56} weight="fill" className="text-red-500" />}
      {partial && <Warning size={56} weight="fill" className="text-amber-500" />}
      {success && <CheckCircle size={56} weight="fill" className="text-emerald-500" />}

      {/* Message */}
      <div className="text-center">
        {allFailed && (
          <p className="text-lg font-semibold text-red-700">
            {t('accounting.import.results.failed', 'Import failed')}
          </p>
        )}
        {partial && (
          <>
            <p className="text-lg font-semibold text-amber-700">
              {t('accounting.import.results.partial', 'Partially imported')}
            </p>
            <p className="mt-1 text-sm text-black/60">
              {t(
                'accounting.import.results.partialDetail',
                'Imported {{inserted}} of {{total}} entries. {{failed}} failed.',
                {
                  inserted: progress.insertedRows,
                  total: progress.totalRows,
                  failed: progress.failedRows,
                },
              )}
            </p>
          </>
        )}
        {success && (
          <>
            <p className="text-lg font-semibold text-emerald-700">
              {t('accounting.import.results.success', 'Import complete')}
            </p>
            <p className="mt-1 text-sm text-black/60">
              {t(
                'accounting.import.results.successDetail',
                'Successfully imported {{count}} entries',
                { count: progress.insertedRows },
              )}
            </p>
          </>
        )}
      </div>

      {/* Errors list */}
      {progress.errors.length > 0 && (
        <div className="w-full max-h-[200px] overflow-auto rounded-lg border border-red-200 bg-red-50 p-4">
          <p className="mb-2 text-xs font-semibold text-red-700">Errors:</p>
          {progress.errors.slice(0, 20).map((err, idx) => (
            <p key={idx} className="text-xs text-red-600">
              Row {err.rowIndex}: {err.message}
            </p>
          ))}
          {progress.errors.length > 20 && (
            <p className="mt-2 text-xs font-medium text-red-500">
              ...and {progress.errors.length - 20} more
            </p>
          )}
        </div>
      )}

      {/* Close */}
      <Button variant="filled" onClick={onClose}>
        {t('accounting.import.close', 'Close')}
      </Button>
    </div>
  )
}
