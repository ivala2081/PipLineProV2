/**
 * In-memory rate limiter for Supabase Edge Functions.
 *
 * NOTE: Deno Edge Functions are stateless between cold starts, so the in-memory
 * store only persists within a single instance. This provides a basic first line
 * of defense against abuse. For production-grade rate limiting, pair this with
 * Supabase's built-in rate limiting or an external store (e.g. Redis / Upstash).
 *
 * Usage:
 *   import { checkRateLimit } from '../_shared/rateLimit.ts'
 *
 *   const rateLimitResponse = checkRateLimit(userId, { maxRequests: 10, windowMs: 60_000 })
 *   if (rateLimitResponse) return rateLimitResponse   // 429 Too Many Requests
 */

/* ── Types ─────────────────────────────────────────────────────────── */

export interface RateLimitOptions {
  /** Maximum number of requests allowed within the window. */
  maxRequests: number
  /** Time window in milliseconds (e.g. 60_000 = 1 minute). */
  windowMs: number
  /** Optional CORS headers to include in the 429 response. */
  corsHeaders?: Record<string, string>
}

interface RateLimitEntry {
  /** Timestamps (ms) of requests within the current window. */
  timestamps: number[]
}

/* ── Store ─────────────────────────────────────────────────────────── */

const store = new Map<string, RateLimitEntry>()

/**
 * Interval (ms) between automatic pruning of stale entries.
 * We prune every 2 minutes to keep memory usage bounded.
 */
const PRUNE_INTERVAL_MS = 2 * 60 * 1000

let lastPruneTime = Date.now()

/**
 * Remove entries whose most recent timestamp is older than `maxAge`.
 * Called automatically from `checkRateLimit` when `PRUNE_INTERVAL_MS` has elapsed.
 */
function pruneStaleEntries(maxAge: number): void {
  const cutoff = Date.now() - maxAge
  for (const [key, entry] of store) {
    if (entry.timestamps.length === 0 || entry.timestamps[entry.timestamps.length - 1] < cutoff) {
      store.delete(key)
    }
  }
}

/* ── Public API ────────────────────────────────────────────────────── */

/**
 * Check whether a given identifier (user ID, IP, etc.) has exceeded the rate limit.
 *
 * @returns `null` if the request is allowed, or a `Response` (429) if rate-limited.
 */
export function checkRateLimit(identifier: string, options: RateLimitOptions): Response | null {
  const { maxRequests, windowMs, corsHeaders: cors } = options
  const now = Date.now()

  // ── Periodic pruning ──────────────────────────────────────────────
  if (now - lastPruneTime > PRUNE_INTERVAL_MS) {
    pruneStaleEntries(windowMs)
    lastPruneTime = now
  }

  // ── Get or create entry ───────────────────────────────────────────
  let entry = store.get(identifier)
  if (!entry) {
    entry = { timestamps: [] }
    store.set(identifier, entry)
  }

  // ── Slide the window: drop timestamps older than windowMs ─────────
  const windowStart = now - windowMs
  entry.timestamps = entry.timestamps.filter((t) => t > windowStart)

  // ── Check limit ───────────────────────────────────────────────────
  if (entry.timestamps.length >= maxRequests) {
    // Calculate when the earliest request in the window expires
    const oldestInWindow = entry.timestamps[0]
    const retryAfterMs = oldestInWindow + windowMs - now
    const retryAfterSeconds = Math.ceil(retryAfterMs / 1000)

    return new Response(
      JSON.stringify({
        error: 'RATE_LIMIT_EXCEEDED',
        message: `Too many requests. Please try again in ${retryAfterSeconds} second${retryAfterSeconds === 1 ? '' : 's'}.`,
        retryAfter: retryAfterSeconds,
      }),
      {
        status: 429,
        headers: {
          ...cors,
          'Content-Type': 'application/json',
          'Retry-After': String(retryAfterSeconds),
        },
      },
    )
  }

  // ── Allow request and record it ───────────────────────────────────
  entry.timestamps.push(now)
  return null
}
