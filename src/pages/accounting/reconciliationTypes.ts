/** A single TEYİT (verification) line-item */
export interface TeyitEntry {
  label: string
  amount: number
  currency: 'USD' | 'TL'
}

/** Per-register computed summary for reconciliation */
export interface RegisterReconciliation {
  register: 'USDT' | 'NAKIT_TL' | 'NAKIT_USD'
  devir: number
  devirIsOverride: boolean
  giren: number
  cikan: number
  net: number // giren - cikan (NOT including devir)
  usdCevrim: number // USD equivalent of net
  currency: string // display currency ('USDT' | 'TL' | 'USD')
}

/** Full reconciliation state for a given month */
export interface ReconciliationData {
  year: number
  month: number
  registers: RegisterReconciliation[]
  kur: number
  kurIsOverride: boolean
  kasaToplam: number // Σ(usdCevrim)
  beklTahs: number
  teyitEntries: TeyitEntry[]
  teyitNet: number // sum of teyit amounts in USD
  fark: number // teyitNet - kasaToplam
}

/** DB row type for accounting_monthly_config */
export interface AccountingMonthlyConfig {
  id: string
  organization_id: string
  year: number
  month: number
  devir_usdt: number | null
  devir_nakit_tl: number | null
  devir_nakit_usd: number | null
  kur: number | null
  bekl_tahs: number | null
  teyit_entries: TeyitEntry[]
  created_by: string | null
  created_at: string
  updated_at: string
}
