import { useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useOrganization } from '@/app/providers/OrganizationProvider'
import { queryKeys } from '@/lib/queryKeys'

interface LookupItemPayload {
  name: string
  aliases: string[]
}

// ── Transfer Types ────────────────────────────────────────────────────────────

export function useCreateTransferType() {
  const { currentOrg } = useOrganization()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (payload: LookupItemPayload) => {
      if (!currentOrg) throw new Error('No organization selected')
      const { error } = await supabase.from('transfer_types').insert({
        id: crypto.randomUUID(),
        organization_id: currentOrg.id,
        name: payload.name.trim(),
        aliases: payload.aliases,
        is_excluded: false,
        is_system: false,
      })
      if (error) {
        if (error.code === '23505') throw new Error('name_taken')
        throw error
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.lookups.transferTypes(currentOrg?.id ?? ''),
      })
    },
  })
}

export function useUpdateTransferType() {
  const { currentOrg } = useOrganization()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ id, payload }: { id: string; payload: LookupItemPayload }) => {
      if (!currentOrg) throw new Error('No organization selected')
      const { error } = await supabase
        .from('transfer_types')
        .update({ name: payload.name.trim(), aliases: payload.aliases })
        .eq('id', id)
        .eq('organization_id', currentOrg.id)
      if (error) {
        if (error.code === '23505') throw new Error('name_taken')
        throw error
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.lookups.transferTypes(currentOrg?.id ?? ''),
      })
    },
  })
}

export function useDeleteTransferType() {
  const { currentOrg } = useOrganization()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (id: string) => {
      if (!currentOrg) throw new Error('No organization selected')

      // Soft guard: check if any transfers reference this type
      const { count } = await supabase
        .from('transfers')
        .select('id', { count: 'exact', head: true })
        .eq('type_id', id)
        .eq('organization_id', currentOrg.id)

      if ((count ?? 0) > 0) {
        throw new Error(`in_use:${count}`)
      }

      const { error } = await supabase
        .from('transfer_types')
        .delete()
        .eq('id', id)
        .eq('organization_id', currentOrg.id)

      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.lookups.transferTypes(currentOrg?.id ?? ''),
      })
    },
  })
}

// ── Payment Methods ───────────────────────────────────────────────────────────

export function useCreatePaymentMethod() {
  const { currentOrg } = useOrganization()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (payload: LookupItemPayload) => {
      if (!currentOrg) throw new Error('No organization selected')
      const { error } = await supabase.from('payment_methods').insert({
        id: crypto.randomUUID(),
        organization_id: currentOrg.id,
        name: payload.name.trim(),
        aliases: payload.aliases,
        is_system: false,
      })
      if (error) {
        if (error.code === '23505') throw new Error('name_taken')
        throw error
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.lookups.paymentMethods(currentOrg?.id ?? ''),
      })
    },
  })
}

export function useUpdatePaymentMethod() {
  const { currentOrg } = useOrganization()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ id, payload }: { id: string; payload: LookupItemPayload }) => {
      if (!currentOrg) throw new Error('No organization selected')
      const { error } = await supabase
        .from('payment_methods')
        .update({ name: payload.name.trim(), aliases: payload.aliases })
        .eq('id', id)
        .eq('organization_id', currentOrg.id)
      if (error) {
        if (error.code === '23505') throw new Error('name_taken')
        throw error
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.lookups.paymentMethods(currentOrg?.id ?? ''),
      })
    },
  })
}

export function useDeletePaymentMethod() {
  const { currentOrg } = useOrganization()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (id: string) => {
      if (!currentOrg) throw new Error('No organization selected')

      // Soft guard: check if any transfers reference this method
      const { count } = await supabase
        .from('transfers')
        .select('id', { count: 'exact', head: true })
        .eq('payment_method_id', id)
        .eq('organization_id', currentOrg.id)

      if ((count ?? 0) > 0) {
        throw new Error(`in_use:${count}`)
      }

      const { error } = await supabase
        .from('payment_methods')
        .delete()
        .eq('id', id)
        .eq('organization_id', currentOrg.id)

      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.lookups.paymentMethods(currentOrg?.id ?? ''),
      })
    },
  })
}
