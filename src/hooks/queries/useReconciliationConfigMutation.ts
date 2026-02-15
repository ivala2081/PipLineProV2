import { useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/app/providers/AuthProvider'
import { useOrganization } from '@/app/providers/OrganizationProvider'
import { queryKeys } from '@/lib/queryKeys'
import type { TeyitEntry } from '@/pages/accounting/reconciliationTypes'

interface SaveConfigInput {
  year: number
  month: number
  devir_usdt?: number | null
  devir_nakit_tl?: number | null
  devir_nakit_usd?: number | null
  kur?: number | null
  bekl_tahs?: number | null
  teyit_entries?: TeyitEntry[]
}

export function useReconciliationConfigMutation() {
  const { user } = useAuth()
  const { currentOrg } = useOrganization()
  const queryClient = useQueryClient()

  const mutation = useMutation({
    mutationFn: async (data: SaveConfigInput) => {
      if (!currentOrg || !user) throw new Error('No organization or user')

      const { error } = await supabase.from('accounting_monthly_config' as never).upsert(
        {
          organization_id: currentOrg.id,
          year: data.year,
          month: data.month,
          devir_usdt: data.devir_usdt ?? null,
          devir_nakit_tl: data.devir_nakit_tl ?? null,
          devir_nakit_usd: data.devir_nakit_usd ?? null,
          kur: data.kur ?? null,
          bekl_tahs: data.bekl_tahs ?? null,
          teyit_entries: data.teyit_entries ?? [],
          created_by: user.id,
        } as never,
        { onConflict: 'organization_id,year,month' } as never,
      )

      if (error) throw error
    },
    onSuccess: (_result, variables) => {
      const orgId = currentOrg?.id ?? ''
      queryClient.invalidateQueries({
        queryKey: queryKeys.accounting.config(orgId, variables.year, variables.month),
      })
      queryClient.invalidateQueries({
        queryKey: queryKeys.accounting.reconciliation(orgId, variables.year, variables.month),
      })
    },
  })

  return {
    saveConfig: mutation.mutateAsync,
    isSaving: mutation.isPending,
  }
}
