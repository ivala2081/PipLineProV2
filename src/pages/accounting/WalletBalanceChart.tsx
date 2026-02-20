import { useTranslation } from 'react-i18next'
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from 'recharts'
import { useWalletChartQuery } from '@/hooks/queries/useWalletChartQuery'
import { Skeleton } from '@ds'

function formatShortDate(dateStr: string): string {
  const d = new Date(dateStr + 'T00:00:00')
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

function formatUsd(value: number): string {
  return (
    '$' +
    value.toLocaleString('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })
  )
}

interface WalletBalanceChartProps {
  walletId: string
}

export function WalletBalanceChart({ walletId }: WalletBalanceChartProps) {
  const { t } = useTranslation('pages')
  const { chartData, isLoading } = useWalletChartQuery(walletId)

  if (isLoading) {
    return (
      <div>
        <h3 className="mb-3 text-sm font-semibold text-black/70">
          {t('accounting.wallets.balanceHistory', 'Balance History')}
        </h3>
        <Skeleton className="h-48 w-full rounded-xl" />
      </div>
    )
  }

  if (chartData.length < 2) return null

  return (
    <div>
      <h3 className="mb-3 text-sm font-semibold text-black/70">
        {t('accounting.wallets.balanceHistory', 'Balance History')}
      </h3>
      <div className="rounded-xl border border-black/10 bg-black/[0.015] p-4">
        <ResponsiveContainer width="100%" height={200}>
          <LineChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.06)" />
            <XAxis
              dataKey="date"
              tickFormatter={formatShortDate}
              tick={{ fontSize: 11, fill: 'rgba(0,0,0,0.4)' }}
              axisLine={{ stroke: 'rgba(0,0,0,0.08)' }}
              tickLine={false}
            />
            <YAxis
              tickFormatter={(v: number) => `$${v.toLocaleString()}`}
              tick={{ fontSize: 11, fill: 'rgba(0,0,0,0.4)' }}
              axisLine={false}
              tickLine={false}
              width={70}
            />
            <Tooltip
              formatter={(value: number) => [formatUsd(value), 'Total USD']}
              labelFormatter={formatShortDate}
              contentStyle={{
                fontSize: 12,
                borderRadius: 8,
                border: '1px solid rgba(0,0,0,0.08)',
                boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
              }}
            />
            <Line
              type="monotone"
              dataKey="totalUsd"
              stroke="#18181b"
              strokeWidth={2}
              dot={{ r: 3, fill: '#18181b' }}
              activeDot={{ r: 5 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}
