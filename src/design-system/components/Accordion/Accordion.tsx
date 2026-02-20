import * as AccordionPrimitive from '@radix-ui/react-accordion'
import { CaretDown } from '@phosphor-icons/react'
import type { ComponentProps, FC } from 'react'
import { cn } from '@ds/utils'

export const Accordion = AccordionPrimitive.Root

export type AccordionItemProps = ComponentProps<typeof AccordionPrimitive.Item>
export const AccordionItem: FC<AccordionItemProps> = ({ className, ...props }) => (
  <AccordionPrimitive.Item className={cn('border-b border-black/10', className)} {...props} />
)
AccordionItem.displayName = 'AccordionItem'

export type AccordionTriggerProps = ComponentProps<typeof AccordionPrimitive.Trigger>
export const AccordionTrigger: FC<AccordionTriggerProps> = ({ className, children, ...props }) => (
  <AccordionPrimitive.Header className="flex">
    <AccordionPrimitive.Trigger
      className={cn(
        'flex flex-1 items-center justify-between py-4 text-sm font-medium hover:underline [&[data-state=open]>svg]:rotate-180',
        className,
      )}
      {...props}
    >
      {children}
      <CaretDown size={16} className="shrink-0 text-black/40" />
    </AccordionPrimitive.Trigger>
  </AccordionPrimitive.Header>
)
AccordionTrigger.displayName = 'AccordionTrigger'

export type AccordionContentProps = ComponentProps<typeof AccordionPrimitive.Content>
export const AccordionContent: FC<AccordionContentProps> = ({ className, children, ...props }) => (
  <AccordionPrimitive.Content className="overflow-hidden text-sm" {...props}>
    <div className={cn('pb-4 pt-0', className)}>{children}</div>
  </AccordionPrimitive.Content>
)
AccordionContent.displayName = 'AccordionContent'
