import type { FC, ReactNode } from 'react'
import { cn } from '@ds/utils'

/**
 * PageHeader — responsive page title + subtitle + action buttons.
 *
 * Mobile  (<sm): title/subtitle stacked on top, actions below
 * Desktop (sm+): title/subtitle left, actions right on the same row
 *
 * Using this component ensures every page header is responsive automatically.
 */
export interface PageHeaderProps {
  title: ReactNode
  subtitle?: ReactNode
  actions?: ReactNode
  className?: string
}

export const PageHeader: FC<PageHeaderProps> = ({ title, subtitle, actions, className }) => (
  <div
    className={cn('flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between', className)}
  >
    <div className="min-w-0">
      <h1 className="text-lg font-semibold tracking-tight text-black md:text-xl">{title}</h1>
      {subtitle && <p className="mt-0.5 text-sm text-black/60">{subtitle}</p>}
    </div>
    {actions && <div className="flex shrink-0 flex-wrap items-center gap-sm">{actions}</div>}
  </div>
)
PageHeader.displayName = 'PageHeader'
