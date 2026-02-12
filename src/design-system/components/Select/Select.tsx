'use client'

import * as SelectPrimitive from '@radix-ui/react-select'
import { CaretDown, CaretUp, Check } from '@phosphor-icons/react'
import type { ComponentProps, FC } from 'react'
import { cn } from '@ds/utils'
import {
  basicInputClasses,
  disabledInputClasses,
  focusInputClasses,
  type InputSize,
} from '../Input'

export const Select = SelectPrimitive.Root
export const SelectGroup = SelectPrimitive.Group
export const SelectValue = SelectPrimitive.Value

const selectSizeClasses: Record<InputSize, string> = {
  sm: 'h-9 rounded-xl px-3 py-1.5 text-sm',
  md: 'h-10 rounded-xl px-4 py-2 text-sm',
  lg: 'rounded-2xl px-5 py-4 text-lg',
}

export type SelectTriggerProps = ComponentProps<typeof SelectPrimitive.Trigger> & {
  selectSize?: InputSize
}
export const SelectTrigger: FC<SelectTriggerProps> = ({
  className,
  children,
  selectSize = 'md',
  ...props
}) => (
  <SelectPrimitive.Trigger
    className={cn(
      'flex w-full items-center justify-between gap-2',
      basicInputClasses,
      focusInputClasses,
      disabledInputClasses,
      selectSizeClasses[selectSize],
      'data-[placeholder]:text-black/45',
      className,
    )}
    {...props}
  >
    {children}
    <SelectPrimitive.Icon asChild>
      <CaretDown size={16} className="shrink-0 text-black/40" />
    </SelectPrimitive.Icon>
  </SelectPrimitive.Trigger>
)
SelectTrigger.displayName = 'SelectTrigger'

export type SelectContentProps = ComponentProps<typeof SelectPrimitive.Content>
export const SelectContent: FC<SelectContentProps> = ({
  className,
  children,
  position = 'popper',
  ...props
}) => (
  <SelectPrimitive.Portal>
    <SelectPrimitive.Content
      className={cn(
        'ui-surface relative z-50 max-h-96 min-w-[8rem] overflow-hidden rounded-xl border border-black/15 bg-bg1 text-black shadow-md',
        position === 'popper' &&
          'data-[side=bottom]:translate-y-1 data-[side=top]:-translate-y-1',
        className,
      )}
      position={position}
      {...props}
    >
      <SelectScrollUpButton />
      <SelectPrimitive.Viewport
        className={cn(
          'p-1',
          position === 'popper' &&
            'h-[var(--radix-select-trigger-height)] w-full min-w-[var(--radix-select-trigger-width)]',
        )}
      >
        {children}
      </SelectPrimitive.Viewport>
      <SelectScrollDownButton />
    </SelectPrimitive.Content>
  </SelectPrimitive.Portal>
)
SelectContent.displayName = 'SelectContent'

export type SelectItemProps = ComponentProps<typeof SelectPrimitive.Item>
export const SelectItem: FC<SelectItemProps> = ({
  className,
  children,
  ...props
}) => (
  <SelectPrimitive.Item
    className={cn(
      'relative flex w-full cursor-pointer select-none items-center rounded-lg py-1.5 pl-8 pr-2 text-sm outline-none',
      'border-b-2 border-solid !border-[#666666] last:!border-b-0',
      'focus:bg-black/5 data-[disabled]:pointer-events-none data-[disabled]:opacity-50',
      className,
    )}
    {...props}
  >
    <span className="absolute left-2 flex h-3.5 w-3.5 items-center justify-center">
      <SelectPrimitive.ItemIndicator>
        <Check size={16} />
      </SelectPrimitive.ItemIndicator>
    </span>
    <SelectPrimitive.ItemText>{children}</SelectPrimitive.ItemText>
  </SelectPrimitive.Item>
)
SelectItem.displayName = 'SelectItem'

export type SelectLabelProps = ComponentProps<typeof SelectPrimitive.Label>
export const SelectLabel: FC<SelectLabelProps> = ({ className, ...props }) => (
  <SelectPrimitive.Label
    className={cn('px-2 py-1.5 text-sm font-semibold', className)}
    {...props}
  />
)
SelectLabel.displayName = 'SelectLabel'

export type SelectSeparatorProps = ComponentProps<typeof SelectPrimitive.Separator>
export const SelectSeparator: FC<SelectSeparatorProps> = ({
  className,
  ...props
}) => (
  <SelectPrimitive.Separator
    className={cn('-mx-1 my-1 h-px bg-black/10', className)}
    {...props}
  />
)
SelectSeparator.displayName = 'SelectSeparator'

const SelectScrollUpButton: FC<ComponentProps<typeof SelectPrimitive.ScrollUpButton>> = ({
  className,
  ...props
}) => (
  <SelectPrimitive.ScrollUpButton
    className={cn('flex cursor-default items-center justify-center py-1', className)}
    {...props}
  >
    <CaretUp size={16} />
  </SelectPrimitive.ScrollUpButton>
)
SelectScrollUpButton.displayName = 'SelectScrollUpButton'

const SelectScrollDownButton: FC<ComponentProps<typeof SelectPrimitive.ScrollDownButton>> = ({
  className,
  ...props
}) => (
  <SelectPrimitive.ScrollDownButton
    className={cn('flex cursor-default items-center justify-center py-1', className)}
    {...props}
  >
    <CaretDown size={16} />
  </SelectPrimitive.ScrollDownButton>
)
SelectScrollDownButton.displayName = 'SelectScrollDownButton'
