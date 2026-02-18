import { useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase, supabaseAdmin } from '@/lib/supabase'
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
      if (!supabaseAdmin) {
        throw new Error('Missing VITE_SUPABASE_SERVICE_ROLE_KEY environment variable')
      }

      // 1. Create auth user via GoTrue Admin API
      const { data: userData, error: createError } = await supabaseAdmin.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: display_name ? { full_name: display_name } : {},
      })

      if (createError) {
        // If user already exists, look them up instead
        if (createError.message?.includes('already been registered')) {
          const { data: existing } = await supabaseAdmin.auth.admin.listUsers()
          const existingUser = existing?.users?.find(
            (u) => u.email?.toLowerCase() === email.toLowerCase(),
          )
          if (!existingUser) throw createError

          // Add existing user to org
          const { error: memberError } = await supabase
            .from('organization_members')
            .insert({ organization_id: orgId, user_id: existingUser.id, role })

          if (memberError) throw memberError
          return { user_id: existingUser.id, created: false }
        }
        throw createError
      }

      // 2. Add user to organization via normal client (RLS-protected)
      const { error: memberError } = await supabase.from('organization_members').insert({
        organization_id: orgId,
        user_id: userData.user.id,
        role,
      })

      if (memberError) throw memberError
      return { user_id: userData.user.id, created: true }
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

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY

export function useInviteMember(orgId: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({
      email,
      password,
      role,
      displayName,
    }: {
      email: string
      password: string
      role: OrgMemberRole
      displayName?: string
    }) => {
      const res = await fetch(`${SUPABASE_URL}/functions/v1/invite-member`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
        },
        body: JSON.stringify({
          orgId,
          email,
          role,
          password,
          displayName: displayName || undefined,
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
