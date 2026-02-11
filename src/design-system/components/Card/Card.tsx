import { cva, type VariantProps } from 'class-variance-authority'
import type { ComponentProps, FC } from 'react'
import { cn } from '@ds/utils'

const cardStyles = cva(
  'ui-surface rounded-2xl border border-black/10 bg-bg5 text-black p-6',
  {
  variants: {
    bordered: {
      true: 'border-black/25',
      false: '',
    },
  },
  defaultVariants: {
    bordered: false,
  },
})

export type CardProps = ComponentProps<'div'> & VariantProps<typeof cardStyles>

export const Card: FC<CardProps> = ({ bordered, className, ...props }) => (
  <div className={cn(cardStyles({ bordered }), className)} {...props} />
)

Card.displayName = 'Card'
