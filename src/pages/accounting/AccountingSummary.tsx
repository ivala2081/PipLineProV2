import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { CaretLeft, CaretRight, TrendUp, TrendDown, Wallet } from '@phosphor-icons/react'
import { useAccountingOverviewSummary } from '@/hooks/queries/useAccountingQuery'
import type { RegisterSummary } from '@/hooks/queries/useAccountingQuery'
import { Card, Skeleton, Tag } from '@ds'

/* ── Helpers ──────────────────────────────────────────── */

function currentYearMonth() {
  const d = new Date()
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  return `${y}-${m}`
}

function shiftMonth(ym: string, delta: number) {
  const [y, m] = ym.split('-').map(Number)
  const d = new Date(y, m - 1 + delta, 1)
  const ny = d.getFullYear()
  const nm = String(d.getMonth() + 1).padStart(2, '0')
  return `${ny}-${nm}`
}

function formatPeriodLabel(ym: string, lang: string) {
  const [y, m] = ym.split('-').map(Number)
  const d = new Date(y, m - 1, 1)
  return d.toLocaleDateString(lang === 'tr' ? 'tr-TR' : 'en-US', {
    month: 'long',
    year: 'numeric',
  })
}

function fmt(n: number) {
  return n.toLocaleString('tr-TR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })
}

/* ── Register Card ────────────────────────────────────── */

function RegisterCard({
  reg,
  t,
}: {
  reg: RegisterSummary
  t: (key: string, fallback?: string) => string
}) {
  return (
    <Card
      padding="default"
      className="group border border-black/10 bg-bg1 transition-shadow hover:shadow-sm"
    >
      {/* Header: label + currency tag */}
      <div className="mb-3 flex items-center justify-between">
        <span className="text-sm font-semibold text-black/70">{reg.label}</span>
        <Tag variant="default" className="text-[10px]">
          {reg.currency}
        </Tag>
      </div>

      {/* Mini table */}
      <div className="space-y-1.5 text-xs">
        <div className="flex items-center justify-between">
          <span className="text-black/50">{t('accounting.overview.opening', 'DEViR')}</span>
          <span className="font-mono tabular-nums text-black/70">{fmt(reg.opening)}</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-black/50">{t('accounting.overview.incoming', 'GiREN')}</span>
          <span className="font-mono tabular-nums text-green">+{fmt(reg.incoming)}</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-black/50">{t('accounting.overview.outgoing', 'CIKAN')}</span>
          <span className="font-mono tabular-nums text-red">-{fmt(reg.outgoing)}</span>
        </div>

        {/* Separator */}
        <div className="border-t border-black/[0.06]" />

        <div className="flex items-center justify-between">
          <span className="text-black/50">{t('accounting.overview.net', 'NET')}</span>
          <span className={`font-mono tabular-nums ${reg.net >= 0 ? 'text-green' : 'text-red'}`}>
            {reg.net >= 0 ? '+' : ''}
            {fmt(reg.net)}
          </span>
        </div>
        <div className="flex items-center justify-between">
          <span className="font-medium text-black/70">
            {t('accounting.overview.closing', 'Closing')}
          </span>
          <span className="font-mono text-sm font-bold tabular-nums text-black/80">
            {fmt(reg.closing)}
          </span>
        </div>
      </div>
    </Card>
  )
}

/* ── Main Component ───────────────────────────────────── */

export function AccountingSummary() {
  const { t, i18n } = useTranslation('pages')
  const [period, setPeriod] = useState(currentYearMonth)

  const { data: summary, isLoading } = useAccountingOverviewSummary(period)

  const goPrev = () => setPeriod((p) => shiftMonth(p, -1))
  const goNext = () => setPeriod((p) => shiftMonth(p, 1))

  return (
    <div className="space-y-md">
      {/* ── Period selector ──────────────────────── */}
      <div className="flex items-center justify-between rounded-xl border border-black/10 bg-black/[0.02] px-4 py-2.5">
        <button
          type="button"
          onClick={goPrev}
          className="rounded-lg p-1.5 text-black/50 transition-colors hover:bg-black/[0.05] hover:text-black/70"
          aria-label={t('accounting.overview.prevMonth', 'Previous month')}
        >
          <CaretLeft size={18} weight="bold" />
        </button>

        <span className="text-sm font-semibold text-black/70">
          {formatPeriodLabel(period, i18n.language)}
        </span>

        <button
          type="button"
          onClick={goNext}
          className="rounded-lg p-1.5 text-black/50 transition-colors hover:bg-black/[0.05] hover:text-black/70"
          aria-label={t('accounting.overview.nextMonth', 'Next month')}
        >
          <CaretRight size={18} weight="bold" />
        </button>
      </div>

      {/* ── Register Cards Grid ──────────────────── */}
      {isLoading ? (
        <div className="grid grid-cols-1 gap-md md:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Card key={i} padding="default" className="border border-black/10 bg-bg1">
              <div className="mb-3 flex items-center justify-between">
                <Skeleton className="h-4 w-24 rounded" />
                <Skeleton className="h-5 w-12 rounded" />
              </div>
              <div className="space-y-2">
                {Array.from({ length: 5 }).map((_, j) => (
                  <div key={j} className="flex items-center justify-between">
                    <Skeleton className="h-3 w-16 rounded" />
                    <Skeleton className="h-3 w-20 rounded" />
                  </div>
                ))}
              </div>
            </Card>
          ))}
        </div>
      ) : !summary?.registers?.length ? (
        /* ── Empty state ─────────────────────────── */
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-black/10 bg-black/[0.02] py-12">
          <Wallet size={40} weight="duotone" className="mb-3 text-black/20" />
          <p className="text-sm text-black/40">
            {t(
              'accounting.overview.noRegisters',
              'No registers found. Registers need to be seeded for this organization.',
            )}
          </p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 gap-md md:grid-cols-2 lg:grid-cols-3">
            {summary.registers.map((reg) => (
              <RegisterCard key={reg.id} reg={reg} t={t} />
            ))}
          </div>

          {/* ── Bottom Summary Bar ───────────────── */}
          <div className="flex flex-col gap-3 rounded-xl border border-black/10 bg-black/[0.02] px-5 py-3.5 sm:flex-row sm:items-center sm:justify-between">
            {/* Portfolio total */}
            <div className="flex items-center gap-2">
              <Wallet size={18} weight="duotone" className="text-black/40" />
              <span className="text-xs font-medium uppercase tracking-wider text-black/40">
                {t('accounting.overview.totalPortfolio', 'Total Portfolio (USD)')}
              </span>
              <span className="font-mono text-base font-bold tabular-nums text-black/80">
                ${fmt(summary.totals.portfolio_usd)}
              </span>
            </div>

            {/* NET P&L */}
            <div className="flex items-center gap-2">
              {summary.totals.net_pl >= 0 ? (
                <TrendUp size={18} weight="bold" className="text-green" />
              ) : (
                <TrendDown size={18} weight="bold" className="text-red" />
              )}
              <span className="text-xs font-medium uppercase tracking-wider text-black/40">
                {t('accounting.overview.netPL', 'NET K/Z')}
              </span>
              <span
                className={`font-mono text-base font-bold tabular-nums ${
                  summary.totals.net_pl >= 0 ? 'text-green' : 'text-red'
                }`}
              >
                {summary.totals.net_pl >= 0 ? '+' : ''}
                {fmt(summary.totals.net_pl)}
              </span>
              <span
                className={`font-mono text-xs tabular-nums ${
                  summary.totals.pl_percent >= 0 ? 'text-green/70' : 'text-red/70'
                }`}
              >
                ({summary.totals.pl_percent >= 0 ? '+' : ''}
                {summary.totals.pl_percent.toFixed(2)}%)
              </span>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
