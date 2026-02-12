/**
 * Device Fingerprinting Service
 *
 * Generates a stable device identifier based on browser characteristics.
 * Used for trusted device tracking and security monitoring.
 *
 * @module deviceFingerprinting
 */

const STORAGE_KEY = 'piplinepro-device-id'

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

export interface DeviceFingerprint {
  /** Unique device identifier */
  deviceId: string
  /** Timestamp when fingerprint was generated */
  generatedAt: number
  /** Browser user agent */
  userAgent: string
  /** Screen resolution */
  screenResolution: string
  /** Timezone offset */
  timezoneOffset: number
  /** Language preference */
  language: string
  /** Platform */
  platform: string
}

/* ------------------------------------------------------------------ */
/*  Fingerprint Generation                                             */
/* ------------------------------------------------------------------ */

/**
 * Hash a string using simple DJB2 algorithm (non-cryptographic)
 */
function simpleHash(str: string): string {
  let hash = 5381
  for (let i = 0; i < str.length; i++) {
    hash = (hash * 33) ^ str.charCodeAt(i)
  }
  return (hash >>> 0).toString(36)
}

/**
 * Get canvas fingerprint
 */
function getCanvasFingerprint(): string {
  try {
    const canvas = document.createElement('canvas')
    const ctx = canvas.getContext('2d')
    if (!ctx) return 'no-canvas'

    // Draw text with specific styling
    canvas.width = 200
    canvas.height = 50
    ctx.textBaseline = 'top'
    ctx.font = '14px Arial'
    ctx.fillStyle = '#f60'
    ctx.fillRect(0, 0, 200, 50)
    ctx.fillStyle = '#069'
    ctx.fillText('PipLinePro Device ID', 2, 2)

    return simpleHash(canvas.toDataURL())
  } catch {
    return 'canvas-error'
  }
}

/**
 * Get WebGL fingerprint
 */
function getWebGLFingerprint(): string {
  try {
    const canvas = document.createElement('canvas')
    const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl')
    if (!gl) return 'no-webgl'

    const debugInfo = (gl as WebGLRenderingContext).getExtension('WEBGL_debug_renderer_info')
    if (!debugInfo) return 'no-debug-info'

    const vendor = (gl as WebGLRenderingContext).getParameter(debugInfo.UNMASKED_VENDOR_WEBGL)
    const renderer = (gl as WebGLRenderingContext).getParameter(debugInfo.UNMASKED_RENDERER_WEBGL)

    return simpleHash(`${vendor}|${renderer}`)
  } catch {
    return 'webgl-error'
  }
}

/**
 * Get screen fingerprint
 */
function getScreenFingerprint(): string {
  const screen = window.screen
  return `${screen.width}x${screen.height}x${screen.colorDepth}`
}

/**
 * Get timezone offset
 */
function getTimezoneOffset(): number {
  return new Date().getTimezoneOffset()
}

/**
 * Get installed fonts (basic check)
 */
function getFontsFingerprint(): string {
  const baseFonts = ['monospace', 'sans-serif', 'serif']
  const testFonts = [
    'Arial', 'Verdana', 'Times New Roman', 'Courier New', 'Georgia',
    'Comic Sans MS', 'Impact', 'Trebuchet MS', 'Arial Black', 'Tahoma'
  ]

  const canvas = document.createElement('canvas')
  const ctx = canvas.getContext('2d')
  if (!ctx) return 'no-fonts'

  // Measure text width with different fonts
  const detected: string[] = []
  baseFonts.forEach(baseFont => {
    const baseWidth = ctx.measureText('mmmmmmmmmmlli').width
    testFonts.forEach(testFont => {
      ctx.font = `72px "${testFont}", ${baseFont}`
      const testWidth = ctx.measureText('mmmmmmmmmmlli').width
      if (testWidth !== baseWidth) {
        detected.push(testFont)
      }
    })
  })

  return simpleHash(detected.join(','))
}

/**
 * Collect all device characteristics
 */
function collectDeviceCharacteristics(): string[] {
  return [
    navigator.userAgent,
    getScreenFingerprint(),
    getTimezoneOffset().toString(),
    navigator.language || 'unknown',
    navigator.platform || 'unknown',
    navigator.hardwareConcurrency?.toString() || '0',
    navigator.maxTouchPoints?.toString() || '0',
    getCanvasFingerprint(),
    getWebGLFingerprint(),
    getFontsFingerprint(),
    // Check for touch support
    ('ontouchstart' in window).toString(),
    // Device memory (if available)
    (navigator as any).deviceMemory?.toString() || 'unknown',
  ]
}

/**
 * Generate a unique device ID based on browser fingerprint
 */
function generateDeviceId(): string {
  const characteristics = collectDeviceCharacteristics()
  const combined = characteristics.join('|')
  return simpleHash(combined)
}

/* ------------------------------------------------------------------ */
/*  Public API                                                         */
/* ------------------------------------------------------------------ */

/**
 * Get or generate device fingerprint
 * Returns existing ID from localStorage if available, otherwise generates new one
 */
export function getDeviceFingerprint(): DeviceFingerprint {
  // Try to get existing fingerprint from localStorage
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored) {
      const parsed = JSON.parse(stored) as DeviceFingerprint
      // Validate stored data
      if (parsed.deviceId && parsed.generatedAt) {
        return parsed
      }
    }
  } catch (error) {
    console.warn('[DeviceFingerprint] Failed to read from localStorage:', error)
  }

  // Generate new fingerprint
  const fingerprint: DeviceFingerprint = {
    deviceId: generateDeviceId(),
    generatedAt: Date.now(),
    userAgent: navigator.userAgent,
    screenResolution: getScreenFingerprint(),
    timezoneOffset: getTimezoneOffset(),
    language: navigator.language || 'unknown',
    platform: navigator.platform || 'unknown',
  }

  // Store for future use
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(fingerprint))
  } catch (error) {
    console.warn('[DeviceFingerprint] Failed to save to localStorage:', error)
  }

  return fingerprint
}

/**
 * Get just the device ID (convenience method)
 */
export function getDeviceId(): string {
  return getDeviceFingerprint().deviceId
}

/**
 * Clear stored device fingerprint
 * Useful for testing or when user logs out from all devices
 */
export function clearDeviceFingerprint(): void {
  try {
    localStorage.removeItem(STORAGE_KEY)
  } catch (error) {
    console.warn('[DeviceFingerprint] Failed to clear localStorage:', error)
  }
}

/**
 * Check if device fingerprint has changed
 * Returns true if current fingerprint differs from stored one
 */
export function hasDeviceFingerprintChanged(): boolean {
  const stored = getDeviceFingerprint()
  const current = generateDeviceId()
  return stored.deviceId !== current
}

/**
 * Get device information for logging/debugging
 */
export function getDeviceInfo(): {
  deviceId: string
  browser: string
  os: string
  isMobile: boolean
  screenSize: string
} {
  const fingerprint = getDeviceFingerprint()
  const ua = navigator.userAgent

  // Simple browser detection
  let browser = 'Unknown'
  if (ua.includes('Firefox')) browser = 'Firefox'
  else if (ua.includes('Chrome') && !ua.includes('Edg')) browser = 'Chrome'
  else if (ua.includes('Safari') && !ua.includes('Chrome')) browser = 'Safari'
  else if (ua.includes('Edg')) browser = 'Edge'

  // Simple OS detection
  let os = 'Unknown'
  if (ua.includes('Windows')) os = 'Windows'
  else if (ua.includes('Mac')) os = 'macOS'
  else if (ua.includes('Linux')) os = 'Linux'
  else if (ua.includes('Android')) os = 'Android'
  else if (ua.includes('iOS') || ua.includes('iPhone') || ua.includes('iPad')) os = 'iOS'

  // Mobile detection
  const isMobile = /Mobile|Android|iPhone|iPad|iPod/i.test(ua)

  return {
    deviceId: fingerprint.deviceId,
    browser,
    os,
    isMobile,
    screenSize: fingerprint.screenResolution,
  }
}
