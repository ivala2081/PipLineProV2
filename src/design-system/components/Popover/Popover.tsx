import * as PopoverPrimitive from '@radix-ui/react-popover'
import type { ComponentProps, FC } from 'react'
import { cn } from '@ds/utils'

export const Popover = PopoverPrimitive.Root
export const PopoverTrigger = PopoverPrimitive.Trigger
export const PopoverAnchor = PopoverPrimitive.Anchor

export type PopoverContentProps = ComponentProps<typeof PopoverPrimitive.Content>
export const PopoverContent: FC<PopoverContentProps> = ({
  className,
  align = 'center',
  sideOffset = 4,
  ...props
}) => (
  <PopoverPrimitive.Portal>
    <PopoverPrimitive.Content
      align={align}
      sideOffset={sideOffset}
      className={cn(
        'ui-surface z-50 w-72 rounded-xl bg-bg1 p-4 text-black shadow-md outline-none',
        className,
      )}
      {...props}
    />
  </PopoverPrimitive.Portal>
)
PopoverContent.displayName = 'PopoverContent'
