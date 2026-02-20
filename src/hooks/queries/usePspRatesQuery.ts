import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/app/providers/AuthProvider'
import { useOrganization } from '@/app/providers/OrganizationProvider'
import { queryKeys } from '@/lib/queryKeys'
import type { PspCommissionRate } from '@/lib/database.types'

/* ------------------------------------------------------------------ */
/*  Pure utility: resolve rate for a date                              */
/* ------------------------------------------------------------------ */

/**
 * Given a list of rates sorted by effective_from DESC,
 * return the commission_rate in effect on `targetDate`.
 */
export function resolveRateForDate(rates: PspCommissionRate[], targetDate: string): number | null {
  for (const r of rates) {
    if (r.effective_from <= targetDate) {
      return r.commission_rate
    }
  }
  return null
}

/* ------------------------------------------------------------------ */
/*  Hook: fetch rates for a single PSP (rate history dialog)           */
/* ------------------------------------------------------------------ */

export function usePspRates(pspId: string | null) {
  const { currentOrg } = useOrganization()
  const orgId = currentOrg?.id

  const {
    data: rates = [],
    isLoading,
    error,
  } = useQuery({
    queryKey: queryKeys.pspRates.byPsp(pspId ?? ''),
    queryFn: async () => {
      if (!pspId || !orgId) throw new Error('Missing psp or org')

      const { data, error } = await supabase
        .from('psp_commission_rates')
        .select('*')
        .eq('psp_id', pspId)
        .eq('organization_id', orgId)
        .order('effective_from', { ascending: false })

      if (error) throw error
      return data as PspCommissionRate[]
    },
    enabled: !!pspId && !!orgId,
  })

  return { rates, isLoading, error: error?.message ?? null }
}

/* ------------------------------------------------------------------ */
/*  Hook: fetch ALL rates for current org (transfer form resolution)   */
/* ------------------------------------------------------------------ */

export function useOrgPspRates() {
  const { currentOrg } = useOrganization()
  const orgId = currentOrg?.id

  const { data: rates = [], isLoading } = useQuery({
    queryKey: queryKeys.pspRates.byOrg(orgId ?? ''),
    queryFn: async () => {
      if (!orgId) throw new Error('No org')

      const { data, error } = await supabase
        .from('psp_commission_rates')
        .select('*')
        .eq('organization_id', orgId)
        .order('effective_from', { ascending: false })

      if (error) throw error
      return data as PspCommissionRate[]
    },
    enabled: !!orgId,
  })

  // Group by psp_id for quick lookup
  const ratesByPsp = new Map<string, PspCommissionRate[]>()
  for (const r of rates) {
    const arr = ratesByPsp.get(r.psp_id) ?? []
    arr.push(r)
    ratesByPsp.set(r.psp_id, arr)
  }

  return { rates, ratesByPsp, isLoading }
}

/* ------------------------------------------------------------------ */
/*  Hook: mutations for PSP rates                                      */
/* ------------------------------------------------------------------ */

export function usePspRateMutations() {
  const { user } = useAuth()
  const { currentOrg } = useOrganization()
  const queryClient = useQueryClient()

  const invalidateAll = (pspId: string) => {
    queryClient.invalidateQueries({
      queryKey: queryKeys.pspRates.byPsp(pspId),
    })
    queryClient.invalidateQueries({
      queryKey: queryKeys.pspRates.byOrg(currentOrg?.id ?? ''),
    })
    // Also invalidate PSP lookups since psps.commission_rate may change via trigger
    queryClient.invalidateQueries({
      queryKey: queryKeys.lookups.psps(currentOrg?.id ?? ''),
    })
  }

  const createRate = useMutation({
    mutationFn: async (params: {
      pspId: string
      commissionRate: number
      effectiveFrom: string
    }) => {
      if (!currentOrg || !user) throw new Error('No org/user')

      const { error } = await supabase.from('psp_commission_rates').insert({
        psp_id: params.pspId,
        organization_id: currentOrg.id,
        commission_rate: params.commissionRate,
        effective_from: params.effectiveFrom,
        created_by: user.id,
      })
      if (error) throw error
    },
    onSuccess: (_data, variables) => invalidateAll(variables.pspId),
  })

  const deleteRate = useMutation({
    mutationFn: async (params: { id: string; pspId: string }) => {
      const { error } = await supabase.from('psp_commission_rates').delete().eq('id', params.id)
      if (error) throw error
    },
    onSuccess: (_data, variables) => invalidateAll(variables.pspId),
  })

  return {
    createRate: createRate.mutateAsync,
    deleteRate: deleteRate.mutateAsync,
    isCreating: createRate.isPending,
    isDeleting: deleteRate.isPending,
  }
}
