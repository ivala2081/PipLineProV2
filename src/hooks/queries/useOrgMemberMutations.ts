import { useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { queryKeys } from '@/lib/queryKeys'
import type { OrgMemberRole } from '@/lib/database.types'

export function useInviteMember(orgId: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({
      email,
      role,
      password,
      displayName,
    }: {
      email: string
      role: OrgMemberRole
      password: string
      displayName?: string
    }) => {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) throw new Error('Not authenticated')

      const { data, error } = await supabase.functions.invoke('invite-member', {
        body: { orgId, email, role, password, displayName },
        headers: { Authorization: `Bearer ${session.access_token}` },
      })

      if (error) throw error

      if (data?.error) {
        throw new Error(data.message || data.error)
      }

      return data as { success: boolean; userAlreadyExisted: boolean; emailSent: boolean }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.organizations.invitations(orgId) })
      queryClient.invalidateQueries({ queryKey: queryKeys.organizations.members(orgId) })
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

export function useRevokeInvitation(orgId: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (invitationId: string) => {
      const { error } = await supabase
        .from('organization_invitations')
        .delete()
        .eq('id', invitationId)

      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.organizations.invitations(orgId) })
    },
  })
}
