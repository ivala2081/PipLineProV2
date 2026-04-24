import { useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { queryKeys } from '@/lib/queryKeys'
import type { OrgMemberRole } from '@/lib/database.types'

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

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL

export function useInviteMember(orgId: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({
      email,
      password,
      role,
      displayName,
      skipEmail,
    }: {
      email: string
      password: string
      role: OrgMemberRole
      displayName?: string
      skipEmail?: boolean
    }) => {
      const {
        data: { session },
      } = await supabase.auth.getSession()
      if (!session) throw new Error('Not authenticated')

      const res = await fetch(`${SUPABASE_URL}/functions/v1/invite-member`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          orgId,
          email,
          role,
          password,
          displayName: displayName || undefined,
          skipEmail: skipEmail || false,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.message || data.error || 'Invite failed')
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.organizations.invitations(orgId) })
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
        .eq('organization_id', orgId)

      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.organizations.invitations(orgId) })
    },
  })
}

export function useSendCredentials(orgId: string) {
  return useMutation({
    mutationFn: async (userId: string) => {
      const {
        data: { session },
      } = await supabase.auth.getSession()
      if (!session) throw new Error('Not authenticated')

      const res = await fetch(`${SUPABASE_URL}/functions/v1/send-credentials`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ userId, orgId }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.message || data.error || 'Failed to send credentials')
      return data
    },
  })
}

export function useGetCredentials() {
  return useMutation({
    mutationFn: async (userId: string) => {
      const {
        data: { session },
      } = await supabase.auth.getSession()
      if (!session) throw new Error('Not authenticated')

      const res = await fetch(`${SUPABASE_URL}/functions/v1/update-credentials`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ action: 'get', userId }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.message || data.error || 'Failed to get credentials')
      return data as {
        success: boolean
        email: string
        createdAt: string
        lastSignInAt: string | null
      }
    },
  })
}

export function useUpdateCredentials() {
  return useMutation({
    mutationFn: async ({
      userId,
      email,
      password,
    }: {
      userId: string
      email?: string
      password?: string
    }) => {
      const {
        data: { session },
      } = await supabase.auth.getSession()
      if (!session) throw new Error('Not authenticated')

      const res = await fetch(`${SUPABASE_URL}/functions/v1/update-credentials`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ action: 'update', userId, email, password }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.message || data.error || 'Failed to update credentials')
      return data
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
