import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsHeaders, handleCors } from '../_shared/cors.ts'
import { createAdminClient } from '../_shared/supabase-admin.ts'
import { z, parseBody } from '../_shared/validation.ts'

/* ────────────────────────────────────────────────────────────────────
 * UniPayment Proxy Edge Function
 *
 * Securely proxies requests to the UniPayment REST API (v1.0).
 * - OAuth2 client_credentials flow with in-memory token cache
 * - JWT auth: validates caller is an org member
 * - Supports: wallet, invoices, payments, and transaction sync
 * ─────────────────────────────────────────────────────────────────── */

const UNIPAYMENT_CLIENT_ID = Deno.env.get('UNIPAYMENT_CLIENT_ID')
const UNIPAYMENT_CLIENT_SECRET = Deno.env.get('UNIPAYMENT_CLIENT_SECRET')
const UNIPAYMENT_BASE_URL = Deno.env.get('UNIPAYMENT_BASE_URL') || 'https://api.unipayment.io'
const UNIPAYMENT_APP_ID =
  Deno.env.get('UNIPAYMENT_APP_ID') || '46f44926-9968-4713-bcc7-f9a2b7586f15'

/* ── Input schema ──────────────────────────────────────────────────── */

const UniPaymentBodySchema = z.object({
  action: z.enum(
    [
      'getBalances',
      'getAccounts',
      'getTransactions',
      'getDepositAddress',
      'createInvoice',
      'queryInvoices',
      'getInvoice',
      'createPayment',
      'queryPayments',
      'getPayment',
      'cancelPayment',
      'getPaymentFee',
      'syncTransactions',
    ],
    {
      errorMap: () => ({ message: 'Unknown action' }),
    },
  ),
  params: z.record(z.unknown()).refine((p) => typeof p.org_id === 'string' && p.org_id.length > 0, {
    message: 'params.org_id is required',
  }),
})

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

/* ── OAuth2 Token Cache ────────────────────────────────────────────── */

let cachedToken: { access_token: string; expires_at: number } | null = null

async function getAccessToken(): Promise<string> {
  // Return cached token if still valid (with 30s buffer)
  if (cachedToken && Date.now() < cachedToken.expires_at - 30_000) {
    return cachedToken.access_token
  }

  if (!UNIPAYMENT_CLIENT_ID || !UNIPAYMENT_CLIENT_SECRET) {
    throw new Error('UniPayment credentials not configured')
  }

  const res = await fetch(`${UNIPAYMENT_BASE_URL}/connect/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'client_credentials',
      client_id: UNIPAYMENT_CLIENT_ID,
      client_secret: UNIPAYMENT_CLIENT_SECRET,
    }),
  })

  if (!res.ok) {
    const errText = await res.text()
    throw new Error(`OAuth token request failed (${res.status}): ${errText}`)
  }

  const data = await res.json()
  cachedToken = {
    access_token: data.access_token,
    expires_at: Date.now() + data.expires_in * 1000,
  }
  return cachedToken.access_token
}

/* ── UniPayment API caller ─────────────────────────────────────────── */

async function uniPaymentFetch<T>(
  method: string,
  path: string,
  body?: Record<string, unknown>,
): Promise<T> {
  const token = await getAccessToken()
  const url = `${UNIPAYMENT_BASE_URL}${path}`

  const options: RequestInit = {
    method,
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  }
  if (body && (method === 'POST' || method === 'PUT')) {
    options.body = JSON.stringify(body)
  }

  const res = await fetch(url, options)

  if (!res.ok) {
    const errText = await res.text()
    throw new Error(`UniPayment API error (${res.status}): ${errText}`)
  }

  return res.json() as Promise<T>
}

/* ── JWT Validation ────────────────────────────────────────────────── */

interface CallerInfo {
  userId: string
  role: string
}

async function validateCaller(authHeader: string | null, orgId: string): Promise<CallerInfo> {
  if (!authHeader) throw new Error('Missing authorization header')

  const supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_ANON_KEY')!, {
    global: { headers: { Authorization: authHeader } },
  })

  const {
    data: { user },
    error,
  } = await supabase.auth.getUser()
  if (error || !user) throw new Error('Unauthorized: invalid token')

  // Use the user's own client (with their JWT) to check membership
  // This respects RLS and confirms user can access the org
  const { data: member, error: memErr } = await supabase
    .from('organization_members')
    .select('role')
    .eq('organization_id', orgId)
    .eq('user_id', user.id)
    .single()

  if (memErr || !member) {
    // Fallback: check profile for system_role (god users may not have org membership)
    const { data: profile } = await supabase
      .from('profiles')
      .select('system_role')
      .eq('id', user.id)
      .single()

    if (profile?.system_role === 'god') {
      return { userId: user.id, role: 'god' }
    }

    throw new Error('Not a member of this organization')
  }

  return { userId: user.id, role: member.role as string }
}

function requireAdmin(caller: CallerInfo): void {
  if (!['admin', 'manager', 'god'].includes(caller.role)) {
    throw new Error('Insufficient permissions: admin role required')
  }
}

/* ── Action Handlers ───────────────────────────────────────────────── */

async function handleGetBalances(): Promise<unknown> {
  return uniPaymentFetch('GET', '/v1.0/wallet/balances')
}

async function handleGetAccounts(): Promise<unknown> {
  return uniPaymentFetch('GET', '/v1.0/wallet/accounts')
}

async function handleGetTransactions(params: Record<string, unknown>): Promise<unknown> {
  const { account_id, page_no = 1, page_size = 20 } = params
  if (!account_id) throw new Error('account_id is required')
  return uniPaymentFetch(
    'GET',
    `/v1.0/wallet/accounts/${account_id}/transactions?page_no=${page_no}&page_size=${page_size}`,
  )
}

async function handleGetDepositAddress(params: Record<string, unknown>): Promise<unknown> {
  const { account_id } = params
  if (!account_id) throw new Error('account_id is required')
  try {
    return await uniPaymentFetch('GET', `/v1.0/wallet/accounts/${account_id}/deposit/address`)
  } catch {
    // Some account types may not support deposit addresses
    return { code: 'OK', data: null }
  }
}

async function handleCreateInvoice(params: Record<string, unknown>): Promise<unknown> {
  const { order_id, price_amount, price_currency, _app_id } = params
  if (!order_id || !price_amount || !price_currency) {
    throw new Error('order_id, price_amount, and price_currency are required')
  }
  return uniPaymentFetch('POST', '/v1.0/invoices', { ...params, app_id: _app_id })
}

async function handleQueryInvoices(params: Record<string, unknown>): Promise<unknown> {
  const { page_no = 1, page_size = 20, status, _app_id } = params
  let path = `/v1.0/invoices?app_id=${_app_id}&page_no=${page_no}&page_size=${page_size}`
  if (status) path += `&status=${status}`
  return uniPaymentFetch('GET', path)
}

async function handleGetInvoice(params: Record<string, unknown>): Promise<unknown> {
  const { invoice_id } = params
  if (!invoice_id) throw new Error('invoice_id is required')
  return uniPaymentFetch('GET', `/v1.0/invoices/${invoice_id}`)
}

async function handleCreatePayment(params: Record<string, unknown>): Promise<unknown> {
  const { from_account_id, to, asset_type, amount } = params
  if (!from_account_id || !to || !asset_type || !amount) {
    throw new Error('from_account_id, to, asset_type, and amount are required')
  }
  return uniPaymentFetch('POST', '/v1.0/payments', params)
}

async function handleQueryPayments(params: Record<string, unknown>): Promise<unknown> {
  const { page_no = 1, page_size = 20, status, _app_id } = params
  let path = `/v1.0/payments?app_id=${_app_id}&page_no=${page_no}&page_size=${page_size}`
  if (status) path += `&status=${status}`
  return uniPaymentFetch('GET', path)
}

async function handleGetPayment(params: Record<string, unknown>): Promise<unknown> {
  const { payment_id } = params
  if (!payment_id) throw new Error('payment_id is required')
  return uniPaymentFetch('GET', `/v1.0/payments/${payment_id}`)
}

async function handleCancelPayment(params: Record<string, unknown>): Promise<unknown> {
  const { payment_id } = params
  if (!payment_id) throw new Error('payment_id is required')
  return uniPaymentFetch('PUT', `/v1.0/payments/${payment_id}/cancel`)
}

async function handleGetPaymentFee(params: Record<string, unknown>): Promise<unknown> {
  const { asset_type, amount } = params
  if (!asset_type || !amount) throw new Error('asset_type and amount are required')
  return uniPaymentFetch('GET', `/v1.0/payments/fee?asset_type=${asset_type}&amount=${amount}`)
}

/* ── Sync Transactions ─────────────────────────────────────────────── */

async function handleSyncTransactions(
  params: Record<string, unknown>,
  callerUserId: string,
): Promise<unknown> {
  const { psp_id, org_id } = params
  if (!psp_id || !org_id) throw new Error('psp_id and org_id are required')

  const admin = createAdminClient()

  // 1. Get or create sync log entry
  const { data: syncLog } = await admin
    .from('unipayment_sync_log')
    .select('*')
    .eq('psp_id', psp_id)
    .single()

  if (syncLog?.sync_status === 'running') {
    return { error: 'Sync already in progress', synced_count: 0, new_count: 0, errors: [] }
  }

  // Mark as running
  if (syncLog) {
    await admin
      .from('unipayment_sync_log')
      .update({ sync_status: 'running', error_message: null })
      .eq('id', syncLog.id)
  } else {
    await admin.from('unipayment_sync_log').insert({
      psp_id: psp_id as string,
      organization_id: org_id as string,
      sync_status: 'running',
    })
  }

  try {
    // 2. Get all accounts to iterate
    const accountsRes = await uniPaymentFetch<{
      code: string
      data: { id: string; asset_type: string }[]
    }>('GET', '/v1.0/wallet/accounts')

    const accounts = accountsRes.data || []
    let totalSynced = 0
    let totalNew = 0
    const errors: string[] = []

    // 3. For each account, fetch transactions
    for (const account of accounts) {
      let pageNo = 1
      let hasMore = true

      while (hasMore) {
        try {
          const txnRes = await uniPaymentFetch<{
            code: string
            data: {
              models: Array<{
                id: string
                account_id: string
                asset_type: string
                txn_type: string
                amount: number
                fee: number
                net_amount: number
                status: string
                note: string | null
                order_id: string | null
                created_at: string
              }>
              page_no: number
              page_size: number
              total: number
              page_count: number
            }
          }>(
            'GET',
            `/v1.0/wallet/accounts/${account.id}/transactions?page_no=${pageNo}&page_size=50`,
          )

          const txns = txnRes.data?.models || []
          if (txns.length === 0) {
            hasMore = false
            break
          }

          // 4. Map and insert each transaction
          for (const txn of txns) {
            totalSynced++

            const isDeposit =
              txn.txn_type === 'deposit' || txn.txn_type === 'invoice_payment' || txn.amount > 0

            const categoryId = isDeposit ? 'dep' : 'wd'
            const absAmount = Math.abs(txn.amount)

            const { error: insertErr } = await admin.from('transfers').insert({
              organization_id: org_id as string,
              full_name: txn.note || txn.order_id || `UniPayment-${txn.id.substring(0, 8)}`,
              transfer_date: txn.created_at,
              amount: absAmount,
              commission: Math.abs(txn.fee || 0),
              net: Math.abs(txn.net_amount || absAmount),
              currency: 'USD' as const,
              category_id: categoryId,
              payment_method_id: 'crypto',
              type_id: 'client',
              psp_id: psp_id as string,
              exchange_rate: 1,
              amount_try: 0,
              amount_usd: absAmount,
              external_transaction_id: txn.id,
              created_by: callerUserId,
            })

            if (insertErr) {
              // Unique constraint violation = already synced (expected for duplicates)
              if (insertErr.code === '23505') {
                // duplicate - skip
              } else {
                errors.push(`txn ${txn.id}: ${insertErr.message}`)
              }
            } else {
              totalNew++
            }
          }

          // Check if there are more pages
          const totalPages = txnRes.data?.page_count || 1
          if (pageNo >= totalPages) {
            hasMore = false
          } else {
            pageNo++
          }
        } catch (err) {
          errors.push(`account ${account.id} page ${pageNo}: ${(err as Error).message}`)
          hasMore = false
        }
      }
    }

    // 5. Update sync log
    await admin
      .from('unipayment_sync_log')
      .update({
        sync_status: 'idle',
        last_synced_at: new Date().toISOString(),
        error_message: errors.length > 0 ? errors.join('; ') : null,
      })
      .eq('psp_id', psp_id)

    return { synced_count: totalSynced, new_count: totalNew, errors }
  } catch (err) {
    // Update sync log with error
    await admin
      .from('unipayment_sync_log')
      .update({
        sync_status: 'error',
        error_message: (err as Error).message,
      })
      .eq('psp_id', psp_id)

    throw err
  }
}

/* ── Main Handler ──────────────────────────────────────────────────── */

serve(async (req: Request) => {
  // Handle CORS preflight
  const corsResponse = handleCors(req)
  if (corsResponse) return corsResponse

  const origin = req.headers.get('origin') || undefined

  try {
    // Parse & validate request body (Zod)
    const { data: body, error: validationError } = await parseBody(
      req,
      UniPaymentBodySchema,
      corsHeaders(origin),
    )
    if (validationError) return validationError

    const { action, params } = body
    const orgId = params.org_id as string

    // Validate JWT and org membership
    const authHeader = req.headers.get('Authorization')
    const caller = await validateCaller(authHeader, orgId)

    // Resolve app_id from PSP record (if psp_id provided)
    let appId = UNIPAYMENT_APP_ID
    const pspId = params.psp_id as string | undefined
    if (pspId) {
      const admin = createAdminClient()
      const { data: psp } = await admin
        .from('psps')
        .select('provider_app_id')
        .eq('id', pspId)
        .single()
      if (psp?.provider_app_id) {
        appId = psp.provider_app_id
      }
    }
    // Inject appId into params for handlers
    params._app_id = appId

    // Route to action handler
    let result: unknown

    switch (action) {
      // Read-only actions (any org member)
      case 'getBalances':
        result = await handleGetBalances()
        break
      case 'getAccounts':
        result = await handleGetAccounts()
        break
      case 'getTransactions':
        result = await handleGetTransactions(params)
        break
      case 'getDepositAddress':
        result = await handleGetDepositAddress(params)
        break
      case 'queryInvoices':
        result = await handleQueryInvoices(params)
        break
      case 'getInvoice':
        result = await handleGetInvoice(params)
        break
      case 'queryPayments':
        result = await handleQueryPayments(params)
        break
      case 'getPayment':
        result = await handleGetPayment(params)
        break
      case 'getPaymentFee':
        result = await handleGetPaymentFee(params)
        break

      // Write actions (admin only)
      case 'createInvoice':
        requireAdmin(caller)
        result = await handleCreateInvoice(params)
        break
      case 'createPayment':
        requireAdmin(caller)
        result = await handleCreatePayment(params)
        break
      case 'cancelPayment':
        requireAdmin(caller)
        result = await handleCancelPayment(params)
        break
      case 'syncTransactions':
        requireAdmin(caller)
        result = await handleSyncTransactions(params, caller.userId)
        break

      default:
        return errorResponse(400, `Unknown action: ${action}`, origin)
    }

    return jsonResponse(result, 200, origin)
  } catch (error) {
    console.error('[UniPayment Proxy] Error:', error)
    const message = error instanceof Error ? error.message : 'Unknown error'
    const status =
      message.includes('Unauthorized') || message.includes('Insufficient')
        ? 403
        : message.includes('required')
          ? 400
          : 500
    return errorResponse(status, message, origin)
  }
})
