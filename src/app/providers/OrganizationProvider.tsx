import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  useRef,
  type ReactNode,
} from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/app/providers/AuthProvider'
import type { Organization, OrganizationMember } from '@/lib/database.types'

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface OrganizationState {
  currentOrg: Organization | null
  organizations: Organization[]
  membership: OrganizationMember | null
  isLoading: boolean
}

type OrganizationDataContextValue = OrganizationState

interface OrganizationActionsContextValue {
  selectOrg: (orgId: string) => void
  refreshOrgs: () => Promise<void>
}

/* ------------------------------------------------------------------ */
/*  Constants                                                          */
/* ------------------------------------------------------------------ */

const STORAGE_KEY = 'piplinepro-org'

/* ------------------------------------------------------------------ */
/*  Contexts                                                           */
/* ------------------------------------------------------------------ */

const OrganizationDataContext = createContext<OrganizationDataContextValue | undefined>(undefined)
const OrganizationActionsContext = createContext<OrganizationActionsContextValue | undefined>(
  undefined,
)

/* ------------------------------------------------------------------ */
/*  Provider                                                           */
/* ------------------------------------------------------------------ */

export function OrganizationProvider({ children }: { children: ReactNode }) {
  const { user, isGod, isLoading: authLoading } = useAuth()

  const [state, setState] = useState<OrganizationState>({
    currentOrg: null,
    organizations: [],
    membership: null,
    isLoading: true,
  })

  // Race condition protection — cancel stale fetches when deps change
  const fetchIdRef = useRef(0)

  // Keep latest values accessible inside callbacks without causing re-renders
  const userRef = useRef(user)
  userRef.current = user

  const isGodRef = useRef(isGod)
  isGodRef.current = isGod

  // Ref for orgs so selectOrg stays stable
  const orgsRef = useRef(state.organizations)
  orgsRef.current = state.organizations

  /* ---- Fetch organizations -------------------------------------- */
  const fetchOrgs = useCallback(async () => {
    const currentUser = userRef.current
    const currentIsGod = isGodRef.current

    if (!currentUser) {
      setState({ currentOrg: null, organizations: [], membership: null, isLoading: false })
      return
    }

    // Increment to invalidate any in-flight fetch from a previous cycle
    const currentFetchId = ++fetchIdRef.current

    let orgs: Organization[] = []

    if (currentIsGod) {
      // Gods can see all organizations
      const { data } = await supabase.from('organizations').select('*').order('name')
      orgs = (data ?? []) as Organization[]
    } else {
      // Fetch memberships with role info
      const { data: memberRows } = await supabase
        .from('organization_members')
        .select('role, organization:organizations(*)')
        .eq('user_id', currentUser.id)

      const isAnyAdmin = memberRows?.some((r) => r.role === 'admin') ?? false

      if (isAnyAdmin) {
        // Admins see all organizations
        const { data } = await supabase.from('organizations').select('*').order('name')
        orgs = (data ?? []) as Organization[]
      } else {
        // Managers and operation users see only their own orgs
        orgs = (memberRows ?? [])
          .map((row) => (row as unknown as { organization: Organization }).organization)
          .filter(Boolean) as Organization[]
      }
    }

    // Bail if a newer fetch cycle started
    if (fetchIdRef.current !== currentFetchId) return

    // Restore previously selected org from localStorage
    const savedOrgId = localStorage.getItem(STORAGE_KEY)
    const savedOrg = orgs.find((o) => o.id === savedOrgId)
    const currentOrg = savedOrg ?? orgs[0] ?? null

    // Fetch membership for selected org (null for gods without membership)
    let membership: OrganizationMember | null = null
    if (currentOrg && !currentIsGod) {
      const { data } = await supabase
        .from('organization_members')
        .select('*')
        .eq('organization_id', currentOrg.id)
        .eq('user_id', currentUser.id)
        .single()
      membership = data as OrganizationMember | null
    }

    // Bail if a newer fetch cycle started (check again after second async op)
    if (fetchIdRef.current !== currentFetchId) return

    if (currentOrg) {
      localStorage.setItem(STORAGE_KEY, currentOrg.id)
    }

    setState({ currentOrg, organizations: orgs, membership, isLoading: false })
  }, []) // No deps — reads from refs to avoid stale closures

  /* ---- Load orgs when auth is ready ----------------------------- */
  useEffect(() => {
    if (authLoading) return

    if (!user) {
      // Explicit sign-out: clear state and cancel any in-flight fetches
      fetchIdRef.current++
      setState({ currentOrg: null, organizations: [], membership: null, isLoading: false })
      return
    }

    fetchOrgs()

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authLoading, user?.id, isGod])
  //    ^^^^^^^^     ^^^^^^^^  ^^^^^
  //    Tracks user identity (not object ref) and god status.
  //    This avoids re-fetching on every Supabase token refresh
  //    which creates a new user object reference.

  /* ---- Select a different org ----------------------------------- */
  const selectOrg = useCallback(
    (orgId: string) => {
      const org = orgsRef.current.find((o) => o.id === orgId)
      if (!org) return

      localStorage.setItem(STORAGE_KEY, orgId)

      const currentUser = userRef.current
      const currentIsGod = isGodRef.current

      // Fetch membership for the new org
      if (currentUser && !currentIsGod) {
        supabase
          .from('organization_members')
          .select('*')
          .eq('organization_id', orgId)
          .eq('user_id', currentUser.id)
          .single()
          .then(({ data }) => {
            setState((prev) => ({
              ...prev,
              currentOrg: org,
              membership: data as OrganizationMember | null,
            }))
          })
      } else {
        setState((prev) => ({ ...prev, currentOrg: org, membership: null }))
      }
    },
    [], // Stable — reads from orgsRef
  )

  const refreshOrgs = useCallback(async () => {
    await fetchOrgs()
  }, [fetchOrgs])

  /* ---- Render --------------------------------------------------- */

  const actions: OrganizationActionsContextValue = {
    selectOrg,
    refreshOrgs,
  }

  return (
    <OrganizationDataContext.Provider value={state}>
      <OrganizationActionsContext.Provider value={actions}>
        {children}
      </OrganizationActionsContext.Provider>
    </OrganizationDataContext.Provider>
  )
}

/* ------------------------------------------------------------------ */
/*  Hooks                                                              */
/* ------------------------------------------------------------------ */

// eslint-disable-next-line react-refresh/only-export-components -- OrganizationProvider exports provider + hooks
export function useOrgData() {
  const context = useContext(OrganizationDataContext)
  if (context === undefined) {
    throw new Error('useOrgData must be used within an OrganizationProvider')
  }
  return context
}

// eslint-disable-next-line react-refresh/only-export-components
export function useOrgActions() {
  const context = useContext(OrganizationActionsContext)
  if (context === undefined) {
    throw new Error('useOrgActions must be used within an OrganizationProvider')
  }
  return context
}

/** Backward-compatible hook — returns both data and actions */
// eslint-disable-next-line react-refresh/only-export-components
export function useOrganization() {
  return { ...useOrgData(), ...useOrgActions() }
}
