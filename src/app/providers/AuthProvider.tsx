import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  type ReactNode,
} from 'react'
import type { User, Session, AuthError } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase'
import type { Profile } from '@/lib/database.types'

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface AuthState {
  user: User | null
  session: Session | null
  profile: Profile | null
  isLoading: boolean
}

interface AuthContextValue extends AuthState {
  /** True when the user has the 'god' system role */
  isGod: boolean
  signIn: (email: string, password: string) => Promise<{ error: AuthError | null }>
  signOut: () => Promise<{ error: AuthError | null }>
  resetPassword: (email: string) => Promise<{ error: AuthError | null }>
  /** Set a new password (used after password reset flow) */
  updatePassword: (password: string) => Promise<{ error: AuthError | null }>
  /** Re-fetch the profile from the database (e.g. after role change) */
  refreshProfile: () => Promise<void>
}

/* ------------------------------------------------------------------ */
/*  Context                                                            */
/* ------------------------------------------------------------------ */

const AuthContext = createContext<AuthContextValue | undefined>(undefined)

/* ------------------------------------------------------------------ */
/*  Provider                                                           */
/* ------------------------------------------------------------------ */

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>({
    user: null,
    session: null,
    profile: null,
    isLoading: true,
  })

  /* ---- Fetch profile from profiles table -------------------------- */
  const fetchProfile = useCallback(async (userId: string) => {
    const { data } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single()
    return data as Profile | null
  }, [])

  /* ---- Bootstrap: get current session + listen for changes -------- */
  useEffect(() => {
    let mounted = true

    // Listen for auth state changes — the INITIAL_SESSION event fires
    // almost immediately with the session from localStorage (no network).
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (_event, session) => {
      if (!mounted) return

      // Unblock the UI immediately — don't wait for profile fetch
      setState((prev) => ({
        user: session?.user ?? null,
        session,
        profile: prev.profile,
        isLoading: false,
      }))

      // Fetch profile in the background
      if (session?.user) {
        try {
          const profile = await fetchProfile(session.user.id)
          if (mounted) {
            setState((prev) => ({ ...prev, profile }))
          }
        } catch {
          // Profile fetch failed — continue without it
        }
      } else {
        setState((prev) => ({ ...prev, profile: null }))
      }
    })

    return () => {
      mounted = false
      subscription.unsubscribe()
    }
  }, [fetchProfile])

  /* ---- Auth actions ---------------------------------------------- */
  /* No signUp — users are created by God admins via Supabase dashboard. */

  const signIn = useCallback(async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    return { error }
  }, [])

  const signOut = useCallback(async () => {
    const { error } = await supabase.auth.signOut()
    return { error }
  }, [])

  const resetPassword = useCallback(async (email: string) => {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    })
    return { error }
  }, [])

  const updatePassword = useCallback(async (password: string) => {
    const { error } = await supabase.auth.updateUser({ password })
    return { error }
  }, [])

  const refreshProfile = useCallback(async () => {
    if (!state.user) return
    const profile = await fetchProfile(state.user.id)
    setState((prev) => ({ ...prev, profile }))
  }, [state.user, fetchProfile])

  /* ---- Render ---------------------------------------------------- */

  const value: AuthContextValue = {
    ...state,
    isGod: state.profile?.system_role === 'god',
    signIn,
    signOut,
    resetPassword,
    updatePassword,
    refreshProfile,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

/* ------------------------------------------------------------------ */
/*  Hook                                                               */
/* ------------------------------------------------------------------ */

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
