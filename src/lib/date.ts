/**
 * Format a Date as "YYYY-MM-DD" using local time (not UTC).
 *
 * Using `d.toISOString().slice(0, 10)` is wrong in UTC+ timezones because
 * toISOString() always returns UTC — in e.g. UTC+3 midnight local time is
 * 21:00 UTC the previous day, so the date would be off by one.
 */
export function localYMD(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

/**
 * Format a Date as "YYYY-MM" using local time (not UTC).
 */
export function localYM(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  return `${y}-${m}`
}

/**
 * Return a UTC ISO string for the START of a local calendar day.
 *
 * Use this when querying TIMESTAMPTZ columns with a local date boundary.
 * e.g. localDayStart("2024-01-15") in UTC+3 → "2024-01-14T21:00:00.000Z"
 *
 * Without this conversion Postgres (which runs in UTC) would treat
 * "2024-01-15T00:00:00" as UTC midnight and miss the first 3 hours of the
 * local day.
 */
export function localDayStart(dateKey: string): string {
  return new Date(`${dateKey}T00:00:00`).toISOString()
}

/**
 * Return a UTC ISO string for the END of a local calendar day (23:59:59).
 */
export function localDayEnd(dateKey: string): string {
  return new Date(`${dateKey}T23:59:59`).toISOString()
}
