import * as TooltipPrimitive from '@radix-ui/react-tooltip'
import type { ComponentProps, FC } from 'react'
import { cn } from '@ds/utils'

export const TooltipProvider = TooltipPrimitive.Provider
export const Tooltip = TooltipPrimitive.Root
export const TooltipTrigger = TooltipPrimitive.Trigger

export type TooltipContentProps = ComponentProps<typeof TooltipPrimitive.Content>
export const TooltipContent: FC<TooltipContentProps> = ({
  className,
  sideOffset = 4,
  ...props
}) => (
  <TooltipPrimitive.Portal>
    <TooltipPrimitive.Content
      sideOffset={sideOffset}
      className={cn(
        'z-50 overflow-hidden rounded-lg bg-black px-3 py-1.5 text-xs text-white shadow-md',
        className,
      )}
      {...props}
    />
  </TooltipPrimitive.Portal>
)
TooltipContent.displayName = 'TooltipContent'
