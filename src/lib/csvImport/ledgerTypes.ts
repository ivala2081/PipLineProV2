/** A single validation issue on a ledger row */
export interface LedgerValidationIssue {
  field: string
  message: string
  severity: 'warning' | 'error'
}

/** A parsed and validated ledger row ready for insert */
export interface LedgerParsedRow {
  rowIndex: number
  description: string
  entryType: 'ODEME' | 'TRANSFER'
  direction: 'in' | 'out'
  amount: number
  currency: 'TL' | 'USD' | 'USDT'
  costPeriod: string
  entryDate: string
  paymentPeriod: string
  register: 'USDT' | 'NAKIT_TL' | 'NAKIT_USD'
  issues: LedgerValidationIssue[]
  isValid: boolean
}

/** Summary of the entire parse + validate pass */
export interface LedgerImportParseResult {
  rows: LedgerParsedRow[]
  totalRawRows: number
  validRows: number
  errorRows: number
  warningRows: number
}

/** Progress state during batch insert */
export interface LedgerImportProgress {
  phase: 'idle' | 'inserting' | 'done' | 'error'
  totalRows: number
  insertedRows: number
  failedRows: number
  currentBatch: number
  totalBatches: number
  errors: Array<{ rowIndex: number; message: string }>
}
