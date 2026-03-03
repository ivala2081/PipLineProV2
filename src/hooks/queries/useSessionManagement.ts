import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/app/providers/AuthProvider'
import { queryKeys } from '@/lib/queryKeys'

interface LoginAttempt {
  id: string
  device_id: string | null
  ip_address: string | null
  success: boolean
  error_message: string | null
  created_at: string
}

export function useLoginHistory(limit = 50, offset = 0) {
  const { user } = useAuth()

  return useQuery({
    queryKey: queryKeys.sessions.loginHistory(user?.id ?? '', limit, offset),
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_login_history', {
        p_user_id: user!.id,
        p_limit: limit,
        p_offset: offset,
      })
      if (error) throw error
      return (data as LoginAttempt[]) ?? []
    },
    enabled: !!user?.id,
    staleTime: 10 * 60_000, // 10 min – login history rarely refreshed
    gcTime: 20 * 60_000,
  })
}
