import { useTranslation } from 'react-i18next'
import { CurrencyDollar, Money, Coins, ArrowDown, ArrowUp } from '@phosphor-icons/react'
import type { AccountingEntry } from '@/lib/database.types'
import { Dialog, DialogContent, DialogHeader, DialogTitle, Skeleton } from '@ds'

/* ── Types ──────────────────────────────────────────── */

interface DateGroup {
  dateKey: string
  label: string
}

interface LedgerDailySummaryDialogProps {
  group: DateGroup | null
  entries: AccountingEntry[]
  isFetching: boolean
  onClose: () => void
}

/* ── Summary computation ────────────────────────────── */

interface CurrencySummary {
  currency: string
  totalIn: number
  totalOut: number
  net: number
  inCount: number
  outCount: number
}

interface RegisterSummary {
  register: string
  totalIn: number
  totalOut: number
  net: number
}

interface DaySummary {
  count: number
  inCount: number
  outCount: number
  byCurrency: CurrencySummary[]
  byRegister: RegisterSummary[]
}

function computeDaySummary(entries: AccountingEntry[]): DaySummary {
  const currencyMap = new Map<string, CurrencySummary>()
  const registerMap = new Map<string, RegisterSummary>()
  let inCount = 0
  let outCount = 0

  for (const e of entries) {
    const amount = Number(e.amount)

    // Currency aggregation
    const cs = currencyMap.get(e.currency) ?? {
      currency: e.currency,
      totalIn: 0,
      totalOut: 0,
      net: 0,
      inCount: 0,
      outCount: 0,
    }
    if (e.direction === 'in') {
      cs.totalIn += amount
      cs.inCount++
      inCount++
    } else {
      cs.totalOut += amount
      cs.outCount++
      outCount++
    }
    cs.net = cs.totalIn - cs.totalOut
    currencyMap.set(e.currency, cs)

    // Register aggregation
    const rs = registerMap.get(e.register) ?? {
      register: e.register,
      totalIn: 0,
      totalOut: 0,
      net: 0,
    }
    if (e.direction === 'in') {
      rs.totalIn += amount
    } else {
      rs.totalOut += amount
    }
    rs.net = rs.totalIn - rs.totalOut
    registerMap.set(e.register, rs)
  }

  return {
    count: entries.length,
    inCount,
    outCount,
    byCurrency: Array.from(currencyMap.values()),
    byRegister: Array.from(registerMap.values()),
  }
}

/* ── Helpers ─────────────────────────────────────────── */

function formatNumber(n: number, lang: string) {
  return n.toLocaleString(lang === 'tr' ? 'tr-TR' : 'en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })
}

const CURRENCY_SYMBOLS: Record<string, string> = {
  USDT: '$',
  USD: '$',
  TL: '₺',
}

const REGISTER_CONFIG: Record<
  string,
  { icon: typeof CurrencyDollar; label: string; accent: string }
> = {
  USDT: { icon: CurrencyDollar, label: 'USDT', accent: 'text-emerald-600' },
  NAKIT_TL: { icon: Money, label: 'Cash TL', accent: 'text-blue-600' },
  NAKIT_USD: { icon: Coins, label: 'Cash USD', accent: 'text-orange-600' },
}

/* ── Component ──────────────────────────────────────── */

export function LedgerDailySummaryDialog({
  group,
  entries,
  isFetching,
  onClose,
}: LedgerDailySummaryDialogProps) {
  const { t, i18n } = useTranslation('pages')
  const lang = i18n.language

  if (!group) return null

  const s = computeDaySummary(entries)

  // Find the primary currency total for the hero (USDT first, then USD, then TL)
  const primaryCurrency =
    s.byCurrency.find((c) => c.currency === 'USDT') ??
    s.byCurrency.find((c) => c.currency === 'USD') ??
    s.byCurrency[0]

  const heroNet = primaryCurrency?.net ?? 0
  const heroSymbol = CURRENCY_SYMBOLS[primaryCurrency?.currency ?? 'USDT'] ?? '$'

  return (
    <Dialog
      open={group !== null}
      onOpenChange={(open) => {
        if (!open) onClose()
      }}
    >
      <DialogContent size="md" className="max-h-[85vh] gap-0 overflow-y-auto p-0">
        {isFetching ? (
          <div className="px-6 py-12">
            <DialogHeader>
              <DialogTitle className="text-sm font-semibold">{group.label}</DialogTitle>
            </DialogHeader>
            <div className="mt-6 space-y-3">
              <Skeleton className="h-8 w-48 rounded-md" />
              <Skeleton className="h-4 w-32 rounded-md" />
            </div>
          </div>
        ) : (
          <>
            {/* Hero zone */}
            <div className={`px-6 pt-6 pb-5 ${heroNet >= 0 ? 'bg-green/[0.03]' : 'bg-red/[0.03]'}`}>
              <DialogHeader>
                <DialogTitle className="text-sm font-semibold">{group.label}</DialogTitle>
              </DialogHeader>
              <p className="mt-0.5 text-[12px] text-black/40">
                {t('accounting.dailySummary.entryCount', '{{count}} entries', { count: s.count })}
                {' · '}
                {t('accounting.dailySummary.inOutCount', '{{inCount}}↑ · {{outCount}}↓', {
                  inCount: s.inCount,
                  outCount: s.outCount,
                })}
              </p>

              <p
                className={`mt-4 font-mono text-[2rem] font-bold leading-none tabular-nums ${heroNet >= 0 ? 'text-green' : 'text-red'}`}
              >
                {heroNet >= 0 ? '+' : '−'}
                {formatNumber(Math.abs(heroNet), lang)}
                <span className="ml-1.5 text-sm opacity-40">{heroSymbol}</span>
              </p>
              <p className="mt-1 text-[12px] text-black/30">
                {t('accounting.dailySummary.net', 'Net')}
                {primaryCurrency && s.byCurrency.length > 1 && ` (${primaryCurrency.currency})`}
              </p>
            </div>

            {/* In / Out per currency */}
            {s.byCurrency.map((cs) => (
              <div key={cs.currency}>
                {/* Currency label */}
                <div className="border-t border-black/10 bg-black/[0.02] px-6 py-2">
                  <span className="text-[11px] font-semibold uppercase tracking-wider text-black/40">
                    {cs.currency}
                  </span>
                </div>

                <div className="grid grid-cols-2">
                  <div className="border-r border-b border-black/10 px-6 py-4">
                    <div className="flex items-center gap-1.5">
                      <div className="size-1.5 rounded-full bg-green" />
                      <span className="text-[12px] text-black/45">
                        {t('accounting.directions.in')}
                      </span>
                    </div>
                    <p className="mt-1.5 font-mono text-lg font-bold tabular-nums text-black/80">
                      {formatNumber(cs.totalIn, lang)}
                      <span className="ml-1 text-[12px] font-medium text-black/25">
                        {CURRENCY_SYMBOLS[cs.currency] ?? cs.currency}
                      </span>
                    </p>
                    <p className="mt-0.5 text-xs tabular-nums text-black/25">
                      {cs.inCount} {t('accounting.dailySummary.entries', 'entries')}
                    </p>
                  </div>
                  <div className="border-b border-black/10 px-6 py-4">
                    <div className="flex items-center gap-1.5">
                      <div className="size-1.5 rounded-full bg-red" />
                      <span className="text-[12px] text-black/45">
                        {t('accounting.directions.out')}
                      </span>
                    </div>
                    <p className="mt-1.5 font-mono text-lg font-bold tabular-nums text-black/80">
                      {formatNumber(cs.totalOut, lang)}
                      <span className="ml-1 text-[12px] font-medium text-black/25">
                        {CURRENCY_SYMBOLS[cs.currency] ?? cs.currency}
                      </span>
                    </p>
                    <p className="mt-0.5 text-xs tabular-nums text-black/25">
                      {cs.outCount} {t('accounting.dailySummary.entries', 'entries')}
                    </p>
                  </div>
                </div>

                {/* Proportion bar */}
                {(() => {
                  const vol = cs.totalIn + cs.totalOut
                  const inPct = vol > 0 ? (cs.totalIn / vol) * 100 : 50
                  return (
                    <div className="flex h-1">
                      <div className="bg-green/60" style={{ width: `${inPct}%` }} />
                      <div className="bg-red/60" style={{ width: `${100 - inPct}%` }} />
                    </div>
                  )
                })()}

                {/* Net for this currency */}
                <div className="flex items-center justify-between border-b border-black/10 px-6 py-3">
                  <span className="text-sm text-black/50">
                    {t('accounting.dailySummary.net', 'Net')}
                  </span>
                  <span
                    className={`font-mono text-sm font-bold tabular-nums ${cs.net >= 0 ? 'text-green' : 'text-red'}`}
                  >
                    {cs.net >= 0 ? '+' : '−'}
                    {formatNumber(Math.abs(cs.net), lang)}{' '}
                    {CURRENCY_SYMBOLS[cs.currency] ?? cs.currency}
                  </span>
                </div>
              </div>
            ))}

            {/* Register breakdown */}
            {s.byRegister.length > 0 && (
              <div className="px-6 py-4">
                <p className="mb-3 text-[11px] font-semibold uppercase tracking-wider text-black/40">
                  {t('accounting.dailySummary.byRegister', 'By Register')}
                </p>
                <div className="space-y-3">
                  {s.byRegister.map((rs) => {
                    const config = REGISTER_CONFIG[rs.register]
                    const Icon = config?.icon ?? Coins
                    return (
                      <div key={rs.register} className="flex items-center justify-between">
                        <div className="flex items-center gap-2.5">
                          <Icon size={16} className="text-black/30" />
                          <span className="text-sm text-black/60">
                            {config?.label ?? rs.register}
                          </span>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="flex items-center gap-1 font-mono text-xs tabular-nums text-green">
                            <ArrowUp size={10} weight="bold" />
                            {formatNumber(rs.totalIn, lang)}
                          </span>
                          <span className="flex items-center gap-1 font-mono text-xs tabular-nums text-red">
                            <ArrowDown size={10} weight="bold" />
                            {formatNumber(rs.totalOut, lang)}
                          </span>
                          <span
                            className={`font-mono text-sm font-semibold tabular-nums ${rs.net >= 0 ? 'text-green' : 'text-red'}`}
                          >
                            {rs.net >= 0 ? '+' : '−'}
                            {formatNumber(Math.abs(rs.net), lang)}
                          </span>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}
          </>
        )}
      </DialogContent>
    </Dialog>
  )
}
