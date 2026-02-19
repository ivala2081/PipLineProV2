import { useRef, useState, useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import { UploadSimple, File, Warning } from '@phosphor-icons/react'
import { Button } from '@ds'
import { cn } from '@ds/utils'
import { parseCsvFile } from '@/lib/csvImport/parseCsv'
import type { CsvRawRow } from '@/lib/csvImport/types'

interface StepUploadProps {
  onParsed: (result: { rows: CsvRawRow[]; exchangeRates: Map<string, number> }) => void
}

export function StepUpload({ onParsed }: StepUploadProps) {
  const { t } = useTranslation('pages')
  const inputRef = useRef<HTMLInputElement>(null)
  const [isDragging, setIsDragging] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [fileName, setFileName] = useState<string | null>(null)
  const [rowCount, setRowCount] = useState(0)
  const [rateCount, setRateCount] = useState(0)
  const [parsed, setParsed] = useState(false)
  const [parseResult, setParseResult] = useState<{
    rows: CsvRawRow[]
    exchangeRates: Map<string, number>
  } | null>(null)

  const processFile = useCallback(
    (file: globalThis.File) => {
      setError(null)
      setParsed(false)

      if (!file.name.endsWith('.csv')) {
        setError(t('transfers.import.upload.parseError', 'Please select a .csv file'))
        return
      }

      setFileName(file.name)

      const reader = new FileReader()
      reader.onload = (e) => {
        const text = e.target?.result as string
        try {
          const result = parseCsvFile(text)
          setRowCount(result.rows.length)
          setRateCount(result.exchangeRates.size)
          setParsed(true)
          setParseResult(result)
        } catch (err) {
          setError(
            err instanceof Error
              ? err.message
              : t('transfers.import.upload.parseError', 'Failed to parse CSV file'),
          )
        }
      }
      reader.onerror = () => {
        setError(t('transfers.import.upload.parseError', 'Failed to read file'))
      }
      reader.readAsText(file, 'utf-8')
    },
    [t],
  )

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(true)
  }

  const handleDragLeave = () => {
    setIsDragging(false)
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
    const file = e.dataTransfer.files[0]
    if (file) processFile(file)
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) processFile(file)
  }

  const handleNext = () => {
    if (parseResult) onParsed(parseResult)
  }

  return (
    <div className="flex flex-col items-center gap-lg py-4">
      {/* Drop zone */}
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={cn(
          'flex w-full flex-col items-center justify-center gap-sm rounded-xl border-2 border-dashed p-12 transition-colors',
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
            {t('transfers.import.upload.dropzone', 'Drop a CSV file here, or click to browse')}
          </p>
          <p className="mt-1 text-xs text-black/40">
            {t('transfers.import.upload.hint', 'Google Sheets CSV export format (.csv)')}
          </p>
        </div>
      </button>

      <input
        ref={inputRef}
        type="file"
        accept=".csv"
        className="hidden"
        onChange={handleInputChange}
      />

      {/* File info */}
      {fileName && !error && (
        <div className="flex w-full items-center gap-sm rounded-lg border border-black/10 bg-black/[0.02] px-4 py-3">
          <File size={20} className="text-black/40" />
          <div className="flex-1">
            <p className="text-sm font-medium text-black/80">{fileName}</p>
            <p className="text-xs text-black/50">
              {rowCount} rows detected &middot; {rateCount} exchange rates found
            </p>
          </div>
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="flex w-full items-start gap-sm rounded-lg border border-red-200 bg-red-50 px-4 py-3">
          <Warning size={20} className="mt-0.5 shrink-0 text-red-500" />
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}

      {/* Next button */}
      <div className="flex w-full justify-end">
        <Button variant="filled" onClick={handleNext} disabled={!parsed}>
          {t('transfers.import.steps.preview', 'Preview')} &rarr;
        </Button>
      </div>
    </div>
  )
}
