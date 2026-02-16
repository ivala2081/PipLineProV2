import { useState, useCallback, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import type { useLookupQueries } from '@/hooks/queries/useLookupQueries'
import { useImportTransfers } from '@/hooks/queries/useImportTransfers'
import {
  buildLookupMaps,
  validateAllRows,
  detectMissingLookups,
} from '@/lib/csvImport/validateRows'
import type { MissingLookups } from '@/lib/csvImport/validateRows'
import type {
  CsvRawRow,
  ResolvedTransferRow,
  ImportParseResult,
  ImportProgress,
} from '@/lib/csvImport/types'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@ds'
import { cn } from '@ds/utils'
import { Warning } from '@phosphor-icons/react'
import { StepUpload } from './import/StepUpload'
import { StepPreview } from './import/StepPreview'
import { StepImport } from './import/StepImport'
import { StepResults } from './import/StepResults'

type ImportStep = 'upload' | 'preview' | 'import' | 'results'

interface CsvImportDialogProps {
  open: boolean
  onClose: () => void
  lookupData: ReturnType<typeof useLookupQueries>
}

const STEPS: ImportStep[] = ['upload', 'preview', 'import', 'results']
const STEP_LABELS = ['Upload', 'Preview', 'Import', 'Results']

export function CsvImportDialog({ open, onClose, lookupData }: CsvImportDialogProps) {
  const { t } = useTranslation('pages')
  const { importTransfers, fetchExistingTransfers } = useImportTransfers()

  const [step, setStep] = useState<ImportStep>('upload')
  const [parseResult, setParseResult] = useState<ImportParseResult | null>(null)
  const [progress, setProgress] = useState<ImportProgress>({
    phase: 'idle',
    totalRows: 0,
    insertedRows: 0,
    failedRows: 0,
    currentBatch: 0,
    totalBatches: 0,
    errors: [],
  })

  // Missing lookups state
  const [missingLookups, setMissingLookups] = useState<MissingLookups | null>(null)

  // Keep raw rows + exchange rates for re-validation after creating lookups
  const rawRowsRef = useRef<CsvRawRow[]>([])
  const exchangeRatesRef = useRef<Map<string, number>>(new Map())

  // Ref for lookupData so runValidation always reads the latest after refetch
  const lookupDataRef = useRef(lookupData)
  lookupDataRef.current = lookupData

  const handleClose = () => {
    if (step === 'import') return
    setStep('upload')
    setParseResult(null)
    setMissingLookups(null)
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

  /** Build lookup maps and validate rows */
  const runValidation = useCallback(
    async (rows: CsvRawRow[], exchangeRates: Map<string, number>) => {
      // Read from ref to always get the latest lookup data (important after refetch)
      const ld = lookupDataRef.current
      const lookupMaps = buildLookupMaps(ld.paymentMethods, ld.categories, ld.transferTypes)

      // Detect missing lookups
      const missing = detectMissingLookups(rows, lookupMaps)
      setMissingLookups(missing)

      // Fetch existing transfers for duplicate detection
      let existingTransfers: Awaited<ReturnType<typeof fetchExistingTransfers>> = []
      if (rows.length > 0) {
        const dates = rows
          .map((r) => {
            const parts = r.dateRaw.trim().split('.')
            if (parts.length !== 3) return null
            return `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`
          })
          .filter(Boolean) as string[]

        if (dates.length > 0) {
          const from = dates.reduce((a, b) => (a < b ? a : b))
          const to = dates.reduce((a, b) => (a > b ? a : b))
          try {
            existingTransfers = await fetchExistingTransfers({ from, to })
          } catch {
            // skip duplicate detection
          }
        }
      }

      const validated = validateAllRows(rows, lookupMaps, exchangeRates, existingTransfers)

      setParseResult(validated)
      setStep('preview')
    },
    [fetchExistingTransfers],
  )

  /** Step 1 → Step 2: file parsed, now validate */
  const handleParsed = useCallback(
    async (result: { rows: CsvRawRow[]; exchangeRates: Map<string, number> }) => {
      rawRowsRef.current = result.rows
      exchangeRatesRef.current = result.exchangeRates
      await runValidation(result.rows, result.exchangeRates)
    },
    [runValidation],
  )

  /** Step 2 → Step 3: user confirmed, start importing */
  const handleConfirm = useCallback(
    async (rows: ResolvedTransferRow[]) => {
      setStep('import')
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
        const result = await importTransfers({
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
    [importTransfers],
  )

  const currentStepIndex = STEPS.indexOf(step)

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent
        size="xl"
        className="max-h-[90vh] overflow-y-auto"
        onInteractOutside={(e) => {
          if (step === 'import') e.preventDefault()
        }}
      >
        <DialogHeader>
          <DialogTitle>{t('transfers.import.title', 'Import Transfers from CSV')}</DialogTitle>
          <DialogDescription>
            {t(
              'transfers.import.subtitle',
              'Upload a Google Sheets CSV export to bulk-import transfer records',
            )}
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
                {STEP_LABELS[idx]}
              </span>
              {idx < STEPS.length - 1 && (
                <div
                  className={cn('h-px w-8', idx < currentStepIndex ? 'bg-black/30' : 'bg-black/10')}
                />
              )}
            </div>
          ))}
        </div>

        {/* Missing lookups banner */}
        {step === 'preview' && missingLookups?.hasMissing && (
          <MissingLookupsBanner missing={missingLookups} />
        )}

        {/* Step content */}
        {step === 'upload' && <StepUpload onParsed={handleParsed} />}
        {step === 'preview' && parseResult && (
          <StepPreview
            parseResult={parseResult}
            onConfirm={handleConfirm}
            onBack={() => {
              setStep('upload')
              setParseResult(null)
              setMissingLookups(null)
            }}
          />
        )}
        {step === 'import' && <StepImport progress={progress} />}
        {step === 'results' && <StepResults progress={progress} onClose={handleClose} />}
      </DialogContent>
    </Dialog>
  )
}

/* ------------------------------------------------------------------ */
/*  Missing lookups banner                                             */
/* ------------------------------------------------------------------ */

function MissingLookupsBanner({ missing }: { missing: MissingLookups }) {
  const invalidValues: Array<{ type: string; values: string[] }> = []

  if (missing.paymentMethods.length > 0) {
    invalidValues.push({
      type: 'Payment Methods',
      values: missing.paymentMethods,
    })
  }
  if (missing.categories.length > 0) {
    invalidValues.push({
      type: 'Categories',
      values: missing.categories.map((c) => c.name),
    })
  }
  if (missing.types.length > 0) {
    invalidValues.push({
      type: 'Transfer Types',
      values: missing.types,
    })
  }

  return (
    <div className="rounded-lg border border-red-200 bg-red-50 p-4">
      <div className="flex items-start gap-3">
        <Warning size={20} weight="fill" className="mt-0.5 shrink-0 text-red-500" />
        <div className="flex-1">
          <p className="text-sm font-medium text-red-800">Invalid lookup values in CSV</p>
          <p className="mt-1 text-xs text-red-700">
            Your CSV file contains values that don't match the system's fixed lookup tables. Please
            update your CSV file to use the valid values listed below:
          </p>

          <div className="mt-3 space-y-2">
            {invalidValues.map((item, idx) => (
              <div key={idx} className="text-xs">
                <p className="font-medium text-red-800">
                  Invalid {item.type}: <span className="font-normal">{item.values.join(', ')}</span>
                </p>
              </div>
            ))}
          </div>

          <div className="mt-3 space-y-2 border-t border-red-200 pt-3">
            <p className="text-xs font-medium text-red-800">Valid values:</p>
            <div className="space-y-1 text-xs text-red-700">
              <p>
                <span className="font-medium">Categories:</span> DEP (deposit), WD (withdrawal)
              </p>
              <p>
                <span className="font-medium">Payment Methods:</span> Bank, Credit Card, Tether
              </p>
              <p>
                <span className="font-medium">Transfer Types:</span> Client, Payment, Blocked
              </p>
            </div>
          </div>

          <p className="mt-3 text-xs font-medium text-red-800">
            ⚠️ These values are fixed and cannot be modified. Please correct your CSV file and try
            again.
          </p>
        </div>
      </div>
    </div>
  )
}
