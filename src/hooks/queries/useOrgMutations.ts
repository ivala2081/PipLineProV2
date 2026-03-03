import { useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/app/providers/AuthProvider'
import { queryKeys } from '@/lib/queryKeys'
import type {
  CreateOrganizationValues,
  UpdateOrganizationValues,
} from '@/schemas/organizationSchema'

export function useCreateOrganization() {
  const { user } = useAuth()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (data: CreateOrganizationValues) => {
      const { data: org, error } = await supabase
        .from('organizations')
        .insert({
          name: data.name,
          slug: data.slug,
          created_by: user?.id ?? null,
        })
        .select()
        .single()

      if (error) throw error
      return org
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.organizations.list() })
    },
  })
}

export function useUpdateOrganization(orgId: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (data: UpdateOrganizationValues) => {
      const updateData: {
        name: string
        is_active: boolean
        base_currency: string
        logo_url?: string | null
      } = {
        name: data.name,
        is_active: data.is_active,
        base_currency: data.base_currency,
      }

      if (data.logo_url !== undefined) {
        updateData.logo_url = data.logo_url
      }

      const { error } = await supabase.from('organizations').update(updateData).eq('id', orgId)

      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.organizations.detail(orgId) })
      queryClient.invalidateQueries({ queryKey: queryKeys.organizations.list() })
    },
  })
}
