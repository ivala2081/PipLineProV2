import { MutationCache, QueryClient } from '@tanstack/react-query'
import { emitToast } from '@/lib/toastEmitter'

/* ------------------------------------------------------------------ */
/*  Mutation meta type augmentation                                     */
/* ------------------------------------------------------------------ */

declare module '@tanstack/react-query' {
  interface Register {
    mutationMeta: {
      /** When true the global MutationCache onError will NOT show a toast.
       *  Use this for mutations that handle errors inline (e.g. with their own toast). */
      suppressGlobalError?: boolean
    }
  }
}

/* ------------------------------------------------------------------ */
/*  Global mutation error handler via MutationCache                     */
/* ------------------------------------------------------------------ */

const mutationCache = new MutationCache({
  onError: (error, _variables, _context, mutation) => {
    // Let mutations opt-out of the global toast
    if (mutation.meta?.suppressGlobalError) return

    const msg = (error as Error)?.message ?? 'An unexpected error occurred'

    // Rate-limit errors are handled inline by specific dialogs (e.g. PIN verify)
    if (msg.includes('RATE_LIMITED')) return

    emitToast({
      title: 'Error',
      description: msg,
      variant: 'error',
    })
  },
})

/* ------------------------------------------------------------------ */
/*  QueryClient                                                         */
/* ------------------------------------------------------------------ */

export const queryClient = new QueryClient({
  mutationCache,
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 2, // 2 minutes – sensible default; hooks override per data-volatility
      gcTime: 1000 * 60 * 10, // 10 minutes (formerly cacheTime)
      retry: false, // Retries handled by withRetry/supabaseQueryFn per-hook
      refetchOnWindowFocus: false,
      refetchOnReconnect: true,
    },
    mutations: {
      retry: (failureCount, error) => {
        if (failureCount >= 1) return false
        const msg = (error as Error)?.message?.toLowerCase() ?? ''
        // Don't retry auth or validation errors
        if (msg.includes('unauthorized') || msg.includes('forbidden')) return false
        if (msg.includes('validation') || msg.includes('constraint')) return false
        if (msg.includes('rate_limited')) return false
        // Retry network/timeout errors once
        return true
      },
    },
  },
})
