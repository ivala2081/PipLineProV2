import { useCallback, useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useOrganization } from '@/app/providers/OrganizationProvider'
import { useAuth } from '@/app/providers/AuthProvider'
import { queryKeys } from '@/lib/queryKeys'

interface MyPagePerm {
  page: string
  can_access: boolean
}

/**
 * Returns { canAccessPage, isLoading } for page-level permissions.
 * Uses get_my_page_permissions RPC — callable by ALL org members.
 * God always has access. Returns null (indeterminate) while loading
 * so callers can distinguish "loading" from "denied".
 */
export function usePagePermissions() {
  const { isGod } = useAuth()
  const { currentOrg, membership, isLoading: orgLoading } = useOrganization()
  const orgId = currentOrg?.id ?? ''
  const role = membership?.role

  const {
    data: permissions,
    isLoading: queryLoading,
    isFetching,
  } = useQuery({
    queryKey: queryKeys.security.myPagePermissions(orgId),
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_my_page_permissions', {
        _org_id: orgId,
      })
      if (error) throw error
      return data as unknown as MyPagePerm[]
    },
    enabled: !!orgId && !!role && !isGod,
    staleTime: 5 * 60 * 1000,
    retry: 2,
    retryDelay: (attempt) => Math.min(1000 * (attempt + 1), 5000),
  })

  // True loading = org provider still loading OR query actively fetching
  const stillLoading = !isGod && (orgLoading || (!permissions && (queryLoading || isFetching)))

  const permMap = useMemo(() => {
    const map = new Map<string, boolean>()
    if (permissions) {
      for (const p of permissions) {
        map.set(p.page, p.can_access)
      }
    }
    return map
  }, [permissions])

  const canAccessPage = useCallback(
    (pageName: string): boolean | null => {
      if (isGod) return true
      // While loading, return null (indeterminate) — callers decide how to handle
      if (stillLoading) return null
      // After loading: if no permissions or role, deny
      if (!permissions || !role) return false
      const val = permMap.get(`page:${pageName}`)
      // If no permission entry exists, default to true (backwards compat)
      return val ?? true
    },
    [isGod, stillLoading, permissions, role, permMap],
  )

  return { canAccessPage, isLoading: stillLoading }
}

/**
 * Single page permission check hook.
 * hasAccess: true/false after resolved, null while loading.
 */
export function usePagePermission(pageName: string) {
  const { canAccessPage, isLoading } = usePagePermissions()
  const access = canAccessPage(pageName)
  return { hasAccess: access === null ? false : access, isLoading: isLoading || access === null }
}
