/**
 * Salary / amount formatting helpers shared across the HR module.
 */

/* ------------------------------------------------------------------ */
/*  Number formatting                                                   */
/* ------------------------------------------------------------------ */

/** Format a number with Turkish locale grouping (no decimals). */
export function fmtNum(n: number): string {
  return n.toLocaleString('tr-TR', { minimumFractionDigits: 0, maximumFractionDigits: 0 })
}

/** Format a number as a currency string (e.g. "12.500 TL" or "3.200 $"). */
export function fmtAmount(n: number, currency: 'TL' | 'USD' = 'TL'): string {
  return fmtNum(n) + (currency === 'USD' ? ' $' : ' TL')
}
