/** Locale-aware amount formatting helpers.
 *  TR → thousands "." decimal ","   (10.000,50)
 *  EN → thousands "," decimal "."   (10,000.50)
 */

export type AmountLocale = 'tr' | 'en'

/** Format a raw input string with locale-appropriate thousands separators. */
export function formatAmount(val: string, locale: AmountLocale): string {
  const decSep = locale === 'tr' ? ',' : '.'
  const thousandSep = locale === 'tr' ? '.' : ','
  const allowed = locale === 'tr' ? /[^\d,]/g : /[^\d.]/g

  const cleaned = val.replace(allowed, '')
  const parts = cleaned.split(decSep)
  // Only keep first decimal separator
  const intPart = (parts[0] || '').replace(/\B(?=(\d{3})+(?!\d))/g, thousandSep)
  return parts.length > 1 ? `${intPart}${decSep}${parts[1].slice(0, 2)}` : intPart
}

/** Parse a locale-formatted display string back to a float. */
export function parseAmount(display: string, locale: AmountLocale): number {
  const thousandSep = locale === 'tr' ? '.' : ','
  const decSep = locale === 'tr' ? ',' : '.'
  return parseFloat(display.replaceAll(thousandSep, '').replace(decSep, '.')) || 0
}

/** Convert a numeric value to a locale-formatted display string. */
export function numberToDisplay(n: number, locale: AmountLocale): string {
  if (!n) return ''
  const decSep = locale === 'tr' ? ',' : '.'
  const str = String(n).replace('.', decSep)
  return formatAmount(str, locale)
}

/** Locale-appropriate decimal placeholder, e.g. "0,00" for TR. */
export function amountPlaceholder(locale: AmountLocale): string {
  return locale === 'tr' ? '0,00' : '0.00'
}
