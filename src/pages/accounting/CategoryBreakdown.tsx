import { useTranslation } from 'react-i18next'
import { ChartPie } from '@phosphor-icons/react'
import { useCategoryBreakdown } from '@/hooks/queries/useAccountingQuery'
import { Card, Skeleton, EmptyState } from '@ds'

const PALETTE = [
  'bg-brand',
  'bg-blue',
  'bg-green',
  'bg-orange',
  'bg-purple',
  'bg-red',
  'bg-teal',
  'bg-pink',
]

function formatCurrency(n: number) {
  return n.toLocaleString('tr-TR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })
}

interface CategoryBreakdownProps {
  period: string // YYYY-MM
}

export function CategoryBreakdown({ period }: CategoryBreakdownProps) {
  const { t } = useTranslation('pages')
  const { data: breakdown = [], isLoading } = useCategoryBreakdown(period)

  const totalAmount = breakdown.reduce((sum, item) => sum + item.total_amount, 0)
  const maxAmount = breakdown.length > 0 ? Math.max(...breakdown.map((b) => b.total_amount)) : 0

  if (isLoading) {
    return (
      <Card padding="default" className="rounded-xl border border-black/10 bg-bg1">
        <div className="mb-4">
          <Skeleton className="h-4 w-40 rounded" />
        </div>
        <div className="space-y-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="space-y-2">
              <div className="flex items-center justify-between">
                <Skeleton className="h-3.5 w-28 rounded" />
                <Skeleton className="h-3.5 w-20 rounded" />
              </div>
              <Skeleton className="h-2 w-full rounded-full" />
            </div>
          ))}
        </div>
      </Card>
    )
  }

  if (breakdown.length === 0) {
    return (
      <EmptyState
        icon={ChartPie}
        title={t('accounting.overview.noCategoryData', 'No category data')}
        description={t(
          'accounting.overview.noCategoryDataDesc',
          'Add entries to see the breakdown',
        )}
      />
    )
  }

  return (
    <Card padding="default" className="rounded-xl border border-black/10 bg-bg1">
      {/* Header */}
      <p className="mb-4 text-xs font-semibold uppercase tracking-wider text-black/40">
        {t('accounting.overview.categoryBreakdown', 'Category Breakdown')}
      </p>

      {/* Category rows */}
      <div className="space-y-3.5">
        {breakdown.map((item, index) => {
          const color = PALETTE[index % PALETTE.length]
          const percent = totalAmount > 0 ? (item.total_amount / totalAmount) * 100 : 0
          const barWidth = maxAmount > 0 ? (item.total_amount / maxAmount) * 100 : 0

          return (
            <div key={item.category_name} className="space-y-1.5">
              {/* Label row */}
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 min-w-0">
                  <span className={`inline-block size-2 shrink-0 rounded-full ${color}`} />
                  <span className="truncate text-sm font-medium text-black/70">
                    {item.category_label}
                  </span>
                  <span className="shrink-0 rounded-full bg-black/[0.06] px-1.5 py-0.5 text-[10px] font-medium tabular-nums text-black/40">
                    {item.entry_count}
                  </span>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <span className="font-mono text-sm font-medium tabular-nums text-black/70">
                    {formatCurrency(item.total_amount)}
                  </span>
                  <span className="font-mono text-xs tabular-nums text-black/35">
                    {percent.toFixed(1)}%
                  </span>
                </div>
              </div>

              {/* Progress bar */}
              <div className="flex h-1.5 overflow-hidden rounded-full bg-black/[0.04]">
                <div
                  className={`${color} rounded-full transition-all`}
                  style={{ width: `${barWidth}%` }}
                />
              </div>
            </div>
          )
        })}
      </div>
    </Card>
  )
}
