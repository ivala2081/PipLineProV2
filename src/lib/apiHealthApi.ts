/**
 * API Health Check & Secret Management Client
 *
 * Uses supabase.functions.invoke() for automatic JWT auth injection.
 */

import { supabase } from '@/lib/supabase'

export interface ApiHealthResult {
  service: string
  status: 'healthy' | 'error' | 'not_configured'
  statusCode?: number
  errorType?: 'invalid_key' | 'rate_limit' | 'server_error' | 'network_error' | 'not_configured'
  errorMessage?: string
  responseTimeMs: number
  keyConfigured: boolean
  keyMasked?: string
  checkedAt: string
}

export async function checkApiHealth(): Promise<ApiHealthResult[]> {
  const { data: sessionData } = await supabase.auth.getSession()
  const token = sessionData?.session?.access_token

  const { data, error } = await supabase.functions.invoke('api-health-check', {
    body: {},
    headers: token ? { Authorization: `Bearer ${token}` } : undefined,
  })
  if (error) throw new Error(error.message || 'Health check failed')
  return data as ApiHealthResult[]
}

export async function updateApiSecrets(
  secrets: { name: string; value: string }[],
): Promise<{ success: boolean; updated: string[]; note: string }> {
  const { data: sessionData } = await supabase.auth.getSession()
  const token = sessionData?.session?.access_token

  const { data, error } = await supabase.functions.invoke('manage-secrets', {
    body: { action: 'update', secrets },
    headers: token ? { Authorization: `Bearer ${token}` } : undefined,
  })
  if (error) throw new Error(error.message || 'Secret update failed')
  return data
}
