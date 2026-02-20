'use client'

import { forwardRef, type ComponentProps } from 'react'
import { cn } from '@ds/utils'
import { Label } from '../Label'

/* ── Shared base classes (exported for SearchableSelect, etc.) ── */
export const basicInputClasses =
  'peer text-black bg-bg2/75 inset-ring inset-ring-black/15 placeholder:text-black/45 hover:bg-bg2/90 hover:inset-ring-black/30'

export const disabledInputClasses =
  'disabled:cursor-not-allowed disabled:bg-bg2/45 disabled:text-black/35 disabled:inset-ring-black/8'

export const focusInputClasses =
  'focus:outline-none focus:ring-4 focus:ring-brand/20 focus:inset-ring-brand/55 active:inset-ring-brand/45'

/* ── Size variant map ── */
export type InputSize = 'sm' | 'md' | 'lg'

const inputSizeClasses: Record<InputSize, string> = {
  sm: 'h-9 rounded-xl px-3 py-1.5 text-sm',
  md: 'h-10 rounded-xl px-4 py-2 text-sm',
  lg: 'rounded-2xl px-5 py-4 text-lg',
}

export type InputProps = ComponentProps<'input'> & {
  title?: string
  inputSize?: InputSize
}

export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  { className, value, defaultValue, id, title, placeholder, inputSize = 'md', ...props },
  ref,
) {
  return (
    <div className="relative w-full">
      <input
        ref={ref}
        id={id}
        className={cn(
          basicInputClasses,
          disabledInputClasses,
          focusInputClasses,
          inputSizeClasses[inputSize],
          'w-full',
          className,
        )}
        value={value}
        defaultValue={defaultValue}
        placeholder={placeholder}
        {...props}
      />
      {title && (
        <Label
          htmlFor={id}
          className="absolute left-5 top-1 text-xs text-black/55 peer-placeholder-shown:top-4 peer-placeholder-shown:text-base peer-focus:top-1 peer-focus:text-xs"
        >
          {title}
        </Label>
      )}
    </div>
  )
})

Input.displayName = 'Input'
