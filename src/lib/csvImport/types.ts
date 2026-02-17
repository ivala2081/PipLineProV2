import type { Currency } from '@/lib/database.types'

/** The 14 core columns extracted from each CSV data row */
export interface CsvRawRow {
  rowIndex: number
  crmId: string
  metaId: string
  fullName: string
  iban: string
  paymentMethodName: string
  company: string
  dateRaw: string
  categoryName: string
  amountRaw: string
  commissionRaw: string
  netRaw: string
  currency: string
  pspName: string
  typeName: string
}

/** A single validation issue on a row */
export interface ValidationIssue {
  field: string
  message: string
  severity: 'warning' | 'error'
}

/** A fully validated/resolved row ready for insert */
export interface ResolvedTransferRow {
  rowIndex: number
  raw: CsvRawRow

  fullName: string
  crmId: string | null
  metaId: string | null
  paymentMethodId: string | null
  categoryId: string | null
  isDeposit: boolean
  typeId: string | null
  pspId: string | null
  transferDate: string
  amount: number
  currency: Currency
  exchangeRate: number
  amountTry: number
  amountUsd: number

  issues: ValidationIssue[]
  isValid: boolean
  isDuplicate: boolean
}

/** Summary of the entire parse + validate pass */
export interface ImportParseResult {
  rows: ResolvedTransferRow[]
  exchangeRates: Map<string, number>
  totalRows: number
  validRows: number
  errorRows: number
  warningRows: number
  duplicateRows: number
}

/** Progress state during batch insert */
export interface ImportProgress {
  phase: 'idle' | 'inserting' | 'done' | 'error'
  totalRows: number
  insertedRows: number
  failedRows: number
  currentBatch: number
  totalBatches: number
  errors: Array<{ rowIndex: number; message: string }>
}
