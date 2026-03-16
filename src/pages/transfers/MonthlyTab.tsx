import { useState, useRef, useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import { useQueryClient } from '@tanstack/react-query'
import {
  CaretLeft,
  CaretRight,
  ArrowUp,
  ArrowDown,
  CurrencyDollar,
  Bank,
  CreditCard,
  Coins,
  HashStraight,
  ChartBar,
  TrendUp,
  TrendDown,
  CalendarBlank,
  Lightning,
  ChartLine,
  Equals,
  PencilSimple,
  Check,
  X,
} from '@phosphor-icons/react'
import { useMonthlyAnalysisQuery } from '@/hooks/queries/useMonthlyAnalysisQuery'
import { useOrganization } from '@/app/providers/OrganizationProvider'
import { supabase } from '@/lib/supabase'
import { queryKeys } from '@/lib/queryKeys'
import { MonthlyCharts } from './MonthlyCharts'
import { PinDialog } from './PinDialog'
import { Button, Skeleton, EmptyState } from '@ds'

function formatNumber(n: number, lang: string) {
  return n.toLocaleString(lang === 'tr' ? 'tr-TR' : 'en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })
}

function formatCompactNumber(n: number, lang: string) {
  return n.toLocaleString(lang === 'tr' ? 'tr-TR' : 'en-US', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  })
}

/* ── Change badge ─────────────────────────────────── */

function ChangeBadge({
  current,
  previous,
  t,
}: {
  current: number
  previous: number | undefined
  t: (key: string) => string
}) {
  if (previous === undefined || previous === null) {
    return (
      <span className="mt-1 inline-flex items-center gap-0.5 text-[10px] text-black/25">
        {t('transfers.monthly.noPrevData')}
      </span>
    )
  }

  if (previous === 0 && current === 0) {
    return (
      <span className="mt-1 inline-flex items-center gap-0.5 text-[10px] text-black/25">
        <Equals size={10} />
        {t('transfers.monthly.noChange')}
      </span>
    )
  }

  if (previous === 0) {
    return (
      <span className="mt-1 inline-flex items-center gap-0.5 text-[10px] text-green">
        <TrendUp size={10} weight="bold" />
        {t('transfers.monthly.noPrevData')}
      </span>
    )
  }

  const pctChange = ((current - previous) / previous) * 100
  const isUp = pctChange > 0
  const isDown = pctChange < 0

  if (Math.abs(pctChange) < 0.1) {
    return (
      <span className="mt-1 inline-flex items-center gap-0.5 text-[10px] text-black/25">
        <Equals size={10} />
        {t('transfers.monthly.noChange')}
      </span>
    )
  }

  return (
    <span
      className={`mt-1 inline-flex items-center gap-0.5 text-[10px] font-medium ${
        isUp ? 'text-green' : isDown ? 'text-red' : 'text-black/25'
      }`}
    >
      {isUp ? <TrendUp size={10} weight="bold" /> : <TrendDown size={10} weight="bold" />}
      {isUp ? '+' : ''}
      {pctChange.toFixed(1)}%
    </span>
  )
}

/* ── KPI Card ──────────────────────────────────────── */

interface KpiBreakdownItem {
  label: string
  icon: React.ElementType
  valueUsd: number
}

function KpiCard({
  label,
  icon: Icon,
  valueTry,
  valueUsd,
  prevValueTry,
  prevValueUsd,
  suffix,
  color = 'neutral',
  lang,
  t,
  primaryCurrency = 'try',
  breakdown,
}: {
  label: string
  icon: React.ElementType
  valueTry?: number
  valueUsd?: number
  prevValueTry?: number
  prevValueUsd?: number
  suffix?: string
  color?: 'green' | 'red' | 'conditional' | 'neutral'
  lang: string
  t: (key: string) => string
  primaryCurrency?: 'try' | 'usd'
  breakdown?: KpiBreakdownItem[]
}) {
  const referenceValue = primaryCurrency === 'usd' ? (valueUsd ?? 0) : (valueTry ?? 0)
  const resolvedColor = color === 'conditional' ? (referenceValue >= 0 ? 'green' : 'red') : color

  const valueClass =
    resolvedColor === 'green'
      ? 'text-green'
      : resolvedColor === 'red'
        ? 'text-red'
        : 'text-black/80'

  if (primaryCurrency === 'usd') {
    return (
      <div className="rounded-xl border border-black/10 bg-black/[0.015] px-4 py-3.5">
        <div className="flex items-center gap-1.5">
          <Icon size={14} className="text-black/30" />
          <span className="text-[11px] font-medium uppercase tracking-wider text-black/40">
            {label}
          </span>
        </div>
        {/* USD — primary (large) */}
        {valueUsd !== undefined && (
          <p className={`mt-2 font-mono text-xl font-bold tabular-nums ${valueClass}`}>
            {formatNumber(Math.abs(valueUsd), lang)}
            <span className="ml-1 text-xs font-medium text-black/25">$</span>
          </p>
        )}
        {/* TRY — secondary (small, muted) */}
        {valueTry !== undefined && (
          <p className="mt-0.5 font-mono text-[11px] tabular-nums text-black/30">
            {formatNumber(Math.abs(valueTry), lang)} ₺
          </p>
        )}
        {/* Breakdown rows */}
        {breakdown && breakdown.length > 0 && (
          <div className="mt-2.5 space-y-1 border-t border-black/[0.06] pt-2">
            {breakdown.map((item) => (
              <div key={item.label} className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-1 min-w-0">
                  <item.icon size={10} className="shrink-0 text-black/25" />
                  <span className="truncate text-[10px] text-black/40">{item.label}</span>
                </div>
                <span className="shrink-0 font-mono text-[10px] font-semibold tabular-nums text-black/50">
                  {formatNumber(Math.abs(item.valueUsd), lang)}&nbsp;$
                </span>
              </div>
            ))}
          </div>
        )}
        {valueUsd !== undefined && (
          <ChangeBadge
            current={Math.abs(valueUsd)}
            previous={prevValueUsd !== undefined ? Math.abs(prevValueUsd) : undefined}
            t={t}
          />
        )}
      </div>
    )
  }

  return (
    <div className="rounded-xl border border-black/10 bg-black/[0.015] px-4 py-3.5">
      <div className="flex items-center gap-1.5">
        <Icon size={14} className="text-black/30" />
        <span className="text-[11px] font-medium uppercase tracking-wider text-black/40">
          {label}
        </span>
      </div>
      {valueTry !== undefined && (
        <p className={`mt-2 font-mono text-xl font-bold tabular-nums ${valueClass}`}>
          {formatNumber(Math.abs(valueTry), lang)}
          <span className="ml-1 text-xs font-medium text-black/25">{suffix ?? '₺'}</span>
        </p>
      )}
      {valueUsd !== undefined && (
        <p className="mt-0.5 font-mono text-xs tabular-nums text-black/30">
          {formatNumber(Math.abs(valueUsd), lang)} $
        </p>
      )}
      {valueTry !== undefined && (
        <ChangeBadge
          current={Math.abs(valueTry)}
          previous={prevValueTry !== undefined ? Math.abs(prevValueTry) : undefined}
          t={t}
        />
      )}
    </div>
  )
}

/* ── Insights strip ───────────────────────────────── */

function InsightPill({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ElementType
  label: string
  value: string
}) {
  return (
    <div className="flex items-center gap-2 rounded-lg border border-black/[0.06] bg-black/[0.02] px-3 py-2">
      <Icon size={14} className="shrink-0 text-black/30" />
      <div className="min-w-0">
        <p className="text-[10px] font-medium uppercase tracking-wider text-black/35">{label}</p>
        <p className="font-mono text-sm font-semibold tabular-nums text-black/70">{value}</p>
      </div>
    </div>
  )
}

/* ── Loading skeleton ──────────────────────────────── */

function KpiSkeleton() {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-md xl:grid-cols-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="rounded-xl border border-black/10 bg-black/[0.015] px-4 py-3.5">
            <Skeleton className="h-3 w-20 rounded" />
            <Skeleton className="mt-3 h-6 w-28 rounded" />
            <Skeleton className="mt-1.5 h-3 w-16 rounded" />
            <Skeleton className="mt-1.5 h-3 w-12 rounded" />
          </div>
        ))}
      </div>
      <div className="grid grid-cols-2 gap-md xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-14 rounded-lg" />
        ))}
      </div>
      <div className="grid grid-cols-1 gap-md lg:grid-cols-2">
        <Skeleton className="h-[310px] rounded-xl" />
        <Skeleton className="h-[310px] rounded-xl" />
      </div>
    </div>
  )
}

/* ── Main component ────────────────────────────────── */

export function MonthlyTab() {
  const { t, i18n } = useTranslation('pages')
  const lang = i18n.language
  const { currentOrg } = useOrganization()
  const queryClient = useQueryClient()

  const now = new Date()
  const [year, setYear] = useState(now.getFullYear())
  const [month, setMonth] = useState(now.getMonth() + 1)

  const { data, isLoading } = useMonthlyAnalysisQuery(year, month)

  // Monthly rate editor state
  const [isEditingRate, setIsEditingRate] = useState(false)
  const [isUpdatingRate, setIsUpdatingRate] = useState(false)
  const [showPinDialog, setShowPinDialog] = useState(false)
  const rateInputRef = useRef<HTMLInputElement>(null)

  const handleSaveMonthlyRate = useCallback(async () => {
    if (!currentOrg) return
    const val = parseFloat(rateInputRef.current?.value ?? '')
    if (isNaN(val) || val <= 0) {
      setIsEditingRate(false)
      return
    }

    setIsEditingRate(false)
    setIsUpdatingRate(true)

    try {
      const { data: result, error } = await supabase.rpc(
        'update_month_exchange_rate' as never,
        {
          _org_id: currentOrg.id,
          _year: year,
          _month: month,
          _new_rate: val,
        } as never,
      )

      if (error) throw error

      // Invalidate related queries
      queryClient.invalidateQueries({ queryKey: queryKeys.transfers.all })

      const res = result as { tl_updated: number; usd_updated: number }
      console.info(
        `Monthly rate updated: ${val} — ${res.tl_updated} TL + ${res.usd_updated} USD transfers`,
      )
    } catch (err) {
      console.error('Failed to update monthly rate:', err)
    } finally {
      setIsUpdatingRate(false)
    }
  }, [currentOrg, year, month, queryClient])

  const goToPrevMonth = () => {
    if (month === 1) {
      setYear((y) => y - 1)
      setMonth(12)
    } else {
      setMonth((m) => m - 1)
    }
  }

  const goToNextMonth = () => {
    if (month === 12) {
      setYear((y) => y + 1)
      setMonth(1)
    } else {
      setMonth((m) => m + 1)
    }
  }

  const isCurrentMonth = year === now.getFullYear() && month === now.getMonth() + 1

  const monthLabel = new Date(year, month - 1, 1).toLocaleDateString(
    lang === 'tr' ? 'tr-TR' : 'en-US',
    { month: 'long', year: 'numeric' },
  )

  const prev = data?.prev_kpis
  const insights = data?.insights

  return (
    <div className="space-y-lg">
      {/* Month picker + rate editor */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-sm">
          <Button variant="ghost" size="sm" onClick={goToPrevMonth} className="size-8 p-0">
            <CaretLeft size={16} weight="bold" />
          </Button>
          <span className="min-w-[160px] text-center text-sm font-semibold capitalize text-black/70">
            {monthLabel}
          </span>
          <Button
            variant="ghost"
            size="sm"
            onClick={goToNextMonth}
            disabled={isCurrentMonth}
            className="size-8 p-0"
          >
            <CaretRight size={16} weight="bold" />
          </Button>
        </div>

        {/* Monthly rate editor */}
        {!isLoading && data && data.kpis.transfer_count > 0 && (
          <div className="flex items-center gap-sm">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-black/30">
              {t('transfers.monthly.monthlyRate')}
            </span>
            {isUpdatingRate ? (
              <div className="flex items-center gap-sm">
                <div className="size-3 animate-spin rounded-full border border-black/10 border-t-black/40" />
                <span className="text-xs text-black/40">{t('transfers.monthly.rateUpdating')}</span>
              </div>
            ) : isEditingRate ? (
              <div className="flex items-center gap-1.5">
                <input
                  ref={rateInputRef}
                  type="number"
                  step="0.01"
                  defaultValue={data?.kpis?.avg_rate?.toFixed(2) ?? ''}
                  className="h-7 w-24 rounded-lg border border-black/10 bg-white px-2 text-right font-mono text-sm font-bold tabular-nums text-black/70 outline-none focus:border-black/25"
                  autoFocus
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleSaveMonthlyRate()
                    else if (e.key === 'Escape') setIsEditingRate(false)
                  }}
                />
                <button
                  className="flex size-6 items-center justify-center rounded-md text-green hover:bg-green/10"
                  onClick={handleSaveMonthlyRate}
                >
                  <Check size={14} weight="bold" />
                </button>
                <button
                  className="flex size-6 items-center justify-center rounded-md text-red hover:bg-red/10"
                  onClick={() => setIsEditingRate(false)}
                >
                  <X size={14} weight="bold" />
                </button>
              </div>
            ) : (
              <button
                className="flex items-center gap-1.5 rounded-lg border border-black/[0.06] bg-black/[0.02] px-2.5 py-1.5 text-xs font-medium text-black/50 transition-colors hover:bg-black/[0.04] hover:text-black/70"
                onClick={() => setShowPinDialog(true)}
              >
                <CurrencyDollar size={13} />
                {t('transfers.monthly.editMonthlyRate')}
                <PencilSimple size={12} className="text-black/25" />
              </button>
            )}
          </div>
        )}
      </div>

      {/* PIN dialog for rate editing */}
      <PinDialog
        open={showPinDialog}
        onClose={() => setShowPinDialog(false)}
        onVerified={() => {
          setShowPinDialog(false)
          setIsEditingRate(true)
        }}
      />

      {/* Loading state */}
      {isLoading && <KpiSkeleton />}

      {/* Empty state */}
      {!isLoading && (!data || data.kpis.transfer_count === 0) && (
        <EmptyState icon={ChartBar} title={t('transfers.monthly.noData')} />
      )}

      {/* Data */}
      {!isLoading && data && data.kpis.transfer_count > 0 && (
        <>
          {/* KPI cards */}
          <div className="grid grid-cols-2 gap-md xl:grid-cols-4">
            <KpiCard
              label={t('transfers.monthly.totalDeposits')}
              icon={ArrowDown}
              valueTry={data.kpis.total_deposits_try}
              valueUsd={data.kpis.total_deposits_usd}
              prevValueTry={prev?.total_deposits_try}
              prevValueUsd={prev?.total_deposits_usd}
              color="green"
              lang={lang}
              t={t}
              primaryCurrency="usd"
              breakdown={[
                {
                  label: t('transfers.monthly.tether'),
                  icon: CurrencyDollar,
                  valueUsd: data.kpis.usdt_deposits_usd ?? 0,
                },
                {
                  label: t('transfers.monthly.bankAndCC'),
                  icon: Bank,
                  valueUsd: data.kpis.bank_cc_deposits_usd ?? 0,
                },
              ]}
            />
            <KpiCard
              label={t('transfers.monthly.totalWithdrawals')}
              icon={ArrowUp}
              valueTry={data.kpis.total_withdrawals_try}
              valueUsd={data.kpis.total_withdrawals_usd}
              prevValueTry={prev?.total_withdrawals_try}
              prevValueUsd={prev?.total_withdrawals_usd}
              color="red"
              lang={lang}
              t={t}
              primaryCurrency="usd"
              breakdown={[
                {
                  label: t('transfers.monthly.tether'),
                  icon: CurrencyDollar,
                  valueUsd: data.kpis.usdt_withdrawals_usd ?? 0,
                },
                {
                  label: t('transfers.monthly.bankAndCC'),
                  icon: Bank,
                  valueUsd: data.kpis.bank_cc_withdrawals_usd ?? 0,
                },
              ]}
            />
            <KpiCard
              label={t('transfers.monthly.net')}
              icon={ChartBar}
              valueTry={data.kpis.total_deposits_try - data.kpis.total_withdrawals_try}
              valueUsd={data.kpis.total_deposits_usd - data.kpis.total_withdrawals_usd}
              prevValueTry={prev ? prev.total_deposits_try - prev.total_withdrawals_try : undefined}
              prevValueUsd={prev ? prev.total_deposits_usd - prev.total_withdrawals_usd : undefined}
              color="conditional"
              lang={lang}
              t={t}
              primaryCurrency="usd"
              breakdown={[
                {
                  label: t('transfers.monthly.tether'),
                  icon: CurrencyDollar,
                  valueUsd:
                    (data.kpis.usdt_deposits_usd ?? 0) - (data.kpis.usdt_withdrawals_usd ?? 0),
                },
                {
                  label: t('transfers.monthly.bankAndCC'),
                  icon: Bank,
                  valueUsd:
                    (data.kpis.bank_cc_deposits_usd ?? 0) -
                    (data.kpis.bank_cc_withdrawals_usd ?? 0),
                },
              ]}
            />
            <KpiCard
              label={t('transfers.monthly.bankVolume')}
              icon={Bank}
              valueTry={data.kpis.total_bank_volume}
              prevValueTry={prev?.total_bank_volume}
              color="neutral"
              lang={lang}
              t={t}
            />
            <KpiCard
              label={t('transfers.monthly.creditCardVolume')}
              icon={CreditCard}
              valueTry={data.kpis.total_credit_card_volume}
              prevValueTry={prev?.total_credit_card_volume}
              color="neutral"
              lang={lang}
              t={t}
            />
            <KpiCard
              label={t('transfers.monthly.usdtNet')}
              icon={CurrencyDollar}
              valueTry={data.kpis.usdt_net}
              prevValueTry={prev?.usdt_net}
              suffix="$"
              color="conditional"
              lang={lang}
              t={t}
            />
            <KpiCard
              label={t('transfers.monthly.commission')}
              icon={Coins}
              valueTry={data.kpis.total_commission_try}
              prevValueTry={prev?.total_commission_try}
              color="neutral"
              lang={lang}
              t={t}
            />
            {/* Transfer Count — special: plain number, no currency */}
            <div className="rounded-xl border border-black/10 bg-black/[0.015] px-4 py-3.5">
              <div className="flex items-center gap-1.5">
                <HashStraight size={14} className="text-black/30" />
                <span className="text-[11px] font-medium uppercase tracking-wider text-black/40">
                  {t('transfers.monthly.transferCount')}
                </span>
              </div>
              <p className="mt-2 font-mono text-xl font-bold tabular-nums text-black/80">
                {data.kpis.transfer_count.toLocaleString(lang === 'tr' ? 'tr-TR' : 'en-US')}
              </p>
              <p className="mt-0.5 text-xs tabular-nums text-black/30">
                {data.kpis.deposit_count} {t('transfers.monthly.deposits').toLowerCase()}
                {' / '}
                {data.kpis.withdrawal_count} {t('transfers.monthly.withdrawals').toLowerCase()}
              </p>
              <ChangeBadge
                current={data.kpis.transfer_count}
                previous={prev?.transfer_count}
                t={t}
              />
            </div>
          </div>

          {/* USD summary row — USD ÇEVRİM / KOM. SON USD / FİNANS % */}
          <div className="grid grid-cols-1 gap-md sm:grid-cols-3">
            <KpiCard
              label={t('transfers.monthly.usdCevirim')}
              icon={CurrencyDollar}
              valueUsd={data.kpis.usd_cevirim}
              prevValueUsd={prev?.usd_cevirim}
              color="conditional"
              lang={lang}
              t={t}
              primaryCurrency="usd"
            />
            <KpiCard
              label={t('transfers.monthly.komSonUsd')}
              icon={CurrencyDollar}
              valueUsd={data.kpis.kom_son_usd}
              prevValueUsd={prev?.kom_son_usd}
              color="conditional"
              lang={lang}
              t={t}
              primaryCurrency="usd"
            />
            {/* Finans % — special card (no currency, shows percentage) */}
            <div className="rounded-xl border border-black/10 bg-black/[0.015] px-4 py-3.5">
              <div className="flex items-center gap-1.5">
                <ChartLine size={14} className="text-black/30" />
                <span className="text-[11px] font-medium uppercase tracking-wider text-black/40">
                  {t('transfers.monthly.finansPct')}
                </span>
              </div>
              <p className="mt-2 font-mono text-xl font-bold tabular-nums text-black/80">
                {formatNumber(data.kpis.finans_pct, lang)}
                <span className="ml-1 text-xs font-medium text-black/25">%</span>
              </p>
              {prev?.finans_pct !== undefined && (
                <ChangeBadge current={data.kpis.finans_pct} previous={prev.finans_pct} t={t} />
              )}
            </div>
          </div>

          {/* Insights strip */}
          {insights && (
            <div className="grid grid-cols-2 gap-md xl:grid-cols-4">
              <InsightPill
                icon={Lightning}
                label={t('transfers.monthly.peakDay')}
                value={
                  insights.peak_day
                    ? new Date(insights.peak_day + 'T00:00:00').toLocaleDateString(
                        lang === 'tr' ? 'tr-TR' : 'en-US',
                        { day: 'numeric', month: 'short' },
                      ) +
                      ' (' +
                      formatCompactNumber(insights.peak_day_volume, lang) +
                      ' ₺)'
                    : '—'
                }
              />
              <InsightPill
                icon={CalendarBlank}
                label={t('transfers.monthly.activeDays')}
                value={`${insights.active_days}`}
              />
              <InsightPill
                icon={ChartLine}
                label={t('transfers.monthly.avgDailyVolume')}
                value={`${formatCompactNumber(insights.avg_daily_volume, lang)} ₺`}
              />
              <InsightPill
                icon={Equals}
                label={t('transfers.monthly.avgPerTransfer')}
                value={`${formatCompactNumber(insights.avg_per_transfer, lang)} ₺`}
              />
            </div>
          )}

          {/* Charts + Breakdowns */}
          <MonthlyCharts data={data} lang={lang} />
        </>
      )}
    </div>
  )
}
