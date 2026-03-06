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
 * God always has access. Denies access while loading (secure default).
 */
export function usePagePermissions() {
  const { isGod } = useAuth()
  const { currentOrg, membership } = useOrganization()
  const orgId = currentOrg?.id ?? ''
  const role = membership?.role

  const { data: permissions, isLoading } = useQuery({
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
  })

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
    (pageName: string): boolean => {
      if (isGod) return true
      // While loading, deny access (PageGuard will show spinner)
      if (!permissions || !role) return false
      const val = permMap.get(`page:${pageName}`)
      // If no permission entry exists, default to true (backwards compat)
      return val ?? true
    },
    [isGod, permissions, role, permMap],
  )

  return { canAccessPage, isLoading: !isGod && isLoading }
}

/**
 * Single page permission check hook.
 */
export function usePagePermission(pageName: string) {
  const { canAccessPage, isLoading } = usePagePermissions()
  return { hasAccess: canAccessPage(pageName), isLoading }
}
