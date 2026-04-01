/**
 * Supabase Retry & Error Classification
 *
 * Composable wrappers for Supabase queries that classify errors and apply
 * appropriate retry/recovery strategies. NOT a global interceptor — query
 * hooks opt-in by wrapping their calls with `withRetry` or `supabaseQueryFn`.
 *
 * @module supabaseRetry
 */

import { supabase } from './supabase'
import { emitToast } from './toastEmitter'

/* ── Error categories ─────────────────────────────────── */

export type ErrorCategory =
  | 'AUTH'
  | 'RATE_LIMIT'
  | 'SERVER'
  | 'TIMEOUT'
  | 'NETWORK'
  | 'CLIENT'
  | 'RLS'
  | 'UNKNOWN'

export class ClassifiedError extends Error {
  category: ErrorCategory
  retryable: boolean
  original: unknown

  constructor(category: ErrorCategory, message: string, retryable: boolean, original: unknown) {
    super(message)
    this.name = 'ClassifiedError'
    this.category = category
    this.retryable = retryable
    this.original = original
  }
}

/* ── Classification logic ─────────────────────────────── */

function hasCodeAndMessage(err: unknown): err is { message: string; code: string } {
  return (
    err != null &&
    typeof err === 'object' &&
    typeof (err as Record<string, unknown>).message === 'string' &&
    typeof (err as Record<string, unknown>).code === 'string'
  )
}

export function classifyError(error: unknown): ClassifiedError {
  const msg =
    error instanceof Error
      ? error.message
      : typeof (error as Record<string, unknown>)?.message === 'string'
        ? ((error as Record<string, unknown>).message as string)
        : String(error)
  const code = hasCodeAndMessage(error) ? error.code : ''
  const lower = msg.toLowerCase()

  // AUTH — JWT expired or unauthorized
  if (
    code === 'PGRST301' ||
    code === '401' ||
    (lower.includes('jwt') && (lower.includes('expired') || lower.includes('invalid'))) ||
    lower.includes('unauthorized')
  ) {
    return new ClassifiedError('AUTH', msg, true, error)
  }

  // RLS — row-level security policy violation
  if (
    code === '42501' ||
    lower.includes('row-level security') ||
    lower.includes('new row violates')
  ) {
    return new ClassifiedError('RLS', msg, false, error)
  }

  // RATE_LIMIT — 429
  if (code === '429' || lower.includes('rate limit') || lower.includes('too many requests')) {
    return new ClassifiedError('RATE_LIMIT', msg, true, error)
  }

  // TIMEOUT — query canceled or statement timeout
  if (
    code === '57014' ||
    lower.includes('timeout') ||
    lower.includes('statement timeout') ||
    lower.includes('aborted')
  ) {
    return new ClassifiedError('TIMEOUT', msg, true, error)
  }

  // NETWORK — fetch failures, DNS, connection refused
  if (
    error instanceof TypeError ||
    lower.includes('failed to fetch') ||
    lower.includes('networkerror') ||
    lower.includes('network request failed') ||
    lower.includes('econnrefused') ||
    lower.includes('dns')
  ) {
    return new ClassifiedError('NETWORK', msg, true, error)
  }

  // SERVER — 5xx
  if (
    code.startsWith('5') ||
    lower.includes('internal server error') ||
    lower.includes('bad gateway') ||
    lower.includes('service unavailable')
  ) {
    return new ClassifiedError('SERVER', msg, true, error)
  }

  // CLIENT — non-retryable 4xx (excluding auth/rls/rate-limit handled above)
  if (
    (code.startsWith('4') && !['401', '403', '429'].includes(code)) ||
    lower.includes('bad request') ||
    lower.includes('not found') ||
    lower.includes('validation') ||
    lower.includes('constraint')
  ) {
    return new ClassifiedError('CLIENT', msg, false, error)
  }

  return new ClassifiedError('UNKNOWN', msg, false, error)
}

/* ── Retry options ────────────────────────────────────── */

export interface RetryOptions {
  maxRetries?: number
  baseDelay?: number
  onRetry?: (attempt: number, error: ClassifiedError) => void
  signal?: AbortSignal
}

/* ── Delay with abort support ─────────────────────────── */

function wait(ms: number, signal?: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) {
      reject(signal.reason)
      return
    }
    const timer = setTimeout(resolve, ms)
    signal?.addEventListener(
      'abort',
      () => {
        clearTimeout(timer)
        reject(signal.reason)
      },
      { once: true },
    )
  })
}

/* ── Core retry wrapper ───────────────────────────────── */

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type SupabaseOp<T> = () => PromiseLike<{ data: T; error: any }>

/**
 * Wraps a Supabase query/rpc call with retry logic.
 * Classifies errors and applies exponential backoff with jitter.
 * AUTH errors trigger a session refresh before retrying.
 * Throws `ClassifiedError` on final failure.
 */
export async function withRetry<T>(op: SupabaseOp<T>, options?: RetryOptions): Promise<T> {
  const { maxRetries = 3, baseDelay = 1000, onRetry, signal } = options ?? {}
  let last: ClassifiedError | undefined

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    if (signal?.aborted) throw signal.reason

    try {
      const result = await op()

      if (result.error) {
        const classified = classifyError(result.error)

        // Non-retryable or exhausted → fail
        if (!classified.retryable || attempt === maxRetries) {
          if (attempt === maxRetries) {
            emitToast({
              title: 'Failed to load data',
              description: classified.message,
              variant: 'error',
            })
          }
          throw classified
        }

        // AUTH → refresh session, retry once immediately (no backoff)
        if (classified.category === 'AUTH' && attempt === 0) {
          const { error: refreshErr } = await supabase.auth.refreshSession()
          if (refreshErr) {
            emitToast({
              title: 'Session expired',
              description: 'Please log in again',
              variant: 'error',
            })
            throw classified
          }
          onRetry?.(attempt + 1, classified)
          continue
        }

        last = classified
        onRetry?.(attempt + 1, classified)

        // Toast on 2nd+ retry (1st retry is silent)
        if (attempt >= 1) {
          emitToast({ title: 'Connection issue', description: 'Retrying...', variant: 'warning' })
        }

        await wait(baseDelay * 2 ** attempt + Math.random() * 500, signal)
        continue
      }

      // Success
      return result.data as T
    } catch (err) {
      // Already classified → rethrow
      if (err instanceof ClassifiedError) throw err
      // Abort → rethrow
      if (signal?.aborted) throw signal.reason

      // Unhandled error (network failure, TypeError, etc.)
      const classified = classifyError(err)

      if (!classified.retryable || attempt === maxRetries) {
        if (attempt === maxRetries) {
          emitToast({
            title: 'Failed to load data',
            description: classified.message,
            variant: 'error',
          })
        }
        throw classified
      }

      last = classified
      onRetry?.(attempt + 1, classified)

      if (attempt >= 1) {
        emitToast({ title: 'Connection issue', description: 'Retrying...', variant: 'warning' })
      }

      await wait(baseDelay * 2 ** attempt + Math.random() * 500, signal)
    }
  }

  throw last ?? new Error('Retry exhausted')
}

/* ── React Query queryFn convenience wrapper ──────────── */

/**
 * Wraps a Supabase query for use as React Query `queryFn`.
 * Replaces the pattern: `const { data, error } = await supabase.from(...); if (error) throw error; return data`
 *
 * @example
 * queryFn: supabaseQueryFn<IBPartner[]>(() =>
 *   supabase.from('ib_partners').select('*').eq('organization_id', orgId)
 * )
 */
export function supabaseQueryFn<T>(
  queryFn: SupabaseOp<T>,
  options?: Omit<RetryOptions, 'signal'>,
): (ctx: { signal: AbortSignal }) => Promise<T> {
  return ({ signal }) => withRetry(queryFn, { ...options, signal })
}
