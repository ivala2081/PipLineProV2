import type { TransferRow } from '@/hooks/useTransfers'

/* ── Types ──────────────────────────────────────────── */

export interface DateGroup {
  dateKey: string
  label: string
  transfers: TransferRow[]
}

export interface DaySummary {
  deposits: number
  withdrawals: number
  net: number
  commission: number
  count: number
  depositCount: number
  withdrawalCount: number
  totalBank: number
  totalCreditCard: number
  totalUsd: number
  netWithCommUsd: number
  netWithoutCommUsd: number
  dayRate: number
}

/* ── Constants ──────────────────────────────────────── */

export const TH_CLASS =
  'whitespace-nowrap text-xs font-semibold uppercase tracking-wider text-black/40'

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
    const key = t.transfer_date.slice(0, 10)
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
  return transfers.filter(
    (t) => t.currency === 'USD' && !t.type?.name?.toLowerCase().includes('blocked'),
  ).length
}

/* ── Day Summary ────────────────────────────────────── */

export function computeDaySummary(transfers: TransferRow[]): DaySummary {
  // Exclude blocked transfers from all calculations
  const active = transfers.filter((t) => !t.type?.name?.toLowerCase().includes('blocked'))

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

  for (const t of active) {
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
    if (t.currency === 'USD') {
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

  return {
    deposits,
    withdrawals,
    net: deposits - withdrawals,
    commission: totalCommission,
    count: active.length,
    depositCount,
    withdrawalCount,
    totalBank,
    totalCreditCard,
    totalUsd,
    netWithoutCommUsd,
    netWithCommUsd: netWithoutCommUsd - totalCommissionUsd,
    dayRate: rateCount > 0 ? rateSum / rateCount : 0,
  }
}
