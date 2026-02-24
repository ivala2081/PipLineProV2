/**
 * Centralized logging service
 *
 * Provides environment-aware logging that can be disabled in production.
 * In production, errors are forwarded to Sentry automatically.
 *
 * Usage:
 *   import { logger } from '@/lib/logger'
 *   logger.debug('Debug info', { userId: 123 })
 *   logger.info('User logged in')
 *   logger.warn('Deprecated API usage')
 *   logger.error('Failed to fetch', error)
 */

import { Sentry } from '@/lib/sentry'

const isDevelopment = import.meta.env.DEV

type LogLevel = 'debug' | 'info' | 'warn' | 'error'

interface LoggerInterface {
  debug: (...args: unknown[]) => void
  info: (...args: unknown[]) => void
  warn: (...args: unknown[]) => void
  error: (...args: unknown[]) => void
}

class Logger implements LoggerInterface {
  private log(level: LogLevel, ...args: unknown[]): void {
    const timestamp = new Date().toISOString()
    const prefix = `[${timestamp}] [${level.toUpperCase()}]`

    switch (level) {
      case 'debug':
        if (isDevelopment) {
          console.log(prefix, ...args)
        }
        break
      case 'info':
        console.info(prefix, ...args)
        break
      case 'warn':
        console.warn(prefix, ...args)
        break
      case 'error':
        console.error(prefix, ...args)
        if (!isDevelopment) {
          const exception = args[0]
          if (exception instanceof Error) {
            Sentry.captureException(exception)
          } else {
            Sentry.captureMessage(String(exception), 'error')
          }
        }
        break
    }
  }

  debug(...args: unknown[]): void {
    this.log('debug', ...args)
  }

  info(...args: unknown[]): void {
    this.log('info', ...args)
  }

  warn(...args: unknown[]): void {
    this.log('warn', ...args)
  }

  error(...args: unknown[]): void {
    this.log('error', ...args)
  }
}

export const logger = new Logger()
