import 'jsr:@supabase/functions-js/edge-runtime.d.ts'
import { createClient } from 'jsr:@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

async function sha256hex(input: string): Promise<string> {
  const encoder = new TextEncoder()
  const data = encoder.encode(input)
  const hashBuffer = await crypto.subtle.digest('SHA-256', data)
  return Array.from(new Uint8Array(hashBuffer))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  )

  // Extract API key from Authorization header
  const authHeader = req.headers.get('Authorization') ?? ''
  const apiKey = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null

  if (!apiKey || !apiKey.startsWith('pipline_')) {
    return new Response(JSON.stringify({ error: 'Invalid or missing API key' }), {
      status: 401,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  // Hash the key and look it up
  const keyHash = await sha256hex(apiKey)
  const { data: keyRecord, error: keyErr } = await supabase.rpc(
    'validate_api_key' as never,
    { p_key_hash: keyHash } as never,
  )

  if (keyErr || !keyRecord) {
    return new Response(JSON.stringify({ error: 'Invalid API key' }), {
      status: 401,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  const key = keyRecord as {
    id: string
    org_id: string
    scopes: string[]
    is_active: boolean
    expires_at: string | null
  }

  if (!key.is_active) {
    return new Response(JSON.stringify({ error: 'API key is revoked' }), {
      status: 401,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  if (key.expires_at && new Date(key.expires_at) < new Date()) {
    return new Response(JSON.stringify({ error: 'API key has expired' }), {
      status: 401,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  // Update last_used_at (fire and forget)
  supabase.rpc('touch_api_key_last_used' as never, { p_key_id: key.id } as never).then(() => {})

  // Parse route
  const url = new URL(req.url)
  const path = url.pathname.replace(/^\/functions\/v1\/api-gateway/, '')

  // GET /transfers — list transfers
  if (req.method === 'GET' && path === '/transfers') {
    if (!key.scopes.includes('transfers:read')) {
      return new Response(
        JSON.stringify({ error: 'Insufficient scope. Required: transfers:read' }),
        {
          status: 403,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        },
      )
    }

    const limit = Math.min(parseInt(url.searchParams.get('limit') ?? '50'), 200)
    const offset = parseInt(url.searchParams.get('offset') ?? '0')

    const { data, error, count } = await supabase
      .from('transfers')
      .select('*', { count: 'exact' })
      .eq('organization_id', key.org_id)
      .is('deleted_at', null)
      .order('transfer_date', { ascending: false })
      .range(offset, offset + limit - 1)

    if (error) {
      return new Response(JSON.stringify({ error: error.message }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    return new Response(JSON.stringify({ data, total: count, limit, offset }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  // POST /transfers — create transfer
  if (req.method === 'POST' && path === '/transfers') {
    if (!key.scopes.includes('transfers:write')) {
      return new Response(
        JSON.stringify({ error: 'Insufficient scope. Required: transfers:write' }),
        {
          status: 403,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        },
      )
    }

    let body: Record<string, unknown>
    try {
      body = await req.json()
    } catch {
      return new Response(JSON.stringify({ error: 'Invalid JSON body' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const required = ['full_name', 'amount', 'currency', 'transfer_date', 'category_id']
    for (const field of required) {
      if (!body[field]) {
        return new Response(JSON.stringify({ error: `Missing required field: ${field}` }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }
    }

    const { data, error } = await supabase
      .from('transfers')
      .insert({
        organization_id: key.org_id,
        full_name: body.full_name,
        amount: body.amount,
        currency: body.currency,
        transfer_date: body.transfer_date,
        category_id: body.category_id,
        payment_method_id: body.payment_method_id ?? null,
        psp_id: body.psp_id ?? null,
        type_id: body.type_id ?? null,
        crm_id: body.crm_id ?? null,
        meta_id: body.meta_id ?? null,
        notes: body.notes ?? null,
        exchange_rate: body.exchange_rate ?? 1,
        commission: body.commission ?? 0,
        net: body.net ?? body.amount,
        amount_try: body.amount_try ?? body.amount,
        amount_usd: body.amount_usd ?? 0,
      } as never)
      .select()
      .single()

    if (error) {
      return new Response(JSON.stringify({ error: error.message }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    return new Response(JSON.stringify({ data }), {
      status: 201,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  return new Response(JSON.stringify({ error: 'Not found' }), {
    status: 404,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
})
