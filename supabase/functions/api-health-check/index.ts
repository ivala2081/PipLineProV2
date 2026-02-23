import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsHeaders, handleCors } from '../_shared/cors.ts'
import { createAdminClient } from '../_shared/supabase-admin.ts'

/* ────────────────────────────────────────────────────────────────────
 * API Health Check Edge Function
 *
 * Tests all third-party API integrations and returns their health status.
 * God-only access — reveals which API keys are configured and their masked values.
 * ─────────────────────────────────────────────────────────────────── */

/* ── Response helpers ──────────────────────────────────────────────── */

function jsonResponse(body: unknown, status = 200, origin?: string): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders(origin), 'Content-Type': 'application/json' },
  })
}

function errorResponse(status: number, message: string, origin?: string): Response {
  return jsonResponse({ error: message }, status, origin)
}

/* ── Helpers ────────────────────────────────────────────────────────── */

function maskKey(key: string | undefined): string | undefined {
  if (!key) return undefined
  if (key.length <= 4) return '****'
  return '****' + key.slice(-4)
}

function classifyError(statusCode: number): string {
  if (statusCode === 401 || statusCode === 403) return 'invalid_key'
  if (statusCode === 429) return 'rate_limit'
  if (statusCode >= 500) return 'server_error'
  return 'unknown'
}

interface HealthResult {
  service: string
  status: 'healthy' | 'error' | 'not_configured'
  statusCode?: number
  errorType?: string
  errorMessage?: string
  responseTimeMs: number
  keyConfigured: boolean
  keyMasked?: string
  checkedAt: string
}

/* ── Service Health Checks ─────────────────────────────────────────── */

const TATUM_API_KEY = Deno.env.get('TATUM_API_KEY')
const EXCHANGE_RATE_API_KEY = Deno.env.get('EXCHANGE_RATE_API_KEY')
const GEMINI_API_KEY = Deno.env.get('GEMINI_API_KEY')
const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')
const UNIPAYMENT_CLIENT_ID = Deno.env.get('UNIPAYMENT_CLIENT_ID')
const UNIPAYMENT_CLIENT_SECRET = Deno.env.get('UNIPAYMENT_CLIENT_SECRET')
const UNIPAYMENT_BASE_URL = Deno.env.get('UNIPAYMENT_BASE_URL') || 'https://api.unipayment.io'

async function checkTatum(): Promise<HealthResult> {
  const now = new Date().toISOString()
  if (!TATUM_API_KEY) {
    return { service: 'tatum', status: 'not_configured', errorType: 'not_configured', responseTimeMs: 0, keyConfigured: false, checkedAt: now }
  }
  const start = Date.now()
  try {
    const res = await fetch('https://api.tatum.io/v4/data/rate/symbol?symbol=BTC&basePair=USD', {
      headers: { accept: 'application/json', 'x-api-key': TATUM_API_KEY },
    })
    const ms = Date.now() - start
    if (res.ok) {
      return { service: 'tatum', status: 'healthy', statusCode: res.status, responseTimeMs: ms, keyConfigured: true, keyMasked: maskKey(TATUM_API_KEY), checkedAt: now }
    }
    const errText = await res.text().catch(() => '')
    return { service: 'tatum', status: 'error', statusCode: res.status, errorType: classifyError(res.status), errorMessage: errText.slice(0, 200), responseTimeMs: ms, keyConfigured: true, keyMasked: maskKey(TATUM_API_KEY), checkedAt: now }
  } catch (err) {
    return { service: 'tatum', status: 'error', errorType: 'network_error', errorMessage: (err as Error).message, responseTimeMs: Date.now() - start, keyConfigured: true, keyMasked: maskKey(TATUM_API_KEY), checkedAt: now }
  }
}

async function checkExchangeRate(): Promise<HealthResult> {
  const now = new Date().toISOString()
  if (!EXCHANGE_RATE_API_KEY) {
    return { service: 'exchangeRate', status: 'not_configured', errorType: 'not_configured', responseTimeMs: 0, keyConfigured: false, checkedAt: now }
  }
  const start = Date.now()
  try {
    const res = await fetch(`https://api.freecurrencyapi.com/v1/latest?apikey=${EXCHANGE_RATE_API_KEY}&base_currency=USD&currencies=TRY`, {
      headers: { accept: 'application/json' },
    })
    const ms = Date.now() - start
    if (res.ok) {
      return { service: 'exchangeRate', status: 'healthy', statusCode: res.status, responseTimeMs: ms, keyConfigured: true, keyMasked: maskKey(EXCHANGE_RATE_API_KEY), checkedAt: now }
    }
    const errText = await res.text().catch(() => '')
    return { service: 'exchangeRate', status: 'error', statusCode: res.status, errorType: classifyError(res.status), errorMessage: errText.slice(0, 200), responseTimeMs: ms, keyConfigured: true, keyMasked: maskKey(EXCHANGE_RATE_API_KEY), checkedAt: now }
  } catch (err) {
    return { service: 'exchangeRate', status: 'error', errorType: 'network_error', errorMessage: (err as Error).message, responseTimeMs: Date.now() - start, keyConfigured: true, keyMasked: maskKey(EXCHANGE_RATE_API_KEY), checkedAt: now }
  }
}

function checkGemini(): HealthResult {
  const now = new Date().toISOString()
  // Gemini: only check if key is configured (actual API calls cost money)
  if (!GEMINI_API_KEY) {
    return { service: 'gemini', status: 'not_configured', errorType: 'not_configured', responseTimeMs: 0, keyConfigured: false, checkedAt: now }
  }
  return { service: 'gemini', status: 'healthy', responseTimeMs: 0, keyConfigured: true, keyMasked: maskKey(GEMINI_API_KEY), checkedAt: now }
}

async function checkResend(): Promise<HealthResult> {
  const now = new Date().toISOString()
  if (!RESEND_API_KEY) {
    return { service: 'resend', status: 'not_configured', errorType: 'not_configured', responseTimeMs: 0, keyConfigured: false, checkedAt: now }
  }
  const start = Date.now()
  try {
    const res = await fetch('https://api.resend.com/api-keys', {
      headers: { Authorization: `Bearer ${RESEND_API_KEY}` },
    })
    const ms = Date.now() - start
    if (res.ok) {
      return { service: 'resend', status: 'healthy', statusCode: res.status, responseTimeMs: ms, keyConfigured: true, keyMasked: maskKey(RESEND_API_KEY), checkedAt: now }
    }
    const errText = await res.text().catch(() => '')
    return { service: 'resend', status: 'error', statusCode: res.status, errorType: classifyError(res.status), errorMessage: errText.slice(0, 200), responseTimeMs: ms, keyConfigured: true, keyMasked: maskKey(RESEND_API_KEY), checkedAt: now }
  } catch (err) {
    return { service: 'resend', status: 'error', errorType: 'network_error', errorMessage: (err as Error).message, responseTimeMs: Date.now() - start, keyConfigured: true, keyMasked: maskKey(RESEND_API_KEY), checkedAt: now }
  }
}

async function checkUniPayment(): Promise<HealthResult> {
  const now = new Date().toISOString()
  if (!UNIPAYMENT_CLIENT_ID || !UNIPAYMENT_CLIENT_SECRET) {
    return { service: 'uniPayment', status: 'not_configured', errorType: 'not_configured', responseTimeMs: 0, keyConfigured: false, checkedAt: now }
  }
  const start = Date.now()
  try {
    const res = await fetch(`${UNIPAYMENT_BASE_URL}/connect/token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'client_credentials',
        client_id: UNIPAYMENT_CLIENT_ID,
        client_secret: UNIPAYMENT_CLIENT_SECRET,
      }),
    })
    const ms = Date.now() - start
    if (res.ok) {
      return { service: 'uniPayment', status: 'healthy', statusCode: res.status, responseTimeMs: ms, keyConfigured: true, keyMasked: maskKey(UNIPAYMENT_CLIENT_ID), checkedAt: now }
    }
    const errText = await res.text().catch(() => '')
    return { service: 'uniPayment', status: 'error', statusCode: res.status, errorType: classifyError(res.status), errorMessage: errText.slice(0, 200), responseTimeMs: ms, keyConfigured: true, keyMasked: maskKey(UNIPAYMENT_CLIENT_ID), checkedAt: now }
  } catch (err) {
    return { service: 'uniPayment', status: 'error', errorType: 'network_error', errorMessage: (err as Error).message, responseTimeMs: Date.now() - start, keyConfigured: true, keyMasked: maskKey(UNIPAYMENT_CLIENT_ID), checkedAt: now }
  }
}

/* ── God-only auth check ───────────────────────────────────────────── */

async function validateGodUser(authHeader: string | null): Promise<string> {
  if (!authHeader) throw new Error('Missing authorization header')

  const token = authHeader.replace('Bearer ', '')
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_ANON_KEY')!,
    { global: { headers: { Authorization: authHeader } } },
  )

  const { data: { user }, error } = await supabase.auth.getUser(token)
  if (error || !user) throw new Error('Unauthorized: invalid token')

  const admin = createAdminClient()
  const { data: profile } = await admin
    .from('profiles')
    .select('system_role, email')
    .eq('id', user.id)
    .single()

  if (profile?.system_role !== 'god') {
    throw new Error('Forbidden: god role required')
  }

  return profile.email || user.email || ''
}

/* ── Main handler ───────────────────────────────────────────────────── */

serve(async (req: Request) => {
  const corsResponse = handleCors(req)
  if (corsResponse) return corsResponse

  const origin = req.headers.get('origin') || undefined

  try {
    await validateGodUser(req.headers.get('authorization'))

    // Run all checks in parallel
    const results = await Promise.all([
      checkTatum(),
      checkExchangeRate(),
      checkGemini(),
      checkResend(),
      checkUniPayment(),
    ])

    return jsonResponse(results, 200, origin)
  } catch (error) {
    const msg = (error as Error).message || 'Unknown error'
    if (msg.includes('Unauthorized') || msg.includes('Missing authorization')) {
      return errorResponse(401, msg, origin)
    }
    if (msg.includes('Forbidden') || msg.includes('god role')) {
      return errorResponse(403, msg, origin)
    }
    console.error('[ApiHealthCheck] Error:', error)
    return errorResponse(500, msg, origin)
  }
})
