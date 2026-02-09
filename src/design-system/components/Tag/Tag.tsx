import { cva, type VariantProps } from 'class-variance-authority'
import type { ComponentProps, FC } from 'react'
import { cn } from '@ds/utils'

const tagVariants = cva(
  'inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-xs font-medium transition-colors',
  {
    variants: {
      variant: {
        default: 'bg-black/5 text-black',
        purple: 'bg-purple/20 text-purple',
        blue: 'bg-blue/20 text-blue',
        green: 'bg-green/20 text-green',
        red: 'bg-red/20 text-red',
        yellow: 'bg-yellow/20 text-yellow',
        orange: 'bg-orange/20 text-orange',
        indigo: 'bg-indigo/20 text-indigo',
        cyan: 'bg-cyan/20 text-cyan',
        mint: 'bg-mint/20 text-mint',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  },
)

export type TagProps = ComponentProps<'span'> & VariantProps<typeof tagVariants>

export const Tag: FC<TagProps> = ({ variant, className, ...props }) => (
  <span className={cn(tagVariants({ variant }), className)} {...props} />
)

Tag.displayName = 'Tag'
