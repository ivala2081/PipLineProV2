import * as SeparatorPrimitive from '@radix-ui/react-separator'
import type { ComponentProps, FC } from 'react'
import { cn } from '@ds/utils'

export type SeparatorProps = ComponentProps<typeof SeparatorPrimitive.Root>

export const Separator: FC<SeparatorProps> = ({
  className,
  orientation = 'horizontal',
  decorative = true,
  ...props
}) => (
  <SeparatorPrimitive.Root
    decorative={decorative}
    orientation={orientation}
    className={cn(
      'shrink-0 bg-black/10',
      orientation === 'horizontal' ? 'h-[1px] w-full' : 'h-full w-[1px]',
      className,
    )}
    {...props}
  />
)

Separator.displayName = 'Separator'
