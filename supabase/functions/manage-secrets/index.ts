import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsHeaders, handleCors } from '../_shared/cors.ts'
import { createAdminClient } from '../_shared/supabase-admin.ts'

/* ────────────────────────────────────────────────────────────────────
 * Manage Secrets Edge Function
 *
 * Allows god users to update API keys via the Supabase Management API.
 * Requires SB_MANAGEMENT_TOKEN (Personal Access Token) to be set.
 * ─────────────────────────────────────────────────────────────────── */

const PROJECT_REF = 'mnbjpcidjawvygkimgma'
const SB_MANAGEMENT_TOKEN = Deno.env.get('SB_MANAGEMENT_TOKEN')

/* Whitelist: only these secrets can be updated from the UI */
const ALLOWED_SECRETS = new Set([
  'TATUM_API_KEY',
  'GEMINI_API_KEY',
  'EXCHANGE_RATE_API_KEY',
  'RESEND_API_KEY',
  'UNIPAYMENT_CLIENT_ID',
  'UNIPAYMENT_CLIENT_SECRET',
])

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

function maskKey(key: string | undefined): string | undefined {
  if (!key) return undefined
  if (key.length <= 4) return '****'
  return '****' + key.slice(-4)
}

/* ── God-only auth check ───────────────────────────────────────────── */

interface GodUser {
  userId: string
  email: string
}

async function validateGodUser(authHeader: string | null): Promise<GodUser> {
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

  return { userId: user.id, email: profile.email || user.email || '' }
}

/* ── Supabase Management API ───────────────────────────────────────── */

async function updateSupabaseSecrets(
  secrets: { name: string; value: string }[],
): Promise<void> {
  if (!SB_MANAGEMENT_TOKEN) {
    throw new Error('SB_MANAGEMENT_TOKEN not configured. Generate a Personal Access Token at https://supabase.com/dashboard/account/tokens')
  }

  const res = await fetch(
    `https://api.supabase.com/v1/projects/${PROJECT_REF}/secrets`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${SB_MANAGEMENT_TOKEN}`,
      },
      body: JSON.stringify(secrets),
    },
  )

  if (!res.ok) {
    const text = await res.text().catch(() => 'Unknown error')
    throw new Error(`Supabase Management API error (${res.status}): ${text}`)
  }
}

/* ── Audit logging ─────────────────────────────────────────────────── */

async function logAudit(
  godUser: GodUser,
  secretNames: string[],
  maskedValues: Record<string, string | undefined>,
): Promise<void> {
  const admin = createAdminClient()
  for (const name of secretNames) {
    await admin.from('god_audit_log').insert({
      god_user_id: godUser.userId,
      god_email: godUser.email,
      action: 'UPDATE_API_SECRET',
      table_name: 'supabase_secrets',
      record_id: null,
      old_values: { key: name, masked: maskKey(Deno.env.get(name)) },
      new_values: { key: name, masked: maskedValues[name] },
    })
  }
}

/* ── Main handler ───────────────────────────────────────────────────── */

serve(async (req: Request) => {
  const corsResponse = handleCors(req)
  if (corsResponse) return corsResponse

  const origin = req.headers.get('origin') || undefined

  try {
    const godUser = await validateGodUser(req.headers.get('authorization'))

    const { action, secrets } = (await req.json()) as {
      action: string
      secrets?: { name: string; value: string }[]
    }

    if (action !== 'update') {
      return errorResponse(400, `Unknown action: ${action}`, origin)
    }

    if (!secrets || !Array.isArray(secrets) || secrets.length === 0) {
      return errorResponse(400, 'No secrets provided', origin)
    }

    // Validate all secret names against whitelist
    const invalidNames = secrets.filter((s) => !ALLOWED_SECRETS.has(s.name))
    if (invalidNames.length > 0) {
      return errorResponse(
        400,
        `Not allowed to update: ${invalidNames.map((s) => s.name).join(', ')}`,
        origin,
      )
    }

    // Validate values are non-empty
    const emptyValues = secrets.filter((s) => !s.value || s.value.trim().length === 0)
    if (emptyValues.length > 0) {
      return errorResponse(
        400,
        `Empty values for: ${emptyValues.map((s) => s.name).join(', ')}`,
        origin,
      )
    }

    // Update secrets via Management API
    await updateSupabaseSecrets(secrets)

    // Build masked values for audit
    const maskedValues: Record<string, string | undefined> = {}
    for (const s of secrets) {
      maskedValues[s.name] = maskKey(s.value)
    }

    // Log to audit trail
    await logAudit(
      godUser,
      secrets.map((s) => s.name),
      maskedValues,
    ).catch((err) => console.error('[ManageSecrets] Audit log failed:', err))

    return jsonResponse(
      {
        success: true,
        updated: secrets.map((s) => s.name),
        note: 'Changes take effect on next Edge Function cold start (~60 seconds).',
      },
      200,
      origin,
    )
  } catch (error) {
    const msg = (error as Error).message || 'Unknown error'
    if (msg.includes('Unauthorized') || msg.includes('Missing authorization')) {
      return errorResponse(401, msg, origin)
    }
    if (msg.includes('Forbidden') || msg.includes('god role')) {
      return errorResponse(403, msg, origin)
    }
    if (msg.includes('SB_MANAGEMENT_TOKEN not configured')) {
      return errorResponse(503, msg, origin)
    }
    console.error('[ManageSecrets] Error:', error)
    return errorResponse(500, msg, origin)
  }
})
