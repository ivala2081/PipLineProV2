import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useOrganization } from '@/app/providers/OrganizationProvider'
import { queryKeys } from '@/lib/queryKeys'
import type { AccountingCategory, AccountingCategoryInsert } from '@/lib/database.types'

/* ── Query: list global + org categories ───────────────── */

export function useAccountingCategories() {
  const { currentOrg } = useOrganization()

  return useQuery({
    queryKey: queryKeys.accounting.categories(currentOrg?.id ?? ''),
    queryFn: async () => {
      if (!currentOrg) throw new Error('No organization selected')
      const { data, error } = await supabase
        .from('accounting_categories')
        .select('*')
        .or(`organization_id.is.null,organization_id.eq.${currentOrg.id}`)
        .order('sort_order', { ascending: true })
        .order('name', { ascending: true })
      if (error) throw error
      return (data ?? []) as AccountingCategory[]
    },
    enabled: !!currentOrg,
    staleTime: 5 * 60_000,
  })
}

/* ── Mutations ──────────────────────────────────────────── */

export function useAccountingCategoryMutations() {
  const { currentOrg } = useOrganization()
  const queryClient = useQueryClient()

  const invalidate = () => {
    queryClient.invalidateQueries({
      queryKey: queryKeys.accounting.categories(currentOrg?.id ?? ''),
    })
  }

  const createCategory = useMutation({
    mutationFn: async (data: Omit<AccountingCategoryInsert, 'organization_id'>) => {
      if (!currentOrg) throw new Error('No organization selected')
      const { error } = await supabase
        .from('accounting_categories')
        .insert({ ...data, organization_id: currentOrg.id } as never)
      if (error) throw error
    },
    onSuccess: invalidate,
  })

  const updateCategory = useMutation({
    mutationFn: async ({
      id,
      ...data
    }: {
      id: string
      label?: string
      icon?: string
      sort_order?: number
    }) => {
      const { error } = await supabase
        .from('accounting_categories')
        .update(data as never)
        .eq('id', id)
      if (error) throw error
    },
    onSuccess: invalidate,
  })

  const deleteCategory = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('accounting_categories').delete().eq('id', id)
      if (error) throw error
    },
    onSuccess: invalidate,
  })

  return { createCategory, updateCategory, deleteCategory }
}
