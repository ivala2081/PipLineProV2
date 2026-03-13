/**
 * Prorated salary calculation for passive (exited) employees.
 *
 * Rules:
 * - Only business days count (weekends excluded when weekendOff=true)
 * - If attendance records exist → count days with status present/late/half_day
 * - If NO attendance records → assume every weekday from start to exit_date was worked
 * - Formula: (workedDays / totalBusinessDays) × monthlySalary
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
  totalBusinessDays: number
  proratedSalary: number
  usedAttendance: boolean
}

/** Check if a date is a weekday (Mon-Fri). */
function isBusinessDay(date: Date): boolean {
  const day = date.getDay()
  return day !== 0 && day !== 6
}

/** Count business days between two dates (inclusive). */
function countBusinessDays(start: Date, end: Date): number {
  let count = 0
  const current = new Date(start)
  while (current <= end) {
    if (isBusinessDay(current)) count++
    current.setDate(current.getDate() + 1)
  }
  return count
}

/** Parse YYYY-MM-DD to a local Date (avoids timezone shift). */
function parseDate(str: string): Date {
  return new Date(str + 'T00:00:00')
}

export function calculateProratedSalary(input: ProratedSalaryInput): ProratedSalaryResult {
  const { monthlySalary, exitDate, hireDate, year, month, attendanceRecords, weekendOff } = input

  // Full month boundaries
  const monthStart = new Date(year, month - 1, 1)
  const monthEnd = new Date(year, month, 0) // last day of month

  // Total business days in the full month
  const totalBusinessDays = weekendOff
    ? countBusinessDays(monthStart, monthEnd)
    : Math.round((monthEnd.getDate() * 5) / 7) // fallback: all days if weekendOff=false — but realistically count all

  if (totalBusinessDays === 0) {
    return { workedDays: 0, totalBusinessDays: 0, proratedSalary: 0, usedAttendance: false }
  }

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

  // Check if attendance records exist for this month
  const hasAttendance = attendanceRecords.length > 0

  let workedDays: number

  if (hasAttendance) {
    // Use attendance: count present, late, half_day (half_day counts as 0.5)
    const workStatuses = new Set(['present', 'late', 'half_day'])
    workedDays = 0
    for (const record of attendanceRecords) {
      const recordDate = parseDate(record.date)
      // Only count records within the effective range
      if (recordDate < effectiveStart || recordDate > effectiveEnd) continue
      // Skip weekends if weekendOff
      if (weekendOff && !isBusinessDay(recordDate)) continue
      if (workStatuses.has(record.status)) {
        workedDays += record.status === 'half_day' ? 0.5 : 1
      }
    }
  } else {
    // No attendance: assume every business day from effectiveStart to effectiveEnd was worked
    workedDays = weekendOff
      ? countBusinessDays(effectiveStart, effectiveEnd)
      : Math.max(0, Math.floor((effectiveEnd.getTime() - effectiveStart.getTime()) / 86400000) + 1)
  }

  const proratedSalary = Math.round((workedDays / totalBusinessDays) * monthlySalary)

  return {
    workedDays,
    totalBusinessDays,
    proratedSalary,
    usedAttendance: hasAttendance,
  }
}
