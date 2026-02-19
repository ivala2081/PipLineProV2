import { useMemo } from 'react'
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
import { useTheme } from '@ds'
import type {
  MonthlySummaryData,
  CategoryBreakdownItem,
  DailyDetailedPoint,
} from '@/hooks/queries/useMonthlyAnalysisQuery'

function formatNumber(n: number, lang: string) {
  return n.toLocaleString(lang === 'tr' ? 'tr-TR' : 'en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })
}

/* ── Chart style helpers (theme-aware) ────────────── */

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
      lineColor: isDark ? '#94e9b8' : '#18181b',
    }),
    [isDark],
  )
}

const GREEN = '#22c55e'
const RED = '#ef4444'

function formatDay(dateStr: string): string {
  const d = new Date(dateStr + 'T00:00:00')
  return d.getDate().toString()
}

function formatCompact(value: number): string {
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`
  if (value >= 1_000) return `${(value / 1_000).toFixed(0)}K`
  return value.toFixed(0)
}

/* ── Breakdown row with progress bar ──────────────── */

function BreakdownRow({
  rank,
  name,
  value,
  suffix,
  count,
  lang,
  pct,
}: {
  rank: number
  name: string
  value: number
  suffix: string
  count: number
  lang: string
  pct: number
}) {
  return (
    <div className="px-4 py-2.5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <span className="w-5 font-mono text-xs text-black/20">{rank}</span>
          <span className="text-[13px] font-medium text-black/70">{name}</span>
        </div>
        <div className="flex items-center gap-sm">
          <span className="font-mono text-[13px] font-semibold tabular-nums text-black/70">
            {formatNumber(value, lang)} {suffix}
          </span>
          <span className="min-w-[40px] text-right text-xs tabular-nums text-black/30">
            {count}x
          </span>
        </div>
      </div>
      <div className="mt-1.5 ml-[30px] h-1 overflow-hidden rounded-full bg-black/[0.04]">
        <div className="h-full rounded-full bg-brand/30" style={{ width: `${pct}%` }} />
      </div>
    </div>
  )
}

/* ── Breakdown card ────────────────────────────────── */

function BreakdownCard({
  title,
  items,
  suffix = '₺',
  lang,
  valueKey = 'volume',
}: {
  title: string
  items: { name: string; [key: string]: unknown }[]
  suffix?: string
  lang: string
  valueKey?: string
}) {
  if (!items || items.length === 0) return null

  const maxValue = Math.max(...items.map((item) => Math.abs(Number(item[valueKey] ?? 0))))

  return (
    <div>
      <h3 className="mb-2 text-sm font-semibold text-black/60">{title}</h3>
      <div className="divide-y divide-black/[0.06] overflow-hidden rounded-xl border border-black/10">
        {items.map((item, i) => {
          const val = Math.abs(Number(item[valueKey] ?? 0))
          return (
            <BreakdownRow
              key={`${item.name}-${i}`}
              rank={i + 1}
              name={item.name as string}
              value={val}
              suffix={suffix}
              count={Number(item.count ?? 0)}
              lang={lang}
              pct={maxValue > 0 ? (val / maxValue) * 100 : 0}
            />
          )
        })}
      </div>
    </div>
  )
}

/* ── Category breakdown with deposit/withdrawal split */

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
  t,
}: {
  title: string
  items: CategoryBreakdownItem[]
  lang: string
  t: (key: string) => string
}) {
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

  return (
    <div>
      <h3 className="mb-2 text-sm font-semibold text-black/60">{title}</h3>
      <div className="divide-y divide-black/[0.06] overflow-hidden rounded-xl border border-black/10">
        {grouped.map((group) => (
          <div key={group.name} className="px-4 py-3">
            <p className="mb-2 text-sm font-medium text-black/70">{group.name}</p>
            <div className="space-y-sm">
              {/* Deposits */}
              {group.deposits > 0 && (
                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-medium uppercase tracking-wider text-black/35">
                      {t('transfers.monthly.deposits')}
                    </span>
                    <span className="font-mono text-[11px] font-semibold tabular-nums text-green">
                      {formatNumber(group.deposits, lang)} ₺
                      <span className="ml-1 font-normal text-black/30">
                        ({group.depositCount}x)
                      </span>
                    </span>
                  </div>
                  <div className="h-1.5 overflow-hidden rounded-full bg-black/[0.04]">
                    <div
                      className="h-full rounded-full bg-green/40"
                      style={{
                        width: `${maxValue > 0 ? (group.deposits / maxValue) * 100 : 0}%`,
                      }}
                    />
                  </div>
                </div>
              )}
              {/* Withdrawals */}
              {group.withdrawals > 0 && (
                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-medium uppercase tracking-wider text-black/35">
                      {t('transfers.monthly.withdrawals')}
                    </span>
                    <span className="font-mono text-[11px] font-semibold tabular-nums text-red">
                      {formatNumber(group.withdrawals, lang)} ₺
                      <span className="ml-1 font-normal text-black/30">
                        ({group.withdrawalCount}x)
                      </span>
                    </span>
                  </div>
                  <div className="h-1.5 overflow-hidden rounded-full bg-black/[0.04]">
                    <div
                      className="h-full rounded-full bg-red/40"
                      style={{
                        width: `${maxValue > 0 ? (group.withdrawals / maxValue) * 100 : 0}%`,
                      }}
                    />
                  </div>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

/* ── Daily breakdown table ─────────────────────────── */

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

function fmtDay(dateStr: string, lang: string) {
  const d = new Date(dateStr + 'T00:00:00')
  return d.toLocaleDateString(lang === 'tr' ? 'tr-TR' : 'en-US', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  })
}

interface DailyBreakdownTableProps {
  rows: DailyDetailedPoint[]
  lang: string
}

function DailyBreakdownTable({ rows, lang }: DailyBreakdownTableProps) {
  const { t } = useTranslation('pages')

  // Monthly totals (bottom row) — must be declared before any early return (Rules of Hooks)
  const totals = useMemo(() => {
    return (rows ?? []).reduce(
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
    )
  }, [rows])

  if (!rows || rows.length === 0) return null

  const totalFinansPct =
    totals.usd_cevirim > 0 ? (totals.commission_usd / totals.usd_cevirim) * 100 : null

  const thCls =
    'sticky top-0 z-10 bg-white/90 px-3 py-2 text-right text-[10px] font-semibold uppercase tracking-wider text-black/40 whitespace-nowrap backdrop-blur'
  const thClsLeft =
    'sticky top-0 z-10 bg-white/90 px-3 py-2 text-left text-[10px] font-semibold uppercase tracking-wider text-black/40 whitespace-nowrap backdrop-blur'
  const tdCls =
    'px-3 py-2 font-mono text-[12px] tabular-nums text-right text-black/70 whitespace-nowrap'
  const tdClsLeft =
    'px-3 py-2 font-mono text-[12px] tabular-nums text-left text-black/70 whitespace-nowrap'
  const tdTotalCls =
    'px-3 py-2 font-mono text-[12px] font-semibold tabular-nums text-right text-black/80 whitespace-nowrap bg-black/[0.02]'
  const tdTotalClsLeft =
    'px-3 py-2 font-mono text-[12px] font-semibold tabular-nums text-left text-black/80 whitespace-nowrap bg-black/[0.02]'

  return (
    <div>
      <h3 className="mb-2 text-sm font-semibold text-black/60">
        {t('transfers.monthly.dailyBreakdown')}
      </h3>
      <div className="overflow-x-auto rounded-xl border border-black/10">
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="border-b border-black/[0.06]">
              <th className={thClsLeft}>{t('transfers.monthly.date')}</th>
              <th className={thCls}>{t('transfers.monthly.banka')}</th>
              <th className={thCls}>{t('transfers.monthly.komisyon')}</th>
              <th className={thCls}>{t('transfers.monthly.kk')}</th>
              <th className={thCls}>{t('transfers.monthly.tether')}</th>
              <th className={thCls}>{t('transfers.monthly.usdCevirim')}</th>
              <th className={thCls}>{t('transfers.monthly.komSonUsd')}</th>
              <th className={thCls}>{t('transfers.monthly.finansPct')}</th>
              <th className={thCls}>{t('transfers.monthly.kur')}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-black/[0.04]">
            {rows.map((row) => {
              const isNegativeUsd = row.usd_cevirim < 0
              return (
                <tr key={row.day} className="hover:bg-black/[0.015] transition-colors">
                  <td className={tdClsLeft}>{fmtDay(row.day, lang)}</td>
                  <td className={tdCls}>
                    {row.bank_try > 0 ? `₺${fmtTry(row.bank_try - row.kk_try, lang)}` : '—'}
                  </td>
                  <td className={tdCls}>
                    {row.commission_try > 0 ? `₺${fmtTry(row.commission_try, lang)}` : '—'}
                  </td>
                  <td className={tdCls}>{row.kk_try > 0 ? `₺${fmtTry(row.kk_try, lang)}` : '—'}</td>
                  <td
                    className={`${tdCls} ${row.usdt_net < 0 ? 'text-red' : row.usdt_net > 0 ? 'text-black/70' : ''}`}
                  >
                    {row.usdt_net !== 0
                      ? `${row.usdt_net < 0 ? '-' : ''}$${fmtUsd(Math.abs(row.usdt_net), lang)}`
                      : '—'}
                  </td>
                  <td className={`${tdCls} ${isNegativeUsd ? 'text-red' : ''}`}>
                    {`${row.usd_cevirim < 0 ? '-' : ''}$${fmtUsd(Math.abs(row.usd_cevirim), lang)}`}
                  </td>
                  <td className={`${tdCls} ${row.kom_son_usd < 0 ? 'text-red' : ''}`}>
                    {`${row.kom_son_usd < 0 ? '-' : ''}$${fmtUsd(Math.abs(row.kom_son_usd), lang)}`}
                  </td>
                  <td className={tdCls}>{fmtPct(row.finans_pct)}</td>
                  <td className={tdCls}>{fmtRate(row.avg_rate)}</td>
                </tr>
              )
            })}
          </tbody>
          <tfoot>
            <tr className="border-t-2 border-black/10">
              <td className={tdTotalClsLeft}>{t('transfers.monthly.total')}</td>
              <td className={tdTotalCls}>{`₺${fmtTry(totals.bank_try - totals.kk_try, lang)}`}</td>
              <td className={tdTotalCls}>{`₺${fmtTry(totals.commission_try, lang)}`}</td>
              <td className={tdTotalCls}>
                {totals.kk_try > 0 ? `₺${fmtTry(totals.kk_try, lang)}` : '—'}
              </td>
              <td className={`${tdTotalCls} ${totals.usdt_net < 0 ? 'text-red' : ''}`}>
                {`${totals.usdt_net < 0 ? '-' : ''}$${fmtUsd(Math.abs(totals.usdt_net), lang)}`}
              </td>
              <td className={`${tdTotalCls} ${totals.usd_cevirim < 0 ? 'text-red' : ''}`}>
                {`${totals.usd_cevirim < 0 ? '-' : ''}$${fmtUsd(Math.abs(totals.usd_cevirim), lang)}`}
              </td>
              <td className={`${tdTotalCls} ${totals.kom_son_usd < 0 ? 'text-red' : ''}`}>
                {`${totals.kom_son_usd < 0 ? '-' : ''}$${fmtUsd(Math.abs(totals.kom_son_usd), lang)}`}
              </td>
              <td className={tdTotalCls}>{fmtPct(totalFinansPct)}</td>
              <td className={tdTotalCls}>—</td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  )
}

/* ── Main component ────────────────────────────────── */

interface MonthlyChartsProps {
  data: MonthlySummaryData
  lang: string
}

export function MonthlyCharts({ data, lang }: MonthlyChartsProps) {
  const { t } = useTranslation('pages')
  const ct = useChartTheme()

  return (
    <div className="space-y-lg">
      {/* Daily breakdown table */}
      <DailyBreakdownTable rows={data.daily_detailed} lang={lang} />

      {/* Charts: Daily Volume + Daily Net */}
      <div className="grid grid-cols-1 gap-md lg:grid-cols-2">
        {/* Daily Volume Bar Chart */}
        <div>
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
                  tickFormatter={formatCompact}
                  tick={ct.axisTick}
                  axisLine={false}
                  tickLine={false}
                  width={55}
                />
                <Tooltip
                  formatter={(value: number, name: string) => [
                    `${formatNumber(value, lang)} ₺`,
                    name === 'deposits'
                      ? t('transfers.monthly.deposits')
                      : t('transfers.monthly.withdrawals'),
                  ]}
                  labelFormatter={(label: string) => formatDay(label)}
                  contentStyle={ct.tooltipStyle}
                />
                <Bar dataKey="deposits" fill={GREEN} radius={[2, 2, 0, 0]} stackId="volume" />
                <Bar dataKey="withdrawals" fill={RED} radius={[2, 2, 0, 0]} stackId="volume" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Daily Net Line Chart */}
        <div>
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
                  tickFormatter={formatCompact}
                  tick={ct.axisTick}
                  axisLine={false}
                  tickLine={false}
                  width={55}
                />
                <Tooltip
                  formatter={(value: number) => [
                    `${formatNumber(value, lang)} ₺`,
                    t('transfers.monthly.net'),
                  ]}
                  labelFormatter={(label: string) => formatDay(label)}
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

      {/* Breakdowns */}
      <div className="grid grid-cols-1 gap-md lg:grid-cols-2">
        <BreakdownCard
          title={t('transfers.monthly.pspBreakdown')}
          items={data.psp_breakdown}
          lang={lang}
        />
        <BreakdownCard
          title={t('transfers.monthly.paymentMethodBreakdown')}
          items={data.payment_method_breakdown}
          lang={lang}
        />
        <CategoryBreakdownCard
          title={t('transfers.monthly.categoryBreakdown')}
          items={data.category_breakdown}
          lang={lang}
          t={t}
        />
        <BreakdownCard
          title={t('transfers.monthly.currencySplit')}
          items={data.currency_split}
          suffix="₺"
          lang={lang}
          valueKey="volume_try"
        />
        <BreakdownCard
          title={t('transfers.monthly.commissionByPsp')}
          items={data.commission_by_psp}
          lang={lang}
          valueKey="commission"
        />
        <BreakdownCard
          title={t('transfers.monthly.typeBreakdown')}
          items={data.type_breakdown}
          lang={lang}
        />
      </div>

      {/* Top Customers — full width */}
      {data.top_customers && data.top_customers.length > 0 && (
        <BreakdownCard
          title={t('transfers.monthly.topCustomers')}
          items={data.top_customers}
          lang={lang}
        />
      )}
    </div>
  )
}
