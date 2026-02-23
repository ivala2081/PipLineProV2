/**
 * UniPayment API Client
 *
 * Routes all UniPayment API calls through the unipayment-proxy Edge Function.
 * Uses supabase.functions.invoke() for automatic auth handling.
 */

import { supabase } from '@/lib/supabase'
import type { UniPaymentAction } from '@/lib/uniPaymentTypes'

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
  const { data, error } = await supabase.functions.invoke('unipayment-proxy', {
    body: { action, params },
  })

  if (error) {
    throw new Error(error.message || `UniPayment API request failed`)
  }

  return data as T
}
