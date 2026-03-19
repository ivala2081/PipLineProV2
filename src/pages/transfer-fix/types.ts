import type { CsvRawRow } from '@/lib/csvImport/types'

/** KASA CSV row — reuse existing CsvRawRow from the import system */
export type KasaRow = CsvRawRow

/** ORDER SATIS CSV — first deposits */
export interface OrderSatisRow {
  rowIndex: number
  donem: string
  tarih: string
  kaynak: string
  data: string
  mt: string
  ekipLideri: string
  musteriAdSoyad: string
  meta: string
  odemeTuru: string
  tutarTl: number
  tutarUsd: number
  kur: number
}

/** ORD RET DEPOSIT CSV — retention re-deposits */
export interface OrdRetDepositRow {
  rowIndex: number
  ay: string
  tarih: string
  ret: string
  kaynak: string
  data: string
  ekipLideri: string
  mt: string
  musteriAdSoyad: string
  metaId: string
  odemeTuru: string
  tutarTl: number
  tutarUsd: number
}

/** ORD WITHDRAWAL CSV — withdrawals */
export interface OrdWithdrawalRow {
  rowIndex: number
  satisKanali: string
  ay: string
  tarih: string
  ret: string
  kaynak: string
  data: string
  ekipLideri: string
  mt: string
  musteriAdSoyad: string
  metaId: string
  odemeTuru: string
  tutarTl: number
  tutarUsd: number
  kur: number
}

/** Generic sales CSV row (union of all 3 sales CSVs) */
export type SalesCsvRow = OrderSatisRow | OrdRetDepositRow | OrdWithdrawalRow

export type CsvSource = 'order-satis' | 'ord-ret-deposit' | 'ord-withdrawal'

/** Field-level note for CSV comparison */
export interface CsvFieldNote {
  field: string
  kasaValue: string
  csvValue: string
}

/** Discrepancy between KASA and a sales CSV */
export interface CsvDiscrepancy {
  type: 'missing-in-csv' | 'missing-in-kasa' | 'amount-mismatch' | 'date-mismatch'
  csvSource: CsvSource
  kasaRow?: KasaRow
  csvRow?: SalesCsvRow
  kasaAmount?: number
  csvAmount?: number
  /** Employee name from sales CSV (MT for first deposits, RET for retention/withdrawal) */
  employeeName?: string
  /** Manager / team leader from sales CSV */
  managerName?: string
  /** Field-level differences (payment method, currency, etc.) */
  fieldNotes?: CsvFieldNote[]
}

/** A system transfer row fetched from Supabase */
export interface SystemTransfer {
  id: string
  crm_id: string | null
  meta_id: string | null
  full_name: string
  transfer_date: string
  amount: number
  amount_try: number
  amount_usd: number
  commission: number
  net: number
  currency: string
  exchange_rate: number
  category_id: string | null
  type_id: string | null
  payment_method_id: string | null
  psp_id: string | null
  employee_id: string | null
  is_first_deposit: boolean
  notes: string | null
}

/** Field diff for mismatched transfers */
export interface FieldDiff {
  field: string
  kasaValue: string | number
  systemValue: string | number
}

/** Discrepancy between KASA and system transfers */
export interface SystemDiscrepancy {
  type: 'missing-in-system' | 'missing-in-kasa' | 'field-mismatch'
  kasaRow?: KasaRow
  systemRow?: SystemTransfer
  diffs?: FieldDiff[]
  action: FixAction
  /** CSV-enriched fields (from sales CSV match) */
  employeeName?: string
  managerName?: string
  csvSource?: CsvSource
  currency?: string
  paymentType?: string
}

export type FixAction = 'insert' | 'update' | 'delete' | 'skip'

/** Fix progress state */
export interface FixProgress {
  phase: 'idle' | 'running' | 'done' | 'error'
  total: number
  inserted: number
  updated: number
  deleted: number
  failed: number
  errors: Array<{ index: number; message: string }>
}

/** Selected period (year + month) */
export interface Period {
  year: number
  month: number // 1-12
}

/** All parsed CSV data (sales CSVs are pre-filtered by period) */
export interface ParsedCsvData {
  period: Period
  kasa: KasaRow[]
  kasaExchangeRates: Map<string, number>
  orderSatis: OrderSatisRow[]
  ordRetDeposit: OrdRetDepositRow[]
  ordWithdrawal: OrdWithdrawalRow[]
}

export type Step = 'upload' | 'csv-compare' | 'system-compare' | 'fix' | 'employee-assign'

/** Employee assignment: a system transfer matched to a CSV employee */
export interface EmployeeAssignment {
  transferId: string
  metaId: string
  fullName: string
  transferDate: string
  amount: number
  currency: string
  /** Employee name from sales CSV (MT or RET) */
  csvEmployeeName: string
  /** Manager name from sales CSV (EKİP LİDERİ) */
  csvManagerName: string
  /** Resolved HR employee ID (null if not found) */
  resolvedEmployeeId: string | null
  /** Resolved HR employee full name */
  resolvedEmployeeName: string | null
  /** Current employee_id on the transfer (may already be set) */
  currentEmployeeId: string | null
  /** Whether to apply this assignment */
  selected: boolean
  /** Source CSV */
  csvSource: CsvSource
}
