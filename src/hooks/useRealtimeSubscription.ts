import { useEffect } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useOrganization } from '@/app/providers/OrganizationProvider'

/**
 * Generic realtime subscription hook.
 * Subscribes to postgres_changes on a table scoped to the current org
 * and invalidates the specified query keys on any INSERT / UPDATE / DELETE.
 */
export function useRealtimeSubscription(
  table: string,
  queryKeysToInvalidate: readonly (readonly unknown[])[],
) {
  const queryClient = useQueryClient()
  const { currentOrg } = useOrganization()

  useEffect(() => {
    if (!currentOrg?.id) return

    const channel = supabase
      .channel(`realtime-${table}-${currentOrg.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table,
          filter: `organization_id=eq.${currentOrg.id}`,
        },
        () => {
          for (const qk of queryKeysToInvalidate) {
            queryClient.invalidateQueries({ queryKey: qk as unknown[] })
          }
        },
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentOrg?.id, table, queryClient])
}
