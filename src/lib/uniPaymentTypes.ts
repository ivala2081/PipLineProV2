/**
 * UniPayment API Response & Entity Types
 *
 * Based on https://unipayment.readme.io (v1.0 API)
 */

/* ── Generic Response Wrappers ─────────────────────────────────────────── */

export interface UniPaymentApiResponse<T> {
  code: string // "OK" or error code
  msg: string
  data: T
}

export interface UniPaymentPaginatedData<T> {
  models: T[]
  page_no: number
  page_size: number
  total: number
  page_count: number
}

export type UniPaymentPaginatedResponse<T> = UniPaymentApiResponse<UniPaymentPaginatedData<T>>

/* ── Wallet & Account ──────────────────────────────────────────────────── */

export interface UniPaymentBalance {
  asset_type: string
  available: number
  frozen: number
  total: number
}

export interface UniPaymentAccount {
  id: string
  asset_type: string
  available: number
  frozen: number
}

export interface UniPaymentDepositAddress {
  address: string
  network: string
  tag: string | null
}

/* ── Transactions ──────────────────────────────────────────────────────── */

export interface UniPaymentTransaction {
  id: string
  account_id: string
  asset_type: string
  txn_type: string // 'deposit' | 'withdrawal' | 'invoice_payment' | 'payout' | etc.
  amount: number
  fee: number
  net_amount: number
  status: string // 'completed' | 'pending' | 'failed'
  note: string | null
  order_id: string | null
  created_at: string
  updated_at: string
}

/* ── Invoices ──────────────────────────────────────────────────────────── */

export interface UniPaymentInvoice {
  invoice_id: string
  app_id: string
  order_id: string
  price_amount: number
  price_currency: string
  pay_amount: number
  pay_currency: string
  network: string | null
  address: string | null
  status: UniPaymentInvoiceStatus
  error_status: string
  invoice_url: string
  created_at: string
  expiration_at: string
}

export type UniPaymentInvoiceStatus =
  | 'New'
  | 'Pending'
  | 'Paid'
  | 'Confirmed'
  | 'Complete'
  | 'Expired'
  | 'Invalid'

export interface CreateInvoiceParams {
  app_id?: string
  order_id: string
  price_amount: number
  price_currency: string
  pay_currency?: string
  notify_url?: string
  redirect_url?: string
  title?: string
  description?: string
  lang?: string
  ext_args?: string
}

/* ── Payments (Payouts) ────────────────────────────────────────────────── */

export interface UniPaymentPayment {
  id: string
  from_account_id: string
  to: string
  asset_type: string
  amount: number
  fee: number
  net_amount: number
  status: UniPaymentPaymentStatus
  reason: string | null
  note: string | null
  created_at: string
  updated_at: string
}

export type UniPaymentPaymentStatus = 'Pending' | 'Confirmed' | 'Complete' | 'Cancelled' | 'Failed'

export interface CreatePaymentParams {
  from_account_id: string
  to: string
  asset_type: string
  amount: number
  note?: string
}

/* ── Exchange ──────────────────────────────────────────────────────────── */

export interface UniPaymentExchangeQuote {
  quote_id: string
  from_asset: string
  to_asset: string
  from_amount: number
  to_amount: number
  rate: number
  expires_at: string
}

/* ── Sync ──────────────────────────────────────────────────────────────── */

export interface SyncResult {
  synced_count: number
  new_count: number
  errors: string[]
}

/* ── Edge Function Action Types ────────────────────────────────────────── */

export type UniPaymentAction =
  | 'getBalances'
  | 'getAccounts'
  | 'getTransactions'
  | 'getDepositAddress'
  | 'createInvoice'
  | 'queryInvoices'
  | 'getInvoice'
  | 'createPayment'
  | 'queryPayments'
  | 'getPayment'
  | 'cancelPayment'
  | 'getPaymentFee'
  | 'syncTransactions'
