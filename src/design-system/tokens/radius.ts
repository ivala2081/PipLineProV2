/**
 * SnowUI / ByeWind Design System – Border Radius Tokens
 *
 * Same scale as spacing – multiples of 4, keep under 16 values.
 */

export const radius = {
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
export const radiusPx = Object.fromEntries(
  Object.entries(radius).map(([k, v]) => [k, `${v}px`]),
) as Record<keyof typeof radius, string>

/** Common semantic aliases */
export const radiusSemantic = {
  none: 0,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  '2xl': 32,
  full: 9999,
} as const

export type RadiusKey = keyof typeof radius
