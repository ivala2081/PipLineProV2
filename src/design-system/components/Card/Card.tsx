import { cva, type VariantProps } from 'class-variance-authority'
import type { ComponentProps, FC } from 'react'
import { cn } from '@ds/utils'

const cardStyles = cva('rounded-2xl bg-bg5 text-black p-6', {
  variants: {
    bordered: {
      true: 'border-[0.5px] inset-0.5 border-black/40',
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
