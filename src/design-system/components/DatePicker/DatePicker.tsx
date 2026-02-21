/**
 * DatePicker – System-wide date selector with presets and calendar
 *
 * Use this component anywhere you need date filtering (transfers, accounting,
 * reports, etc.) for a consistent UX across the app.
 *
 * @example
 *   <DatePicker
 *     dateFrom={filters.dateFrom}
 *     dateTo={filters.dateTo}
 *     onChange={(from, to) => {
 *       setFilter('dateFrom', from)
 *       setFilter('dateTo', to)
 *     }}
 *   />
 */

import { useState, useCallback, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { CalendarBlank, CaretDown } from '@phosphor-icons/react'
import { Popover, PopoverTrigger, PopoverContent } from '../Popover'
import { Calendar } from '../Calendar'
import { cn } from '@ds/utils'

function toYMD(d: Date): string {
  return d.toISOString().slice(0, 10)
}

function parseYMD(s: string): Date {
  const [y, m, d] = s.split('-').map(Number)
  return new Date(y, m - 1, d)
}

const PRESETS = [
  {
    id: 'today',
    labelKey: 'datePicker.today',
    getRange: () => {
      const t = new Date()
      const s = toYMD(t)
      return [s, s] as const
    },
  },
  {
    id: 'yesterday',
    labelKey: 'datePicker.yesterday',
    getRange: () => {
      const t = new Date()
      t.setDate(t.getDate() - 1)
      const s = toYMD(t)
      return [s, s] as const
    },
  },
  {
    id: 'last7',
    labelKey: 'datePicker.last7Days',
    getRange: () => {
      const end = new Date()
      const start = new Date()
      start.setDate(start.getDate() - 6)
      return [toYMD(start), toYMD(end)] as const
    },
  },
  {
    id: 'last30',
    labelKey: 'datePicker.last30Days',
    getRange: () => {
      const end = new Date()
      const start = new Date()
      start.setDate(start.getDate() - 29)
      return [toYMD(start), toYMD(end)] as const
    },
  },
  {
    id: 'thisMonth',
    labelKey: 'datePicker.thisMonth',
    getRange: () => {
      const t = new Date()
      const start = new Date(t.getFullYear(), t.getMonth(), 1)
      return [toYMD(start), toYMD(t)] as const
    },
  },
  {
    id: 'lastMonth',
    labelKey: 'datePicker.lastMonth',
    getRange: () => {
      const t = new Date()
      const start = new Date(t.getFullYear(), t.getMonth() - 1, 1)
      const end = new Date(t.getFullYear(), t.getMonth(), 0)
      return [toYMD(start), toYMD(end)] as const
    },
  },
] as const

export interface DatePickerProps {
  /** Start date (YYYY-MM-DD) */
  dateFrom: string | null
  /** End date (YYYY-MM-DD). For single-date mode, use same value as dateFrom */
  dateTo: string | null
  /** Called when date selection changes */
  onChange: (dateFrom: string | null, dateTo: string | null) => void
  /** Placeholder when no date selected */
  placeholder?: string
  /** Additional CSS classes for the trigger button */
  className?: string
  /** Minimum width of the trigger (default: 10rem) */
  minWidth?: string
}

export function DatePicker({
  dateFrom,
  dateTo,
  onChange,
  placeholder,
  className,
  minWidth = '10rem',
}: DatePickerProps) {
  const { t } = useTranslation('components')
  const [open, setOpen] = useState(false)
  const [calMonth, setCalMonth] = useState(() => {
    if (dateFrom) return parseYMD(dateFrom).getMonth()
    return new Date().getMonth()
  })
  const [calYear, setCalYear] = useState(() => {
    if (dateFrom) return parseYMD(dateFrom).getFullYear()
    return new Date().getFullYear()
  })

  const hasDate = dateFrom != null && dateTo != null
  const isSingleDay = hasDate && dateFrom === dateTo

  useEffect(() => {
    if (open && dateFrom) {
      const d = parseYMD(dateFrom)
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setCalMonth(d.getMonth())

      setCalYear(d.getFullYear())
    } else if (open) {
      const d = new Date()

      setCalMonth(d.getMonth())

      setCalYear(d.getFullYear())
    }
  }, [open, dateFrom])

  const formatDisplay = useCallback(() => {
    if (!hasDate) return placeholder ?? t('datePicker.placeholder')
    if (isSingleDay) {
      const d = parseYMD(dateFrom!)
      return d.toLocaleDateString(undefined, {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      })
    }
    const d1 = parseYMD(dateFrom!)
    const d2 = parseYMD(dateTo!)
    return `${d1.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })} – ${d2.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}`
  }, [hasDate, isSingleDay, dateFrom, dateTo, placeholder, t])

  const handlePreset = (getRange: () => readonly [string, string]) => {
    const [from, to] = getRange()
    onChange(from, to)
    setOpen(false)
  }

  const handleCalendarSelect = (date: Date) => {
    const s = toYMD(date)
    onChange(s, s)
    setOpen(false)
  }

  const handleClear = () => {
    onChange(null, null)
    setOpen(false)
  }

  const selectedDate = dateFrom ? parseYMD(dateFrom) : undefined

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          className={cn(
            'flex h-8 items-center gap-2 rounded-lg border border-black/10 bg-bg1 px-3 text-left text-xs font-medium text-black transition-colors',
            'hover:border-black/20 hover:bg-black/[0.02]',
            hasDate && 'border-brand/30 bg-brand/5 text-black',
            className,
          )}
          style={{ minWidth }}
        >
          <CalendarBlank
            size={14}
            weight={hasDate ? 'fill' : 'regular'}
            className={hasDate ? 'text-brand' : 'text-black/40'}
          />
          <span className="flex-1 truncate">{formatDisplay()}</span>
          <CaretDown size={12} className="shrink-0 text-black/40" />
        </button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-auto p-0" sideOffset={6}>
        <div className="flex">
          <div className="flex flex-col border-r border-black/10 py-2">
            {PRESETS.map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => handlePreset(p.getRange)}
                className="mx-1 rounded-xl px-3 py-2 text-left text-xs font-medium text-black/80 transition-colors duration-150 hover:bg-brand/10 hover:text-brand"
              >
                {t(p.labelKey)}
              </button>
            ))}
            {hasDate && (
              <button
                type="button"
                onClick={handleClear}
                className="mx-1 mt-1 rounded-xl border-t border-black/10 px-3 py-2 text-left text-xs font-medium text-red/80 transition-colors duration-150 hover:bg-red/10"
              >
                {t('datePicker.clear')}
              </button>
            )}
          </div>
          <div className="p-2">
            <Calendar
              month={calMonth}
              year={calYear}
              selectedDate={selectedDate}
              onDateSelect={handleCalendarSelect}
              onMonthChange={setCalMonth}
              onYearChange={setCalYear}
              className="rounded-xl border-0 bg-transparent p-2 shadow-none"
            />
          </div>
        </div>
      </PopoverContent>
    </Popover>
  )
}

DatePicker.displayName = 'DatePicker'
