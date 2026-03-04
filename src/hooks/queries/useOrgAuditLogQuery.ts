import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { queryKeys } from '@/lib/queryKeys'
import { useOrganization } from '@/app/providers/OrganizationProvider'

export interface OrgAuditEntry {
  id: string
  transfer_id: string
  organization_id: string
  action: string
  performed_by: string | null
  changes: Record<string, { old: unknown; new: unknown }> | null
  created_at: string
  performer_name: string | null
  performer_email: string | null
  transfer_name: string | null
}

export interface OrgAuditFilters {
  from?: string | null
  to?: string | null
  actorId?: string | null
  action?: string | null
  search?: string | null
}

export interface OrgAuditStats {
  created: number
  updated: number
  deleted: number
  restored: number
}

export const AUDIT_PAGE_SIZE = 25

export function useOrgAuditLogQuery(filters: OrgAuditFilters, page: number) {
  const { currentOrg } = useOrganization()

  const filtersKey = { ...filters, page }

  const { data, isLoading, error } = useQuery({
    queryKey: queryKeys.audit.list(currentOrg?.id ?? '', filtersKey),
    queryFn: async () => {
      if (!currentOrg) throw new Error('No organization selected')

      const [{ data: entries, error: entriesErr }, { data: countData, error: countErr }] =
        await Promise.all([
          supabase.rpc(
            'get_org_audit_log' as never,
            {
              p_org_id: currentOrg.id,
              p_from: filters.from ?? null,
              p_to: filters.to ?? null,
              p_actor_id: filters.actorId ?? null,
              p_action: filters.action ?? null,
              p_search: filters.search ?? null,
              p_limit: AUDIT_PAGE_SIZE,
              p_offset: (page - 1) * AUDIT_PAGE_SIZE,
            } as never,
          ),
          supabase.rpc(
            'get_org_audit_log_count' as never,
            {
              p_org_id: currentOrg.id,
              p_from: filters.from ?? null,
              p_to: filters.to ?? null,
              p_actor_id: filters.actorId ?? null,
              p_action: filters.action ?? null,
              p_search: filters.search ?? null,
            } as never,
          ),
        ])

      if (entriesErr) throw entriesErr
      if (countErr) throw countErr

      return {
        entries: (entries as OrgAuditEntry[]) ?? [],
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
    pageSize: AUDIT_PAGE_SIZE,
    isLoading,
    error: error?.message ?? null,
  }
}

export function useOrgAuditLogStats(filters: OrgAuditFilters) {
  const { currentOrg } = useOrganization()

  return useQuery({
    queryKey: [...queryKeys.audit.list(currentOrg?.id ?? '', filters), 'stats'],
    queryFn: async () => {
      if (!currentOrg) throw new Error('No organization selected')
      const { data, error } = await supabase.rpc(
        'get_org_audit_log_stats' as never,
        {
          p_org_id: currentOrg.id,
          p_from: filters.from ?? null,
          p_to: filters.to ?? null,
          p_actor_id: filters.actorId ?? null,
          p_search: filters.search ?? null,
        } as never,
      )
      if (error) throw error
      return (data as OrgAuditStats) ?? { created: 0, updated: 0, deleted: 0, restored: 0 }
    },
    enabled: !!currentOrg,
    staleTime: 0,
  })
}
