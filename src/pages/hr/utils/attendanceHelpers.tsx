/**
 * Attendance-related helper functions used by AttendanceTab and SalariesTab.
 */
import { CheckCircle, XCircle, Clock, MinusCircle } from '@phosphor-icons/react'
import type { HrAttendanceStatus } from '@/lib/database.types'

/* ------------------------------------------------------------------ */
/*  Date / time helpers                                                 */
/* ------------------------------------------------------------------ */

/** Return today as a YYYY-MM-DD string. */
export function todayString(): string {
  return new Date().toISOString().split('T')[0]
}

/** Check if a YYYY-MM-DD date string falls on Saturday (6) or Sunday (0). */
export function isWeekendDate(dateStr: string): boolean {
  const d = new Date(dateStr + 'T00:00:00')
  const day = d.getDay()
  return day === 0 || day === 6
}

/** Strip seconds from a time string: "18:30:00" -> "18:30" */
export function fmtTime(t: string | null | undefined): string {
  if (!t) return '—'
  return t.slice(0, 5)
}

/* ------------------------------------------------------------------ */
/*  Late-hours calculation                                              */
/* ------------------------------------------------------------------ */

/** Compare check-in time vs standard and return how many hours late (0 = on time). */
export function calculateLateHours(checkInTime: string, standardCheckIn: string): number {
  const [ciH, ciM] = checkInTime.split(':').map(Number)
  const [stdH, stdM] = standardCheckIn.split(':').map(Number)
  const ciMinutes = ciH * 60 + ciM
  const stdMinutes = stdH * 60 + stdM
  if (ciMinutes <= stdMinutes) return 0
  return Math.ceil((ciMinutes - stdMinutes) / 60)
}

/* ------------------------------------------------------------------ */
/*  Status config (label + icon + variant)                              */
/* ------------------------------------------------------------------ */

export function getStatusConfig(status: HrAttendanceStatus | undefined, lang: 'tr' | 'en') {
  const configs: Record<
    HrAttendanceStatus,
    {
      label: string
      labelEn: string
      icon: React.ReactNode
      variant: 'green' | 'red' | 'orange' | 'blue'
    }
  > = {
    present: {
      label: 'Geldi',
      labelEn: 'Present',
      icon: <CheckCircle size={14} weight="fill" className="text-green" />,
      variant: 'green',
    },
    absent: {
      label: 'Gelmedi',
      labelEn: 'Absent',
      icon: <XCircle size={14} weight="fill" className="text-red" />,
      variant: 'red',
    },
    late: {
      label: 'Geç Geldi',
      labelEn: 'Late',
      icon: <Clock size={14} weight="fill" className="text-orange" />,
      variant: 'orange',
    },
    half_day: {
      label: 'Yarım Gün',
      labelEn: 'Half Day',
      icon: <MinusCircle size={14} weight="fill" className="text-blue" />,
      variant: 'blue',
    },
  }
  if (!status) return null
  const cfg = configs[status]
  return { ...cfg, displayLabel: lang === 'tr' ? cfg.label : cfg.labelEn }
}
