import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { queryKeys } from '@/lib/queryKeys'
import { useOrganization } from '@/app/providers/OrganizationProvider'

export interface OrgActivityEntry {
  id: string
  organization_id: string
  table_name: string
  record_id: string | null
  action: string
  old_data: Record<string, unknown> | null
  new_data: Record<string, unknown> | null
  performed_by: string | null
  performed_at: string
  metadata: Record<string, unknown> | null
  performer_name: string | null
  performer_email: string | null
}

export interface OrgActivityFilters {
  from?: string | null
  to?: string | null
  actorId?: string | null
  action?: string | null
  tableName?: string | null
}

export interface OrgActivityStats {
  created: number
  updated: number
  deleted: number
}

export const ACTIVITY_PAGE_SIZE = 25

export const AUDITED_TABLES = [
  'ib_partners',
  'ib_commissions',
  'ib_payments',
  'accounting_entries',
  'role_permissions',
] as const

export function useOrgActivityLogQuery(filters: OrgActivityFilters, page: number) {
  const { currentOrg } = useOrganization()

  const filtersKey = { ...filters, page }

  const { data, isLoading, error } = useQuery({
    queryKey: queryKeys.audit.activity(currentOrg?.id ?? '', filtersKey),
    queryFn: async () => {
      if (!currentOrg) throw new Error('No organization selected')

      const [{ data: entries, error: entriesErr }, { data: countData, error: countErr }] =
        await Promise.all([
          supabase.rpc(
            'get_org_activity_log' as never,
            {
              p_org_id: currentOrg.id,
              p_from: filters.from ?? null,
              p_to: filters.to ?? null,
              p_actor_id: filters.actorId ?? null,
              p_action: filters.action ?? null,
              p_table_name: filters.tableName ?? null,
              p_limit: ACTIVITY_PAGE_SIZE,
              p_offset: (page - 1) * ACTIVITY_PAGE_SIZE,
            } as never,
          ),
          supabase.rpc(
            'get_org_activity_log_count' as never,
            {
              p_org_id: currentOrg.id,
              p_from: filters.from ?? null,
              p_to: filters.to ?? null,
              p_actor_id: filters.actorId ?? null,
              p_action: filters.action ?? null,
              p_table_name: filters.tableName ?? null,
            } as never,
          ),
        ])

      if (entriesErr) throw entriesErr
      if (countErr) throw countErr

      return {
        entries: (entries as OrgActivityEntry[]) ?? [],
        total: (countData as number) ?? 0,
      }
    },
    enabled: !!currentOrg,
    staleTime: 0,
    gcTime: 60_000,
  })

  return {
    entries: data?.entries ?? [],
    total: data?.total ?? 0,
    pageSize: ACTIVITY_PAGE_SIZE,
    isLoading,
    error: error?.message ?? null,
  }
}

export function useOrgActivityLogStats(filters: OrgActivityFilters) {
  const { currentOrg } = useOrganization()

  return useQuery({
    queryKey: [...queryKeys.audit.activity(currentOrg?.id ?? '', filters), 'stats'],
    queryFn: async () => {
      if (!currentOrg) throw new Error('No organization selected')
      const { data, error } = await supabase.rpc(
        'get_org_activity_log_stats' as never,
        {
          p_org_id: currentOrg.id,
          p_from: filters.from ?? null,
          p_to: filters.to ?? null,
          p_actor_id: filters.actorId ?? null,
          p_table_name: filters.tableName ?? null,
        } as never,
      )
      if (error) throw error
      const row = Array.isArray(data) ? data[0] : data
      return (row as OrgActivityStats) ?? { created: 0, updated: 0, deleted: 0 }
    },
    enabled: !!currentOrg,
    staleTime: 0,
  })
}
