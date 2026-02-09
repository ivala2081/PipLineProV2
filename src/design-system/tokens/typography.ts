/**
 * SnowUI / ByeWind Design System – Typography Tokens
 */

export const fontFamily = {
  normal: '"Inter", sans-serif',
} as const

export const fontWeight = {
  regular: 400,
  medium: 500,
  semibold: 600,
  bold: 700,
} as const

/**
 * Text size scale – matches the SnowUI Figma text styles.
 * Each entry includes the Tailwind class, raw pixel size, and rem value.
 */
export const textSize = {
  12: { px: 12, rem: '0.75rem', tw: 'text-xs', lineHeight: '1rem' },
  14: { px: 14, rem: '0.875rem', tw: 'text-sm', lineHeight: '1.25rem' },
  16: { px: 16, rem: '1rem', tw: 'text-base', lineHeight: '1.5rem' },
  18: { px: 18, rem: '1.125rem', tw: 'text-lg', lineHeight: '1.75rem' },
  24: { px: 24, rem: '1.5rem', tw: 'text-2xl', lineHeight: '2rem' },
  32: { px: 32, rem: '2rem', tw: 'text-[2rem]', lineHeight: '2.5rem' },
  48: { px: 48, rem: '3rem', tw: 'text-[3rem]', lineHeight: '3.625rem' },
  64: { px: 64, rem: '4rem', tw: 'text-[4rem]', lineHeight: '4.875rem' },
} as const

export type TextSizeKey = keyof typeof textSize
export type FontWeightKey = keyof typeof fontWeight
