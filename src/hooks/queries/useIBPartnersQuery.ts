import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { supabaseQueryFn } from '@/lib/supabaseRetry'
import { useAuth } from '@/app/providers/AuthProvider'
import { useOrganization } from '@/app/providers/OrganizationProvider'
import { queryKeys } from '@/lib/queryKeys'
import type { IBPartner } from '@/lib/database.types'
import type { IBPartnerFormValues } from '@/schemas/ibSchema'

export function useIBPartnersQuery() {
  const { currentOrg } = useOrganization()
  const orgId = currentOrg?.id ?? ''

  const { data, isLoading, error } = useQuery({
    queryKey: queryKeys.ib.partners(orgId),
    queryFn: supabaseQueryFn<IBPartner[]>(() =>
      supabase.from('ib_partners').select('*').eq('organization_id', currentOrg!.id).order('name'),
    ),
    enabled: !!currentOrg,
    staleTime: 5 * 60_000,
    gcTime: 10 * 60_000,
  })

  return {
    partners: data ?? [],
    isLoading,
    error: error?.message ?? null,
  }
}

export function useIBPartnerMutations() {
  const { user } = useAuth()
  const { currentOrg } = useOrganization()
  const queryClient = useQueryClient()
  const orgId = currentOrg?.id ?? ''

  const invalidate = async () => {
    await queryClient.invalidateQueries({ queryKey: queryKeys.ib.partners(orgId) })
  }

  const createPartner = useMutation({
    mutationFn: async (formData: IBPartnerFormValues) => {
      if (!currentOrg) throw new Error('No organization selected')
      const { error } = await supabase.from('ib_partners').insert({
        organization_id: currentOrg.id,
        name: formData.name.trim(),
        contact_email: formData.contact_email?.trim() || null,
        contact_phone: formData.contact_phone?.trim() || null,
        referral_code: formData.referral_code.trim(),
        agreement_type: formData.agreement_type,
        agreement_details: formData.agreement_details,
        status: formData.status,
        notes: formData.notes?.trim() || null,
        company_name: formData.company_name?.trim() || null,
        website: formData.website?.trim() || null,
        telegram: formData.telegram?.trim() || null,
        whatsapp: formData.whatsapp?.trim() || null,
        instagram: formData.instagram?.trim() || null,
        twitter: formData.twitter?.trim() || null,
        linkedin: formData.linkedin?.trim() || null,
        preferred_payment_method: formData.preferred_payment_method || null,
        iban: formData.iban?.trim() || null,
        crypto_wallet_address: formData.crypto_wallet_address?.trim() || null,
        crypto_network: formData.crypto_network?.trim() || null,
        contract_start_date: formData.contract_start_date || null,
        contract_end_date: formData.contract_end_date || null,
        logo_url: formData.logo_url?.trim() || null,
        created_by: user?.id ?? null,
      })
      if (error) throw error
    },
    onSuccess: invalidate,
  })

  const updatePartner = useMutation({
    mutationFn: async ({ id, data: formData }: { id: string; data: IBPartnerFormValues }) => {
      const { error } = await supabase
        .from('ib_partners')
        .update({
          name: formData.name.trim(),
          contact_email: formData.contact_email?.trim() || null,
          contact_phone: formData.contact_phone?.trim() || null,
          referral_code: formData.referral_code.trim(),
          agreement_type: formData.agreement_type,
          agreement_details: formData.agreement_details,
          status: formData.status,
          notes: formData.notes?.trim() || null,
          company_name: formData.company_name?.trim() || null,
          website: formData.website?.trim() || null,
          telegram: formData.telegram?.trim() || null,
          whatsapp: formData.whatsapp?.trim() || null,
          instagram: formData.instagram?.trim() || null,
          twitter: formData.twitter?.trim() || null,
          linkedin: formData.linkedin?.trim() || null,
          preferred_payment_method: formData.preferred_payment_method || null,
          iban: formData.iban?.trim() || null,
          crypto_wallet_address: formData.crypto_wallet_address?.trim() || null,
          crypto_network: formData.crypto_network?.trim() || null,
          contract_start_date: formData.contract_start_date || null,
          contract_end_date: formData.contract_end_date || null,
          logo_url: formData.logo_url?.trim() || null,
        })
        .eq('id', id)
      if (error) throw error
    },
    onSuccess: invalidate,
  })

  const deletePartner = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('ib_partners').delete().eq('id', id)
      if (error) throw error
    },
    onSuccess: invalidate,
  })

  return {
    createPartner,
    updatePartner,
    deletePartner,
  }
}
