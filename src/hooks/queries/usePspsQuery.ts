import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useOrganization } from '@/app/providers/OrganizationProvider'
import { queryKeys } from '@/lib/queryKeys'

export interface Psp {
  id: string
  name: string
  commission_rate: number
  is_active: boolean
  is_internal: boolean
  psp_scope: 'local' | 'global'
  provider: string | null
}

export function usePspsQuery() {
  const { currentOrg } = useOrganization()

  const { data, isLoading, error } = useQuery({
    queryKey: queryKeys.lookups.psps(currentOrg?.id ?? ''),
    queryFn: async () => {
      if (!currentOrg) throw new Error('No organization selected')

      const { data, error } = await supabase
        .from('psps')
        .select('id, name, commission_rate, is_active, is_internal, psp_scope, provider')
        .eq('organization_id', currentOrg.id)
        .order('name')

      if (error) throw error
      return data as Psp[]
    },
    enabled: !!currentOrg,
    staleTime: 5 * 60 * 1000, // 5 minutes
  })

  return {
    psps: data ?? [],
    isLoading,
    error: error?.message ?? null,
  }
}
