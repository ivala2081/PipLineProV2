/**
 * Prorated salary calculation for passive (exited) employees.
 *
 * Turkish labour law: monthly salary is divided by 30 (fixed SGK standard),
 * then multiplied by the number of actual business days worked (weekends excluded).
 * Formula: (businessDaysWorked / 30) × monthlySalary
 *
 * Attendance records (absent / unpaid_leave) reduce the worked day count.
 * Days without an attendance record are assumed as worked.
 */

export interface ProratedSalaryInput {
  monthlySalary: number
  exitDate: string // YYYY-MM-DD
  hireDate: string | null // YYYY-MM-DD
  year: number
  month: number // 1-12
  attendanceRecords: { date: string; status: string }[]
  weekendOff: boolean
}

export interface ProratedSalaryResult {
  workedDays: number
  totalDays: number // always 30 per Turkish labour law
  proratedSalary: number
  usedAttendance: boolean
}

/** Check if a date is a weekday (Mon-Fri). */
function isBusinessDay(date: Date): boolean {
  const day = date.getDay()
  return day !== 0 && day !== 6
}

/** Parse YYYY-MM-DD to a local Date (avoids timezone shift). */
function parseDate(str: string): Date {
  return new Date(str + 'T00:00:00')
}

export function calculateProratedSalary(input: ProratedSalaryInput): ProratedSalaryResult {
  const { monthlySalary, exitDate, hireDate, year, month, attendanceRecords } = input

  const LEGAL_MONTH_DAYS = 30 // Turkish labour law fixed divisor

  // Full month boundaries
  const monthStart = new Date(year, month - 1, 1)
  const monthEnd = new Date(year, month, 0) // last day of month

  // Effective start: max(monthStart, hireDate)
  let effectiveStart = monthStart
  if (hireDate) {
    const hire = parseDate(hireDate)
    if (hire > monthStart && hire <= monthEnd) {
      effectiveStart = hire
    }
  }

  const exit = parseDate(exitDate)

  // Clamp exit to month boundary
  const effectiveEnd = exit < monthEnd ? exit : monthEnd

  // Build attendance map for quick lookup
  const attendanceMap = new Map<string, string>()
  for (const record of attendanceRecords) {
    attendanceMap.set(record.date, record.status)
  }

  const absentStatuses = new Set(['absent', 'unpaid_leave'])
  let workedDays = 0

  // Walk through every day in the effective range, count only business days
  const current = new Date(effectiveStart)
  while (current <= effectiveEnd) {
    if (isBusinessDay(current)) {
      const dateStr = current.toISOString().slice(0, 10)
      const status = attendanceMap.get(dateStr)

      if (status) {
        // Explicit attendance record exists
        if (absentStatuses.has(status)) {
          // absent / unpaid_leave → don't count
        } else if (status === 'half_day') {
          workedDays += 0.5
        } else {
          workedDays += 1
        }
      } else {
        // No record for this business day → assume worked
        workedDays += 1
      }
    }
    current.setDate(current.getDate() + 1)
  }

  const proratedSalary = Math.round((workedDays / LEGAL_MONTH_DAYS) * monthlySalary)

  return {
    workedDays,
    totalDays: LEGAL_MONTH_DAYS,
    proratedSalary,
    usedAttendance: attendanceMap.size > 0,
  }
}
