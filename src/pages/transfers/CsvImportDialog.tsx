import { useState, useCallback, useRef, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import type { useLookupQueries } from '@/hooks/queries/useLookupQueries'
import { useImportTransfers } from '@/hooks/queries/useImportTransfers'
import { useOrganization } from '@/app/providers/OrganizationProvider'
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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  Button,
} from '@ds'
import { cn } from '@ds/utils'
import { Warning, Plus, SpinnerGap } from '@phosphor-icons/react'
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
  const { currentOrg } = useOrganization()
  const { importTransfers, fetchExistingTransfers, createMissingLookups } =
    useImportTransfers()

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
  const [isCreatingLookups, setIsCreatingLookups] = useState(false)
  const [lookupError, setLookupError] = useState<string | null>(null)
  const [pendingRevalidation, setPendingRevalidation] = useState(false)

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
    setLookupError(null)
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
    async (
      rows: CsvRawRow[],
      exchangeRates: Map<string, number>,
    ) => {
      // Read from ref to always get the latest lookup data (important after refetch)
      const ld = lookupDataRef.current
      const lookupMaps = buildLookupMaps(
        ld.paymentMethods,
        ld.categories,
        ld.psps,
        ld.transferTypes,
      )

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

      const validated = validateAllRows(
        rows,
        lookupMaps,
        exchangeRates,
        existingTransfers,
      )

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

  /** Create missing lookups, then schedule re-validation after data refreshes */
  const handleCreateLookups = useCallback(async () => {
    if (!missingLookups) return

    setIsCreatingLookups(true)
    setLookupError(null)

    try {
      // This awaits refetchQueries — data is in cache, but component
      // hasn't re-rendered yet. Set flag so the effect re-validates
      // after React re-renders with fresh lookupData.
      await createMissingLookups(missingLookups)

      setMissingLookups(null)
      setParseResult(null)
      setPendingRevalidation(true)
    } catch (err) {
      setLookupError(err instanceof Error ? err.message : 'Failed to create lookups')
      setIsCreatingLookups(false)
    }
  }, [missingLookups, createMissingLookups])

  // After creating lookups, React Query refetches and the component re-renders
  // with fresh lookupData. This effect picks that up and re-validates.
  useEffect(() => {
    if (!pendingRevalidation) return
    setPendingRevalidation(false)
    setIsCreatingLookups(false)
    void runValidation(rawRowsRef.current, exchangeRatesRef.current).catch(() => {
      setLookupError('Re-validation failed after creating lookups')
    })
  }, [pendingRevalidation, lookupData, runValidation])

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
          <DialogTitle>
            {t('transfers.import.title', 'Import Transfers from CSV')}
          </DialogTitle>
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
                  idx <= currentStepIndex
                    ? 'bg-black/80 text-white'
                    : 'bg-black/10 text-black/40',
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
                  className={cn(
                    'h-px w-8',
                    idx < currentStepIndex ? 'bg-black/30' : 'bg-black/10',
                  )}
                />
              )}
            </div>
          ))}
        </div>

        {/* Missing lookups banner */}
        {step === 'preview' && missingLookups?.hasMissing && (
          <MissingLookupsBanner
            missing={missingLookups}
            isCreating={isCreatingLookups}
            error={lookupError}
            onCreate={handleCreateLookups}
          />
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
        {step === 'results' && (
          <StepResults progress={progress} onClose={handleClose} />
        )}
      </DialogContent>
    </Dialog>
  )
}

/* ------------------------------------------------------------------ */
/*  Missing lookups banner                                             */
/* ------------------------------------------------------------------ */

function MissingLookupsBanner({
  missing,
  isCreating,
  error,
  onCreate,
}: {
  missing: MissingLookups
  isCreating: boolean
  error: string | null
  onCreate: () => void
}) {
  const items: string[] = []
  if (missing.paymentMethods.length > 0)
    items.push(`${missing.paymentMethods.length} payment methods (${missing.paymentMethods.join(', ')})`)
  if (missing.categories.length > 0)
    items.push(`${missing.categories.length} categories (${missing.categories.map((c) => c.name).join(', ')})`)
  if (missing.psps.length > 0)
    items.push(`${missing.psps.length} PSPs (${missing.psps.join(', ')})`)
  if (missing.types.length > 0)
    items.push(`${missing.types.length} types (${missing.types.join(', ')})`)

  return (
    <div className="rounded-lg border border-amber-200 bg-amber-50 p-4">
      <div className="flex items-start gap-3">
        <Warning size={20} weight="fill" className="mt-0.5 shrink-0 text-amber-500" />
        <div className="flex-1">
          <p className="text-sm font-medium text-amber-800">
            Missing lookup entries detected
          </p>
          <p className="mt-1 text-xs text-amber-700">
            The CSV references values that don't exist in your system yet:
          </p>
          <ul className="mt-2 space-y-1">
            {items.map((item, idx) => (
              <li key={idx} className="text-xs text-amber-700">
                &bull; {item}
              </li>
            ))}
          </ul>
          {error && (
            <p className="mt-2 text-xs font-medium text-red-600">{error}</p>
          )}
          <Button
            variant="filled"
            size="sm"
            className="mt-3"
            onClick={onCreate}
            disabled={isCreating}
          >
            {isCreating ? (
              <>
                <SpinnerGap size={14} className="animate-spin" />
                Creating...
              </>
            ) : (
              <>
                <Plus size={14} weight="bold" />
                Create missing entries & re-validate
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  )
}
