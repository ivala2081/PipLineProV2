/**
 * Haptic Feedback Utility
 *
 * Provides tactile feedback on mobile devices using the Vibration API.
 * Gracefully degrades on unsupported devices.
 *
 * @module haptics
 */

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

export type HapticType = 'success' | 'error' | 'warning' | 'light' | 'medium' | 'heavy'

/**
 * Vibration pattern: [vibrate, pause, vibrate, pause, ...]
 * Duration in milliseconds
 */
type VibrationPattern = number | number[]

/* ------------------------------------------------------------------ */
/*  Feature Detection                                                  */
/* ------------------------------------------------------------------ */

/**
 * Check if Vibration API is supported
 */
function isVibrationSupported(): boolean {
  return 'vibrate' in navigator
}

/**
 * Check if device is likely mobile (for selective haptic feedback)
 */
function isMobileDevice(): boolean {
  return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)
}

/* ------------------------------------------------------------------ */
/*  Vibration Patterns                                                 */
/* ------------------------------------------------------------------ */

/**
 * Predefined vibration patterns for different feedback types
 */
const VIBRATION_PATTERNS: Record<HapticType, VibrationPattern> = {
  // Success: Single short vibration
  success: 50,

  // Error: Two short vibrations
  error: [100, 50, 100],

  // Warning: Three very short vibrations
  warning: [50, 30, 50, 30, 50],

  // Light: Very short tap
  light: 10,

  // Medium: Medium tap
  medium: 30,

  // Heavy: Strong tap
  heavy: 60,
}

/* ------------------------------------------------------------------ */
/*  Core Functions                                                     */
/* ------------------------------------------------------------------ */

/**
 * Trigger haptic feedback with specified pattern
 * @param pattern - Vibration pattern (number or array of numbers)
 * @returns true if vibration was triggered, false if not supported
 */
function vibrate(pattern: VibrationPattern): boolean {
  if (!isVibrationSupported()) {
    return false
  }

  try {
    navigator.vibrate(pattern)
    return true
  } catch (error) {
    console.warn('[Haptics] Failed to trigger vibration:', error)
    return false
  }
}

/**
 * Cancel any ongoing vibration
 */
function cancelVibration(): void {
  if (isVibrationSupported()) {
    try {
      navigator.vibrate(0)
    } catch (error) {
      console.warn('[Haptics] Failed to cancel vibration:', error)
    }
  }
}

/* ------------------------------------------------------------------ */
/*  Public API                                                         */
/* ------------------------------------------------------------------ */

/**
 * Trigger haptic feedback by type
 * @param type - Type of haptic feedback
 * @param forceOnDesktop - Force haptic even on desktop (default: false)
 * @returns true if vibration was triggered
 */
export function triggerHaptic(type: HapticType, forceOnDesktop: boolean = false): boolean {
  // Skip on desktop unless forced
  if (!forceOnDesktop && !isMobileDevice()) {
    return false
  }

  const pattern = VIBRATION_PATTERNS[type]
  return vibrate(pattern)
}

/**
 * Success haptic (single short vibration)
 * Use for: successful login, form submission, task completion
 */
export function success(): boolean {
  return triggerHaptic('success')
}

/**
 * Error haptic (two short vibrations)
 * Use for: failed login, validation errors, network errors
 */
export function error(): boolean {
  return triggerHaptic('error')
}

/**
 * Warning haptic (three short vibrations)
 * Use for: warnings, confirmations needed, rate limits
 */
export function warning(): boolean {
  return triggerHaptic('warning')
}

/**
 * Light haptic (very short tap)
 * Use for: button presses, tab switches, minor interactions
 */
export function light(): boolean {
  return triggerHaptic('light')
}

/**
 * Medium haptic (medium tap)
 * Use for: toggle switches, selections, focus changes
 */
export function medium(): boolean {
  return triggerHaptic('medium')
}

/**
 * Heavy haptic (strong tap)
 * Use for: important actions, critical alerts, confirmations
 */
export function heavy(): boolean {
  return triggerHaptic('heavy')
}

/**
 * Custom haptic pattern
 * @param pattern - Custom vibration pattern (number or array)
 * @example
 * // Single vibration for 200ms
 * custom(200)
 *
 * // Pattern: vibrate 100ms, pause 50ms, vibrate 100ms
 * custom([100, 50, 100])
 */
export function custom(pattern: VibrationPattern): boolean {
  if (!isMobileDevice()) {
    return false
  }
  return vibrate(pattern)
}

/**
 * Stop any ongoing vibration
 */
export function cancel(): void {
  cancelVibration()
}

/**
 * Check if haptic feedback is available
 * @returns true if device supports vibration and is mobile
 */
export function isAvailable(): boolean {
  return isVibrationSupported() && isMobileDevice()
}

/**
 * Test haptic feedback (for settings/debugging)
 * Triggers all haptic types in sequence
 */
export async function testAllHaptics(): Promise<void> {
  if (!isAvailable()) {
    console.warn('[Haptics] Haptic feedback not available on this device')
    return
  }

  const types: HapticType[] = ['light', 'medium', 'heavy', 'success', 'warning', 'error']

  for (const type of types) {
    console.log(`[Haptics] Testing ${type}`)
    triggerHaptic(type, true)
    // Wait between each test
    await new Promise((resolve) => setTimeout(resolve, 800))
  }
}

/* ------------------------------------------------------------------ */
/*  Hook Integration (for React)                                       */
/* ------------------------------------------------------------------ */

/**
 * Get haptic API object (for use in React hooks)
 * @example
 * const haptics = getHaptics()
 * haptics.success() // trigger success haptic
 */
export function getHaptics() {
  return {
    success,
    error,
    warning,
    light,
    medium,
    heavy,
    custom,
    cancel,
    isAvailable: isAvailable(),
    test: testAllHaptics,
  }
}

/* ------------------------------------------------------------------ */
/*  Export default for convenience                                     */
/* ------------------------------------------------------------------ */

export default {
  success,
  error,
  warning,
  light,
  medium,
  heavy,
  custom,
  cancel,
  isAvailable,
  test: testAllHaptics,
  get: getHaptics,
}
