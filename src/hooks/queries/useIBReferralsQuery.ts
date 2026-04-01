import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/app/providers/AuthProvider'
import { useOrganization } from '@/app/providers/OrganizationProvider'
import { queryKeys } from '@/lib/queryKeys'
import type { IBReferral } from '@/lib/database.types'
import type { IBReferralFormValues } from '@/schemas/ibSchema'

export type IBReferralWithPartner = IBReferral & {
  ib_partner: { name: string } | null
}

export function useIBReferralsQuery() {
  const { currentOrg } = useOrganization()
  const orgId = currentOrg?.id ?? ''

  const { data, isLoading, error } = useQuery({
    queryKey: queryKeys.ib.referrals(orgId),
    queryFn: async () => {
      if (!currentOrg) throw new Error('No organization selected')
      const { data, error } = await supabase
        .from('ib_referrals')
        .select('*, ib_partner:ib_partners!ib_partner_id(name)')
        .eq('organization_id', currentOrg.id)
        .order('created_at', { ascending: false })
      if (error) throw error
      return (data as unknown as IBReferralWithPartner[]) ?? []
    },
    enabled: !!currentOrg,
    staleTime: 5 * 60_000,
    gcTime: 10 * 60_000,
  })

  return {
    referrals: data ?? [],
    isLoading,
    error: error?.message ?? null,
  }
}

export function useIBReferralMutations() {
  const { user } = useAuth()
  const { currentOrg } = useOrganization()
  const queryClient = useQueryClient()
  const orgId = currentOrg?.id ?? ''

  const invalidate = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: queryKeys.ib.referrals(orgId) }),
      queryClient.invalidateQueries({ queryKey: queryKeys.ib.partners(orgId) }),
    ])
  }

  const createReferral = useMutation({
    mutationFn: async (formData: IBReferralFormValues) => {
      if (!currentOrg) throw new Error('No organization selected')
      const { error } = await supabase.from('ib_referrals').insert({
        organization_id: currentOrg.id,
        ib_partner_id: formData.ib_partner_id,
        client_name: formData.client_name.trim(),
        ftd_date: formData.ftd_date || null,
        ftd_amount: formData.ftd_amount ?? null,
        is_ftd: formData.is_ftd,
        lots_traded: formData.lots_traded,
        status: formData.status,
        notes: formData.notes?.trim() || null,
        created_by: user?.id ?? null,
      })
      if (error) throw error
    },
    onSuccess: invalidate,
  })

  const updateReferral = useMutation({
    mutationFn: async ({ id, data: formData }: { id: string; data: IBReferralFormValues }) => {
      const { error } = await supabase
        .from('ib_referrals')
        .update({
          ib_partner_id: formData.ib_partner_id,
          client_name: formData.client_name.trim(),
          ftd_date: formData.ftd_date || null,
          ftd_amount: formData.ftd_amount ?? null,
          is_ftd: formData.is_ftd,
          lots_traded: formData.lots_traded,
          status: formData.status,
          notes: formData.notes?.trim() || null,
        })
        .eq('id', id)
      if (error) throw error
    },
    onSuccess: invalidate,
  })

  const deleteReferral = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('ib_referrals').delete().eq('id', id)
      if (error) throw error
    },
    onSuccess: invalidate,
  })

  const updateLots = useMutation({
    mutationFn: async ({ id, lots }: { id: string; lots: number }) => {
      const { error } = await supabase
        .from('ib_referrals')
        .update({ lots_traded: lots })
        .eq('id', id)
      if (error) throw error
    },
    onSuccess: invalidate,
  })

  return {
    createReferral,
    updateReferral,
    deleteReferral,
    updateLots,
  }
}
