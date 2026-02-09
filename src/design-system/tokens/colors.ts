/**
 * SnowUI / ByeWind Design System – Color Tokens
 *
 * These JS constants mirror the CSS custom-properties defined in
 * `src/styles/index.css`.  Use them when you need colour values in
 * JavaScript (e.g. chart libraries, canvas, dynamic styles).
 */

/* ------------------------------------------------------------------ */
/*  Theme-aware colours (light-mode defaults shown)                   */
/* ------------------------------------------------------------------ */

export const themeColors = {
  light: {
    black: 'rgb(0, 0, 0)',
    white: 'rgb(255, 255, 255)',
    brand: 'rgb(0, 0, 0)',
    brandHover: 'rgb(102, 102, 102)',
    bg1: 'rgb(255, 255, 255)',
    bg2: 'rgb(249, 249, 250)',
    bg5: 'rgb(255, 255, 255)',
  },
  dark: {
    black: 'rgb(255, 255, 255)',
    white: 'rgb(0, 0, 0)',
    brand: 'rgb(159, 159, 248)',
    brandHover: 'rgb(95, 95, 149)',
    bg1: 'rgb(42, 42, 42)',
    bg2: 'rgb(255, 255, 255)',
    bg5: 'rgb(229, 229, 229)',
  },
} as const

/* ------------------------------------------------------------------ */
/*  Static colours (identical in both themes)                         */
/* ------------------------------------------------------------------ */

export const staticColors = {
  purple: 'rgba(201, 179, 237, 1)',
  indigo: 'rgba(159, 159, 248, 1)',
  blue: 'rgba(146, 191, 255, 1)',
  cyan: 'rgba(174, 199, 237, 1)',
  mint: 'rgba(150, 226, 214, 1)',
  green: 'rgba(148, 233, 184, 1)',
  yellow: 'rgba(255, 219, 86, 1)',
  orange: 'rgba(255, 181, 91, 1)',
  red: 'rgba(255, 71, 71, 1)',
  bg3: 'rgba(230, 241, 253, 1)',
  bg4: 'rgba(237, 238, 252, 1)',
} as const

/* ------------------------------------------------------------------ */
/*  Black / White opacity scales                                      */
/* ------------------------------------------------------------------ */

export const blackOpacity = {
  100: 'rgba(0, 0, 0, 1)',
  80: 'rgba(0, 0, 0, 0.8)',
  40: 'rgba(0, 0, 0, 0.4)',
  20: 'rgba(0, 0, 0, 0.2)',
  10: 'rgba(0, 0, 0, 0.1)',
  5: 'rgba(0, 0, 0, 0.05)',
  4: 'rgba(0, 0, 0, 0.04)',
} as const

export const whiteOpacity = {
  100: 'rgba(255, 255, 255, 1)',
  80: 'rgba(255, 255, 255, 0.8)',
  40: 'rgba(255, 255, 255, 0.4)',
  20: 'rgba(255, 255, 255, 0.2)',
  10: 'rgba(255, 255, 255, 0.1)',
  5: 'rgba(255, 255, 255, 0.05)',
} as const

/* ------------------------------------------------------------------ */
/*  Semantic aliases (convenience)                                    */
/* ------------------------------------------------------------------ */

export const semanticColors = {
  success: staticColors.green,
  error: staticColors.red,
  warning: staticColors.yellow,
  info: staticColors.blue,
} as const

export type ThemeMode = keyof typeof themeColors
