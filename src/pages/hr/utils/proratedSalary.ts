/**
 * Prorated salary calculation for passive (exited) employees.
 *
 * Turkish labour law: monthly salary is divided by 30 (fixed SGK standard),
 * then multiplied by the number of calendar days worked (weekends included).
 * Formula: (calendarDaysWorked / 30) × monthlySalary
 *
 * Attendance-based deductions (absent, unpaid_leave, half_day) are handled
 * separately in SalariesTab via Devam Kesintisi / İzin Kesintisi columns.
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

/** Parse YYYY-MM-DD to a local Date (avoids timezone shift). */
function parseDate(str: string): Date {
  return new Date(str + 'T00:00:00')
}

export function calculateProratedSalary(input: ProratedSalaryInput): ProratedSalaryResult {
  const { monthlySalary, exitDate, hireDate, year, month } = input

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

  // Count calendar days (weekends included)
  let workedDays = 0
  const current = new Date(effectiveStart)
  while (current <= effectiveEnd) {
    workedDays += 1
    current.setDate(current.getDate() + 1)
  }

  const proratedSalary = Math.round((workedDays / LEGAL_MONTH_DAYS) * monthlySalary)

  return {
    workedDays,
    totalDays: LEGAL_MONTH_DAYS,
    proratedSalary,
    usedAttendance: false,
  }
}
