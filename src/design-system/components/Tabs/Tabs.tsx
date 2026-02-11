import * as TabsPrimitive from '@radix-ui/react-tabs'
import type { ComponentProps, FC } from 'react'
import { cn } from '@ds/utils'

export type TabsProps = ComponentProps<typeof TabsPrimitive.Root>
export const Tabs: FC<TabsProps> = (props) => <TabsPrimitive.Root {...props} />
Tabs.displayName = 'Tabs'

export type TabsListProps = ComponentProps<typeof TabsPrimitive.List>
export const TabsList: FC<TabsListProps> = ({ className, ...props }) => (
  <TabsPrimitive.List
    className={cn(
      'inline-flex h-10 items-center justify-center gap-1 rounded-xl bg-black/5 p-1 text-black/40',
      className,
    )}
    {...props}
  />
)
TabsList.displayName = 'TabsList'

export type TabsTriggerProps = ComponentProps<typeof TabsPrimitive.Trigger>
export const TabsTrigger: FC<TabsTriggerProps> = ({ className, ...props }) => (
  <TabsPrimitive.Trigger
    className={cn(
      'inline-flex items-center justify-center whitespace-nowrap rounded-lg px-3 py-1.5 text-sm font-medium',
      'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black/5 focus-visible:ring-offset-2',
      'disabled:pointer-events-none disabled:opacity-50',
      'data-[state=active]:bg-white data-[state=active]:text-black data-[state=active]:shadow-sm',
      className,
    )}
    {...props}
  />
)
TabsTrigger.displayName = 'TabsTrigger'

export type TabsContentProps = ComponentProps<typeof TabsPrimitive.Content>
export const TabsContent: FC<TabsContentProps> = ({ className, ...props }) => (
  <TabsPrimitive.Content
    className={cn(
      'mt-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black/5 focus-visible:ring-offset-2',
      className,
    )}
    {...props}
  />
)
TabsContent.displayName = 'TabsContent'
