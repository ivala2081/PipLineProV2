import { useEffect, useRef } from 'react'
import { useMutationState } from '@tanstack/react-query'
import { useToast } from '@/hooks/useToast'

/**
 * Global mutation error handler.
 * Watches all mutation failures and shows error toasts.
 */
export function useMutationErrorHandler() {
  const { toast } = useToast()
  const seenIds = useRef(new Set<string>())

  const failures = useMutationState({
    filters: { status: 'error' },
    select: (m) => ({
      id: m.mutationId.toString(),
      error: m.state.error as Error | null,
    }),
  })

  useEffect(() => {
    for (const f of failures) {
      if (!f.error || seenIds.current.has(f.id)) continue
      seenIds.current.add(f.id)

      const msg = f.error.message ?? 'An unexpected error occurred'
      // Skip rate limit errors (handled inline by specific dialogs)
      if (msg.includes('RATE_LIMITED')) continue

      toast({
        title: 'Error',
        description: msg,
        variant: 'error',
      })
    }
  }, [failures, toast])
}
