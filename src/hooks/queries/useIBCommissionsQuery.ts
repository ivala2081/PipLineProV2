import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/app/providers/AuthProvider'
import { useOrganization } from '@/app/providers/OrganizationProvider'
import { queryKeys } from '@/lib/queryKeys'
import type { IBCommission } from '@/lib/database.types'
import type { Json } from '@/lib/database.types'

export type IBCommissionWithPartner = IBCommission & {
  ib_partner: { name: string } | null
}

export function useIBCommissionsQuery() {
  const { currentOrg } = useOrganization()
  const orgId = currentOrg?.id ?? ''

  const { data, isLoading, error } = useQuery({
    queryKey: queryKeys.ib.commissions(orgId),
    queryFn: async () => {
      if (!currentOrg) throw new Error('No organization selected')
      const { data, error } = await supabase
        .from('ib_commissions')
        .select('*, ib_partner:ib_partners!ib_partner_id(name)')
        .eq('organization_id', currentOrg.id)
        .order('period_start', { ascending: false })
      if (error) throw error
      return (data as unknown as IBCommissionWithPartner[]) ?? []
    },
    enabled: !!currentOrg,
    staleTime: 5 * 60_000,
    gcTime: 10 * 60_000,
  })

  return {
    commissions: data ?? [],
    isLoading,
    error: error?.message ?? null,
  }
}

export function useIBCommissionMutations() {
  const { user } = useAuth()
  const { currentOrg } = useOrganization()
  const queryClient = useQueryClient()
  const orgId = currentOrg?.id ?? ''

  const invalidate = async () => {
    await queryClient.invalidateQueries({ queryKey: queryKeys.ib.commissions(orgId) })
  }

  const calculateCommission = useMutation({
    mutationFn: async ({
      ib_partner_id,
      period_start,
      period_end,
    }: {
      ib_partner_id: string
      period_start: string
      period_end: string
    }) => {
      if (!currentOrg) throw new Error('No organization selected')

      // Call RPC to calculate all types
      const { data: rpcResult, error: rpcError } = await supabase.rpc('calculate_ib_commission', {
        p_ib_partner_id: ib_partner_id,
        p_period_start: period_start,
        p_period_end: period_end,
      })
      if (rpcError) throw rpcError

      const result = rpcResult as {
        total_amount: number
        types: { type: string; calculated_amount: number; breakdown: Json; currency: string }[]
        currency: string
      }

      // Upsert one commission record per type
      for (const typeResult of result.types) {
        const { error } = await supabase.from('ib_commissions').upsert(
          {
            organization_id: currentOrg.id,
            ib_partner_id,
            period_start,
            period_end,
            agreement_type: typeResult.type,
            calculated_amount: typeResult.calculated_amount,
            currency: typeResult.currency ?? 'USD',
            breakdown: typeResult.breakdown,
            status: 'draft',
            created_by: user?.id ?? null,
          },
          { onConflict: 'idx_ib_commissions_unique_period' },
        )
        if (error) throw error
      }

      return result
    },
    onSuccess: invalidate,
  })

  const overrideCommission = useMutation({
    mutationFn: async ({
      id,
      override_amount,
      override_reason,
    }: {
      id: string
      override_amount: number
      override_reason: string
    }) => {
      const { error } = await supabase
        .from('ib_commissions')
        .update({ override_amount, override_reason })
        .eq('id', id)
      if (error) throw error
    },
    onSuccess: invalidate,
  })

  const confirmCommission = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('ib_commissions')
        .update({
          status: 'confirmed',
          confirmed_at: new Date().toISOString(),
          confirmed_by: user?.id ?? null,
        })
        .eq('id', id)
      if (error) throw error
    },
    onSuccess: invalidate,
  })

  const markPaid = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('ib_commissions')
        .update({ status: 'paid' })
        .eq('id', id)
      if (error) throw error
    },
    onSuccess: invalidate,
  })

  return {
    calculateCommission,
    overrideCommission,
    confirmCommission,
    markPaid,
  }
}
