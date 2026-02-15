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

export function formatNumber(n: number, lang: string = 'tr') {
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

/* ── Day Summary ────────────────────────────────────── */

export function computeDaySummary(transfers: TransferRow[]): DaySummary {
  // Exclude blocked transfers from all calculations
  const active = transfers.filter(
    (t) => !t.type?.name?.toLowerCase().includes('blocked'),
  )

  let deposits = 0
  let withdrawals = 0
  let commission = 0
  let depositCount = 0
  let withdrawalCount = 0
  let totalBank = 0
  let totalCreditCard = 0
  let totalUsd = 0
  let netWithoutCommUsd = 0
  let commissionUsd = 0
  let rateSum = 0
  let rateCount = 0

  for (const t of active) {
    const tryAmount = Math.abs(t.amount_try ?? 0)
    const commTry =
      t.currency === 'USD' ? t.commission * (t.exchange_rate ?? 1) : t.commission
    const rate = t.exchange_rate ?? 1

    if (t.category?.is_deposit) {
      deposits += tryAmount
      depositCount++
    } else {
      withdrawals += tryAmount
      withdrawalCount++
    }
    commission += commTry

    const method = t.payment_method?.name?.toLowerCase() ?? ''
    if (method.includes('bank')) totalBank += tryAmount
    if (method.includes('credit')) totalCreditCard += tryAmount
    if (t.currency === 'USD') totalUsd += Math.abs(t.amount ?? 0)

    netWithoutCommUsd += t.amount_usd ?? 0
    commissionUsd += t.currency === 'USD' ? t.commission : t.commission / rate

    if (rate > 0) {
      rateSum += rate
      rateCount++
    }
  }

  return {
    deposits,
    withdrawals,
    net: deposits - withdrawals,
    commission,
    count: active.length,
    depositCount,
    withdrawalCount,
    totalBank,
    totalCreditCard,
    totalUsd,
    netWithoutCommUsd,
    netWithCommUsd: netWithoutCommUsd - commissionUsd,
    dayRate: rateCount > 0 ? rateSum / rateCount : 0,
  }
}
