/**
 * SnowUI / ByeWind Design System – Spacing Tokens
 *
 * All values are multiples of 4.
 * Keep the total count under 16 per the 90% principle.
 */

export const spacing = {
  0: 0,
  4: 4,
  8: 8,
  12: 12,
  16: 16,
  20: 20,
  24: 24,
  28: 28,
  32: 32,
  40: 40,
  48: 48,
  80: 80,
} as const

/** Pixel string map for inline styles */
export const spacingPx = Object.fromEntries(
  Object.entries(spacing).map(([k, v]) => [k, `${v}px`]),
) as Record<keyof typeof spacing, string>

export type SpacingKey = keyof typeof spacing

/**
 * Semantic spacing aliases — mirror the CSS --spacing-* tokens in index.css.
 *
 * Usage rules:
 *   xs   (4px)  — icon + label gap, tight inline elements
 *   sm   (8px)  — button groups, action rows, row-level gaps
 *   md   (16px) — filter grids, card inner sections, form columns
 *   card (20px) — Card component default padding only
 *   lg   (24px) — page-section gap, major vertical groups
 *   xl   (32px) — page-level separation
 *   '2xl'(48px) — hero / major layout blocks
 *
 * In Tailwind use the generated utilities (gap-xs, space-y-lg, p-card …).
 * Use this object only when you need inline styles or JS calculations.
 */
export const space = {
  xs: 4,
  sm: 8,
  md: 16,
  card: 20,
  lg: 24,
  xl: 32,
  '2xl': 48,
} as const

export type SpaceKey = keyof typeof space
