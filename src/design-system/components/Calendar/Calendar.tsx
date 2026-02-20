import { CaretLeft, CaretRight } from '@phosphor-icons/react'
import type { ComponentProps, FC } from 'react'
import { cn } from '@ds/utils'
import { Button } from '../Button'

export type CalendarProps = ComponentProps<'div'> & {
  month?: number
  year?: number
  selectedDate?: Date
  onDateSelect?: (date: Date) => void
  onMonthChange?: (month: number) => void
  onYearChange?: (year: number) => void
}

const DAYS = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa']
const MONTHS = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
]

function getDaysInMonth(month: number, year: number) {
  return new Date(year, month + 1, 0).getDate()
}

function getFirstDayOfMonth(month: number, year: number) {
  return new Date(year, month, 1).getDay()
}

export const Calendar: FC<CalendarProps> = ({
  className,
  month: controlledMonth,
  year: controlledYear,
  selectedDate,
  onDateSelect,
  onMonthChange,
  onYearChange,
  ...props
}) => {
  const now = new Date()
  const month = controlledMonth ?? now.getMonth()
  const year = controlledYear ?? now.getFullYear()
  const daysInMonth = getDaysInMonth(month, year)
  const firstDay = getFirstDayOfMonth(month, year)
  const today = now.getDate()
  const isCurrentMonth = now.getMonth() === month && now.getFullYear() === year

  const prevMonth = () => {
    if (month === 0) {
      onMonthChange?.(11)
      onYearChange?.(year - 1)
    } else {
      onMonthChange?.(month - 1)
    }
  }

  const nextMonth = () => {
    if (month === 11) {
      onMonthChange?.(0)
      onYearChange?.(year + 1)
    } else {
      onMonthChange?.(month + 1)
    }
  }

  const days: (number | null)[] = []
  for (let i = 0; i < firstDay; i++) days.push(null)
  for (let i = 1; i <= daysInMonth; i++) days.push(i)

  const isSelected = (day: number) => {
    if (!selectedDate) return false
    return (
      selectedDate.getDate() === day &&
      selectedDate.getMonth() === month &&
      selectedDate.getFullYear() === year
    )
  }

  return (
    <div className={cn('w-[280px] rounded-2xl bg-bg1 p-4', className)} {...props}>
      {/* Header */}
      <div className="mb-4 flex items-center justify-between">
        <Button
          variant="borderless"
          size="sm"
          onClick={prevMonth}
          leftContent={<CaretLeft size={16} />}
        />
        <span className="text-sm font-semibold">
          {MONTHS[month]} {year}
        </span>
        <Button
          variant="borderless"
          size="sm"
          onClick={nextMonth}
          leftContent={<CaretRight size={16} />}
        />
      </div>

      {/* Day headers */}
      <div className="mb-2 grid grid-cols-7 gap-1 text-center text-xs text-black/40">
        {DAYS.map((d) => (
          <div key={d} className="py-1">
            {d}
          </div>
        ))}
      </div>

      {/* Day cells */}
      <div className="grid grid-cols-7 gap-1 text-center text-sm">
        {days.map((day, i) => (
          <button
            key={i}
            type="button"
            disabled={day === null}
            onClick={() => day && onDateSelect?.(new Date(year, month, day))}
            className={cn(
              'flex h-8 w-8 items-center justify-center rounded-lg transition-colors',
              day === null && 'invisible',
              day !== null && 'hover:bg-black/5 cursor-pointer',
              isCurrentMonth && day === today && !isSelected(day!) && 'font-semibold text-brand',
              day !== null && isSelected(day) && 'bg-brand text-white hover:bg-brand-hover',
            )}
          >
            {day}
          </button>
        ))}
      </div>
    </div>
  )
}

Calendar.displayName = 'Calendar'
