import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsHeaders, handleCors } from '../_shared/cors.ts'
import { createAdminClient } from '../_shared/supabase-admin.ts'
import { z, parseBody } from '../_shared/validation.ts'
import { checkRateLimit } from '../_shared/rateLimit.ts'

/* ── Input schema ──────────────────────────────────────────────── */

const AiChatBodySchema = z.object({
  messages: z
    .array(
      z.object({
        role: z.string().min(1),
        content: z.string().min(1),
      }),
    )
    .min(1, 'At least one message is required'),
  orgId: z.string().uuid('orgId must be a valid UUID'),
  orgName: z.string().min(1, 'orgName is required'),
  // userRole accepted for backward compat with clients, but authorization is
  // always derived server-side from the authenticated user's profile/membership.
  userRole: z.string().optional(),
})

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
  {
    name: 'get_hr_summary',
    description:
      'Get HR summary including employee count, status breakdown (active/inactive), total monthly payroll, and salary payments for the current month. Use this for HR overviews or payroll questions.',
    input_schema: {
      type: 'object',
      properties: {
        year: { type: 'number', description: 'Year for salary payment lookup (e.g. 2026)' },
        month: { type: 'number', description: 'Month number (1-12) for salary payment lookup' },
      },
      required: ['year', 'month'],
    },
  },
  {
    name: 'get_wallet_balances',
    description:
      'Get all crypto wallet balances for the organization. Returns each wallet with its chain, address, label, active status, and the most recent snapshot balance.',
    input_schema: { type: 'object', properties: {} },
  },
  {
    name: 'get_accounting_summary',
    description:
      'Get accounting ledger summary for a specific month. Groups entries by type (ODEME/TRANSFER), direction (in/out), and register (USDT, NAKIT_TL, NAKIT_USD, TRX). Returns totals per combination.',
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
    name: 'get_recent_activity',
    description:
      'Get the most recent actions across transfers, accounting entries, and HR salary payments. Useful for "what happened today/recently?" questions. Returns up to 20 items ordered by creation time.',
    input_schema: {
      type: 'object',
      properties: {
        limit: {
          type: 'number',
          description: 'Max items to return (default 20, max 50)',
        },
      },
    },
  },
]

/* ── Role-based tool allowlist ──────────────────────────────────── */

// Tools that expose sensitive data (payroll, crypto, full ledger) — restricted
// to admin/manager/god. Operation-level users cannot call these.
const ADMIN_ONLY_TOOLS = new Set([
  'get_hr_summary',
  'get_wallet_balances',
  'get_accounting_summary',
])

type EffectiveRole = 'god' | 'admin' | 'manager' | 'operation'

function isPrivilegedRole(role: EffectiveRole): boolean {
  return role === 'god' || role === 'admin' || role === 'manager'
}

function filterToolsForRole(role: EffectiveRole) {
  if (isPrivilegedRole(role)) return TOOLS
  return TOOLS.filter((t) => !ADMIN_ONLY_TOOLS.has(t.name))
}

function isToolAllowedForRole(toolName: string, role: EffectiveRole): boolean {
  if (isPrivilegedRole(role)) return true
  return !ADMIN_ONLY_TOOLS.has(toolName)
}

/* ── Tool execution ─────────────────────────────────────────────── */

type AdminClient = ReturnType<typeof createAdminClient>

async function executeTool(
  name: string,
  input: Record<string, unknown>,
  orgId: string,
  role: EffectiveRole,
  admin: AdminClient,
): Promise<unknown> {
  // Defense-in-depth: reject forbidden tools even if model somehow calls them.
  if (!isToolAllowedForRole(name, role)) {
    return { error: `Tool "${name}" is not available for your role.` }
  }

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

      case 'get_hr_summary': {
        // 1. Employee count and status breakdown
        const { data: employees, error: empError } = await admin
          .from('hr_employees')
          .select('id, full_name, role, salary_tl, salary_currency, is_active')
          .eq('organization_id', orgId)

        if (empError) return { error: empError.message }

        const allEmps = employees ?? []
        const activeEmps = allEmps.filter((e) => e.is_active)
        const inactiveEmps = allEmps.filter((e) => !e.is_active)

        // Total monthly payroll (active employees only)
        const totalPayrollTL = activeEmps.reduce((sum, e) => sum + (Number(e.salary_tl) || 0), 0)

        // Group active employees by role
        const byRole: Record<string, number> = {}
        for (const e of activeEmps) {
          const role = e.role || 'unassigned'
          byRole[role] = (byRole[role] || 0) + 1
        }

        // 2. Salary payments for the requested month
        const year = Number(input.year)
        const month = Number(input.month)
        const periodPrefix = `${year}-${String(month).padStart(2, '0')}`

        const { data: payments, error: payError } = await admin
          .from('hr_salary_payments')
          .select('id, employee_id, amount_tl, salary_currency, paid_at, period')
          .eq('organization_id', orgId)
          .like('period', `${periodPrefix}%`)

        if (payError) return { error: payError.message }

        const allPayments = payments ?? []
        const totalPaidTL = allPayments.reduce((sum, p) => sum + (Number(p.amount_tl) || 0), 0)
        const paidEmployeeIds = new Set(allPayments.map((p) => p.employee_id))
        const unpaidActive = activeEmps.filter((e) => !paidEmployeeIds.has(e.id))

        return {
          total_employees: allEmps.length,
          active_employees: activeEmps.length,
          inactive_employees: inactiveEmps.length,
          employees_by_role: byRole,
          monthly_payroll_tl: totalPayrollTL,
          period: periodPrefix,
          payments_made: allPayments.length,
          total_paid_tl: totalPaidTL,
          unpaid_active_employees: unpaidActive.map((e) => ({
            name: e.full_name,
            salary_tl: e.salary_tl,
          })),
        }
      }

      case 'get_wallet_balances': {
        // Get all wallets for the org
        const { data: wallets, error: walletError } = await admin
          .from('wallets')
          .select('id, chain, address, label, is_active')
          .eq('organization_id', orgId)
          .order('chain')

        if (walletError) return { error: walletError.message }

        const allWallets = wallets ?? []
        const result = []

        for (const w of allWallets) {
          // Get the most recent snapshot for this wallet
          const { data: snapshots, error: snapError } = await admin
            .from('wallet_snapshots')
            .select('balances, total_usd, snapshot_date')
            .eq('wallet_id', w.id)
            .eq('organization_id', orgId)
            .order('snapshot_date', { ascending: false })
            .limit(1)

          const latestSnapshot = snapshots?.[0] ?? null

          result.push({
            label: w.label,
            chain: w.chain,
            address: w.address,
            is_active: w.is_active,
            latest_balance_usd: latestSnapshot?.total_usd ?? null,
            latest_balances: latestSnapshot?.balances ?? null,
            snapshot_date: latestSnapshot?.snapshot_date ?? null,
          })

          if (snapError) {
            console.error(`Snapshot fetch error for wallet ${w.id}:`, snapError.message)
          }
        }

        return {
          wallet_count: allWallets.length,
          active_wallets: allWallets.filter((w) => w.is_active).length,
          wallets: result,
        }
      }

      case 'get_accounting_summary': {
        const year = Number(input.year)
        const month = Number(input.month)
        const startDate = `${year}-${String(month).padStart(2, '0')}-01`
        // End date: first day of next month
        const nextMonth = month === 12 ? 1 : month + 1
        const nextYear = month === 12 ? year + 1 : year
        const endDate = `${nextYear}-${String(nextMonth).padStart(2, '0')}-01`

        const { data: entries, error: entryError } = await admin
          .from('accounting_entries')
          .select('entry_type, direction, register, amount, currency, description')
          .eq('organization_id', orgId)
          .gte('entry_date', startDate)
          .lt('entry_date', endDate)

        if (entryError) return { error: entryError.message }

        const allEntries = entries ?? []

        // Group by entry_type → direction → register
        const grouped: Record<string, { count: number; total: number }> = {}
        let grandTotal = 0

        for (const e of allEntries) {
          const key = `${e.entry_type}|${e.direction}|${e.register}`
          if (!grouped[key]) grouped[key] = { count: 0, total: 0 }
          grouped[key].count++
          grouped[key].total += Number(e.amount) || 0
          grandTotal += Number(e.amount) || 0
        }

        // Format into readable breakdown
        const breakdown = Object.entries(grouped)
          .sort(([a], [b]) => a.localeCompare(b))
          .map(([key, val]) => {
            const [entryType, direction, register] = key.split('|')
            return {
              entry_type: entryType,
              direction,
              register,
              count: val.count,
              total_amount: val.total,
            }
          })

        return {
          period: `${year}-${String(month).padStart(2, '0')}`,
          total_entries: allEntries.length,
          grand_total: grandTotal,
          breakdown,
        }
      }

      case 'get_recent_activity': {
        const limit = Math.min(Number(input.limit) || 20, 50)
        const canSeeSensitive = isPrivilegedRole(role)

        // Operation role: skip accounting + HR payment sources (sensitive).
        const [transfersRes, accountingRes, hrPaymentsRes] = await Promise.all([
          admin
            .from('transfers')
            .select('id, created_at, full_name, amount_try, currency, category_id, transfer_date')
            .eq('organization_id', orgId)
            .order('created_at', { ascending: false })
            .limit(limit),
          canSeeSensitive
            ? admin
                .from('accounting_entries')
                .select('id, created_at, entry_type, direction, register, amount, description')
                .eq('organization_id', orgId)
                .order('created_at', { ascending: false })
                .limit(limit)
            : Promise.resolve({ data: [], error: null }),
          canSeeSensitive
            ? admin
                .from('hr_salary_payments')
                .select('id, created_at, employee_id, amount_tl, period, paid_at')
                .eq('organization_id', orgId)
                .order('created_at', { ascending: false })
                .limit(limit)
            : Promise.resolve({ data: [], error: null }),
        ])

        // Collect all items with a unified shape
        type ActivityItem = {
          source: string
          created_at: string
          summary: string
        }

        const items: ActivityItem[] = []

        if (!transfersRes.error) {
          for (const t of transfersRes.data ?? []) {
            const row = t as {
              created_at: string
              full_name: string
              amount_try: number
              currency: string
              category_id: string
              transfer_date: string
            }
            const cat = row.category_id === 'dep' ? 'Deposit' : 'Withdrawal'
            items.push({
              source: 'transfer',
              created_at: row.created_at,
              summary: `${cat}: ${row.full_name} — ₺${Number(row.amount_try).toLocaleString('en', { minimumFractionDigits: 2 })} (${row.currency}) on ${row.transfer_date}`,
            })
          }
        }

        if (!accountingRes.error) {
          for (const a of accountingRes.data ?? []) {
            const row = a as {
              created_at: string
              entry_type: string
              direction: string
              register: string
              amount: number
              description: string
            }
            items.push({
              source: 'accounting',
              created_at: row.created_at,
              summary: `${row.entry_type} ${row.direction}: ${Number(row.amount).toLocaleString('en', { minimumFractionDigits: 2 })} ${row.register} — ${row.description}`,
            })
          }
        }

        if (!hrPaymentsRes.error) {
          for (const p of hrPaymentsRes.data ?? []) {
            const row = p as {
              created_at: string
              employee_id: string
              amount_tl: number
              period: string
              paid_at: string
            }
            items.push({
              source: 'hr_payment',
              created_at: row.created_at,
              summary: `Salary payment: ₺${Number(row.amount_tl).toLocaleString('en', { minimumFractionDigits: 2 })} for period ${row.period}, paid ${row.paid_at}`,
            })
          }
        }

        // Sort all by created_at descending and take top N
        items.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
        const topItems = items.slice(0, limit)

        return {
          total_fetched: items.length,
          showing: topItems.length,
          activity: topItems,
        }
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
  role: EffectiveRole,
  admin: AdminClient,
  writer: WritableStreamDefaultWriter<Uint8Array>,
  encoder: TextEncoder,
  apiKey: string,
): Promise<void> {
  const send = (event: Record<string, unknown>) =>
    writer.write(encoder.encode(`data: ${JSON.stringify(event)}\n\n`))

  const allowedTools = filterToolsForRole(role)

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
        tools: allowedTools,
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

      const result = await executeTool(toolBlock.name, toolBlock.input, orgId, role, admin)
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

    // ── 1b. Rate limit: 20 requests per minute per user ─────────────
    const rateLimited = checkRateLimit(`ai-chat:${user.id}`, {
      maxRequests: 20,
      windowMs: 60_000,
      corsHeaders: corsHeaders(origin),
    })
    if (rateLimited) return rateLimited

    // ── 2. Parse & validate request body ────────────────────────────
    const { data: body, error: validationError } = await parseBody(
      req,
      AiChatBodySchema,
      corsHeaders(origin),
    )
    if (validationError) return validationError

    const { messages, orgId, orgName } = body

    // ── 3. Authorize: verify org membership ────────────────────────
    const admin = createAdminClient()

    const { data: profile } = await admin
      .from('profiles')
      .select('system_role')
      .eq('id', user.id)
      .single()

    const isGod = profile?.system_role === 'god'

    // Compute effective role server-side from the authenticated user's
    // profile and membership. The request body's `userRole` is ignored for
    // authorization — clients cannot be trusted to declare their own role.
    let effectiveRole: EffectiveRole
    if (isGod) {
      effectiveRole = 'god'
    } else {
      const { data: membership } = await admin
        .from('organization_members')
        .select('role')
        .eq('organization_id', orgId)
        .eq('user_id', user.id)
        .single()

      if (!membership) return jsonErr(403, 'FORBIDDEN')

      const memberRole = membership.role as string
      if (memberRole === 'admin' || memberRole === 'manager' || memberRole === 'operation') {
        effectiveRole = memberRole
      } else {
        // Unknown role — fail closed to the least-privileged tier.
        effectiveRole = 'operation'
      }
    }

    // ── 4. Build system prompt ──────────────────────────────────────
    const today = new Date().toISOString().split('T')[0]

    const systemPrompt = `You are an AI assistant embedded in PipLinePro, a financial pipeline management platform used by payment operations teams.

Current context:
- Organization: ${orgName} (ID: ${orgId})
- User role: ${effectiveRole}
- Today's date: ${today}

You have read-only access to this organization's live data through the provided tools. You can query transfers, PSPs, HR/payroll data, crypto wallet balances, and accounting ledger entries. Always fetch real data before making any claims about specific numbers.

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

    runAgenticLoop(apiMessages, systemPrompt, orgId, effectiveRole, admin, writer, encoder, apiKey)
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
