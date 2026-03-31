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
 * Client-side fallback defaults matching the SQL default_permission() function.
 * Used when the RPC hasn't loaded yet or fails, so the sidebar is never empty.
 * This mirrors the old hardcoded roles behavior before the permission system.
 */
const PAGE_DEFAULTS: Record<string, string[]> = {
  dashboard: ['admin', 'manager', 'operation', 'ik'],
  members: ['admin', 'manager', 'operation', 'ik'],
  ai: ['admin', 'manager', 'operation', 'ik'],
  transfers: ['admin', 'manager', 'operation', 'ik'],
  'transfer-fix': ['admin', 'manager'],
  trash: ['admin', 'manager'],
  accounting: ['admin', 'manager', 'ik'],
  psps: ['admin'],
  hr: ['admin', 'ik'],
  organizations: ['admin'],
  security: ['admin', 'manager'],
  audit: ['admin', 'manager'],
}

/**
 * Returns { canAccessPage, isLoading } for page-level permissions.
 * Uses get_my_page_permissions RPC — callable by ALL org members.
 * God always has access. Falls back to client-side defaults when RPC
 * hasn't loaded yet, so the sidebar is never blank.
 */
export function usePagePermissions() {
  const { isGod } = useAuth()
  const { currentOrg, membership, isLoading: orgLoading } = useOrganization()
  const orgId = currentOrg?.id ?? ''
  const role = membership?.role

  const { data: permissions } = useQuery({
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

  // True loading = org provider still loading (don't know role yet)
  const stillLoading = !isGod && orgLoading

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

      // Org provider still loading — show skeleton
      if (stillLoading) return null

      // RPC loaded — use server permissions
      if (permissions && role) {
        const val = permMap.get(`page:${pageName}`)
        // If no permission entry exists for this page, allow (backwards compat)
        return val ?? true
      }

      // Fallback: RPC not loaded yet (role undefined, query disabled, or error).
      // Use client-side defaults so the sidebar is never empty.
      if (role) {
        const allowed = PAGE_DEFAULTS[pageName]
        return allowed ? allowed.includes(role) : true
      }

      // No role at all (membership failed) — allow basic pages to avoid blank sidebar
      const basicPages = PAGE_DEFAULTS[pageName]
      return basicPages ? basicPages.length === 4 : false // only show "all roles" pages
    },
    [isGod, stillLoading, permissions, role, permMap],
  )

  return { canAccessPage, isLoading: stillLoading }
}

/**
 * Single page permission check hook.
 * hasAccess: true/false after resolved, null while org is loading.
 */
export function usePagePermission(pageName: string) {
  const { canAccessPage, isLoading } = usePagePermissions()
  const access = canAccessPage(pageName)
  return { hasAccess: access === null ? false : access, isLoading: isLoading || access === null }
}
