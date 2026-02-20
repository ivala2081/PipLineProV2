import type { ComponentType, FC, ReactNode } from 'react'
import type { IconProps } from '@phosphor-icons/react'
import { cn } from '@ds/utils'
import { Card } from '../Card'
import { Skeleton } from '../Skeleton'

export interface StatCardProps {
  icon: ComponentType<IconProps>
  iconBg?: string
  iconColor?: string
  label: string
  value: string | number
  isLoading?: boolean
  trend?: ReactNode
  className?: string
}

export const StatCard: FC<StatCardProps> = ({
  icon: Icon,
  iconBg = 'bg-black/5',
  iconColor = 'text-black/40',
  label,
  value,
  isLoading,
  trend,
  className,
}) => (
  <Card
    padding="default"
    className={cn('flex items-center gap-4 border border-black/10 bg-bg1', className)}
  >
    <div className={cn('flex size-10 items-center justify-center rounded-xl', iconBg)}>
      <Icon size={18} className={iconColor} />
    </div>
    <div className="min-w-0 flex-1">
      <p className="text-xs font-medium uppercase tracking-wider text-black/40">{label}</p>
      {isLoading ? (
        <Skeleton className="mt-1 h-6 w-16 rounded" />
      ) : (
        <p className="mt-0.5 text-xl font-semibold tabular-nums">{value}</p>
      )}
    </div>
    {trend}
  </Card>
)

StatCard.displayName = 'StatCard'
