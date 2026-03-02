import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsHeaders, handleCors } from '../_shared/cors.ts'
import { createAdminClient } from '../_shared/supabase-admin.ts'

/* ── Config ─────────────────────────────────────────────────────── */

const MODEL = 'claude-sonnet-4-6'
const MAX_TOKENS = 4096
const MAX_LOOPS = 6

/* ── Tool definitions ───────────────────────────────────────────── */

const TOOLS = [
  {
    name: 'get_monthly_summary',
    description:
      'Get comprehensive monthly KPIs, daily volume breakdown, PSP analysis, customer rankings, and insights for a specific month. Use this for monthly reports or when asked about a specific month.',
    input_schema: {
      type: 'object',
      properties: {
        year: { type: 'number', description: 'Year (e.g. 2026)' },
        month: { type: 'number', description: 'Month number (1-12)' },
      },
      required: ['year', 'month'],
    },
  },
  {
    name: 'get_transfers',
    description:
      'Query transfers with optional date and category filters. Returns transfer details including amounts, customer names, dates, and PSPs. Useful for transaction-level analysis.',
    input_schema: {
      type: 'object',
      properties: {
        from_date: { type: 'string', description: 'Start date inclusive (YYYY-MM-DD)' },
        to_date: { type: 'string', description: 'End date inclusive (YYYY-MM-DD)' },
        category: {
          type: 'string',
          enum: ['dep', 'wit'],
          description: 'Filter by category: dep = deposit, wit = withdrawal',
        },
        limit: {
          type: 'number',
          description: 'Max rows to return (default 50, max 200)',
        },
      },
    },
  },
  {
    name: 'get_top_customers',
    description:
      'Get top customers ranked by deposit volume for a date range. Returns customer name, total TRY volume, and transaction count.',
    input_schema: {
      type: 'object',
      properties: {
        from_date: { type: 'string', description: 'Start date inclusive (YYYY-MM-DD)' },
        to_date: { type: 'string', description: 'End date inclusive (YYYY-MM-DD)' },
        limit: {
          type: 'number',
          description: 'Number of top customers to return (default 10, max 50)',
        },
      },
    },
  },
  {
    name: 'get_psp_list',
    description:
      'Get the list of PSPs (payment service providers) for the organization with their active status.',
    input_schema: { type: 'object', properties: {} },
  },
]

/* ── Tool execution ─────────────────────────────────────────────── */

type AdminClient = ReturnType<typeof createAdminClient>

async function executeTool(
  name: string,
  input: Record<string, unknown>,
  orgId: string,
  admin: AdminClient,
): Promise<unknown> {
  try {
    switch (name) {
      case 'get_monthly_summary': {
        const { data, error } = await admin.rpc('get_monthly_summary', {
          _org_id: orgId,
          _year: Number(input.year),
          _month: Number(input.month),
        })
        if (error) return { error: error.message }
        return data
      }

      case 'get_transfers': {
        // deno-lint-ignore no-explicit-any
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        let query: any = admin
          .from('transfers')
          .select(
            'id, transfer_date, full_name, amount, amount_try, amount_usd, currency, category_id, commission, transfer_types(name), psps(name)',
          )
          .eq('organization_id', orgId)
          .order('transfer_date', { ascending: false })
          .limit(Math.min(Number(input.limit) || 50, 200))

        if (input.from_date) query = query.gte('transfer_date', String(input.from_date))
        if (input.to_date) query = query.lte('transfer_date', String(input.to_date))
        if (input.category) query = query.eq('category_id', String(input.category))

        const { data, error } = await query
        if (error) return { error: error.message }
        return { count: data?.length ?? 0, transfers: data }
      }

      case 'get_top_customers': {
        const limit = Math.min(Number(input.limit) || 10, 50)
        // deno-lint-ignore no-explicit-any
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        let query: any = admin
          .from('transfers')
          .select('full_name, amount_try, category_id')
          .eq('organization_id', orgId)
          .eq('category_id', 'dep')

        if (input.from_date) query = query.gte('transfer_date', String(input.from_date))
        if (input.to_date) query = query.lte('transfer_date', String(input.to_date))

        const { data, error } = await query
        if (error) return { error: error.message }

        // Aggregate by customer name
        const agg: Record<string, { name: string; total: number; count: number }> = {}
        for (const row of data ?? []) {
          const r = row as { full_name: string; amount_try: number }
          const key = r.full_name?.trim() || 'Unknown'
          if (!agg[key]) agg[key] = { name: key, total: 0, count: 0 }
          agg[key].total += Math.abs(Number(r.amount_try) || 0)
          agg[key].count++
        }

        const sorted = Object.values(agg)
          .sort((a, b) => b.total - a.total)
          .slice(0, limit)

        return { customers: sorted }
      }

      case 'get_psp_list': {
        const { data, error } = await admin
          .from('psps')
          .select('id, name, is_active')
          .eq('organization_id', orgId)
          .order('name')

        if (error) return { error: error.message }
        return { psps: data }
      }

      default:
        return { error: `Unknown tool: ${name}` }
    }
  } catch (err) {
    return { error: err instanceof Error ? err.message : 'Tool execution failed' }
  }
}

/* ── Types for agentic loop ─────────────────────────────────────── */

type TextBlock = { type: 'text'; text: string }
type ToolUseBlock = { type: 'tool_use'; id: string; name: string; input: Record<string, unknown> }
type ContentBlock = TextBlock | ToolUseBlock
type ToolResultBlock = { type: 'tool_result'; tool_use_id: string; content: string }

type AssistantMessage = { role: 'assistant'; content: ContentBlock[] }
type UserTextMessage = { role: 'user'; content: string }
type UserToolResultMessage = { role: 'user'; content: ToolResultBlock[] }
type ApiMessage = AssistantMessage | UserTextMessage | UserToolResultMessage

/* ── Agentic streaming loop ─────────────────────────────────────── */

async function runAgenticLoop(
  messages: ApiMessage[],
  systemPrompt: string,
  orgId: string,
  admin: AdminClient,
  writer: WritableStreamDefaultWriter<Uint8Array>,
  encoder: TextEncoder,
  apiKey: string,
): Promise<void> {
  const send = (event: Record<string, unknown>) =>
    writer.write(encoder.encode(`data: ${JSON.stringify(event)}\n\n`))

  for (let loop = 0; loop < MAX_LOOPS; loop++) {
    const apiRes = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: MODEL,
        max_tokens: MAX_TOKENS,
        system: systemPrompt,
        tools: TOOLS,
        stream: true,
        messages,
      }),
    })

    if (!apiRes.ok || !apiRes.body) {
      const errText = await apiRes.text()
      console.error('Anthropic API error:', apiRes.status, errText)
      // Surface the actual Anthropic error so we can diagnose it
      let userMsg = `Anthropic API error (${apiRes.status})`
      try {
        const parsed = JSON.parse(errText)
        const detail = parsed?.error?.message ?? parsed?.message ?? errText
        userMsg = `[${apiRes.status}] ${detail}`
      } catch {
        userMsg = `[${apiRes.status}] ${errText.slice(0, 200)}`
      }
      await send({ type: 'error', message: userMsg })
      return
    }

    // Parse Anthropic SSE stream
    const reader = apiRes.body.getReader()
    const dec = new TextDecoder()
    let buf = ''

    // Track content blocks by streaming index
    const blockMap = new Map<number, ContentBlock & { _json?: string }>()
    let stopReason: string | null = null
    let hasToolCalls = false

    outer: while (true) {
      const { done, value } = await reader.read()
      if (done) break

      buf += dec.decode(value, { stream: true })
      const lines = buf.split('\n')
      buf = lines.pop() ?? ''

      for (const line of lines) {
        if (!line.startsWith('data: ')) continue
        const payload = line.slice(6).trim()
        if (!payload || payload === '[DONE]') continue

        let evt: Record<string, unknown>
        try {
          evt = JSON.parse(payload)
        } catch {
          continue
        }

        const evtType = evt.type as string

        if (evtType === 'content_block_start') {
          const idx = evt.index as number
          const block = evt.content_block as Record<string, unknown>

          if (block.type === 'text') {
            blockMap.set(idx, { type: 'text', text: '' })
          } else if (block.type === 'tool_use') {
            hasToolCalls = true
            blockMap.set(idx, {
              type: 'tool_use',
              id: block.id as string,
              name: block.name as string,
              input: {},
              _json: '',
            })
          }
        } else if (evtType === 'content_block_delta') {
          const idx = evt.index as number
          const delta = evt.delta as Record<string, unknown>
          const block = blockMap.get(idx)
          if (!block) continue

          if (delta.type === 'text_delta' && block.type === 'text') {
            const chunk = delta.text as string
            block.text += chunk
            await send({ type: 'text', content: chunk })
          } else if (delta.type === 'input_json_delta' && block.type === 'tool_use') {
            block._json = (block._json ?? '') + (delta.partial_json as string)
          }
        } else if (evtType === 'content_block_stop') {
          const idx = evt.index as number
          const block = blockMap.get(idx)
          if (block?.type === 'tool_use' && '_json' in block) {
            try {
              block.input = JSON.parse(block._json ?? '{}')
            } catch {
              block.input = {}
            }
            delete (block as Record<string, unknown>)._json
          }
        } else if (evtType === 'message_delta') {
          stopReason = ((evt.delta as Record<string, unknown>).stop_reason as string) ?? null
        } else if (evtType === 'message_stop') {
          break outer
        } else if (evtType === 'error') {
          console.error('Anthropic stream error event:', evt)
          await send({ type: 'error', message: 'AI stream error' })
          return
        }
      }
    }

    // Build ordered assistant content array
    const assistantContent: ContentBlock[] = Array.from(blockMap.entries())
      .sort(([a], [b]) => a - b)
      .map(([, block]) => {
        const { ...clean } = block as Record<string, unknown>
        delete clean._json
        return clean as ContentBlock
      })

    messages.push({ role: 'assistant', content: assistantContent })

    if (!hasToolCalls || stopReason === 'end_turn') {
      // No tool calls — streaming is complete
      await send({ type: 'done' })
      return
    }

    // Execute tool calls and collect results
    const toolResults: ToolResultBlock[] = []
    const toolBlocks = assistantContent.filter((b): b is ToolUseBlock => b.type === 'tool_use')

    for (const toolBlock of toolBlocks) {
      // Notify frontend which tool is running
      await send({ type: 'tool_call', name: toolBlock.name })

      const result = await executeTool(toolBlock.name, toolBlock.input, orgId, admin)
      toolResults.push({
        type: 'tool_result',
        tool_use_id: toolBlock.id,
        content: JSON.stringify(result),
      })
    }

    // Add tool results and loop for the next Claude response
    messages.push({ role: 'user', content: toolResults })
    hasToolCalls = false
  }

  // Safety fallback after MAX_LOOPS
  await send({ type: 'done' })
}

/* ── Main handler ───────────────────────────────────────────────── */

serve(async (req: Request) => {
  const corsRes = handleCors(req)
  if (corsRes) return corsRes

  const origin = req.headers.get('origin') ?? undefined

  const jsonErr = (status: number, message: string) =>
    new Response(JSON.stringify({ error: message }), {
      status,
      headers: { ...corsHeaders(origin), 'Content-Type': 'application/json' },
    })

  try {
    // ── 1. Authenticate caller ──────────────────────────────────────
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) return jsonErr(401, 'UNAUTHORIZED')

    const anonClient = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } },
    )

    const {
      data: { user },
      error: authError,
    } = await anonClient.auth.getUser()

    if (authError || !user) return jsonErr(401, 'UNAUTHORIZED')

    // ── 2. Parse request body ───────────────────────────────────────
    const body = (await req.json()) as {
      messages: Array<{ role: string; content: string }>
      orgId: string
      orgName: string
      userRole: string
    }

    const { messages, orgId, orgName, userRole } = body

    if (!orgId || !messages?.length) return jsonErr(400, 'Missing required fields')

    // ── 3. Authorize: verify org membership ────────────────────────
    const admin = createAdminClient()

    const { data: profile } = await admin
      .from('profiles')
      .select('system_role')
      .eq('id', user.id)
      .single()

    const isGod = profile?.system_role === 'god'

    if (!isGod) {
      const { data: membership } = await admin
        .from('organization_members')
        .select('role')
        .eq('organization_id', orgId)
        .eq('user_id', user.id)
        .single()

      if (!membership) return jsonErr(403, 'FORBIDDEN')
    }

    // ── 4. Build system prompt ──────────────────────────────────────
    const today = new Date().toISOString().split('T')[0]

    const systemPrompt = `You are an AI assistant embedded in PipLinePro, a financial pipeline management platform used by payment operations teams.

Current context:
- Organization: ${orgName} (ID: ${orgId})
- User role: ${userRole}
- Today's date: ${today}

You have read-only access to this organization's live data through the provided tools. Always fetch real data before making any claims about specific numbers.

Formatting rules:
- TRY amounts: use ₺ prefix with 2 decimal places (e.g. ₺1,234.56)
- USD amounts: use $ prefix with 2 decimal places (e.g. $1,234.56)
- Use markdown tables or bullet lists when comparing multiple items
- Be direct and concise — these are financial operators, not novices
- Never estimate or guess financial figures — always query the tools

Date intelligence:
- "this month" → use today's year and month
- "last month" / "previous month" → subtract 1 month from today
- "this week" → Monday through today
- When you have enough context, calculate dates automatically without asking the user`

    // ── 5. Check API key ────────────────────────────────────────────
    const apiKey = Deno.env.get('ANTHROPIC_API_KEY')
    if (!apiKey) return jsonErr(500, 'API key not configured')

    // ── 6. Build initial API messages ──────────────────────────────
    const apiMessages: ApiMessage[] = messages.map((m) => ({
      role: m.role as 'user' | 'assistant',
      content: m.content,
    }))

    // ── 7. Create SSE stream and run agentic loop ───────────────────
    const { readable, writable } = new TransformStream<Uint8Array, Uint8Array>()
    const writer = writable.getWriter()
    const encoder = new TextEncoder()

    runAgenticLoop(apiMessages, systemPrompt, orgId, admin, writer, encoder, apiKey)
      .catch(async (err) => {
        console.error('Agentic loop error:', err)
        try {
          await writer.write(
            encoder.encode(
              `data: ${JSON.stringify({ type: 'error', message: 'An unexpected error occurred.' })}\n\n`,
            ),
          )
        } catch {
          // ignore write errors after failure
        }
      })
      .finally(() => {
        writer.close().catch(() => {
          // ignore close errors
        })
      })

    return new Response(readable, {
      headers: {
        ...corsHeaders(origin),
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'X-Accel-Buffering': 'no',
      },
    })
  } catch (err) {
    console.error('Handler error:', err)
    return jsonErr(500, 'Internal error')
  }
})
