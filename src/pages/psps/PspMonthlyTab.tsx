import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import {
  ArrowCircleDown,
  ArrowCircleUp,
  Coins,
  Percent,
  TrendUp,
  Export,
  CaretDown,
  FileXls,
  FileCsv,
} from '@phosphor-icons/react'
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
  Legend,
} from 'recharts'
import {
  Card,
  StatCard,
  EmptyState,
  Skeleton,
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
  Tag,
  Button,
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from '@ds'
import { useTheme } from '@ds'
import { usePspMonthlyQuery } from '@/hooks/queries/usePspMonthlyQuery'
import { exportPspMonthlyCsv } from '@/lib/csvExport/exportPspMonthlyCsv'
import { exportPspMonthlyXlsx } from '@/lib/csvExport/exportPspMonthlyXlsx'

/* ------------------------------------------------------------------ */
/*  Chart theme (matches dashboard pattern)                            */
/* ------------------------------------------------------------------ */

function useChartTheme() {
  const { resolvedTheme } = useTheme()
  const isDark = resolvedTheme === 'dark'
  return useMemo(
    () => ({
      isDark,
      gridStroke: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)',
      axisTick: { fontSize: 11, fill: isDark ? 'rgba(255,255,255,0.35)' : 'rgba(0,0,0,0.35)' },
      axisLine: { stroke: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)' },
      tooltipStyle: {
        fontSize: 12,
        borderRadius: 12,
        padding: '10px 14px',
        backgroundColor: isDark ? '#1e293b' : '#ffffff',
        color: isDark ? '#e2e8f0' : '#1e293b',
        border: isDark ? '1px solid rgba(255,255,255,0.08)' : '1px solid rgba(0,0,0,0.06)',
        boxShadow: isDark ? '0 4px 16px rgba(0,0,0,0.3)' : '0 4px 16px rgba(0,0,0,0.06)',
      },
      cursorStroke: isDark ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.08)',
    }),
    [isDark],
  )
}

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

function fmtNum(v: number): string {
  return v.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

function pctChange(current: number, previous: number): number | null {
  if (previous === 0) return null
  return ((current - previous) / Math.abs(previous)) * 100
}

function ChangeTag({ value }: { value: number | null }) {
  if (value == null) return <span className="text-xs text-black/30">—</span>
  const isUp = value >= 0
  return (
    <Tag variant={isUp ? 'green' : 'red'} size="sm">
      {isUp ? '+' : ''}
      {value.toFixed(1)}%
    </Tag>
  )
}

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

interface MonthlyTabProps {
  pspId: string
  pspName: string
  currency: string
}

export function MonthlyTab({ pspId, pspName, currency }: MonthlyTabProps) {
  const { t } = useTranslation('pages')
  const ct = useChartTheme()
  const { data: rows, isLoading } = usePspMonthlyQuery(pspId)

  // Sorted chronologically for charts (oldest first)
  const chronological = useMemo(() => (rows ? [...rows].reverse() : []), [rows])

  // Rows with MoM change (newest first for table)
  const rowsWithChange = useMemo(() => {
    if (!chronological.length) return []
    // Compute changes based on chronological order, then reverse for table display
    const withChange = chronological.map((row, i) => ({
      ...row,
      depositChange: i > 0 ? pctChange(row.depositTotal, chronological[i - 1].depositTotal) : null,
      withdrawalChange:
        i > 0 ? pctChange(row.withdrawalTotal, chronological[i - 1].withdrawalTotal) : null,
      netChange: i > 0 ? pctChange(row.netTotal, chronological[i - 1].netTotal) : null,
      commissionChange:
        i > 0 ? pctChange(row.commissionTotal, chronological[i - 1].commissionTotal) : null,
    }))
    return [...withChange].reverse()
  }, [chronological])

  // Aggregated totals
  const totals = useMemo(() => {
    if (!rows?.length) return null
    return rows.reduce(
      (acc, r) => ({
        deposits: acc.deposits + r.depositTotal,
        withdrawals: acc.withdrawals + r.withdrawalTotal,
        commission: acc.commission + r.commissionTotal,
        net: acc.net + r.netTotal,
        settlements: acc.settlements + r.settlementTotal,
        transfers: acc.transfers + r.transferCount,
      }),
      { deposits: 0, withdrawals: 0, commission: 0, net: 0, settlements: 0, transfers: 0 },
    )
  }, [rows])

  if (isLoading) {
    return (
      <div className="space-y-4 py-4">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-20 rounded-xl" />
          ))}
        </div>
        <Skeleton className="h-64 rounded-xl" />
      </div>
    )
  }

  if (!rows?.length) {
    return (
      <div className="py-8">
        <EmptyState title={t('psps.monthly.noData', 'No monthly data yet.')} icon={TrendUp} />
      </div>
    )
  }

  const cur = currency

  return (
    <div className="space-y-6 py-4">
      {/* ── Summary Cards ── */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatCard
          icon={ArrowCircleDown}
          iconBg="bg-green-500/10"
          iconColor="text-green-600"
          label={t('psps.monthly.totalDeposits', 'Total Deposits')}
          value={`${fmtNum(totals!.deposits)} ${cur}`}
        />
        <StatCard
          icon={ArrowCircleUp}
          iconBg="bg-red-500/10"
          iconColor="text-red-500"
          label={t('psps.monthly.totalWithdrawals', 'Total Withdrawals')}
          value={`${fmtNum(totals!.withdrawals)} ${cur}`}
        />
        <StatCard
          icon={Coins}
          label={t('psps.monthly.totalNet', 'Total Net')}
          value={`${fmtNum(totals!.net)} ${cur}`}
        />
        <StatCard
          icon={Percent}
          iconBg="bg-purple-500/10"
          iconColor="text-purple-500"
          label={t('psps.monthly.totalCommission', 'Total Commission')}
          value={`${fmtNum(totals!.commission)} ${cur}`}
        />
      </div>

      {/* ── Charts Row ── */}
      <div className="grid gap-4 lg:grid-cols-2">
        {/* Volume Trend Bar Chart */}
        <Card padding="default" className="border border-black/10 bg-bg1">
          <h3 className="mb-3 text-sm font-semibold">
            {t('psps.monthly.volumeTrend', 'Volume Trend')}
          </h3>
          <div className="min-h-[250px] md:min-h-[350px]">
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={chronological} barGap={2}>
                <CartesianGrid strokeDasharray="3 3" stroke={ct.gridStroke} vertical={false} />
                <XAxis dataKey="monthLabel" tick={ct.axisTick} axisLine={ct.axisLine} />
                <YAxis tick={ct.axisTick} axisLine={ct.axisLine} width={60} />
                <Tooltip contentStyle={ct.tooltipStyle} cursor={{ fill: ct.cursorStroke }} />
                <Legend />
                <Bar
                  dataKey="depositTotal"
                  name={t('psps.monthly.deposits', 'Deposits')}
                  fill="#22c55e"
                  radius={[4, 4, 0, 0]}
                />
                <Bar
                  dataKey="withdrawalTotal"
                  name={t('psps.monthly.withdrawals', 'Withdrawals')}
                  fill="#ef4444"
                  radius={[4, 4, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>

        {/* Net & Settlement Line Chart */}
        <Card padding="default" className="border border-black/10 bg-bg1">
          <h3 className="mb-3 text-sm font-semibold">
            {t('psps.monthly.netTrend', 'Net & Settlement Trend')}
          </h3>
          <div className="min-h-[250px] md:min-h-[350px]">
            <ResponsiveContainer width="100%" height={260}>
              <LineChart data={chronological}>
                <CartesianGrid strokeDasharray="3 3" stroke={ct.gridStroke} vertical={false} />
                <XAxis dataKey="monthLabel" tick={ct.axisTick} axisLine={ct.axisLine} />
                <YAxis tick={ct.axisTick} axisLine={ct.axisLine} width={60} />
                <Tooltip
                  contentStyle={ct.tooltipStyle}
                  cursor={{ strokeDasharray: '4 4', stroke: ct.cursorStroke }}
                />
                <Legend />
                <Line
                  type="monotone"
                  dataKey="netTotal"
                  name={t('psps.monthly.net', 'Net')}
                  stroke="#3b82f6"
                  strokeWidth={2}
                  dot={{ r: 4 }}
                />
                <Line
                  type="monotone"
                  dataKey="settlementTotal"
                  name={t('psps.monthly.settlement', 'Settlement')}
                  stroke="#f59e0b"
                  strokeWidth={2}
                  dot={{ r: 4 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>

      {/* ── Commission Analysis Card ── */}
      <Card padding="default" className="border border-black/10 bg-bg1">
        <h3 className="mb-3 text-sm font-semibold">
          {t('psps.monthly.commissionAnalysis', 'Commission Analysis')}
        </h3>
        <div className="min-h-[250px] md:min-h-[350px]">
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={chronological} barGap={2}>
              <CartesianGrid strokeDasharray="3 3" stroke={ct.gridStroke} vertical={false} />
              <XAxis dataKey="monthLabel" tick={ct.axisTick} axisLine={ct.axisLine} />
              <YAxis tick={ct.axisTick} axisLine={ct.axisLine} width={60} />
              <Tooltip contentStyle={ct.tooltipStyle} cursor={{ fill: ct.cursorStroke }} />
              <Bar
                dataKey="commissionTotal"
                name={t('psps.monthly.commission', 'Commission')}
                fill="#a855f7"
                radius={[4, 4, 0, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </Card>

      {/* ── Monthly Breakdown Table ── */}
      <Card padding="default" className="border border-black/10 bg-bg1">
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-sm font-semibold">
            {t('psps.monthly.monthlyBreakdown', 'Monthly Breakdown')}
          </h3>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm">
                <Export size={14} className="mr-1.5" />
                {t('psps.monthly.export', 'Export')}
                <CaretDown size={12} />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => exportPspMonthlyCsv(rows, pspName, currency)}>
                <FileCsv size={16} className="mr-2" />
                {t('psps.monthly.exportCsv', 'Export CSV')}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => exportPspMonthlyXlsx(rows, pspName, currency)}>
                <FileXls size={16} className="mr-2" />
                {t('psps.monthly.exportXlsx', 'Export Excel')}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t('psps.monthly.month', 'Month')}</TableHead>
                <TableHead className="text-right">
                  {t('psps.monthly.deposits', 'Deposits')}
                </TableHead>
                <TableHead className="text-right">
                  {t('psps.monthly.withdrawals', 'Withdrawals')}
                </TableHead>
                <TableHead className="text-right">
                  {t('psps.monthly.commission', 'Commission')}
                </TableHead>
                <TableHead className="text-right">{t('psps.monthly.net', 'Net')}</TableHead>
                <TableHead className="text-right">
                  {t('psps.monthly.settlement', 'Settlement')}
                </TableHead>
                <TableHead className="text-right">
                  {t('psps.monthly.transfers', 'Transfers')}
                </TableHead>
                <TableHead className="text-right">{t('psps.monthly.change', 'MoM')}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rowsWithChange.map((row) => (
                <TableRow key={`${row.year}-${row.month}`}>
                  <TableCell className="font-medium">{row.monthLabel}</TableCell>
                  <TableCell className="text-right tabular-nums">
                    {fmtNum(row.depositTotal)}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {fmtNum(row.withdrawalTotal)}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {fmtNum(row.commissionTotal)}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">{fmtNum(row.netTotal)}</TableCell>
                  <TableCell className="text-right tabular-nums">
                    {fmtNum(row.settlementTotal)}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">{row.transferCount}</TableCell>
                  <TableCell className="text-right">
                    <ChangeTag value={row.depositChange} />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </Card>
    </div>
  )
}
