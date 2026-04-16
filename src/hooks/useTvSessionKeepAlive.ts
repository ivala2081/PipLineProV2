import { useEffect } from 'react'
import { supabase } from '@/lib/supabase'

/**
 * Keeps the Supabase auth session alive for 24/7 TV displays.
 * Refreshes the token every 30 minutes to prevent expiry.
 */
export function useTvSessionKeepAlive() {
  useEffect(() => {
    const interval = setInterval(
      async () => {
        await supabase.auth.refreshSession()
      },
      30 * 60 * 1000,
    )

    return () => clearInterval(interval)
  }, [])
}
