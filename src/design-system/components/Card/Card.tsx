import { cva, type VariantProps } from 'class-variance-authority'
import type { ComponentProps, FC } from 'react'
import { cn } from '@ds/utils'

const cardStyles = cva(
  'ui-surface rounded-xl md:rounded-2xl border border-black/10 bg-bg5 text-black',
  {
    variants: {
      bordered: {
        true: 'border-black/25',
        false: '',
      },
      padding: {
        none: '',
        compact: 'p-3 md:p-md' /* 12→16px — data-dense panels */,
        default: 'p-3 md:p-card' /* 12→20px — standard card */,
        spacious: 'p-md md:p-lg' /* 16→24px — content-heavy blocks */,
      },
    },
    defaultVariants: {
      bordered: false,
      padding: 'default',
    },
  },
)

export type CardProps = ComponentProps<'div'> & VariantProps<typeof cardStyles>

export const Card: FC<CardProps> = ({ bordered, padding, className, ...props }) => (
  <div className={cn(cardStyles({ bordered, padding }), className)} {...props} />
)

Card.displayName = 'Card'
