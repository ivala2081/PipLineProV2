import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from 'recharts'
import {
  Bank,
  CreditCard,
  Coins,
  Users,
  Percent,
  SquaresFour,
  CaretDown,
  ArrowUp,
  ArrowDown,
} from '@phosphor-icons/react'
import { useTheme } from '@ds'
import type {
  MonthlySummaryData,
  BreakdownItem,
  CategoryBreakdownItem,
  DailyDetailedPoint,
  CommissionByPspItem,
  CurrencySplitItem,
} from '@/hooks/queries/useMonthlyAnalysisQuery'

/* ── Palette (monochrome / business-minimal) ─────────────────── */

const BAR_COLOR = 'rgba(100,116,139,0.35)' // slate-500 @ 35%
const BAR_COLOR_ALT = 'rgba(100,116,139,0.22)' // lighter variant for secondary bars

/* ── Format helpers ─────────────────────────────────────────── */

function fmt(n: number, lang: string) {
  return n.toLocaleString(lang === 'tr' ? 'tr-TR' : 'en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })
}

function fmtCompact(value: number): string {
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`
  if (value >= 1_000) return `${(value / 1_000).toFixed(0)}K`
  return value.toFixed(0)
}

function fmtCompactL(n: number, lang: string): string {
  const loc = lang === 'tr' ? 'tr-TR' : 'en-US'
  if (n >= 1_000_000)
    return (
      (n / 1_000_000).toLocaleString(loc, { minimumFractionDigits: 1, maximumFractionDigits: 1 }) +
      'M'
    )
  if (n >= 1_000)
    return (
      (n / 1_000).toLocaleString(loc, { minimumFractionDigits: 0, maximumFractionDigits: 0 }) + 'K'
    )
  return fmt(n, lang)
}

/* ── Chart theme ────────────────────────────────────────────── */

function useChartTheme() {
  const { resolvedTheme } = useTheme()
  const isDark = resolvedTheme === 'dark'
  return useMemo(
    () => ({
      gridStroke: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)',
      axisTick: { fontSize: 11, fill: isDark ? 'rgba(255,255,255,0.45)' : 'rgba(0,0,0,0.4)' },
      axisLine: { stroke: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)' },
      tooltipStyle: {
        fontSize: 12,
        borderRadius: 8,
        backgroundColor: isDark ? '#1b2533' : '#ffffff',
        color: isDark ? '#e6e9f2' : '#18181b',
        border: isDark ? '1px solid rgba(255,255,255,0.1)' : '1px solid rgba(0,0,0,0.08)',
        boxShadow: isDark ? '0 2px 8px rgba(0,0,0,0.4)' : '0 2px 8px rgba(0,0,0,0.06)',
      },
      lineColor: 'var(--color-net-line)',
    }),
    [isDark],
  )
}

const DEPOSIT_COLOR = 'var(--color-deposit)'
const WITHDRAWAL_COLOR = 'var(--color-withdrawal)'

function formatDay(dateStr: string): string {
  const d = new Date(dateStr + 'T00:00:00')
  return d.getDate().toString()
}

/* ── Shared CardHeader ──────────────────────────────────────── */

function CardHeader({
  icon: Icon,
  title,
  badge,
}: {
  icon: React.ElementType
  title: string
  badge?: React.ReactNode
}) {
  return (
    <div className="flex items-center justify-between border-b border-black/[0.06] bg-black/[0.012] px-4 py-3">
      <div className="flex items-center gap-2">
        <Icon size={14} className="shrink-0 text-black/40" />
        <h3 className="text-sm font-semibold text-black/70">{title}</h3>
      </div>
      {badge}
    </div>
  )
}

/* ================================================================ */
/*  1. VOLUME BY PSP — "Leaderboard" with big ranks + fat bars      */
/* ================================================================ */

function PspVolumeCard({
  title,
  items,
  lang,
}: {
  title: string
  items: BreakdownItem[]
  lang: string
}) {
  if (!items || items.length === 0) return null
  const total = items.reduce((a, b) => a + b.volume, 0)
  const maxVol = Math.max(...items.map((i) => i.volume))

  return (
    <div className="overflow-hidden rounded-xl border border-black/10">
      <CardHeader
        icon={Bank}
        title={title}
        badge={
          <span className="font-mono text-xs font-semibold tabular-nums text-black/40">
            {fmtCompactL(total, lang)} ₺
          </span>
        }
      />
      <div className="divide-y divide-black/[0.04]">
        {items.map((item, i) => {
          const pct = total > 0 ? (item.volume / total) * 100 : 0
          const barPct = maxVol > 0 ? (item.volume / maxVol) * 100 : 0
          return (
            <div key={item.name} className="px-4 py-3.5">
              <div className="flex items-baseline justify-between gap-3">
                <div className="flex items-baseline gap-2.5">
                  <span className="w-5 text-sm font-semibold tabular-nums text-black/25">
                    {i + 1}
                  </span>
                  <span className="text-sm font-medium text-black/75">{item.name}</span>
                </div>
                <span className="shrink-0 font-mono text-sm font-semibold tabular-nums text-black/70">
                  {fmt(item.volume, lang)} ₺
                </span>
              </div>
              <div className="mt-2.5 h-1.5 overflow-hidden rounded-full bg-black/[0.04]">
                <div
                  className="h-full rounded-full"
                  style={{ width: `${barPct}%`, backgroundColor: BAR_COLOR }}
                />
              </div>
              <div className="mt-1.5 flex items-center justify-between">
                <span className="text-[11px] tabular-nums text-black/30">{item.count}×</span>
                <span className="text-[11px] font-medium tabular-nums text-black/40">
                  {pct.toFixed(1)}%
                </span>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

/* ================================================================ */
/*  2. COMMISSION BY PSP — Percentage-focused tiles                 */
/* ================================================================ */

function CommissionTilesCard({
  title,
  items,
  lang,
}: {
  title: string
  items: CommissionByPspItem[]
  lang: string
}) {
  if (!items || items.length === 0) return null
  const values = items.map((i) => Math.abs(i.commission))
  const total = values.reduce((a, b) => a + b, 0)

  return (
    <div className="overflow-hidden rounded-xl border border-black/10">
      <CardHeader
        icon={Percent}
        title={title}
        badge={
          <span className="font-mono text-xs font-semibold tabular-nums text-black/40">
            {fmtCompactL(total, lang)} ₺
          </span>
        }
      />
      <div className="grid grid-cols-2 gap-3 p-4">
        {items.map((item) => {
          const val = Math.abs(item.commission)
          const pct = total > 0 ? (val / total) * 100 : 0
          return (
            <div key={item.name} className="rounded-lg border border-black/[0.06] p-3.5">
              <p className="truncate text-[11px] font-medium uppercase tracking-wide text-black/40">
                {item.name}
              </p>
              <p className="mt-2 text-2xl font-semibold tabular-nums leading-none text-black/75">
                {pct.toFixed(1)}
                <span className="text-sm text-black/40">%</span>
              </p>
              <p className="mt-2 font-mono text-xs tabular-nums text-black/45">
                {fmt(val, lang)} ₺
              </p>
            </div>
          )
        })}
      </div>
    </div>
  )
}

/* ================================================================ */
/*  3. PAYMENT METHOD — Tile grid with dots + amounts + mini bars   */
/* ================================================================ */

function PaymentMethodCard({
  title,
  items,
  lang,
}: {
  title: string
  items: BreakdownItem[]
  lang: string
}) {
  if (!items || items.length === 0) return null
  const total = items.reduce((a, b) => a + b.volume, 0)
  const maxVol = Math.max(...items.map((i) => i.volume))

  return (
    <div className="overflow-hidden rounded-xl border border-black/10">
      <CardHeader
        icon={CreditCard}
        title={title}
        badge={
          <span className="font-mono text-xs font-semibold tabular-nums text-black/40">
            {fmtCompactL(total, lang)} ₺
          </span>
        }
      />
      <div className="grid grid-cols-2 gap-3 p-4">
        {items.map((item) => {
          const pct = total > 0 ? (item.volume / total) * 100 : 0
          const barPct = maxVol > 0 ? (item.volume / maxVol) * 100 : 0
          return (
            <div key={item.name} className="rounded-lg border border-black/[0.06] p-3.5">
              <span className="text-sm font-medium text-black/70">{item.name}</span>
              <p className="mt-2 font-mono text-base font-semibold tabular-nums text-black/75">
                {fmt(item.volume, lang)} ₺
              </p>
              <div className="mt-1 flex items-center gap-2">
                <span className="text-[11px] tabular-nums text-black/30">{item.count}×</span>
                <span className="text-[11px] font-medium tabular-nums text-black/40">
                  {pct.toFixed(1)}%
                </span>
              </div>
              <div className="mt-2.5 h-1.5 overflow-hidden rounded-full bg-black/[0.04]">
                <div
                  className="h-full rounded-full"
                  style={{ width: `${barPct}%`, backgroundColor: BAR_COLOR }}
                />
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

/* ================================================================ */
/*  4. CURRENCY SPLIT — Thick stacked bar + stat tiles              */
/* ================================================================ */

function CurrencySplitCard({
  title,
  items,
  lang,
}: {
  title: string
  items: CurrencySplitItem[]
  lang: string
}) {
  if (!items || items.length === 0) return null
  const total = items.reduce((a, b) => a + b.volume_try, 0)

  return (
    <div className="overflow-hidden rounded-xl border border-black/10">
      <CardHeader
        icon={Coins}
        title={title}
        badge={
          <span className="font-mono text-xs font-semibold tabular-nums text-black/40">
            {fmtCompactL(total, lang)} ₺
          </span>
        }
      />

      {/* Stacked bar */}
      {total > 0 && (
        <div className="px-4 pt-4 pb-2">
          <div className="flex h-2.5 gap-px overflow-hidden rounded-full bg-black/[0.04]">
            {items.map((item, i) => {
              const pct = (item.volume_try / total) * 100
              return (
                <div
                  key={item.currency}
                  className="h-full first:rounded-l-full last:rounded-r-full"
                  style={{ width: `${pct}%`, backgroundColor: i === 0 ? BAR_COLOR : BAR_COLOR_ALT }}
                />
              )
            })}
          </div>
        </div>
      )}

      {/* Currency tiles */}
      <div className="grid grid-cols-2 gap-3 p-4 pt-2">
        {items.map((item) => {
          const pct = total > 0 ? (item.volume_try / total) * 100 : 0
          return (
            <div key={item.currency} className="rounded-lg border border-black/[0.06] p-3.5">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-black/70">{item.currency}</span>
                <span className="text-lg font-semibold tabular-nums leading-none text-black/65">
                  {pct.toFixed(1)}%
                </span>
              </div>
              <div className="mt-2 flex items-center justify-between">
                <span className="font-mono text-xs tabular-nums text-black/45">
                  {fmt(item.volume_try, lang)} ₺
                </span>
                <span className="text-[11px] tabular-nums text-black/30">{item.count}×</span>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

/* ================================================================ */
/*  5. CATEGORY BREAKDOWN — Directional stripe rows with arrows     */
/* ================================================================ */

interface CategoryGroup {
  name: string
  deposits: number
  withdrawals: number
  depositCount: number
  withdrawalCount: number
}

function CategoryBreakdownCard({
  title,
  items,
  lang,
}: {
  title: string
  items: CategoryBreakdownItem[]
  lang: string
}) {
  const { t } = useTranslation('pages')

  const grouped = useMemo(() => {
    const map = new Map<string, CategoryGroup>()
    for (const item of items) {
      const existing = map.get(item.name) ?? {
        name: item.name,
        deposits: 0,
        withdrawals: 0,
        depositCount: 0,
        withdrawalCount: 0,
      }
      if (item.is_deposit) {
        existing.deposits = item.volume
        existing.depositCount = item.count
      } else {
        existing.withdrawals = item.volume
        existing.withdrawalCount = item.count
      }
      map.set(item.name, existing)
    }
    return Array.from(map.values()).sort(
      (a, b) => b.deposits + b.withdrawals - (a.deposits + a.withdrawals),
    )
  }, [items])

  if (grouped.length === 0) return null

  const maxValue = Math.max(...grouped.flatMap((g) => [g.deposits, g.withdrawals]))

  const rows = grouped
    .flatMap((g) => [
      g.deposits > 0
        ? {
            key: `${g.name}-dep`,
            name: g.name,
            amount: g.deposits,
            count: g.depositCount,
            isDeposit: true,
          }
        : null,
      g.withdrawals > 0
        ? {
            key: `${g.name}-wd`,
            name: g.name,
            amount: g.withdrawals,
            count: g.withdrawalCount,
            isDeposit: false,
          }
        : null,
    ])
    .filter(Boolean) as {
    key: string
    name: string
    amount: number
    count: number
    isDeposit: boolean
  }[]

  return (
    <div className="overflow-hidden rounded-xl border border-black/10">
      <CardHeader icon={SquaresFour} title={title} />
      <div>
        {rows.map((row) => {
          const barPct = maxValue > 0 ? (row.amount / maxValue) * 100 : 0
          const DirIcon = row.isDeposit ? ArrowUp : ArrowDown
          return (
            <div key={row.key} className="border-b border-black/[0.04] px-4 py-3 last:border-b-0">
              <div className="flex items-center justify-between gap-3">
                <div className="flex min-w-0 items-center gap-2">
                  <DirIcon
                    size={12}
                    weight="bold"
                    className={`shrink-0 ${row.isDeposit ? 'text-black/35' : 'text-black/35'}`}
                  />
                  <span className="truncate text-sm font-medium text-black/70">{row.name}</span>
                  <span className="shrink-0 text-[10px] font-medium uppercase tracking-wider text-black/30">
                    {row.isDeposit
                      ? t('transfers.monthly.deposits')
                      : t('transfers.monthly.withdrawals')}
                  </span>
                </div>
                <div className="flex shrink-0 items-baseline gap-2">
                  <span className="text-[11px] text-black/30">{row.count}×</span>
                  <span className="font-mono text-sm font-semibold tabular-nums text-black/65">
                    {fmt(row.amount, lang)} ₺
                  </span>
                </div>
              </div>
              <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-black/[0.04]">
                <div
                  className="h-full rounded-full"
                  style={{ width: `${barPct}%`, backgroundColor: BAR_COLOR }}
                />
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

/* ================================================================ */
/*  6. TOP CUSTOMERS — Champion feature + compact 2–5               */
/* ================================================================ */

function TopCustomersCard({
  title,
  items,
  lang,
}: {
  title: string
  items: { name: string; volume: number; count: number }[]
  lang: string
}) {
  const top5 = items.slice(0, 5)
  if (top5.length === 0) return null

  const maxValue = Math.max(...top5.map((i) => Math.abs(i.volume)))

  return (
    <div className="overflow-hidden rounded-xl border border-black/10">
      <CardHeader
        icon={Users}
        title={title}
        badge={
          <span className="rounded-full bg-black/[0.06] px-2.5 py-0.5 text-[11px] font-semibold text-black/45">
            Top 5
          </span>
        }
      />

      <div className="divide-y divide-black/[0.04]">
        {top5.map((item, i) => {
          const val = Math.abs(item.volume)
          const barPct = maxValue > 0 ? (val / maxValue) * 100 : 0
          return (
            <div key={item.name} className="px-4 py-3">
              <div className="flex items-center justify-between gap-3">
                <div className="flex min-w-0 items-center gap-2.5">
                  <span className="w-5 shrink-0 text-sm font-semibold tabular-nums text-black/25">
                    {i + 1}
                  </span>
                  <span className="truncate text-sm font-medium text-black/70">{item.name}</span>
                </div>
                <div className="flex shrink-0 items-center gap-2.5">
                  <span className="text-[11px] text-black/30">{item.count}×</span>
                  <span className="font-mono text-sm font-semibold tabular-nums text-black/70">
                    {fmt(val, lang)} ₺
                  </span>
                </div>
              </div>
              <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-black/[0.04]">
                <div
                  className="h-full rounded-full"
                  style={{ width: `${barPct}%`, backgroundColor: BAR_COLOR }}
                />
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

/* ================================================================ */
/*  DAILY BREAKDOWN TABLE — Collapsible                             */
/* ================================================================ */

function fmtTry(n: number, lang: string) {
  return n.toLocaleString(lang === 'tr' ? 'tr-TR' : 'en-US', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  })
}
function fmtUsd(n: number, lang: string) {
  return n.toLocaleString(lang === 'tr' ? 'tr-TR' : 'en-US', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  })
}
function fmtPct(n: number | null) {
  if (n === null || n === undefined) return '—'
  return n.toFixed(2) + '%'
}
function fmtRate(n: number | null) {
  if (n === null || n === undefined) return '—'
  return n.toFixed(2)
}
function fmtDayFull(dateStr: string, lang: string) {
  const d = new Date(dateStr + 'T00:00:00')
  return d.toLocaleDateString(lang === 'tr' ? 'tr-TR' : 'en-US', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  })
}

function DailyBreakdownTable({ rows, lang }: { rows: DailyDetailedPoint[]; lang: string }) {
  const { t } = useTranslation('pages')
  const [isOpen, setIsOpen] = useState(false)

  const totals = useMemo(
    () =>
      (rows ?? []).reduce(
        (acc, r) => ({
          bank_try: acc.bank_try + r.bank_try,
          kk_try: acc.kk_try + r.kk_try,
          commission_try: acc.commission_try + r.commission_try,
          usdt_net: acc.usdt_net + r.usdt_net,
          usd_cevirim: acc.usd_cevirim + r.usd_cevirim,
          kom_son_usd: acc.kom_son_usd + r.kom_son_usd,
          commission_usd: acc.commission_usd + r.commission_usd,
        }),
        {
          bank_try: 0,
          kk_try: 0,
          commission_try: 0,
          usdt_net: 0,
          usd_cevirim: 0,
          kom_son_usd: 0,
          commission_usd: 0,
        },
      ),
    [rows],
  )

  if (!rows || rows.length === 0) return null

  const totalFinansPct =
    totals.usd_cevirim > 0 ? (totals.commission_usd / totals.usd_cevirim) * 100 : null

  const th =
    'sticky top-0 z-10 bg-white/90 px-3 py-2 text-right text-[10px] font-semibold uppercase tracking-wider text-black/40 whitespace-nowrap backdrop-blur'
  const thL =
    'sticky top-0 z-10 bg-white/90 px-3 py-2 text-left text-[10px] font-semibold uppercase tracking-wider text-black/40 whitespace-nowrap backdrop-blur'
  const td =
    'px-3 py-2 font-mono text-[12px] tabular-nums text-right text-black/70 whitespace-nowrap'
  const tdL =
    'px-3 py-2 font-mono text-[12px] tabular-nums text-left text-black/70 whitespace-nowrap'
  const tdf =
    'px-3 py-2 font-mono text-[12px] font-semibold tabular-nums text-right text-black/80 whitespace-nowrap bg-black/[0.02]'
  const tdfL =
    'px-3 py-2 font-mono text-[12px] font-semibold tabular-nums text-left text-black/80 whitespace-nowrap bg-black/[0.02]'

  return (
    <div className="overflow-hidden rounded-xl border border-black/10">
      <button
        type="button"
        onClick={() => setIsOpen((v) => !v)}
        className="flex w-full items-center justify-between bg-black/[0.012] px-4 py-3 transition-colors hover:bg-black/[0.03]"
      >
        <h3 className="text-sm font-semibold text-black/70">
          {t('transfers.monthly.dailyBreakdown')}
        </h3>
        <div className="flex items-center gap-2">
          <span className="text-[11px] font-medium text-black/35">
            {rows.length} {t('transfers.monthly.days')}
          </span>
          <CaretDown
            size={14}
            weight="bold"
            className={`text-black/30 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
          />
        </div>
      </button>

      {isOpen && (
        <div className="overflow-x-auto border-t border-black/[0.06]">
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="border-b border-black/[0.06]">
                <th className={thL}>{t('transfers.monthly.date')}</th>
                <th className={th}>{t('transfers.monthly.banka')}</th>
                <th className={th}>{t('transfers.monthly.komisyon')}</th>
                <th className={th}>{t('transfers.monthly.kk')}</th>
                <th className={th}>{t('transfers.monthly.tether')}</th>
                <th className={th}>{t('transfers.monthly.usdCevirim')}</th>
                <th className={th}>{t('transfers.monthly.komSonUsd')}</th>
                <th className={th}>{t('transfers.monthly.finansPct')}</th>
                <th className={th}>{t('transfers.monthly.kur')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-black/[0.04]">
              {rows.map((row) => (
                <tr key={row.day} className="transition-colors hover:bg-black/[0.015]">
                  <td className={tdL}>{fmtDayFull(row.day, lang)}</td>
                  <td className={td}>
                    {row.bank_try > 0 ? `₺${fmtTry(row.bank_try - row.kk_try, lang)}` : '—'}
                  </td>
                  <td className={td}>
                    {row.commission_try > 0 ? `₺${fmtTry(row.commission_try, lang)}` : '—'}
                  </td>
                  <td className={td}>{row.kk_try > 0 ? `₺${fmtTry(row.kk_try, lang)}` : '—'}</td>
                  <td className={`${td} ${row.usdt_net < 0 ? 'text-red' : ''}`}>
                    {row.usdt_net !== 0
                      ? `${row.usdt_net < 0 ? '-' : ''}$${fmtUsd(Math.abs(row.usdt_net), lang)}`
                      : '—'}
                  </td>
                  <td className={`${td} ${row.usd_cevirim < 0 ? 'text-red' : ''}`}>
                    {`${row.usd_cevirim < 0 ? '-' : ''}$${fmtUsd(Math.abs(row.usd_cevirim), lang)}`}
                  </td>
                  <td className={`${td} ${row.kom_son_usd < 0 ? 'text-red' : ''}`}>
                    {`${row.kom_son_usd < 0 ? '-' : ''}$${fmtUsd(Math.abs(row.kom_son_usd), lang)}`}
                  </td>
                  <td className={td}>{fmtPct(row.finans_pct)}</td>
                  <td className={td}>{fmtRate(row.avg_rate)}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="border-t-2 border-black/10">
                <td className={tdfL}>{t('transfers.monthly.total')}</td>
                <td className={tdf}>{`₺${fmtTry(totals.bank_try - totals.kk_try, lang)}`}</td>
                <td className={tdf}>{`₺${fmtTry(totals.commission_try, lang)}`}</td>
                <td className={tdf}>
                  {totals.kk_try > 0 ? `₺${fmtTry(totals.kk_try, lang)}` : '—'}
                </td>
                <td className={`${tdf} ${totals.usdt_net < 0 ? 'text-red' : ''}`}>
                  {`${totals.usdt_net < 0 ? '-' : ''}$${fmtUsd(Math.abs(totals.usdt_net), lang)}`}
                </td>
                <td className={`${tdf} ${totals.usd_cevirim < 0 ? 'text-red' : ''}`}>
                  {`${totals.usd_cevirim < 0 ? '-' : ''}$${fmtUsd(Math.abs(totals.usd_cevirim), lang)}`}
                </td>
                <td className={`${tdf} ${totals.kom_son_usd < 0 ? 'text-red' : ''}`}>
                  {`${totals.kom_son_usd < 0 ? '-' : ''}$${fmtUsd(Math.abs(totals.kom_son_usd), lang)}`}
                </td>
                <td className={tdf}>{fmtPct(totalFinansPct)}</td>
                <td className={tdf}>—</td>
              </tr>
            </tfoot>
          </table>
        </div>
      )}
    </div>
  )
}

/* ================================================================ */
/*  MAIN EXPORT                                                     */
/* ================================================================ */

export function MonthlyCharts({ data, lang }: { data: MonthlySummaryData; lang: string }) {
  const { t } = useTranslation('pages')
  const ct = useChartTheme()

  return (
    <div className="space-y-lg">
      {/* Charts */}
      <div className="grid grid-cols-1 gap-md lg:grid-cols-2">
        <div className="min-w-0">
          <h3 className="mb-2 text-sm font-semibold text-black/60">
            {t('transfers.monthly.dailyVolume')}
          </h3>
          <div className="rounded-xl border border-black/10 bg-black/[0.015] p-4">
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={data.daily_volume}>
                <CartesianGrid strokeDasharray="3 3" stroke={ct.gridStroke} />
                <XAxis
                  dataKey="day"
                  tickFormatter={formatDay}
                  tick={ct.axisTick}
                  axisLine={ct.axisLine}
                  tickLine={false}
                />
                <YAxis
                  tickFormatter={fmtCompact}
                  tick={ct.axisTick}
                  axisLine={false}
                  tickLine={false}
                  width={55}
                />
                <Tooltip
                  formatter={(value: number | undefined, name: string) => [
                    `${fmt(value ?? 0, lang)} ₺`,
                    name === 'deposits'
                      ? t('transfers.monthly.deposits')
                      : t('transfers.monthly.withdrawals'),
                  ]}
                  labelFormatter={(label) => formatDay(String(label))}
                  contentStyle={ct.tooltipStyle}
                />
                <Bar dataKey="deposits" fill={DEPOSIT_COLOR} radius={[2, 2, 0, 0]} stackId="v" />
                <Bar
                  dataKey="withdrawals"
                  fill={WITHDRAWAL_COLOR}
                  radius={[2, 2, 0, 0]}
                  stackId="v"
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="min-w-0">
          <h3 className="mb-2 text-sm font-semibold text-black/60">
            {t('transfers.monthly.dailyNet')}
          </h3>
          <div className="rounded-xl border border-black/10 bg-black/[0.015] p-4">
            <ResponsiveContainer width="100%" height={260}>
              <LineChart data={data.daily_net}>
                <CartesianGrid strokeDasharray="3 3" stroke={ct.gridStroke} />
                <XAxis
                  dataKey="day"
                  tickFormatter={formatDay}
                  tick={ct.axisTick}
                  axisLine={ct.axisLine}
                  tickLine={false}
                />
                <YAxis
                  tickFormatter={fmtCompact}
                  tick={ct.axisTick}
                  axisLine={false}
                  tickLine={false}
                  width={55}
                />
                <Tooltip
                  formatter={(value: number | undefined) => [
                    `${fmt(value ?? 0, lang)} ₺`,
                    t('transfers.monthly.net'),
                  ]}
                  labelFormatter={(label) => formatDay(String(label))}
                  contentStyle={ct.tooltipStyle}
                />
                <Line
                  type="monotone"
                  dataKey="net"
                  stroke={ct.lineColor}
                  strokeWidth={2}
                  dot={{ r: 2.5, fill: ct.lineColor }}
                  activeDot={{ r: 4 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Row 1: Volume by PSP (leaderboard) + Commission by PSP (tiles) */}
      <div className="grid grid-cols-1 gap-md lg:grid-cols-2">
        <PspVolumeCard
          title={t('transfers.monthly.pspBreakdown')}
          items={data.psp_breakdown}
          lang={lang}
        />
        <CommissionTilesCard
          title={t('transfers.monthly.commissionByPsp')}
          items={data.commission_by_psp}
          lang={lang}
        />
      </div>

      {/* Row 2: Payment Method (tile grid) + Currency Split (bar + tiles) */}
      <div className="grid grid-cols-1 gap-md lg:grid-cols-2">
        <PaymentMethodCard
          title={t('transfers.monthly.paymentMethodBreakdown')}
          items={data.payment_method_breakdown}
          lang={lang}
        />
        <CurrencySplitCard
          title={t('transfers.monthly.currencySplit')}
          items={data.currency_split}
          lang={lang}
        />
      </div>

      {/* Category breakdown — directional rows */}
      <CategoryBreakdownCard
        title={t('transfers.monthly.categoryBreakdown')}
        items={data.category_breakdown}
        lang={lang}
      />

      {/* Top customers — champion + compact list */}
      {data.top_customers && data.top_customers.length > 0 && (
        <TopCustomersCard
          title={t('transfers.monthly.topCustomers')}
          items={data.top_customers}
          lang={lang}
        />
      )}

      {/* Daily breakdown — collapsible */}
      <DailyBreakdownTable rows={data.daily_detailed} lang={lang} />
    </div>
  )
}
