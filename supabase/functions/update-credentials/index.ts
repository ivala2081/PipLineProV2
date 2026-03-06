import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsHeaders, handleCors } from '../_shared/cors.ts'
import { createAdminClient } from '../_shared/supabase-admin.ts'
import { z, parseBody } from '../_shared/validation.ts'
import { checkRateLimit } from '../_shared/rateLimit.ts'

/* ------------------------------------------------------------------ */
/*  Input schemas                                                      */
/* ------------------------------------------------------------------ */

const GetCredentialsSchema = z.object({
  action: z.literal('get'),
  userId: z.string().uuid('userId must be a valid UUID'),
})

const UpdateCredentialsSchema = z.object({
  action: z.literal('update'),
  userId: z.string().uuid('userId must be a valid UUID'),
  email: z.string().email('Invalid email').optional(),
  password: z.string().min(8, 'Password must be at least 8 characters').optional(),
})

const BodySchema = z.union([GetCredentialsSchema, UpdateCredentialsSchema])

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

    // ── 1b. Rate limit ───────────────────────────────────────────────
    const rateLimited = checkRateLimit(`update-credentials:${caller.id}`, {
      maxRequests: 10,
      windowMs: 60_000,
      corsHeaders: corsHeaders(origin),
    })
    if (rateLimited) return rateLimited

    // ── 2. Parse & validate body ─────────────────────────────────────
    const { data: body, error: validationError } = await parseBody(
      req,
      BodySchema,
      corsHeaders(origin),
    )
    if (validationError) return validationError

    // ── 3. Create admin client ───────────────────────────────────────
    const adminClient = createAdminClient()

    // ── 4. GOD-ONLY: check caller is god ─────────────────────────────
    const { data: callerProfile } = await adminClient
      .from('profiles')
      .select('system_role')
      .eq('id', caller.id)
      .single()

    if (callerProfile?.system_role !== 'god') {
      return errorResponse(403, 'FORBIDDEN', 'Only god admins can manage credentials', origin)
    }

    // ── 5. Get target user ───────────────────────────────────────────
    const { data: targetUser, error: userError } = await adminClient.auth.admin.getUserById(
      body.userId,
    )

    if (userError || !targetUser?.user) {
      return errorResponse(404, 'USER_NOT_FOUND', 'User not found', origin)
    }

    // ── 6. Handle action ─────────────────────────────────────────────
    if (body.action === 'get') {
      return jsonResponse(
        {
          success: true,
          email: targetUser.user.email,
          createdAt: targetUser.user.created_at,
          lastSignInAt: targetUser.user.last_sign_in_at,
        },
        200,
        origin,
      )
    }

    // action === 'update'
    const updates: Record<string, string> = {}
    if (body.email) updates.email = body.email
    if (body.password) updates.password = body.password

    if (Object.keys(updates).length === 0) {
      return errorResponse(400, 'NO_CHANGES', 'No email or password provided', origin)
    }

    const { error: updateError } = await adminClient.auth.admin.updateUserById(body.userId, updates)

    if (updateError) {
      return errorResponse(500, 'UPDATE_FAILED', updateError.message, origin)
    }

    // If email changed, also update profiles.email
    if (body.email) {
      await adminClient
        .from('profiles')
        .update({ email: body.email })
        .eq('id', body.userId)
    }

    return jsonResponse({ success: true }, 200, origin)
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
