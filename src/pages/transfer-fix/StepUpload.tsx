import { useRef, useState, useCallback } from 'react'
import { UploadSimple, File, Warning, CheckCircle } from '@phosphor-icons/react'
import { Button } from '@ds'
import { cn } from '@ds/utils'
import { parseCsvFile } from '@/lib/csvImport/parseCsv'
import type { CsvRawRow } from '@/lib/csvImport/types'
import {
  parseOrderSatisCsv,
  parseOrdRetDepositCsv,
  parseOrdWithdrawalCsv,
  filterOrderSatisByPeriod,
  filterOrdRetDepositByPeriod,
  filterOrdWithdrawalByPeriod,
} from './parsers'
import type { ParsedCsvData, Period } from './types'

interface StepUploadProps {
  onComplete: (data: ParsedCsvData) => void
}

type CsvType = 'kasa' | 'orderSatis' | 'ordRetDeposit' | 'ordWithdrawal'

interface CsvFileState {
  fileName: string | null
  rowCount: number
  filteredCount?: number
  error: string | null
  parsed: boolean
}

const CSV_CONFIG: Record<CsvType, { label: string; description: string }> = {
  kasa: { label: 'KASA CSV', description: 'Ana kaynak dosya' },
  orderSatis: { label: 'ORDER SATIS CSV', description: 'İlk yatırımlar (first deposits)' },
  ordRetDeposit: {
    label: 'ORD RET DEPOSIT CSV',
    description: 'Retention tekrar yatırımlar',
  },
  ordWithdrawal: { label: 'ORD WITHDRAWAL CSV', description: 'Çekimler' },
}

const MONTHS = [
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

const now = new Date()

export function StepUpload({ onComplete }: StepUploadProps) {
  const [period, setPeriod] = useState<Period>({
    year: now.getFullYear(),
    month: now.getMonth() + 1,
  })

  const [files, setFiles] = useState<Record<CsvType, CsvFileState>>({
    kasa: { fileName: null, rowCount: 0, error: null, parsed: false },
    orderSatis: { fileName: null, rowCount: 0, error: null, parsed: false },
    ordRetDeposit: { fileName: null, rowCount: 0, error: null, parsed: false },
    ordWithdrawal: { fileName: null, rowCount: 0, error: null, parsed: false },
  })

  const kasaRowsRef = useRef<CsvRawRow[]>([])
  const kasaRatesRef = useRef<Map<string, number>>(new Map())
  const orderSatisRef = useRef<ReturnType<typeof parseOrderSatisCsv>>([])
  const ordRetRef = useRef<ReturnType<typeof parseOrdRetDepositCsv>>([])
  const ordWdRef = useRef<ReturnType<typeof parseOrdWithdrawalCsv>>([])

  const allParsed = Object.values(files).every((f) => f.parsed)

  const processFile = useCallback((csvType: CsvType, file: globalThis.File) => {
    if (!file.name.endsWith('.csv')) {
      setFiles((prev) => ({
        ...prev,
        [csvType]: {
          fileName: file.name,
          rowCount: 0,
          error: 'Sadece .csv dosya yükleyin',
          parsed: false,
        },
      }))
      return
    }

    const reader = new FileReader()
    reader.onload = (e) => {
      const text = e.target?.result as string
      try {
        let rowCount = 0
        switch (csvType) {
          case 'kasa': {
            const result = parseCsvFile(text)
            kasaRowsRef.current = result.rows
            kasaRatesRef.current = result.exchangeRates
            rowCount = result.rows.length
            break
          }
          case 'orderSatis': {
            const rows = parseOrderSatisCsv(text)
            orderSatisRef.current = rows
            rowCount = rows.length
            break
          }
          case 'ordRetDeposit': {
            const rows = parseOrdRetDepositCsv(text)
            ordRetRef.current = rows
            rowCount = rows.length
            break
          }
          case 'ordWithdrawal': {
            const rows = parseOrdWithdrawalCsv(text)
            ordWdRef.current = rows
            rowCount = rows.length
            break
          }
        }
        setFiles((prev) => ({
          ...prev,
          [csvType]: { fileName: file.name, rowCount, error: null, parsed: true },
        }))
      } catch (err) {
        setFiles((prev) => ({
          ...prev,
          [csvType]: {
            fileName: file.name,
            rowCount: 0,
            error: err instanceof Error ? err.message : 'Parse hatası',
            parsed: false,
          },
        }))
      }
    }
    reader.readAsText(file, 'utf-8')
  }, [])

  const handleCompare = () => {
    // Filter sales CSVs by selected period
    const filteredOrderSatis = filterOrderSatisByPeriod(orderSatisRef.current, period)
    const filteredOrdRet = filterOrdRetDepositByPeriod(ordRetRef.current, period)
    const filteredOrdWd = filterOrdWithdrawalByPeriod(ordWdRef.current, period)

    onComplete({
      period,
      kasa: kasaRowsRef.current,
      kasaExchangeRates: kasaRatesRef.current,
      orderSatis: filteredOrderSatis,
      ordRetDeposit: filteredOrdRet,
      ordWithdrawal: filteredOrdWd,
    })
  }

  // Preview filtered counts
  const getFilteredCount = (csvType: CsvType): number | undefined => {
    if (!files[csvType].parsed) return undefined
    switch (csvType) {
      case 'orderSatis':
        return filterOrderSatisByPeriod(orderSatisRef.current, period).length
      case 'ordRetDeposit':
        return filterOrdRetDepositByPeriod(ordRetRef.current, period).length
      case 'ordWithdrawal':
        return filterOrdWithdrawalByPeriod(ordWdRef.current, period).length
      default:
        return undefined
    }
  }

  return (
    <div className="space-y-lg">
      {/* Period selector */}
      <div className="flex items-center gap-3 rounded-xl border bg-bg1 p-md">
        <span className="text-sm font-medium text-primary">Dönem:</span>
        <select
          value={period.month}
          onChange={(e) => setPeriod((p) => ({ ...p, month: Number(e.target.value) }))}
          className="rounded-lg border bg-bg1 px-3 py-1.5 text-sm text-primary"
        >
          {MONTHS.map((name, i) => (
            <option key={i} value={i + 1}>
              {name}
            </option>
          ))}
        </select>
        <select
          value={period.year}
          onChange={(e) => setPeriod((p) => ({ ...p, year: Number(e.target.value) }))}
          className="rounded-lg border bg-bg1 px-3 py-1.5 text-sm text-primary"
        >
          {[2024, 2025, 2026, 2027].map((y) => (
            <option key={y} value={y}>
              {y}
            </option>
          ))}
        </select>
        <span className="text-xs text-muted ml-2">
          Satış CSV'leri sadece bu döneme göre filtrelenir
        </span>
      </div>

      <div className="grid grid-cols-2 gap-md">
        {(Object.keys(CSV_CONFIG) as CsvType[]).map((csvType) => (
          <DropZone
            key={csvType}
            csvType={csvType}
            config={CSV_CONFIG[csvType]}
            state={files[csvType]}
            filteredCount={getFilteredCount(csvType)}
            onFile={(file) => processFile(csvType, file)}
          />
        ))}
      </div>

      <div className="flex justify-end">
        <Button variant="filled" disabled={!allParsed} onClick={handleCompare}>
          Karşılaştır
        </Button>
      </div>
    </div>
  )
}

function DropZone({
  config,
  state,
  filteredCount,
  onFile,
}: {
  csvType: CsvType
  config: { label: string; description: string }
  state: CsvFileState
  filteredCount?: number
  onFile: (file: globalThis.File) => void
}) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [isDragging, setIsDragging] = useState(false)

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      setIsDragging(false)
      const file = e.dataTransfer.files[0]
      if (file) onFile(file)
    },
    [onFile],
  )

  return (
    <div
      className={cn(
        'relative flex flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed p-lg transition-colors cursor-pointer',
        isDragging && 'border-brand bg-brand/5',
        state.parsed && 'border-green-500 bg-green-500/5',
        state.error && 'border-red-500 bg-red-500/5',
        !isDragging && !state.parsed && !state.error && 'border-border hover:border-muted',
      )}
      onDragOver={(e) => {
        e.preventDefault()
        setIsDragging(true)
      }}
      onDragLeave={() => setIsDragging(false)}
      onDrop={handleDrop}
      onClick={() => inputRef.current?.click()}
    >
      <input
        ref={inputRef}
        type="file"
        accept=".csv"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0]
          if (file) onFile(file)
        }}
      />

      {state.parsed ? (
        <CheckCircle className="h-8 w-8 text-green-500" weight="duotone" />
      ) : state.error ? (
        <Warning className="h-8 w-8 text-red-500" weight="duotone" />
      ) : (
        <UploadSimple className="h-8 w-8 text-muted" weight="duotone" />
      )}

      <div className="text-center">
        <p className="text-sm font-semibold text-primary">{config.label}</p>
        <p className="text-xs text-muted">{config.description}</p>
      </div>

      {state.fileName && (
        <div className="flex flex-col items-center gap-0.5 text-xs text-muted">
          <div className="flex items-center gap-1">
            <File className="h-3.5 w-3.5" />
            <span>{state.fileName}</span>
            {state.parsed && (
              <span className="text-green-600 font-medium">({state.rowCount} satır)</span>
            )}
          </div>
          {filteredCount != null && (
            <span className="text-blue-600 font-medium">Dönem filtresi: {filteredCount} satır</span>
          )}
        </div>
      )}

      {state.error && <p className="text-xs text-red-500 text-center">{state.error}</p>}
    </div>
  )
}
