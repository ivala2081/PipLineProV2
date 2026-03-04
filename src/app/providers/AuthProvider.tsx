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
import { getDeviceId } from '@/lib/deviceFingerprinting'
import { queryClient } from '@/lib/queryClient'

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
  /** Force a Supabase session token refresh (e.g. after org switch) */
  refreshToken: () => Promise<void>
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

  // Track the last known system_role to detect role changes
  const previousRoleRef = useRef<string | null>(null)

  // Guard against infinite loops: profile fetch → role change → token refresh → auth state change → profile fetch
  const isRefreshingTokenRef = useRef(false)

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

      // On sign-out: clear all cached data and redirect to login
      if (event === 'SIGNED_OUT') {
        setState({ user: null, session: null, profile: null, isLoading: false })
        queryClient.clear()
        try {
          localStorage.removeItem('piplinepro-org')
        } catch {
          /* ignore */
        }
        window.location.replace('/login')
        return
      }

      // On token refresh: re-sync profile to pick up any role changes
      if (event === 'TOKEN_REFRESHED' && session?.user) {
        supabase
          .from('profiles')
          .select('*')
          .eq('id', session.user.id)
          .single()
          .then(({ data }) => {
            if (data && mounted) {
              setState((prev) => ({ ...prev, profile: data as Profile }))
            }
          })
          .catch(() => {
            /* non-critical */
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
          const profile = data as Profile
          // Seed the previous role ref so refreshProfile() can detect changes
          previousRoleRef.current = profile.system_role
          setState((prev) => ({ ...prev, profile }))
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
      profileFetchId.current++
    }
  }, [state.user?.id])

  /* ---- Auth actions ---------------------------------------------- */
  /* No signUp — users are created by God admins via Supabase dashboard. */

  const signIn = useCallback(async (email: string, password: string) => {
    const deviceId = getDeviceId()

    // Server-side rate limiting — check DB-tracked failed attempts before auth
    try {
      const { data: isRateLimited } = await supabase.rpc(
        'should_rate_limit_device' as never,
        { p_device_id: deviceId, p_max_attempts: 5, p_minutes: 15 } as never,
      )
      if (isRateLimited) {
        return {
          error: { message: 'rate_limited', status: 429 } as unknown as AuthError,
        }
      }
    } catch {
      // Don't block login if rate-limit check itself fails
    }

    const { data, error } = await supabase.auth.signInWithPassword({ email, password })

    // Log login attempt (fire and forget)
    try {
      const userId = data?.user?.id || null
      await supabase.rpc('log_login_attempt', {
        p_user_id: userId,
        p_device_id: deviceId,
        p_ip_address: null, // IP tracking would need server-side implementation
        p_success: !error,
        p_error_message: error?.message || null,
      })
    } catch (logError) {
      // Don't fail login if logging fails
      console.warn('[AuthProvider] Failed to log login attempt:', logError)
    }

    // On successful login, clear session-only flag (handled in login page)
    if (!error && data?.session) {
      if (import.meta.env.DEV) {
        console.debug('[AuthProvider] Login successful, session established')
      }
    }

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
    try {
      const { data } = await supabase.from('profiles').select('*').eq('id', state.user.id).single()
      if (data) {
        const newProfile = data as Profile
        const oldRole = previousRoleRef.current
        const newRole = newProfile.system_role

        setState((prev) => ({ ...prev, profile: newProfile }))
        previousRoleRef.current = newRole

        // If the system_role changed since last fetch, rotate the session token
        // so the JWT's custom claim (`user_role`) reflects the new role immediately.
        if (oldRole !== null && oldRole !== newRole && !isRefreshingTokenRef.current) {
          if (import.meta.env.DEV) {
            console.debug(
              '[AuthProvider] Role changed from',
              oldRole,
              'to',
              newRole,
              '— refreshing session token',
            )
          }
          isRefreshingTokenRef.current = true
          try {
            await supabase.auth.refreshSession()
          } catch (refreshErr) {
            console.error('[AuthProvider] Token refresh after role change failed:', refreshErr)
          } finally {
            isRefreshingTokenRef.current = false
          }
        }
      }
    } catch (err) {
      console.error('[AuthProvider] refreshProfile failed:', err)
    }
  }, [state.user])

  /** Force a Supabase session token refresh (e.g. after org switch). */
  const refreshToken = useCallback(async () => {
    if (isRefreshingTokenRef.current) return
    isRefreshingTokenRef.current = true
    try {
      if (import.meta.env.DEV) {
        console.debug('[AuthProvider] Forcing session token refresh')
      }
      await supabase.auth.refreshSession()
    } catch (err) {
      console.error('[AuthProvider] refreshToken failed:', err)
    } finally {
      isRefreshingTokenRef.current = false
    }
  }, [])

  /* ---- Render ---------------------------------------------------- */

  const value: AuthContextValue = {
    ...state,
    isGod: state.profile?.system_role === 'god',
    signIn,
    signOut,
    resetPassword,
    updatePassword,
    refreshProfile,
    refreshToken,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

/* ------------------------------------------------------------------ */
/*  Hook                                                               */
/* ------------------------------------------------------------------ */

// eslint-disable-next-line react-refresh/only-export-components -- AuthProvider exports provider + hook
export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
