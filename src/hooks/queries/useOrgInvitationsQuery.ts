import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { queryKeys } from '@/lib/queryKeys'
import type { OrganizationInvitation } from '@/lib/database.types'

export function useOrgInvitationsQuery(orgId: string, enabled = true) {
  return useQuery({
    queryKey: queryKeys.organizations.invitations(orgId),
    queryFn: async () => {
      const { data, error } = await supabase
        .from('organization_invitations')
        .select('*')
        .eq('organization_id', orgId)
        .order('created_at', { ascending: false })

      if (error) throw error
      return (data as OrganizationInvitation[]) ?? []
    },
    enabled: !!orgId && enabled,
    staleTime: 10 * 60_000, // 10 min – invitations change infrequently
    gcTime: 20 * 60_000,
  })
}
