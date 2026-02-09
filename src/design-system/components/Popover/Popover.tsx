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
        'z-50 w-72 rounded-xl bg-bg1 p-4 text-black shadow-md outline-none',
        'data-[state=open]:animate-in data-[state=closed]:animate-out',
        'data-[side=bottom]:animate-slide-in-from-top data-[side=top]:animate-slide-in-from-bottom',
        'data-[side=left]:animate-slide-in-from-right data-[side=right]:animate-slide-in-from-left',
        className,
      )}
      {...props}
    />
  </PopoverPrimitive.Portal>
)
PopoverContent.displayName = 'PopoverContent'
