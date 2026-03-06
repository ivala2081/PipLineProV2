import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useOrganization } from '@/app/providers/OrganizationProvider'
import { queryKeys } from '@/lib/queryKeys'

/* ── Types ─────────────────────────────────────────────── */

export interface RolePermission {
  table_name: string
  role: string
  can_select: boolean
  can_insert: boolean
  can_update: boolean
  can_delete: boolean
  is_custom: boolean
}

/* ── Query: fetch all permissions with defaults ────────── */

export function useRolePermissionsQuery() {
  const { currentOrg } = useOrganization()
  const orgId = currentOrg?.id ?? ''

  return useQuery({
    queryKey: queryKeys.security.permissions(orgId),
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_role_permissions_with_defaults', {
        _org_id: orgId,
      })
      if (error) throw error
      return (data as unknown as RolePermission[]) ?? []
    },
    enabled: !!orgId,
  })
}

/* ── Mutation: bulk upsert permissions ─────────────────── */

export function useUpsertRolePermissions() {
  const queryClient = useQueryClient()
  const { currentOrg } = useOrganization()
  const orgId = currentOrg?.id ?? ''

  return useMutation({
    mutationFn: async (permissions: RolePermission[]) => {
      const { error } = await supabase.rpc('upsert_role_permissions', {
        _org_id: orgId,
        _permissions: permissions.map((p) => ({
          table_name: p.table_name,
          role: p.role,
          can_select: p.can_select,
          can_insert: p.can_insert,
          can_update: p.can_update,
          can_delete: p.can_delete,
        })),
      })
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.security.permissions(orgId) })
    },
  })
}
