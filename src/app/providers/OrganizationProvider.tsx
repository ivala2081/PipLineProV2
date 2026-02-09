import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
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

  /* ---- Fetch organizations -------------------------------------- */
  const fetchOrgs = useCallback(async () => {
    if (!user) {
      setState({ currentOrg: null, organizations: [], membership: null, isLoading: false })
      return
    }

    let orgs: Organization[] = []

    if (isGod) {
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
        .eq('user_id', user.id)

      orgs = ((data ?? [])
        .map((row) => (row as unknown as { organization: Organization }).organization)
        .filter(Boolean)) as Organization[]
    }

    // Restore previously selected org from localStorage
    const savedOrgId = localStorage.getItem(STORAGE_KEY)
    const savedOrg = orgs.find((o) => o.id === savedOrgId)
    const currentOrg = savedOrg ?? orgs[0] ?? null

    // Fetch membership for selected org (null for gods without membership)
    let membership: OrganizationMember | null = null
    if (currentOrg && !isGod) {
      const { data } = await supabase
        .from('organization_members')
        .select('*')
        .eq('organization_id', currentOrg.id)
        .eq('user_id', user.id)
        .single()
      membership = data as OrganizationMember | null
    }

    if (currentOrg) {
      localStorage.setItem(STORAGE_KEY, currentOrg.id)
    }

    setState({ currentOrg, organizations: orgs, membership, isLoading: false })
  }, [user, isGod])

  /* ---- Load orgs when auth is ready ----------------------------- */
  useEffect(() => {
    if (authLoading) return
    fetchOrgs()
  }, [authLoading, fetchOrgs])

  /* ---- Select a different org ----------------------------------- */
  const selectOrg = useCallback(
    (orgId: string) => {
      const org = state.organizations.find((o) => o.id === orgId)
      if (!org) return

      localStorage.setItem(STORAGE_KEY, orgId)

      // Fetch membership for the new org
      if (user && !isGod) {
        supabase
          .from('organization_members')
          .select('*')
          .eq('organization_id', orgId)
          .eq('user_id', user.id)
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
    [state.organizations, user, isGod],
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
