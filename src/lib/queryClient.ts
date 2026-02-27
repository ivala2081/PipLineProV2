import { QueryClient } from '@tanstack/react-query'

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes
      gcTime: 1000 * 60 * 10, // 10 minutes (formerly cacheTime)
      retry: 1,
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
