import type { ComponentProps, FC } from 'react'
import { cn } from '@ds/utils'

export type LinkProps = ComponentProps<'a'>

export const Link: FC<LinkProps> = ({ className, children, ...props }) => (
  <a
    className={cn(
      'text-brand underline-offset-4 transition-colors hover:underline focus:outline-none focus:ring-2 focus:ring-black/5 focus:ring-offset-2',
      className,
    )}
    {...props}
  >
    {children}
  </a>
)

Link.displayName = 'Link'
