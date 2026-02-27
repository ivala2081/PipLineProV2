import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/app/providers/AuthProvider'
import { useOrganization } from '@/app/providers/OrganizationProvider'
import { queryKeys } from '@/lib/queryKeys'
import { localYMD } from '@/lib/date'

type LookupTable = 'psps'

interface LookupItem {
  id: string
  organization_id: string
  name: string
  is_active: boolean
  created_at: string
  updated_at: string
  [key: string]: unknown
}

interface UseLookupMutationReturn {
  items: LookupItem[]
  isLoading: boolean
  error: string | null
  createItem: (data: Record<string, unknown>) => Promise<void>
  updateItem: (id: string, data: Record<string, unknown>) => Promise<void>
  deleteItem: (id: string) => Promise<void>
  isCreating: boolean
  isUpdating: boolean
  isDeleting: boolean
}

export function useLookupMutation(table: LookupTable): UseLookupMutationReturn {
  const { user } = useAuth()
  const { currentOrg } = useOrganization()
  const queryClient = useQueryClient()
  const orgId = currentOrg?.id

  // Query for items
  const {
    data: items = [],
    isLoading,
    error,
  } = useQuery({
    queryKey: [...queryKeys.lookups.all, table, orgId ?? ''],
    queryFn: async () => {
      if (!orgId) throw new Error('No organization selected')

      const { data, error } = await supabase
        .from(table)
        .select('*')
        .eq('organization_id', orgId)
        .order('name')

      if (error) throw error
      return (data as LookupItem[]) ?? []
    },
    enabled: !!orgId,
  })

  // Helper to invalidate both the management query and the active-only query
  const invalidateQueries = () => {
    queryClient.invalidateQueries({
      queryKey: [...queryKeys.lookups.all, table],
    })
    // Also invalidate the specific lookup query used by useLookupQueries
    if (table === 'psps') {
      queryClient.invalidateQueries({
        queryKey: queryKeys.lookups.psps(orgId ?? ''),
      })
      // Invalidate PSP dashboard so cards reflect updated rates
      queryClient.invalidateQueries({
        queryKey: queryKeys.pspDashboard.summary(orgId ?? ''),
      })
    } else if (table === 'transfer_categories') {
      queryClient.invalidateQueries({
        queryKey: queryKeys.lookups.categories(orgId ?? ''),
      })
    } else if (table === 'payment_methods') {
      queryClient.invalidateQueries({
        queryKey: queryKeys.lookups.paymentMethods(orgId ?? ''),
      })
    } else if (table === 'transfer_types') {
      queryClient.invalidateQueries({
        queryKey: queryKeys.lookups.transferTypes(orgId ?? ''),
      })
    }
  }

  // Create mutation
  const createMutation = useMutation({
    mutationFn: async (data: Record<string, unknown>) => {
      if (!orgId) throw new Error('No organization selected')

      const { data: inserted, error } = await supabase
        .from(table)
        .insert({
          organization_id: orgId,
          ...data,
        } as never)
        .select('id')
        .single()

      if (error) throw error

      // When creating a PSP, also seed the initial rate-history row
      if (table === 'psps' && inserted && data.commission_rate != null) {
        await supabase.from('psp_commission_rates').insert({
          psp_id: (inserted as { id: string }).id,
          organization_id: orgId,
          commission_rate: data.commission_rate,
          effective_from: localYMD(new Date()),
          created_by: user?.id,
        })
      }
    },
    onSuccess: invalidateQueries, // Automatic sync!
  })

  // Update mutation
  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Record<string, unknown> }) => {
      const { error } = await supabase
        .from(table)
        .update(data as never)
        .eq('id', id)

      if (error) throw error
    },
    onSuccess: invalidateQueries,
  })

  // Delete mutation — optimistic
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from(table).delete().eq('id', id)

      if (error) throw error
    },
    onMutate: async (id: string) => {
      const qk = [...queryKeys.lookups.all, table, orgId ?? '']
      await queryClient.cancelQueries({ queryKey: qk })
      const snapshot = queryClient.getQueryData<LookupItem[]>(qk)
      queryClient.setQueryData<LookupItem[]>(qk, (old) =>
        old ? old.filter((item) => item.id !== id) : old,
      )
      return { snapshot, qk }
    },
    onError: (_err, _id, context) => {
      if (context?.snapshot && context?.qk) {
        queryClient.setQueryData(context.qk, context.snapshot)
      }
    },
    onSettled: invalidateQueries,
  })

  return {
    items,
    isLoading,
    error: error?.message ?? null,
    createItem: createMutation.mutateAsync,
    updateItem: async (id: string, data: Record<string, unknown>) =>
      updateMutation.mutateAsync({ id, data }),
    deleteItem: deleteMutation.mutateAsync,
    isCreating: createMutation.isPending,
    isUpdating: updateMutation.isPending,
    isDeleting: deleteMutation.isPending,
  }
}
