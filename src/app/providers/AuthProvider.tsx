import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  useRef,
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

  // Counter to cancel stale profile fetches when user changes
  const profileFetchId = useRef(0)

  /* ---- 1. Listen for auth state changes (user/session only) ------- */
  useEffect(() => {
    let mounted = true

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (!mounted) return

      if (import.meta.env.DEV) {
        console.debug('[AuthProvider] onAuthStateChange:', event, {
          hasSession: Boolean(session),
          userId: session?.user?.id ?? null,
        })
      }

      // Only update user/session here — profile is handled separately
      setState((prev) => ({
        user: session?.user ?? null,
        session,
        profile: session?.user ? prev.profile : null,
        isLoading: false,
      }))
    })

    return () => {
      mounted = false
      subscription.unsubscribe()
    }
  }, [])

  /* ---- 2. Fetch profile when user.id changes (decoupled) ---------- */
  useEffect(() => {
    const userId = state.user?.id
    if (!userId) return

    // Increment to invalidate any in-flight fetch from a previous cycle
    const currentFetchId = ++profileFetchId.current

    const fetchWithRetry = async () => {
      const MAX_ATTEMPTS = 3
      const RETRY_DELAY = 800

      for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
        // Bail if a newer fetch cycle started (user changed)
        if (profileFetchId.current !== currentFetchId) return

        const { data, error } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', userId)
          .single()

        if (import.meta.env.DEV) {
          console.debug(`[AuthProvider] fetchProfile attempt ${attempt}/${MAX_ATTEMPTS}:`, {
            userId,
            data: data ? { id: data.id, system_role: (data as Profile).system_role } : null,
            error: error?.message,
          })
        }

        if (data && profileFetchId.current === currentFetchId) {
          setState((prev) => ({ ...prev, profile: data as Profile }))
          return
        }

        if (error) {
          console.error(
            `[AuthProvider] fetchProfile attempt ${attempt}/${MAX_ATTEMPTS}:`,
            error.message,
            error.details,
            error.hint,
          )
        }

        // Wait before retrying (skip delay on last attempt)
        if (attempt < MAX_ATTEMPTS) {
          await new Promise((r) => setTimeout(r, RETRY_DELAY))
        }
      }

      console.error('[AuthProvider] All profile fetch attempts failed for user:', userId)
    }

    fetchWithRetry()

    return () => {
      // Invalidate this fetch cycle on cleanup
      profileFetchId.current++
    }
  }, [state.user?.id])

  /* ---- Auth actions ---------------------------------------------- */
  /* No signUp — users are created by God admins via Supabase dashboard. */

  const signIn = useCallback(async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    return { error }
  }, [])

  const signOut = useCallback(async () => {
    // Optimistically clear local auth state so route guards redirect immediately,
    // even if the network call to revoke tokens fails.
    setState({
      user: null,
      session: null,
      profile: null,
      isLoading: false,
    })

    // Best-effort: clear org selection (avoid cross-user leakage)
    try {
      localStorage.removeItem('piplinepro-org')
    } catch {
      // ignore
    }

    // Prefer local sign-out (reliable offline / avoids global revoke surprises)
    const { error } = await supabase.auth.signOut({ scope: 'local' })

    if (import.meta.env.DEV) {
      console.debug('[AuthProvider] signOut(scope=local):', error ?? 'ok')
    }
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
    const { data } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', state.user.id)
      .single()
    if (data) {
      setState((prev) => ({ ...prev, profile: data as Profile }))
    }
  }, [state.user])

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
