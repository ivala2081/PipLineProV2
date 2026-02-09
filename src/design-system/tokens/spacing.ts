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
