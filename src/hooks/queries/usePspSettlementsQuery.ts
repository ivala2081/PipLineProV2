import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/app/providers/AuthProvider'
import { useOrganization } from '@/app/providers/OrganizationProvider'
import { queryKeys } from '@/lib/queryKeys'
import type { PspSettlement } from '@/lib/database.types'
import type { SettlementFormValues } from '@/schemas/pspSettlementSchema'

interface UsePspSettlementsReturn {
  settlements: PspSettlement[]
  isLoading: boolean
  error: string | null
  createSettlement: (data: SettlementFormValues) => Promise<void>
  updateSettlement: (id: string, data: SettlementFormValues) => Promise<void>
  deleteSettlement: (id: string) => Promise<void>
  isCreating: boolean
  isUpdating: boolean
  isDeleting: boolean
}

export function usePspSettlementsQuery(pspId: string | undefined): UsePspSettlementsReturn {
  const { user } = useAuth()
  const { currentOrg } = useOrganization()
  const queryClient = useQueryClient()

  const { data, isLoading, error } = useQuery({
    queryKey: queryKeys.pspSettlements.byPsp(pspId ?? ''),
    queryFn: async () => {
      if (!currentOrg || !pspId) throw new Error('Missing org or PSP')

      const { data, error } = await supabase
        .from('psp_settlements')
        .select('*')
        .eq('psp_id', pspId)
        .eq('organization_id', currentOrg.id)
        .order('settlement_date', { ascending: false })

      if (error) throw error
      return (data as PspSettlement[]) ?? []
    },
    enabled: !!currentOrg && !!pspId,
    staleTime: 10 * 60_000, // 10 min – settlements are admin-entered, change rarely
    gcTime: 20 * 60_000,
  })

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: queryKeys.pspSettlements.byPsp(pspId ?? '') })
    queryClient.invalidateQueries({
      queryKey: queryKeys.pspDashboard.summary(currentOrg?.id ?? ''),
    })
    queryClient.invalidateQueries({ queryKey: queryKeys.pspDashboard.ledger(pspId ?? '') })
  }

  const createMutation = useMutation({
    mutationFn: async (data: SettlementFormValues) => {
      if (!currentOrg || !user || !pspId) throw new Error('Missing context')
      const { error } = await supabase.from('psp_settlements').insert({
        psp_id: pspId,
        organization_id: currentOrg.id,
        settlement_date: data.settlement_date,
        amount: data.amount,
        currency: data.currency,
        notes: data.notes || null,
        created_by: user.id,
      } as never)
      if (error) throw error
    },
    onSuccess: invalidate,
  })

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: SettlementFormValues }) => {
      if (!currentOrg) throw new Error('No organization')
      const { error } = await supabase
        .from('psp_settlements')
        .update({
          settlement_date: data.settlement_date,
          amount: data.amount,
          currency: data.currency,
          notes: data.notes || null,
        } as never)
        .eq('id', id)
      if (error) throw error
    },
    onSuccess: invalidate,
  })

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('psp_settlements').delete().eq('id', id)
      if (error) throw error
    },
    onSuccess: invalidate,
  })

  return {
    settlements: data ?? [],
    isLoading,
    error: error?.message ?? null,
    createSettlement: createMutation.mutateAsync,
    updateSettlement: async (id, data) => updateMutation.mutateAsync({ id, data }),
    deleteSettlement: deleteMutation.mutateAsync,
    isCreating: createMutation.isPending,
    isUpdating: updateMutation.isPending,
    isDeleting: deleteMutation.isPending,
  }
}
