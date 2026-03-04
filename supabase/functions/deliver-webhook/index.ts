import 'jsr:@supabase/functions-js/edge-runtime.d.ts'
import { createClient } from 'jsr:@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Verify caller is authenticated
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    )

    // Verify JWT
    const jwt = authHeader.replace('Bearer ', '')
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser(jwt)
    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const body = await req.json()
    const { webhook_id, event_type, payload } = body

    if (!webhook_id) {
      return new Response(JSON.stringify({ error: 'webhook_id is required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Fetch webhook
    const { data: webhook, error: webhookErr } = await supabase
      .from('org_webhooks')
      .select('id, url, secret, org_id, is_active')
      .eq('id', webhook_id)
      .single()

    if (webhookErr || !webhook) {
      return new Response(JSON.stringify({ error: 'Webhook not found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    if (!webhook.is_active) {
      return new Response(JSON.stringify({ error: 'Webhook is disabled' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Build payload
    const deliveryPayload = payload ?? {
      event: event_type ?? 'webhook.test',
      timestamp: new Date().toISOString(),
      org_id: webhook.org_id,
      data: { message: 'This is a test delivery from PipLinePro' },
    }

    const payloadStr = JSON.stringify(deliveryPayload)

    // HMAC-SHA256 signature
    const encoder = new TextEncoder()
    const keyData = encoder.encode(webhook.secret)
    const msgData = encoder.encode(payloadStr)
    const cryptoKey = await crypto.subtle.importKey(
      'raw',
      keyData,
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign'],
    )
    const sig = await crypto.subtle.sign('HMAC', cryptoKey, msgData)
    const sigHex = Array.from(new Uint8Array(sig))
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('')
    const signature = `sha256=${sigHex}`

    // Deliver
    const startTime = Date.now()
    let httpStatus = 0
    let responseText = ''
    let status = 'failed'

    try {
      const response = await fetch(webhook.url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-PipLine-Signature': signature,
          'X-PipLine-Event': deliveryPayload.event ?? 'webhook.test',
        },
        body: payloadStr,
        signal: AbortSignal.timeout(10_000), // 10s timeout
      })
      httpStatus = response.status
      responseText = await response.text().catch(() => '')
      status = response.ok ? 'success' : 'failed'
    } catch (fetchErr) {
      responseText = String(fetchErr)
      status = 'timeout'
    }

    const durationMs = Date.now() - startTime

    // Log delivery
    await supabase.from('webhook_delivery_log').insert({
      webhook_id: webhook.id,
      event_type: deliveryPayload.event ?? 'webhook.test',
      payload: deliveryPayload,
      status,
      http_status: httpStatus || null,
      response_text: responseText.slice(0, 1000),
    })

    return new Response(
      JSON.stringify({
        status,
        http_status: httpStatus,
        duration_ms: durationMs,
        response: responseText.slice(0, 500),
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    )
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
