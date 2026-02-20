import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useOrganization } from '@/app/providers/OrganizationProvider'
import { queryKeys } from '@/lib/queryKeys'
import type { Wallet } from '@/lib/database.types'
import type { WalletFormValues } from '@/schemas/accountingSchema'

interface UseWalletsQueryReturn {
  wallets: Wallet[]
  isLoading: boolean
  error: string | null
  createWallet: (data: WalletFormValues) => Promise<void>
  updateWallet: (id: string, data: WalletFormValues) => Promise<void>
  deleteWallet: (id: string) => Promise<void>
  isCreating: boolean
  isDeleting: boolean
}

export function useWalletsQuery(): UseWalletsQueryReturn {
  const { currentOrg } = useOrganization()
  const queryClient = useQueryClient()

  const { data, isLoading, error } = useQuery({
    queryKey: queryKeys.wallets.list(currentOrg?.id ?? ''),
    queryFn: async () => {
      if (!currentOrg) throw new Error('No organization selected')
      const { data, error } = await supabase
        .from('wallets')
        .select('*')
        .eq('organization_id', currentOrg.id)
        .eq('is_active', true)
        .order('created_at', { ascending: false })
      if (error) throw error
      return (data as Wallet[]) ?? []
    },
    enabled: !!currentOrg,
  })

  const createMutation = useMutation({
    mutationFn: async (formData: WalletFormValues) => {
      if (!currentOrg) throw new Error('No organization selected')

      // Try to reactivate a soft-deleted wallet with the same address+chain
      const { data: reactivated } = await supabase
        .from('wallets')
        .update({ is_active: true, label: formData.label } as never)
        .eq('organization_id', currentOrg.id)
        .eq('address', formData.address)
        .eq('chain', formData.chain)
        .eq('is_active', false)
        .select()

      if (reactivated && reactivated.length > 0) return

      const { error } = await supabase.from('wallets').insert({
        organization_id: currentOrg.id,
        label: formData.label,
        address: formData.address,
        chain: formData.chain,
      } as never)
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.wallets.list(currentOrg?.id ?? '') })
    },
  })

  const updateMutation = useMutation({
    mutationFn: async ({ id, data: formData }: { id: string; data: WalletFormValues }) => {
      const { error } = await supabase
        .from('wallets')
        .update({
          label: formData.label,
          address: formData.address,
          chain: formData.chain,
        } as never)
        .eq('id', id)
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.wallets.list(currentOrg?.id ?? '') })
    },
  })

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('wallets')
        .update({ is_active: false } as never)
        .eq('id', id)
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.wallets.list(currentOrg?.id ?? '') })
    },
  })

  return {
    wallets: data ?? [],
    isLoading,
    error: error?.message ?? null,
    createWallet: createMutation.mutateAsync,
    updateWallet: async (id, data) => updateMutation.mutateAsync({ id, data }),
    deleteWallet: deleteMutation.mutateAsync,
    isCreating: createMutation.isPending,
    isUpdating: updateMutation.isPending,
    isDeleting: deleteMutation.isPending,
  }
}
