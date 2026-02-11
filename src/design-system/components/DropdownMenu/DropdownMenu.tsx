import * as DropdownMenuPrimitive from '@radix-ui/react-dropdown-menu'
import { Check, CaretRight, Circle } from '@phosphor-icons/react'
import type { ComponentProps, FC } from 'react'
import { cn } from '@ds/utils'

export const DropdownMenu = DropdownMenuPrimitive.Root
export const DropdownMenuTrigger = DropdownMenuPrimitive.Trigger
export const DropdownMenuGroup = DropdownMenuPrimitive.Group
export const DropdownMenuPortal = DropdownMenuPrimitive.Portal
export const DropdownMenuSub = DropdownMenuPrimitive.Sub
export const DropdownMenuRadioGroup = DropdownMenuPrimitive.RadioGroup

export type DropdownMenuContentProps = ComponentProps<typeof DropdownMenuPrimitive.Content>
export const DropdownMenuContent: FC<DropdownMenuContentProps> = ({
  className,
  sideOffset = 4,
  ...props
}) => (
  <DropdownMenuPrimitive.Portal>
    <DropdownMenuPrimitive.Content
      sideOffset={sideOffset}
      className={cn(
        'ui-surface z-50 min-w-[8rem] overflow-hidden rounded-xl bg-bg1 p-1 text-black shadow-md',
        className,
      )}
      {...props}
    />
  </DropdownMenuPrimitive.Portal>
)
DropdownMenuContent.displayName = 'DropdownMenuContent'

export type DropdownMenuItemProps = ComponentProps<typeof DropdownMenuPrimitive.Item> & {
  inset?: boolean
}
export const DropdownMenuItem: FC<DropdownMenuItemProps> = ({
  className,
  inset,
  ...props
}) => (
  <DropdownMenuPrimitive.Item
    className={cn(
      'relative flex cursor-pointer select-none items-center gap-2 rounded-lg px-2 py-1.5 text-sm outline-none',
      'focus:bg-black/5 data-[disabled]:pointer-events-none data-[disabled]:opacity-50',
      inset && 'pl-8',
      className,
    )}
    {...props}
  />
)
DropdownMenuItem.displayName = 'DropdownMenuItem'

export type DropdownMenuCheckboxItemProps = ComponentProps<typeof DropdownMenuPrimitive.CheckboxItem>
export const DropdownMenuCheckboxItem: FC<DropdownMenuCheckboxItemProps> = ({
  className,
  children,
  checked,
  ...props
}) => (
  <DropdownMenuPrimitive.CheckboxItem
    className={cn(
      'relative flex cursor-pointer select-none items-center rounded-lg py-1.5 pl-8 pr-2 text-sm outline-none',
      'focus:bg-black/5 data-[disabled]:pointer-events-none data-[disabled]:opacity-50',
      className,
    )}
    checked={checked}
    {...props}
  >
    <span className="absolute left-2 flex h-3.5 w-3.5 items-center justify-center">
      <DropdownMenuPrimitive.ItemIndicator>
        <Check size={16} />
      </DropdownMenuPrimitive.ItemIndicator>
    </span>
    {children}
  </DropdownMenuPrimitive.CheckboxItem>
)
DropdownMenuCheckboxItem.displayName = 'DropdownMenuCheckboxItem'

export type DropdownMenuRadioItemProps = ComponentProps<typeof DropdownMenuPrimitive.RadioItem>
export const DropdownMenuRadioItem: FC<DropdownMenuRadioItemProps> = ({
  className,
  children,
  ...props
}) => (
  <DropdownMenuPrimitive.RadioItem
    className={cn(
      'relative flex cursor-pointer select-none items-center rounded-lg py-1.5 pl-8 pr-2 text-sm outline-none',
      'focus:bg-black/5 data-[disabled]:pointer-events-none data-[disabled]:opacity-50',
      className,
    )}
    {...props}
  >
    <span className="absolute left-2 flex h-3.5 w-3.5 items-center justify-center">
      <DropdownMenuPrimitive.ItemIndicator>
        <Circle size={8} weight="fill" />
      </DropdownMenuPrimitive.ItemIndicator>
    </span>
    {children}
  </DropdownMenuPrimitive.RadioItem>
)
DropdownMenuRadioItem.displayName = 'DropdownMenuRadioItem'

export type DropdownMenuLabelProps = ComponentProps<typeof DropdownMenuPrimitive.Label> & {
  inset?: boolean
}
export const DropdownMenuLabel: FC<DropdownMenuLabelProps> = ({
  className,
  inset,
  ...props
}) => (
  <DropdownMenuPrimitive.Label
    className={cn('px-2 py-1.5 text-sm font-semibold', inset && 'pl-8', className)}
    {...props}
  />
)
DropdownMenuLabel.displayName = 'DropdownMenuLabel'

export type DropdownMenuSeparatorProps = ComponentProps<typeof DropdownMenuPrimitive.Separator>
export const DropdownMenuSeparator: FC<DropdownMenuSeparatorProps> = ({
  className,
  ...props
}) => (
  <DropdownMenuPrimitive.Separator
    className={cn('-mx-1 my-1 h-px bg-black/10', className)}
    {...props}
  />
)
DropdownMenuSeparator.displayName = 'DropdownMenuSeparator'

export type DropdownMenuShortcutProps = ComponentProps<'span'>
export const DropdownMenuShortcut: FC<DropdownMenuShortcutProps> = ({
  className,
  ...props
}) => (
  <span className={cn('ml-auto text-xs tracking-widest text-black/40', className)} {...props} />
)
DropdownMenuShortcut.displayName = 'DropdownMenuShortcut'

export type DropdownMenuSubContentProps = ComponentProps<typeof DropdownMenuPrimitive.SubContent>
export const DropdownMenuSubContent: FC<DropdownMenuSubContentProps> = ({
  className,
  ...props
}) => (
  <DropdownMenuPrimitive.SubContent
    className={cn(
      'ui-surface z-50 min-w-[8rem] overflow-hidden rounded-xl bg-bg1 p-1 text-black shadow-lg',
      className,
    )}
    {...props}
  />
)
DropdownMenuSubContent.displayName = 'DropdownMenuSubContent'

export type DropdownMenuSubTriggerProps = ComponentProps<typeof DropdownMenuPrimitive.SubTrigger> & {
  inset?: boolean
}
export const DropdownMenuSubTrigger: FC<DropdownMenuSubTriggerProps> = ({
  className,
  inset,
  children,
  ...props
}) => (
  <DropdownMenuPrimitive.SubTrigger
    className={cn(
      'flex cursor-default select-none items-center gap-2 rounded-lg px-2 py-1.5 text-sm outline-none focus:bg-black/5',
      inset && 'pl-8',
      className,
    )}
    {...props}
  >
    {children}
    <CaretRight size={16} className="ml-auto" />
  </DropdownMenuPrimitive.SubTrigger>
)
DropdownMenuSubTrigger.displayName = 'DropdownMenuSubTrigger'
