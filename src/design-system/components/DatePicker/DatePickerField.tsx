'use client'

import { forwardRef, useCallback, useEffect, useRef, useState } from 'react'
import { CalendarBlank, X } from '@phosphor-icons/react'
import { useTranslation } from 'react-i18next'
import { cn } from '@ds/utils'
import { Calendar } from '../Calendar'
import { Popover, PopoverContent, PopoverTrigger } from '../Popover'
import {
  basicInputClasses,
  disabledInputClasses,
  focusInputClasses,
  type InputSize,
} from '../Input/Input'

function toYMD(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

function parseYMD(s: string): Date | undefined {
  if (!s) return undefined
  const [y, m, d] = s.split('-').map(Number)
  if (!y || !m || !d) return undefined
  return new Date(y, m - 1, d)
}

export type DatePickerFieldProps = {
  /** YYYY-MM-DD string (controlled) */
  value?: string
  /** YYYY-MM-DD string (uncontrolled default) */
  defaultValue?: string
  /** Field name — passed to hidden input for react-hook-form */
  name?: string
  /** Called with a synthetic { target: { value } } — compatible with register() and setValue() */
  onChange?: (e: { target: { value: string } }) => void
  /** Called when the picker closes — triggers react-hook-form validation */
  onBlur?: () => void
  disabled?: boolean
  inputSize?: InputSize
  /** Extra classes applied to the outer wrapper */
  className?: string
  /** Placeholder text. Defaults to i18n datePicker.placeholder */
  placeholder?: string
  /** Show × clear button when a date is selected */
  clearable?: boolean
}

const sizeClasses: Record<InputSize, string> = {
  sm: 'h-9 rounded-xl text-sm',
  md: 'h-10 rounded-xl text-sm',
  lg: 'h-12 rounded-2xl text-base',
}

export const DatePickerField = forwardRef<HTMLInputElement, DatePickerFieldProps>(
  function DatePickerField(
    {
      value,
      defaultValue,
      name,
      onChange,
      onBlur,
      disabled,
      inputSize = 'md',
      className,
      placeholder,
      clearable,
    },
    ref,
  ) {
    const { t } = useTranslation('components')

    const isControlled = value !== undefined
    const [internalValue, setInternalValue] = useState(defaultValue ?? '')
    const resolvedValue = isControlled ? (value ?? '') : internalValue

    const [open, setOpen] = useState(false)
    const selectedDate = resolvedValue ? parseYMD(resolvedValue) : undefined

    const [calMonth, setCalMonth] = useState(() => (selectedDate ?? new Date()).getMonth())
    const [calYear, setCalYear] = useState(() => (selectedDate ?? new Date()).getFullYear())

    // Sync calendar nav to the selected date whenever the popover opens
    useEffect(() => {
      if (open) {
        const d = selectedDate ?? new Date()
        setCalMonth(d.getMonth())
        setCalYear(d.getFullYear())
      }
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [open])

    // Hidden input ref — forwarded for react-hook-form registration
    const hiddenRef = useRef<HTMLInputElement>(null)
    const mergedRef = useCallback(
      (node: HTMLInputElement | null) => {
        ;(hiddenRef as React.MutableRefObject<HTMLInputElement | null>).current = node
        if (typeof ref === 'function') ref(node)
        else if (ref) (ref as React.MutableRefObject<HTMLInputElement | null>).current = node
      },
      [ref],
    )

    const fireChange = useCallback(
      (newValue: string) => {
        if (!isControlled) setInternalValue(newValue)
        if (hiddenRef.current) hiddenRef.current.value = newValue
        onChange?.({ target: { value: newValue } })
      },
      [isControlled, onChange],
    )

    const handleSelect = useCallback(
      (date: Date) => {
        fireChange(toYMD(date))
        setOpen(false)
      },
      [fireChange],
    )

    const handleClear = useCallback(
      (e: React.MouseEvent) => {
        e.stopPropagation()
        fireChange('')
      },
      [fireChange],
    )

    const handleOpenChange = useCallback(
      (isOpen: boolean) => {
        setOpen(isOpen)
        if (!isOpen) onBlur?.()
      },
      [onBlur],
    )

    const hasValue = Boolean(resolvedValue) && Boolean(selectedDate)
    const displayText =
      hasValue && selectedDate
        ? selectedDate.toLocaleDateString(undefined, {
            day: '2-digit',
            month: 'short',
            year: 'numeric',
          })
        : null

    return (
      <div className={cn('relative w-full', className)}>
        {/* Hidden input — gives react-hook-form a ref target and name */}
        <input ref={mergedRef} name={name} type="hidden" value={resolvedValue} readOnly />

        {/* Calendar icon — absolutely positioned so it overlays the trigger */}
        <CalendarBlank
          size={14}
          weight={hasValue ? 'fill' : 'regular'}
          className={cn(
            'pointer-events-none absolute left-2.5 top-1/2 z-10 -translate-y-1/2 transition-colors',
            hasValue ? 'text-brand' : 'text-black/35',
          )}
        />

        <Popover open={open} onOpenChange={handleOpenChange}>
          <PopoverTrigger asChild>
            <button
              type="button"
              disabled={disabled}
              className={cn(
                basicInputClasses,
                disabledInputClasses,
                focusInputClasses,
                sizeClasses[inputSize],
                'flex w-full cursor-pointer items-center pl-8 transition-colors',
                hasValue ? 'inset-ring-brand/30' : '',
                clearable && hasValue ? 'pr-7' : 'pr-3',
              )}
            >
              <span
                className={cn('flex-1 truncate text-left text-sm', !hasValue && 'text-black/45')}
              >
                {displayText ?? placeholder ?? t('datePicker.placeholder')}
              </span>
            </button>
          </PopoverTrigger>

          <PopoverContent align="start" className="w-auto p-0" sideOffset={6}>
            <div className="p-2">
              <Calendar
                month={calMonth}
                year={calYear}
                selectedDate={selectedDate}
                onDateSelect={handleSelect}
                onMonthChange={setCalMonth}
                onYearChange={setCalYear}
                className="border-0 bg-transparent p-2 shadow-none"
              />
              <div className="border-t border-black/8 px-2 pb-1 pt-1">
                <button
                  type="button"
                  onClick={() => handleSelect(new Date())}
                  className="w-full rounded-lg px-3 py-1.5 text-xs font-medium text-black/60 transition-colors hover:bg-black/5 hover:text-black"
                >
                  {t('datePicker.today')}
                </button>
              </div>
            </div>
          </PopoverContent>
        </Popover>

        {/* Clear button */}
        {clearable && hasValue && (
          <button
            type="button"
            onClick={handleClear}
            className="absolute right-2 top-1/2 z-10 -translate-y-1/2 rounded-full p-0.5 text-black/30 transition-colors hover:bg-black/5 hover:text-black/60"
          >
            <X size={12} />
          </button>
        )}
      </div>
    )
  },
)

DatePickerField.displayName = 'DatePickerField'
