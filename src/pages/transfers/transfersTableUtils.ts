import type { TransferRow } from '@/hooks/useTransfers'
import { localYMD } from '@/lib/date'

/* ── Types ──────────────────────────────────────────── */

export interface DateGroup {
  dateKey: string
  label: string
  transfers: TransferRow[]
}

export interface PaymentSummary {
  count: number
  totalTry: number
  depositCount: number
  withdrawalCount: number
  totalDeposits: number
  totalWithdrawals: number
  net: number
}

export interface DaySummary {
  deposits: number
  withdrawals: number
  net: number
  commission: number
  commissionUsd: number
  count: number
  depositCount: number
  withdrawalCount: number
  totalBank: number
  totalCreditCard: number
  totalUsd: number
  netWithCommUsd: number
  netWithoutCommUsd: number
  dayRate: number
  payment: PaymentSummary
}

/* ── Type detection helpers ─────────────────────────── */

export function isBlockedType(typeName: string): boolean {
  const n = typeName.toLowerCase()
  return n.includes('blocked') || n.includes('bloke')
}

export function isPaymentType(typeName: string): boolean {
  const n = typeName.toLowerCase()
  return n.includes('payment') || n.includes('ödeme') || n.includes('odeme')
}

/* ── Locale helpers ─────────────────────────────────── */

function toLocale(lang: string) {
  return lang === 'tr' ? 'tr-TR' : 'en-US'
}

export function formatTime(dateStr: string, lang: string) {
  return new Date(dateStr).toLocaleTimeString(toLocale(lang), {
    hour: '2-digit',
    minute: '2-digit',
  })
}

export function formatDate(dateStr: string, lang: string) {
  const locale = toLocale(lang)
  const d = new Date(dateStr)
  const date = d.toLocaleDateString(locale, {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  })
  const time = d.toLocaleTimeString(locale, {
    hour: '2-digit',
    minute: '2-digit',
  })
  return { date, time }
}

export function formatNumber(n: number | undefined | null, lang: string = 'tr') {
  if (n === undefined || n === null) return '0.00'
  return n.toLocaleString(toLocale(lang), {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })
}

/* ── Grouping ───────────────────────────────────────── */

export function groupByDate(transfers: TransferRow[], lang: string): DateGroup[] {
  const map = new Map<string, TransferRow[]>()
  for (const t of transfers) {
    const key = localYMD(new Date(t.transfer_date))
    const arr = map.get(key) ?? []
    arr.push(t)
    map.set(key, arr)
  }
  const locale = toLocale(lang)
  return Array.from(map, ([dateKey, items]) => ({
    dateKey,
    label: new Date(dateKey + 'T00:00:00').toLocaleDateString(locale, {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
      weekday: 'long',
    }),
    transfers: items,
  }))
}

/* ── USD helpers ────────────────────────────────────── */

export function countUsdTransfers(transfers: TransferRow[]): number {
  return transfers.filter((t) => {
    if (t.currency !== 'USDT') return false
    const typeName = t.type?.name?.toLowerCase() ?? ''
    return !isBlockedType(typeName) && !isPaymentType(typeName)
  }).length
}

/* ── Day Summary ────────────────────────────────────── */

export function computeDaySummary(transfers: TransferRow[]): DaySummary {
  // Exclude blocked transfers from all calculations (mirrors SQL is_excluded flag)
  const nonBlocked = transfers.filter((t) => {
    const typeName = t.type?.name?.toLowerCase() ?? ''
    return !isBlockedType(typeName)
  })

  // Split into client and payment transfers
  const clientTransfers = nonBlocked.filter(
    (t) => !isPaymentType(t.type?.name?.toLowerCase() ?? ''),
  )
  const paymentTransfers = nonBlocked.filter((t) =>
    isPaymentType(t.type?.name?.toLowerCase() ?? ''),
  )

  // ── Client transfer aggregation (drives net cash / revenue) ──
  let deposits = 0
  let withdrawals = 0
  let totalCommission = 0
  let totalCommissionUsd = 0
  let depositCount = 0
  let withdrawalCount = 0
  let totalBank = 0
  let totalCreditCard = 0
  let totalUsd = 0
  let netWithoutCommUsd = 0
  let rateSum = 0
  let rateCount = 0

  for (const t of clientTransfers) {
    const tryAmount = Math.abs(t.amount_try ?? 0)
    const rate = t.exchange_rate ?? 1
    // Commission only applies to deposits
    const isDeposit = t.category?.is_deposit ?? false
    const commissionRate = isDeposit ? (t.psp?.commission_rate ?? 0) : 0
    const commissionTry = Math.round(tryAmount * commissionRate * 100) / 100
    const commissionUsd = rate > 0 ? Math.round((commissionTry / rate) * 100) / 100 : 0

    totalCommission += commissionTry

    if (isDeposit) {
      deposits += tryAmount
      depositCount++
    } else {
      withdrawals += tryAmount
      withdrawalCount++
    }

    const method = t.payment_method?.name?.toLowerCase() ?? ''
    if (method.includes('bank')) totalBank += isDeposit ? tryAmount : -tryAmount
    if (method.includes('credit')) totalCreditCard += isDeposit ? tryAmount : -tryAmount
    if (t.currency === 'USDT') {
      const usdAmt = Math.abs(t.amount ?? 0)
      totalUsd += t.category?.is_deposit ? usdAmt : -usdAmt
    }

    netWithoutCommUsd += t.amount_usd ?? 0
    totalCommissionUsd += commissionUsd

    if (rate > 0) {
      rateSum += rate
      rateCount++
    }
  }

  // ── Payment transfer aggregation (separate section) ──
  let pmtDeposits = 0
  let pmtWithdrawals = 0
  let pmtDepositCount = 0
  let pmtWithdrawalCount = 0
  let pmtTotalTry = 0

  for (const t of paymentTransfers) {
    const tryAmount = Math.abs(t.amount_try ?? 0)
    const isDeposit = t.category?.is_deposit ?? false
    pmtTotalTry += tryAmount
    if (isDeposit) {
      pmtDeposits += tryAmount
      pmtDepositCount++
    } else {
      pmtWithdrawals += tryAmount
      pmtWithdrawalCount++
    }
  }

  return {
    deposits,
    withdrawals,
    net: deposits - withdrawals,
    commission: totalCommission,
    commissionUsd: totalCommissionUsd,
    count: clientTransfers.length,
    depositCount,
    withdrawalCount,
    totalBank,
    totalCreditCard,
    totalUsd,
    netWithoutCommUsd,
    netWithCommUsd: netWithoutCommUsd - totalCommissionUsd,
    dayRate: rateCount > 0 ? rateSum / rateCount : 0,
    payment: {
      count: paymentTransfers.length,
      totalTry: pmtTotalTry,
      depositCount: pmtDepositCount,
      withdrawalCount: pmtWithdrawalCount,
      totalDeposits: pmtDeposits,
      totalWithdrawals: pmtWithdrawals,
      net: pmtDeposits - pmtWithdrawals,
    },
  }
}
