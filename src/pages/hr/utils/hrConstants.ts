/**
 * Shared constants and helpers used across the HR module.
 */

/* ------------------------------------------------------------------ */
/*  Month name arrays                                                   */
/* ------------------------------------------------------------------ */

export const MONTH_NAMES_TR = [
  'Ocak',
  'Şubat',
  'Mart',
  'Nisan',
  'Mayıs',
  'Haziran',
  'Temmuz',
  'Ağustos',
  'Eylül',
  'Ekim',
  'Kasım',
  'Aralık',
] as const

export const MONTH_NAMES_EN = [
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
] as const

/* ------------------------------------------------------------------ */
/*  Timezone list                                                       */
/* ------------------------------------------------------------------ */

export const COMMON_TIMEZONES = [
  { value: 'Europe/Istanbul', label: 'Türkiye (UTC+3)' },
  { value: 'Europe/London', label: 'UK (UTC+0/+1)' },
  { value: 'Europe/Berlin', label: 'Almanya (UTC+1/+2)' },
  { value: 'Europe/Paris', label: 'Fransa (UTC+1/+2)' },
  { value: 'Europe/Moscow', label: 'Rusya - Moskova (UTC+3)' },
  { value: 'Europe/Kiev', label: 'Ukrayna (UTC+2/+3)' },
  { value: 'Europe/Athens', label: 'Yunanistan (UTC+2/+3)' },
  { value: 'Europe/Bucharest', label: 'Romanya (UTC+2/+3)' },
  { value: 'Asia/Dubai', label: 'BAE (UTC+4)' },
  { value: 'Asia/Riyadh', label: 'Suudi Arabistan (UTC+3)' },
  { value: 'Asia/Tehran', label: 'İran (UTC+3:30)' },
  { value: 'Asia/Baku', label: 'Azerbaycan (UTC+4)' },
  { value: 'Asia/Tbilisi', label: 'Gürcistan (UTC+4)' },
  { value: 'Asia/Kolkata', label: 'Hindistan (UTC+5:30)' },
  { value: 'Asia/Shanghai', label: 'Çin (UTC+8)' },
  { value: 'Asia/Tokyo', label: 'Japonya (UTC+9)' },
  { value: 'America/New_York', label: 'ABD Doğu (UTC-5/-4)' },
  { value: 'America/Chicago', label: 'ABD Merkez (UTC-6/-5)' },
  { value: 'America/Los_Angeles', label: 'ABD Batı (UTC-8/-7)' },
  { value: 'America/Sao_Paulo', label: 'Brezilya (UTC-3)' },
  { value: 'Australia/Sydney', label: 'Avustralya Doğu (UTC+10/+11)' },
] as const

/* ------------------------------------------------------------------ */
/*  Protected roles                                                     */
/* ------------------------------------------------------------------ */

/** Roles linked to the auto-bonus system that cannot be deleted. */
export const PROTECTED_ROLES: readonly string[] = ['Marketing', 'Retention']

/* ------------------------------------------------------------------ */
/*  Role → Tag variant mapping                                         */
/* ------------------------------------------------------------------ */

export type RoleVariant = 'blue' | 'purple' | 'green' | 'orange' | 'red' | 'cyan'

const ROLE_VARIANT_MAP: Record<string, RoleVariant> = {
  Manager: 'blue',
  Marketing: 'purple',
  Operation: 'green',
  Retention: 'orange',
  'Project Management': 'cyan',
  'Social Media': 'purple',
  'Sales Development': 'red',
  Programmer: 'blue',
}

/** Return the Tag colour variant for a given HR role string. */
export function getRoleVariant(role: string): RoleVariant {
  return ROLE_VARIANT_MAP[role] ?? 'blue'
}
