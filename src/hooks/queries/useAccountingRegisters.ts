import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useOrganization } from '@/app/providers/OrganizationProvider'
import { queryKeys } from '@/lib/queryKeys'
import type { AccountingRegister, AccountingRegisterInsert } from '@/lib/database.types'

/* ── Query: list org registers ─────────────────────────── */

export function useAccountingRegisters() {
  const { currentOrg } = useOrganization()

  return useQuery({
    queryKey: queryKeys.accounting.registers(currentOrg?.id ?? ''),
    queryFn: async () => {
      if (!currentOrg) throw new Error('No organization selected')
      const { data, error } = await supabase
        .from('accounting_registers')
        .select('*')
        .eq('organization_id', currentOrg.id)
        .order('sort_order', { ascending: true })
        .order('name', { ascending: true })
      if (error) throw error
      return (data ?? []) as AccountingRegister[]
    },
    enabled: !!currentOrg,
    staleTime: 5 * 60_000,
  })
}

/* ── Mutations ──────────────────────────────────────────── */

export function useAccountingRegisterMutations() {
  const { currentOrg } = useOrganization()
  const queryClient = useQueryClient()

  const invalidate = () => {
    queryClient.invalidateQueries({
      queryKey: queryKeys.accounting.registers(currentOrg?.id ?? ''),
    })
  }

  const createRegister = useMutation({
    mutationFn: async (data: Omit<AccountingRegisterInsert, 'organization_id'>) => {
      if (!currentOrg) throw new Error('No organization selected')
      const { error } = await supabase
        .from('accounting_registers')
        .insert({ ...data, organization_id: currentOrg.id } as never)
      if (error) throw error
    },
    onSuccess: invalidate,
  })

  const updateRegister = useMutation({
    mutationFn: async ({
      id,
      ...data
    }: {
      id: string
      label?: string
      currency?: string
      is_active?: boolean
      sort_order?: number
    }) => {
      const { error } = await supabase
        .from('accounting_registers')
        .update(data as never)
        .eq('id', id)
      if (error) throw error
    },
    onSuccess: invalidate,
  })

  const deleteRegister = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('accounting_registers').delete().eq('id', id)
      if (error) throw error
    },
    onSuccess: invalidate,
  })

  return { createRegister, updateRegister, deleteRegister }
}

/* ── Seed registers for org (call once on setup) ────────── */

export function useSeedRegisters() {
  const { currentOrg } = useOrganization()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async () => {
      if (!currentOrg) throw new Error('No organization selected')
      const { error } = await supabase.rpc('seed_default_registers', {
        p_org_id: currentOrg.id,
      })
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.accounting.registers(currentOrg?.id ?? ''),
      })
    },
  })
}
