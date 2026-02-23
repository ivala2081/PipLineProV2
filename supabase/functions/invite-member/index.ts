import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsHeaders, handleCors } from '../_shared/cors.ts'
import { createAdminClient } from '../_shared/supabase-admin.ts'

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
/*  Email templates                                                    */
/* ------------------------------------------------------------------ */

function buildNewUserEmailHtml(
  orgName: string,
  email: string,
  password: string,
  role: string,
  loginUrl: string,
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
          <h2 style="font-size:18px;font-weight:600;color:#18181b;margin:0 0 8px;">Welcome to ${orgName}</h2>
          <p style="font-size:14px;color:#71717a;line-height:1.6;margin:0 0 24px;">
            An account has been created for you. Use the credentials below to sign in.
          </p>
          <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f4f4f5;border-radius:8px;margin:0 0 24px;">
            <tr><td style="padding:20px;">
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr><td style="padding:0 0 12px;">
                  <span style="font-size:11px;font-weight:600;color:#a1a1aa;text-transform:uppercase;letter-spacing:0.5px;">Email</span><br>
                  <span style="font-size:14px;color:#18181b;font-weight:500;">${email}</span>
                </td></tr>
                <tr><td style="padding:0 0 12px;">
                  <span style="font-size:11px;font-weight:600;color:#a1a1aa;text-transform:uppercase;letter-spacing:0.5px;">Password</span><br>
                  <code style="font-size:14px;color:#18181b;font-weight:500;background-color:#e4e4e7;padding:2px 8px;border-radius:4px;">${password}</code>
                </td></tr>
                <tr><td>
                  <span style="font-size:11px;font-weight:600;color:#a1a1aa;text-transform:uppercase;letter-spacing:0.5px;">Role</span><br>
                  <span style="font-size:14px;color:#18181b;font-weight:500;">${roleLabel}</span>
                </td></tr>
              </table>
            </td></tr>
          </table>
          <table width="100%" cellpadding="0" cellspacing="0">
            <tr><td align="center">
              <a href="${loginUrl}" style="display:inline-block;background-color:#18181b;color:#ffffff;font-size:14px;font-weight:600;text-decoration:none;padding:12px 32px;border-radius:8px;">
                Sign In to PipLinePro
              </a>
            </td></tr>
          </table>
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

function buildExistingUserEmailHtml(orgName: string, role: string, loginUrl: string): string {
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
          <h2 style="font-size:18px;font-weight:600;color:#18181b;margin:0 0 8px;">You've been added to ${orgName}</h2>
          <p style="font-size:14px;color:#71717a;line-height:1.6;margin:0 0 8px;">
            You have been added as <strong>${roleLabel}</strong> to the organization <strong>${orgName}</strong>.
          </p>
          <p style="font-size:14px;color:#71717a;line-height:1.6;margin:0 0 24px;">
            Sign in with your existing credentials to access it.
          </p>
          <table width="100%" cellpadding="0" cellspacing="0">
            <tr><td align="center">
              <a href="${loginUrl}" style="display:inline-block;background-color:#18181b;color:#ffffff;font-size:14px;font-weight:600;text-decoration:none;padding:12px 32px;border-radius:8px;">
                Sign In to PipLinePro
              </a>
            </td></tr>
          </table>
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
  // Handle CORS preflight
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

    // ── 2. Parse & validate body ────────────────────────────────────
    const body = await req.json()
    const { orgId, email, role, password, displayName } = body as {
      orgId?: string
      email?: string
      role?: string
      password?: string
      displayName?: string
    }

    if (!orgId || !email || !role || !password) {
      return errorResponse(400, 'VALIDATION_ERROR', 'Missing required fields', origin)
    }
    if (!['admin', 'manager', 'operation'].includes(role)) {
      return errorResponse(400, 'VALIDATION_ERROR', 'Invalid role', origin)
    }
    if (password.length < 8) {
      return errorResponse(
        400,
        'VALIDATION_ERROR',
        'Password must be at least 8 characters',
        origin,
      )
    }

    const normalizedEmail = email.toLowerCase().trim()

    // ── 3. Create admin client ──────────────────────────────────────
    const adminClient = createAdminClient()

    // ── 4. Authorize: caller must be god OR org admin ───────────────
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
        return errorResponse(403, 'FORBIDDEN', 'Not authorized to invite members', origin)
      }

      // Managers cannot assign admin role
      if (membership?.role === 'manager' && role === 'admin') {
        return errorResponse(403, 'FORBIDDEN', 'Managers cannot assign the admin role', origin)
      }
    }

    // ── 5. Get org name (for the email) ─────────────────────────────
    const { data: org } = await adminClient
      .from('organizations')
      .select('name')
      .eq('id', orgId)
      .single()

    if (!org) {
      return errorResponse(404, 'ORG_NOT_FOUND', 'Organization not found', origin)
    }

    // ── 6. Insert invitation record ─────────────────────────────────
    const { data: invitation, error: invError } = await adminClient
      .from('organization_invitations')
      .insert({
        organization_id: orgId,
        email: normalizedEmail,
        role,
        invited_by: caller.id,
      })
      .select()
      .single()

    if (invError) {
      if (invError.code === '23505') {
        return errorResponse(
          409,
          'DUPLICATE_INVITATION',
          'A pending invitation already exists for this email',
          origin,
        )
      }
      throw invError
    }

    // ── 7. Create user or handle existing ───────────────────────────
    let userAlreadyExisted = false

    const { error: createError } = await adminClient.auth.admin.createUser({
      email: normalizedEmail,
      password,
      email_confirm: true,
      user_metadata: { full_name: displayName || undefined },
    })

    if (createError) {
      if (createError.message?.includes('already been registered')) {
        userAlreadyExisted = true

        // Look up existing user ID
        const { data: userId } = await adminClient.rpc('get_user_id_by_email', {
          _email: normalizedEmail,
        })

        if (userId) {
          // Add to org directly (upsert to handle edge case)
          await adminClient.from('organization_members').upsert(
            {
              organization_id: orgId,
              user_id: userId,
              role,
              invited_by: caller.id,
            },
            { onConflict: 'organization_id,user_id' },
          )

          // Mark invitation as accepted
          await adminClient
            .from('organization_invitations')
            .update({ status: 'accepted' })
            .eq('id', invitation.id)
        }
      } else {
        // Unexpected error — roll back invitation
        await adminClient.from('organization_invitations').delete().eq('id', invitation.id)

        return errorResponse(500, 'USER_CREATION_FAILED', createError.message, origin)
      }
    }

    // ── 8. Send email via Resend ────────────────────────────────────
    const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')
    let emailSent = false

    if (RESEND_API_KEY) {
      const loginUrl = Deno.env.get('APP_URL') || 'https://app.piplinepro.com'

      const html = userAlreadyExisted
        ? buildExistingUserEmailHtml(org.name, role, loginUrl)
        : buildNewUserEmailHtml(org.name, normalizedEmail, password, role, loginUrl)

      const subject = userAlreadyExisted
        ? `You've been added to ${org.name}`
        : `You've been invited to ${org.name}`

      const fromEmail = Deno.env.get('RESEND_FROM_EMAIL') || 'PipLinePro <onboarding@resend.dev>'

      const resendRes = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${RESEND_API_KEY}`,
        },
        body: JSON.stringify({
          from: fromEmail,
          to: [normalizedEmail],
          subject,
          html,
        }),
      })

      if (resendRes.ok) {
        emailSent = true
      } else {
        console.error('Resend API error:', await resendRes.text())
      }
    }

    // ── 9. Success ──────────────────────────────────────────────────
    return jsonResponse(
      {
        success: true,
        userAlreadyExisted,
        emailSent,
        invitationId: invitation.id,
      },
      200,
      origin,
    )
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
