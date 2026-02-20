import { cva, type VariantProps } from 'class-variance-authority'
import type { ComponentProps, FC } from 'react'
import { cn } from '@ds/utils'

/**
 * Responsive Grid — collapses from max `cols` down to 1 column on small screens.
 * Using this instead of bare `grid grid-cols-*` ensures every grid is responsive
 * automatically as part of the design system.
 *
 * cols=1: always 1 column
 * cols=2: 1 → sm:2
 * cols=3: 1 → sm:2 → lg:3
 * cols=4: 1 → sm:2 → lg:4
 * cols=5: 2 → sm:3 → lg:5
 */
const gridVariants = cva('grid', {
  variants: {
    cols: {
      1: 'grid-cols-1',
      2: 'grid-cols-1 sm:grid-cols-2',
      3: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3',
      4: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-4',
      5: 'grid-cols-2 sm:grid-cols-3 lg:grid-cols-5',
    },
    gap: {
      xs: 'gap-xs',
      sm: 'gap-sm',
      md: 'gap-md',
      lg: 'gap-lg',
    },
  },
  defaultVariants: {
    cols: 2,
    gap: 'md',
  },
})

export type GridProps = ComponentProps<'div'> & VariantProps<typeof gridVariants>

export const Grid: FC<GridProps> = ({ cols, gap, className, ...props }) => (
  <div className={cn(gridVariants({ cols, gap }), className)} {...props} />
)
Grid.displayName = 'Grid'
