import * as LabelPrimitive from '@radix-ui/react-label'
import type { ComponentProps, FC } from 'react'
import { cn } from '@ds/utils'

export type LabelProps = ComponentProps<typeof LabelPrimitive.Root>

export const Label: FC<LabelProps> = ({ className, ...props }) => (
  <LabelPrimitive.Root
    className={cn(
      'text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-50',
      className,
    )}
    {...props}
  />
)

Label.displayName = 'Label'
