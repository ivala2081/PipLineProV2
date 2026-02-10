import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { queryKeys } from '@/lib/queryKeys'
import type { Organization } from '@/lib/database.types'

export function useOrganizationDetailQuery(orgId: string) {
  return useQuery({
    queryKey: queryKeys.organizations.detail(orgId),
    queryFn: async () => {
      const { data, error } = await supabase
        .from('organizations')
        .select('*')
        .eq('id', orgId)
        .single()

      if (error) throw error
      return data as Organization
    },
    enabled: !!orgId,
  })
}
