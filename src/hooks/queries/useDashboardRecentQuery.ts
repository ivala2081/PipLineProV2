import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useOrganization } from '@/app/providers/OrganizationProvider'
import { queryKeys } from '@/lib/queryKeys'
import { TRANSFER_CATEGORIES, PAYMENT_METHODS } from '@/lib/transferLookups'

/* ── Recent Transfer (lightweight) ─────────────────── */

export interface RecentTransfer {
  id: string
  full_name: string
  amount: number
  amount_try: number
  currency: string
  category_id: string
  psp_id: string
  payment_method_id: string
  transfer_date: string
  categoryName: string
  isDeposit: boolean
  paymentMethodName: string
  pspName: string
}

const TRANSFER_SELECT =
  'id, full_name, amount, amount_try, currency, category_id, psp_id, payment_method_id, transfer_date, psp:psps!psp_id(name)'

/* ── Activity Feed Entry ───────────────────────────── */

export interface ActivityEntry {
  id: string
  transfer_id: string
  action: 'created' | 'updated'
  created_at: string
  performerName: string
  transferName: string
}

const FEED_SELECT =
  'id, transfer_id, action, created_at, performer:profiles!transfer_audit_log_performed_by_profiles_fkey(display_name)'

/* ── Hook ──────────────────────────────────────────── */

export function useDashboardRecentQuery() {
  const { currentOrg } = useOrganization()
  const orgId = currentOrg?.id ?? ''

  // Recent transfers (last 10)
  const transfersQuery = useQuery({
    queryKey: queryKeys.dashboard.recentTransfers(orgId),
    queryFn: async () => {
      if (!currentOrg) throw new Error('No org')

      const { data, error } = await supabase
        .from('transfers')
        .select(TRANSFER_SELECT)
        .eq('organization_id', currentOrg.id)
        .order('transfer_date', { ascending: false })
        .limit(10)

      if (error) throw error

      return ((data ?? []) as Array<Record<string, unknown>>).map((row): RecentTransfer => {
        const catId = row.category_id as string
        const pmId = row.payment_method_id as string
        const cat = TRANSFER_CATEGORIES.find((c) => c.id === catId)
        const pm = PAYMENT_METHODS.find((p) => p.id === pmId)
        const psp = row.psp as { name: string } | null

        return {
          id: row.id as string,
          full_name: row.full_name as string,
          amount: Number(row.amount) || 0,
          amount_try: Number(row.amount_try) || 0,
          currency: row.currency as string,
          category_id: catId,
          psp_id: row.psp_id as string,
          payment_method_id: pmId,
          transfer_date: row.transfer_date as string,
          categoryName: cat?.name ?? catId,
          isDeposit: cat?.is_deposit ?? true,
          paymentMethodName: pm?.name ?? pmId,
          pspName: psp?.name ?? '—',
        }
      })
    },
    enabled: !!currentOrg,
    staleTime: 30_000, // 30s – recent transfers change frequently
    gcTime: 5 * 60_000,
  })

  // Recent activity (last 8 audit entries)
  const activityQuery = useQuery({
    queryKey: queryKeys.dashboard.recentActivity(orgId),
    queryFn: async () => {
      if (!currentOrg) throw new Error('No org')

      // Fetch audit entries
      const { data: auditData, error: auditError } = await supabase
        .from('transfer_audit_log')
        .select(FEED_SELECT)
        .eq('organization_id', currentOrg.id)
        .order('created_at', { ascending: false })
        .limit(8)

      if (auditError) throw auditError

      const entries = (auditData ?? []) as Array<Record<string, unknown>>
      if (entries.length === 0) return []

      // Fetch transfer names for the referenced transfer_ids
      const transferIds = [...new Set(entries.map((e) => e.transfer_id as string))]
      const { data: transferData } = await supabase
        .from('transfers')
        .select('id, full_name')
        .in('id', transferIds)

      const nameMap = new Map<string, string>()
      for (const t of (transferData ?? []) as Array<{ id: string; full_name: string }>) {
        nameMap.set(t.id, t.full_name)
      }

      return entries.map((entry): ActivityEntry => {
        const performer = entry.performer as { display_name: string | null } | null
        return {
          id: entry.id as string,
          transfer_id: entry.transfer_id as string,
          action: entry.action as 'created' | 'updated',
          created_at: entry.created_at as string,
          performerName: performer?.display_name ?? '?',
          transferName: nameMap.get(entry.transfer_id as string) ?? '—',
        }
      })
    },
    enabled: !!currentOrg,
    staleTime: 30_000, // 30s – activity feed changes frequently
    gcTime: 5 * 60_000,
  })

  return {
    recentTransfers: transfersQuery.data ?? [],
    isTransfersLoading: transfersQuery.isLoading,
    activity: activityQuery.data ?? [],
    isActivityLoading: activityQuery.isLoading,
  }
}
