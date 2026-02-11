import { useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { queryKeys } from '@/lib/queryKeys'
import type { OrgMemberRole } from '@/lib/database.types'

export function useAddMember(orgId: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({
      email,
      password,
      role,
      display_name,
    }: {
      email: string
      password: string
      role: OrgMemberRole
      display_name?: string
    }) => {
      const { data, error } = await supabase.rpc('add_organization_member', {
        _org_id: orgId,
        _email: email,
        _password: password,
        _role: role,
        _display_name: display_name ?? null,
      })

      if (error) throw error
      return data as { user_id: string; created: boolean }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.organizations.members(orgId) })
      queryClient.invalidateQueries({ queryKey: queryKeys.organizations.list() })
    },
  })
}

export function useUpdateMemberRole(orgId: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ userId, role }: { userId: string; role: OrgMemberRole }) => {
      const { error } = await supabase
        .from('organization_members')
        .update({ role })
        .eq('organization_id', orgId)
        .eq('user_id', userId)

      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.organizations.members(orgId) })
    },
  })
}

export function useRemoveMember(orgId: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (userId: string) => {
      const { error } = await supabase
        .from('organization_members')
        .delete()
        .eq('organization_id', orgId)
        .eq('user_id', userId)

      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.organizations.members(orgId) })
      queryClient.invalidateQueries({ queryKey: queryKeys.organizations.list() })
    },
  })
}
