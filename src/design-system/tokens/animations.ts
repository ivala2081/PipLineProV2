/**
 * SnowUI / ByeWind Design System – Animation Tokens
 *
 * These mirror the CSS @keyframes in index.css.
 * Use them when driving animations from JS (e.g. Framer Motion).
 */

export const durations = {
  fast: 150,
  normal: 300,
  slow: 500,
} as const

export const easings = {
  easeOut: 'ease-out',
  easeInOut: 'ease-in-out',
  spring: 'cubic-bezier(0.34, 1.56, 0.64, 1)',
} as const

export const animationNames = [
  'accordion-down',
  'accordion-up',
  'animate-in',
  'animate-out',
  'slide-in-from-top',
  'slide-in-from-right',
  'slide-in-from-left',
  'slide-in-from-bottom',
  'slide-out-to-top',
  'slide-out-to-right',
  'slide-out-to-left',
  'slide-out-to-bottom',
  'zoom-in-95',
  'zoom-out-95',
] as const

export type AnimationName = (typeof animationNames)[number]
