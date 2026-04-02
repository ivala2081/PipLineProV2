import { useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/app/providers/AuthProvider'
import { useOrganization } from '@/app/providers/OrganizationProvider'
import { queryKeys } from '@/lib/queryKeys'

/**
 * Creates an automatic accounting entry linked to an HR payment or IB payment.
 * Used as an onSuccess callback after salary/bonus/IB payment mutations.
 *
 * Idempotency: checks if an entry with the same source_type+source_id already exists.
 */

export interface AutoEntryInput {
  sourceType: 'hr_salary' | 'hr_bonus' | 'ib_payment' | 'psp_transfer'
  sourceId: string
  description: string
  payee: string
  amount: number
  currency: string
  registerName: string
  registerId?: string
  categoryName: string
  costPeriod: string
  entryDate: string
  direction?: 'in' | 'out'
}

export function useAutoAccountingEntry() {
  const { currentOrg } = useOrganization()
  const { user } = useAuth()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (input: AutoEntryInput) => {
      if (!currentOrg || !user) throw new Error('No organization selected')

      // Idempotency guard: check if entry already exists
      const { data: existing } = await supabase
        .from('accounting_entries')
        .select('id')
        .eq('organization_id', currentOrg.id)
        .eq('source_type', input.sourceType)
        .eq('source_id', input.sourceId)
        .limit(1)

      if (existing && existing.length > 0) {
        return // Already exists, skip
      }

      // Find category by name
      let categoryId: string | null = null
      const { data: cats } = await supabase
        .from('accounting_categories')
        .select('id')
        .eq('name', input.categoryName)
        .or(`organization_id.is.null,organization_id.eq.${currentOrg.id}`)
        .limit(1)
      if (cats && cats.length > 0) {
        categoryId = cats[0].id
      }

      // Find register by name if registerId not provided
      let registerId = input.registerId ?? null
      if (!registerId) {
        const { data: regs } = await supabase
          .from('accounting_registers')
          .select('id')
          .eq('organization_id', currentOrg.id)
          .eq('name', input.registerName)
          .limit(1)
        if (regs && regs.length > 0) {
          registerId = regs[0].id
        }
      }

      const { error } = await supabase.from('accounting_entries').insert({
        organization_id: currentOrg.id,
        description: input.description,
        entry_type: 'ODEME',
        direction: input.direction ?? 'out',
        amount: input.amount,
        currency: input.currency,
        register: input.registerName,
        register_id: registerId,
        category_id: categoryId,
        payee: input.payee,
        cost_period: input.costPeriod,
        entry_date: input.entryDate,
        source_type: input.sourceType,
        source_id: input.sourceId,
        created_by: user.id,
      } as never)
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.accounting.lists() })
      queryClient.invalidateQueries({
        queryKey: queryKeys.accounting.summary(currentOrg?.id ?? ''),
      })
    },
  })
}
