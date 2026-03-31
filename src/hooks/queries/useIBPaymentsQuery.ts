import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/app/providers/AuthProvider'
import { useOrganization } from '@/app/providers/OrganizationProvider'
import { queryKeys } from '@/lib/queryKeys'
import type { IBPayment } from '@/lib/database.types'
import type { IBPaymentFormValues } from '@/schemas/ibSchema'

export type IBPaymentWithPartner = IBPayment & {
  ib_partner: { name: string } | null
}

export function useIBPaymentsQuery() {
  const { currentOrg } = useOrganization()
  const orgId = currentOrg?.id ?? ''

  const { data, isLoading, error } = useQuery({
    queryKey: queryKeys.ib.payments(orgId),
    queryFn: async () => {
      if (!currentOrg) throw new Error('No organization selected')
      const { data, error } = await supabase
        .from('ib_payments')
        .select('*, ib_partner:ib_partners!ib_partner_id(name)')
        .eq('organization_id', currentOrg.id)
        .order('payment_date', { ascending: false })
      if (error) throw error
      return (data as unknown as IBPaymentWithPartner[]) ?? []
    },
    enabled: !!currentOrg,
    staleTime: 5 * 60_000,
    gcTime: 10 * 60_000,
  })

  return {
    payments: data ?? [],
    isLoading,
    error: error?.message ?? null,
  }
}

export function useIBPaymentMutations() {
  const { user } = useAuth()
  const { currentOrg } = useOrganization()
  const queryClient = useQueryClient()
  const orgId = currentOrg?.id ?? ''

  const invalidate = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: queryKeys.ib.payments(orgId) }),
      queryClient.invalidateQueries({ queryKey: queryKeys.ib.commissions(orgId) }),
      queryClient.invalidateQueries({ queryKey: queryKeys.accounting.all }),
    ])
  }

  const createPayment = useMutation({
    mutationFn: async (formData: IBPaymentFormValues) => {
      if (!currentOrg) throw new Error('No organization selected')

      const { error } = await supabase.from('ib_payments').insert({
        organization_id: currentOrg.id,
        ib_partner_id: formData.ib_partner_id,
        ib_commission_id: formData.ib_commission_id || null,
        amount: formData.amount,
        currency: formData.currency,
        register: formData.register,
        payment_method: formData.payment_method?.trim() || null,
        reference: formData.reference?.trim() || null,
        payment_date: formData.payment_date,
        description: formData.description?.trim() || null,
        notes: formData.notes?.trim() || null,
        created_by: user?.id ?? null,
      })
      if (error) throw error

      // If linked to a commission, mark it as paid
      if (formData.ib_commission_id) {
        await supabase
          .from('ib_commissions')
          .update({ status: 'paid' })
          .eq('id', formData.ib_commission_id)
      }
    },
    onSuccess: invalidate,
  })

  return {
    createPayment,
  }
}
