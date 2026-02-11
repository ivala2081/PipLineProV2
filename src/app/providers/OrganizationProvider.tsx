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

interface OrganizationContextValue extends OrganizationState {
  /** Switch to a different organization by ID */
  selectOrg: (orgId: string) => void
  /** Re-fetch organizations from the database */
  refreshOrgs: () => Promise<void>
}

/* ------------------------------------------------------------------ */
/*  Constants                                                          */
/* ------------------------------------------------------------------ */

const STORAGE_KEY = 'piplinepro-org'

/* ------------------------------------------------------------------ */
/*  Context                                                            */
/* ------------------------------------------------------------------ */

const OrganizationContext = createContext<OrganizationContextValue | undefined>(undefined)

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
      const { data } = await supabase
        .from('organizations')
        .select('*')
        .order('name')
      orgs = (data ?? []) as Organization[]
    } else {
      // Normal users see only their orgs via the join table
      const { data } = await supabase
        .from('organization_members')
        .select('organization:organizations(*)')
        .eq('user_id', currentUser.id)

      orgs = ((data ?? [])
        .map((row) => (row as unknown as { organization: Organization }).organization)
        .filter(Boolean)) as Organization[]
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
      const org = state.organizations.find((o) => o.id === orgId)
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
    [state.organizations],
  )

  const refreshOrgs = useCallback(async () => {
    await fetchOrgs()
  }, [fetchOrgs])

  /* ---- Render --------------------------------------------------- */

  const value: OrganizationContextValue = {
    ...state,
    selectOrg,
    refreshOrgs,
  }

  return <OrganizationContext.Provider value={value}>{children}</OrganizationContext.Provider>
}

/* ------------------------------------------------------------------ */
/*  Hook                                                               */
/* ------------------------------------------------------------------ */

export function useOrganization() {
  const context = useContext(OrganizationContext)
  if (context === undefined) {
    throw new Error('useOrganization must be used within an OrganizationProvider')
  }
  return context
}
