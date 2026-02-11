import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { queryKeys } from '@/lib/queryKeys'

export interface AuditLogEntry {
  id: string
  transfer_id: string
  organization_id: string
  action: 'created' | 'updated'
  performed_by: string | null
  changes: Record<string, { old: unknown; new: unknown }> | null
  created_at: string
  performer: { display_name: string | null } | null
}

const AUDIT_PAGE_SIZE = 10

const AUDIT_SELECT =
  '*, performer:profiles!transfer_audit_log_performed_by_fkey(display_name)'

export function useTransferAuditQuery(
  transferId: string | null,
  page: number,
) {
  const { data, isLoading, error } = useQuery({
    queryKey: queryKeys.transfers.audit(transferId ?? '', page),
    queryFn: async () => {
      if (!transferId) throw new Error('No transfer ID')

      const from = (page - 1) * AUDIT_PAGE_SIZE
      const to = from + AUDIT_PAGE_SIZE - 1

      const { data, error, count } = await supabase
        .from('transfer_audit_log')
        .select(AUDIT_SELECT, { count: 'exact' })
        .eq('transfer_id', transferId)
        .order('created_at', { ascending: false })
        .range(from, to)

      if (error) throw error

      return {
        entries: (data as unknown as AuditLogEntry[]) ?? [],
        total: count ?? 0,
      }
    },
    enabled: !!transferId,
  })

  return {
    entries: data?.entries ?? [],
    total: data?.total ?? 0,
    pageSize: AUDIT_PAGE_SIZE,
    isLoading,
    error: error?.message ?? null,
  }
}
