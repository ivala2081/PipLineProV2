/**
 * UniPayment API Client
 *
 * Routes all UniPayment API calls through the unipayment-proxy Edge Function.
 * Uses the user's JWT for authentication (unlike secureApi which uses anon key).
 */

import { supabase } from '@/lib/supabase'
import type { UniPaymentAction } from '@/lib/uniPaymentTypes'

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL

if (!SUPABASE_URL) {
  throw new Error('Missing VITE_SUPABASE_URL environment variable')
}

const UNIPAYMENT_PROXY_URL = `${SUPABASE_URL}/functions/v1/unipayment-proxy`

/**
 * Call the UniPayment proxy Edge Function
 *
 * @param action - The UniPayment action to perform
 * @param params - Parameters including org_id
 * @returns The API response data
 */
export async function callUniPaymentApi<T>(
  action: UniPaymentAction,
  params: Record<string, unknown> = {},
): Promise<T> {
  const { data: { session } } = await supabase.auth.getSession()

  if (!session?.access_token) {
    throw new Error('No active session')
  }

  const response = await fetch(UNIPAYMENT_PROXY_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${session.access_token}`,
    },
    body: JSON.stringify({ action, params }),
  })

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Request failed' }))
    throw new Error(error.error || `UniPayment API request failed (${response.status})`)
  }

  return response.json()
}
