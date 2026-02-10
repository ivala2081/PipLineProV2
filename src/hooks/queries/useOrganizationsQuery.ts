import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/app/providers/AuthProvider'
import { queryKeys } from '@/lib/queryKeys'
import type { Organization } from '@/lib/database.types'

export interface OrganizationWithCount extends Organization {
  member_count: number
}

export function useOrganizationsQuery() {
  const { user } = useAuth()

  return useQuery({
    queryKey: queryKeys.organizations.list(),
    queryFn: async () => {
      const { data: orgs, error } = await supabase
        .from('organizations')
        .select('*')
        .order('name')

      if (import.meta.env.DEV) {
        console.debug('[useOrganizationsQuery] result:', { orgs: orgs?.length, error: error?.message })
      }
      if (error) throw error

      const orgsWithCounts: OrganizationWithCount[] = await Promise.all(
        (orgs ?? []).map(async (org) => {
          const { count } = await supabase
            .from('organization_members')
            .select('*', { count: 'exact', head: true })
            .eq('organization_id', org.id)

          return { ...org, member_count: count ?? 0 }
        }),
      )

      return orgsWithCounts
    },
    enabled: !!user,
  })
}
