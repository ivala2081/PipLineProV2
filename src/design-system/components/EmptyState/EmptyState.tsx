import type { ComponentType, FC, ReactNode } from 'react'
import type { IconProps } from '@phosphor-icons/react'
import { cn } from '@ds/utils'

export interface EmptyStateProps {
  icon: ComponentType<IconProps>
  title: string
  description?: string
  action?: ReactNode
  className?: string
}

export const EmptyState: FC<EmptyStateProps> = ({
  icon: Icon,
  title,
  description,
  action,
  className,
}) => (
  <div
    className={cn(
      'flex flex-col items-center justify-center gap-3 rounded-xl border border-black/10 bg-bg1 py-10 md:py-20',
      className,
    )}
  >
    <div className="flex size-12 items-center justify-center rounded-full bg-black/5">
      <Icon size={20} className="text-black/30" />
    </div>
    <div className="text-center">
      <p className="text-sm font-medium text-black/60">{title}</p>
      {description && <p className="mt-1 text-xs text-black/40">{description}</p>}
    </div>
    {action}
  </div>
)

EmptyState.displayName = 'EmptyState'
