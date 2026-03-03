import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { z, parseBody } from '../_shared/validation.ts'
import { checkRateLimit } from '../_shared/rateLimit.ts'

/* ------------------------------------------------------------------ */
/*  Inlined shared utilities                                           */
/* ------------------------------------------------------------------ */

const ALLOWED_ORIGINS = (
  Deno.env.get('ALLOWED_ORIGINS') || 'http://localhost:5173,http://127.0.0.1:5173'
).split(',')

function corsHeaders(origin?: string): Record<string, string> {
  const allowedOrigin = origin && ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0]
  return {
    'Access-Control-Allow-Origin': allowedOrigin,
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Credentials': 'true',
    'Access-Control-Max-Age': '86400',
  }
}

function handleCors(req: Request): Response | null {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders(req.headers.get('origin') || undefined) })
  }
  return null
}

function createAdminClient() {
  return createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, {
    auth: { autoRefreshToken: false, persistSession: false },
  })
}

/* ------------------------------------------------------------------ */
/*  Input schema                                                       */
/* ------------------------------------------------------------------ */

const SendCredentialsBodySchema = z.object({
  userId: z.string().uuid('userId must be a valid UUID'),
  orgId: z.string().uuid('orgId must be a valid UUID'),
})

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

function jsonResponse(body: Record<string, unknown>, status = 200, origin?: string): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders(origin), 'Content-Type': 'application/json' },
  })
}

function errorResponse(status: number, code: string, message: string, origin?: string): Response {
  return jsonResponse({ error: code, message }, status, origin)
}

/* ------------------------------------------------------------------ */
/*  Email template                                                     */
/* ------------------------------------------------------------------ */

function buildCredentialsEmailHtml(
  orgName: string,
  email: string,
  role: string,
  recoveryUrl: string,
): string {
  const roleLabel = role.charAt(0).toUpperCase() + role.slice(1)
  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin:0;padding:0;background-color:#f4f4f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f4f4f5;padding:40px 20px;">
    <tr><td align="center">
      <table width="100%" cellpadding="0" cellspacing="0" style="max-width:480px;background-color:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.08);">
        <tr><td style="background-color:#18181b;padding:32px 40px;text-align:center;">
          <h1 style="color:#ffffff;font-size:20px;font-weight:600;margin:0;">PipLinePro</h1>
        </td></tr>
        <tr><td style="padding:40px;">
          <h2 style="font-size:18px;font-weight:600;color:#18181b;margin:0 0 8px;">Your Account Details</h2>
          <p style="font-size:14px;color:#71717a;line-height:1.6;margin:0 0 24px;">
            Here are your login details for <strong>${orgName}</strong>. Use the button below to set or reset your password.
          </p>
          <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f4f4f5;border-radius:8px;margin:0 0 24px;">
            <tr><td style="padding:20px;">
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr><td style="padding:0 0 12px;">
                  <span style="font-size:11px;font-weight:600;color:#a1a1aa;text-transform:uppercase;letter-spacing:0.5px;">Email</span><br>
                  <span style="font-size:14px;color:#18181b;font-weight:500;">${email}</span>
                </td></tr>
                <tr><td style="padding:0 0 12px;">
                  <span style="font-size:11px;font-weight:600;color:#a1a1aa;text-transform:uppercase;letter-spacing:0.5px;">Role</span><br>
                  <span style="font-size:14px;color:#18181b;font-weight:500;">${roleLabel}</span>
                </td></tr>
                <tr><td>
                  <span style="font-size:11px;font-weight:600;color:#a1a1aa;text-transform:uppercase;letter-spacing:0.5px;">Organization</span><br>
                  <span style="font-size:14px;color:#18181b;font-weight:500;">${orgName}</span>
                </td></tr>
              </table>
            </td></tr>
          </table>
          <table width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 16px;">
            <tr><td align="center">
              <a href="${recoveryUrl}" style="display:inline-block;background-color:#18181b;color:#ffffff;font-size:14px;font-weight:600;text-decoration:none;padding:12px 32px;border-radius:8px;">
                Set Your Password
              </a>
            </td></tr>
          </table>
          <p style="font-size:12px;color:#a1a1aa;text-align:center;margin:0;">
            &#9888; This link expires in 24 hours.
          </p>
        </td></tr>
        <tr><td style="padding:20px 40px;border-top:1px solid #f4f4f5;">
          <p style="font-size:12px;color:#a1a1aa;text-align:center;margin:0;">
            This is an automated message from PipLinePro. Please do not reply.
          </p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`
}

/* ------------------------------------------------------------------ */
/*  Main handler                                                       */
/* ------------------------------------------------------------------ */

serve(async (req: Request) => {
  const corsResponse = handleCors(req)
  if (corsResponse) return corsResponse

  const origin = req.headers.get('origin') || undefined

  try {
    // ── 1. Authenticate the caller ──────────────────────────────────
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return errorResponse(401, 'UNAUTHORIZED', 'Missing authorization header', origin)
    }

    const anonClient = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } },
    )
    const {
      data: { user: caller },
      error: authError,
    } = await anonClient.auth.getUser()

    if (authError || !caller) {
      return errorResponse(401, 'UNAUTHORIZED', 'Invalid token', origin)
    }

    // ── 1b. Rate limit: 5 requests per minute per user ──────────────
    const rateLimited = checkRateLimit(`send-credentials:${caller.id}`, {
      maxRequests: 5,
      windowMs: 60_000,
      corsHeaders: corsHeaders(origin),
    })
    if (rateLimited) return rateLimited

    // ── 2. Parse & validate body (Zod) ─────────────────────────────
    const { data: body, error: validationError } = await parseBody(
      req,
      SendCredentialsBodySchema,
      corsHeaders(origin),
    )
    if (validationError) return validationError

    const { userId, orgId } = body

    // ── 3. Create admin client ──────────────────────────────────────
    const adminClient = createAdminClient()

    // ── 4. Authorize: caller must be god OR org admin/manager ───────
    const { data: callerProfile } = await adminClient
      .from('profiles')
      .select('system_role')
      .eq('id', caller.id)
      .single()

    const isGod = callerProfile?.system_role === 'god'

    if (!isGod) {
      const { data: membership } = await adminClient
        .from('organization_members')
        .select('role')
        .eq('organization_id', orgId)
        .eq('user_id', caller.id)
        .single()

      if (membership?.role !== 'admin' && membership?.role !== 'manager') {
        return errorResponse(403, 'FORBIDDEN', 'Not authorized to send credentials', origin)
      }
    }

    // ── 5. Get org name ─────────────────────────────────────────────
    const { data: org } = await adminClient
      .from('organizations')
      .select('name')
      .eq('id', orgId)
      .single()

    if (!org) {
      return errorResponse(404, 'ORG_NOT_FOUND', 'Organization not found', origin)
    }

    // ── 6. Get member email via admin API ───────────────────────────
    const { data: memberUser, error: userError } = await adminClient.auth.admin.getUserById(userId)

    if (userError || !memberUser?.user?.email) {
      return errorResponse(404, 'USER_NOT_FOUND', 'Member not found', origin)
    }

    const memberEmail = memberUser.user.email

    // ── 7. Get member role in this org ──────────────────────────────
    const { data: memberRecord } = await adminClient
      .from('organization_members')
      .select('role')
      .eq('organization_id', orgId)
      .eq('user_id', userId)
      .single()

    if (!memberRecord) {
      return errorResponse(404, 'NOT_A_MEMBER', 'User is not a member of this organization', origin)
    }

    // ── 8. Generate recovery link ───────────────────────────────────
    const { data: linkData, error: linkError } = await adminClient.auth.admin.generateLink({
      type: 'recovery',
      email: memberEmail,
    })

    if (linkError || !linkData?.properties?.action_link) {
      console.error('generateLink error:', linkError)
      return errorResponse(
        500,
        'LINK_GENERATION_FAILED',
        'Could not generate recovery link',
        origin,
      )
    }

    const recoveryUrl = linkData.properties.action_link

    // ── 9. Send email via Resend ────────────────────────────────────
    const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')
    let emailSent = false

    if (RESEND_API_KEY) {
      const fromEmail = Deno.env.get('RESEND_FROM_EMAIL') || 'PipLinePro <onboarding@resend.dev>'

      const html = buildCredentialsEmailHtml(org.name, memberEmail, memberRecord.role, recoveryUrl)

      const resendRes = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${RESEND_API_KEY}`,
        },
        body: JSON.stringify({
          from: fromEmail,
          to: [memberEmail],
          subject: 'Your PipLinePro account details',
          html,
        }),
      })

      if (resendRes.ok) {
        emailSent = true
      } else {
        console.error('Resend API error:', await resendRes.text())
      }
    }

    // ── 10. Success ─────────────────────────────────────────────────
    return jsonResponse({ success: true, emailSent }, 200, origin)
  } catch (err) {
    console.error('Unhandled error:', err)
    return errorResponse(
      500,
      'INTERNAL_ERROR',
      'An unexpected error occurred',
      req.headers.get('origin') || undefined,
    )
  }
})
