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
import type { MonthlySummaryData } from '@/hooks/queries/useMonthlyAnalysisQuery'

function formatNumber(n: number, lang: string) {
  return n.toLocaleString(lang === 'tr' ? 'tr-TR' : 'en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })
}

/* ── Chart style constants ─────────────────────────── */

const GRID_STROKE = 'rgba(0,0,0,0.06)'
const AXIS_TICK = { fontSize: 11, fill: 'rgba(0,0,0,0.4)' }
const AXIS_LINE = { stroke: 'rgba(0,0,0,0.08)' }
const TOOLTIP_STYLE = {
  fontSize: 12,
  borderRadius: 8,
  border: '1px solid rgba(0,0,0,0.08)',
  boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
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

/* ── Breakdown row ─────────────────────────────────── */

function BreakdownRow({
  rank,
  name,
  value,
  suffix,
  count,
  lang,
}: {
  rank: number
  name: string
  value: number
  suffix: string
  count: number
  lang: string
}) {
  return (
    <div className="flex items-center justify-between px-4 py-2.5">
      <div className="flex items-center gap-2.5">
        <span className="w-5 font-mono text-xs text-black/25">{rank}</span>
        <span className="text-sm text-black/70">{name}</span>
      </div>
      <div className="flex items-center gap-3">
        <span className="font-mono text-sm font-semibold tabular-nums text-black/70">
          {formatNumber(value, lang)} {suffix}
        </span>
        <span className="min-w-[40px] text-right text-xs tabular-nums text-black/30">
          {count}x
        </span>
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

  return (
    <div>
      <h3 className="mb-2 text-sm font-semibold text-black/60">{title}</h3>
      <div className="divide-y divide-black/[0.06] overflow-hidden rounded-xl border border-black/10">
        {items.map((item, i) => (
          <BreakdownRow
            key={item.name as string}
            rank={i + 1}
            name={item.name as string}
            value={Number(item[valueKey] ?? 0)}
            suffix={suffix}
            count={Number(item.count ?? 0)}
            lang={lang}
          />
        ))}
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

  return (
    <div className="space-y-6">
      {/* Charts: Daily Volume + Daily Net */}
      <div className="grid grid-cols-2 gap-4">
        {/* Daily Volume Bar Chart */}
        <div>
          <h3 className="mb-2 text-sm font-semibold text-black/60">
            {t('transfers.monthly.dailyVolume')}
          </h3>
          <div className="rounded-xl border border-black/10 bg-black/[0.015] p-4">
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={data.daily_volume}>
                <CartesianGrid strokeDasharray="3 3" stroke={GRID_STROKE} />
                <XAxis
                  dataKey="day"
                  tickFormatter={formatDay}
                  tick={AXIS_TICK}
                  axisLine={AXIS_LINE}
                  tickLine={false}
                />
                <YAxis
                  tickFormatter={formatCompact}
                  tick={AXIS_TICK}
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
                  contentStyle={TOOLTIP_STYLE}
                />
                <Bar
                  dataKey="deposits"
                  fill={GREEN}
                  radius={[2, 2, 0, 0]}
                  stackId="volume"
                />
                <Bar
                  dataKey="withdrawals"
                  fill={RED}
                  radius={[2, 2, 0, 0]}
                  stackId="volume"
                />
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
                <CartesianGrid strokeDasharray="3 3" stroke={GRID_STROKE} />
                <XAxis
                  dataKey="day"
                  tickFormatter={formatDay}
                  tick={AXIS_TICK}
                  axisLine={AXIS_LINE}
                  tickLine={false}
                />
                <YAxis
                  tickFormatter={formatCompact}
                  tick={AXIS_TICK}
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
                  contentStyle={TOOLTIP_STYLE}
                />
                <Line
                  type="monotone"
                  dataKey="net"
                  stroke="#18181b"
                  strokeWidth={2}
                  dot={{ r: 2.5, fill: '#18181b' }}
                  activeDot={{ r: 4 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Breakdowns: 2-column grid */}
      <div className="grid grid-cols-2 gap-4">
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
        <BreakdownCard
          title={t('transfers.monthly.categoryBreakdown')}
          items={data.category_breakdown}
          lang={lang}
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
        <div>
          <h3 className="mb-2 text-sm font-semibold text-black/60">
            {t('transfers.monthly.topCustomers')}
          </h3>
          <div className="divide-y divide-black/[0.06] overflow-hidden rounded-xl border border-black/10">
            {data.top_customers.map((item, i) => (
              <BreakdownRow
                key={item.name}
                rank={i + 1}
                name={item.name}
                value={item.volume}
                suffix="₺"
                count={item.count}
                lang={lang}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
