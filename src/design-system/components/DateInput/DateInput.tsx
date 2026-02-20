'use client'

import { forwardRef, useCallback, useEffect, useRef, useState, type ComponentProps } from 'react'
import { CalendarBlank, X } from '@phosphor-icons/react'
import { cn } from '@ds/utils'
import {
  basicInputClasses,
  disabledInputClasses,
  focusInputClasses,
  type InputSize,
} from '../Input/Input'

export type DateInputProps = Omit<ComponentProps<'input'>, 'type'> & {
  type?: 'date' | 'datetime-local'
  inputSize?: InputSize
  /** When provided, an × button appears while the input has a value */
  onClear?: () => void
}

const sizeClasses: Record<InputSize, string> = {
  sm: 'h-9 rounded-xl py-1.5 text-sm',
  md: 'h-10 rounded-xl py-2 text-sm',
  lg: 'rounded-2xl py-4 text-lg',
}

export const DateInput = forwardRef<HTMLInputElement, DateInputProps>(function DateInput(
  { value, defaultValue, onChange, onClear, inputSize = 'md', className, type = 'date', ...props },
  ref,
) {
  const isControlled = value !== undefined
  const innerRef = useRef<HTMLInputElement>(null)

  // For uncontrolled inputs (e.g. react-hook-form register()), read DOM after mount
  const [uncontrolledHasValue, setUncontrolledHasValue] = useState(Boolean(defaultValue))
  useEffect(() => {
    if (!isControlled && innerRef.current) {
      setUncontrolledHasValue(Boolean(innerRef.current.value))
    }
  }, [isControlled])

  const hasValue = isControlled ? Boolean(value) : uncontrolledHasValue

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      if (!isControlled) setUncontrolledHasValue(Boolean(e.target.value))
      onChange?.(e)
    },
    [isControlled, onChange],
  )

  // Merge the external ref with our internal one
  const mergedRef = useCallback(
    (node: HTMLInputElement | null) => {
      ;(innerRef as React.MutableRefObject<HTMLInputElement | null>).current = node
      if (typeof ref === 'function') ref(node)
      else if (ref) (ref as React.MutableRefObject<HTMLInputElement | null>).current = node
    },
    [ref],
  )

  return (
    <div className="relative w-full">
      <CalendarBlank
        size={14}
        weight={hasValue ? 'fill' : 'regular'}
        className={cn(
          'pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 transition-colors',
          hasValue ? 'text-brand' : 'text-black/35 dark:text-white/35',
        )}
      />
      <input
        ref={mergedRef}
        type={type}
        value={value}
        defaultValue={defaultValue}
        onChange={handleChange}
        className={cn(
          basicInputClasses,
          disabledInputClasses,
          focusInputClasses,
          sizeClasses[inputSize],
          'w-full cursor-pointer pl-8 transition-colors [&::-webkit-calendar-picker-indicator]:opacity-0',
          hasValue && 'inset-ring-brand/30',
          onClear && hasValue ? 'pr-7' : 'pr-2.5',
          className,
        )}
        {...props}
      />
      {onClear && hasValue && (
        <button
          type="button"
          onClick={onClear}
          className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full p-0.5 text-black/30 dark:text-white/30 transition-colors hover:bg-black/5 dark:hover:bg-white/5 hover:text-black/60 dark:hover:text-white/60"
        >
          <X size={12} />
        </button>
      )}
    </div>
  )
})

DateInput.displayName = 'DateInput'
