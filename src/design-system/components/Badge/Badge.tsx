import type { ComponentProps, FC } from 'react'
import { cn } from '@ds/utils'
import { Typography } from '../Text'

export type BadgeComponentProps = ComponentProps<'span'> & {
  content?: string
}

export const BadgeComponent: FC<BadgeComponentProps> = ({ content, className, ...props }) => (
  <span
    className={cn(
      'absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-red px-1',
      className,
    )}
    {...props}
  >
    <Typography size={12} className="text-white">
      {content}
    </Typography>
  </span>
)

BadgeComponent.displayName = 'BadgeComponent'

export type BadgeProps = ComponentProps<'div'> & {
  content?: string
}

export const Badge: FC<BadgeProps> = ({ content, children, className, ...props }) => (
  <div className={cn('relative inline-flex', className)} {...props}>
    {children}
    {content != null && content !== '' ? <BadgeComponent content={content} /> : null}
  </div>
)

Badge.displayName = 'Badge'
