/**
 * usePresenceSubscription Hook
 * Subscribes to real-time presence updates for organization members
 */

import { useEffect } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useOrganization } from '@/app/providers/OrganizationProvider'
import { queryKeys } from '@/lib/queryKeys'

/**
 * Hook to subscribe to real-time presence updates
 * Automatically invalidates relevant queries when presence changes
 */
export function usePresenceSubscription() {
  const queryClient = useQueryClient()
  const { currentOrg } = useOrganization()

  useEffect(() => {
    if (!currentOrg?.id) return

    // Subscribe to profile updates (presence changes)
    const channel = supabase
      .channel('presence-changes')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'profiles',
        },
        (payload) => {
          console.log('Presence update:', payload)

          // Invalidate all presence queries (count + member list)
          queryClient.invalidateQueries({
            queryKey: queryKeys.presence.all,
          })

          // Invalidate organization members query (to update presence in lists)
          queryClient.invalidateQueries({
            queryKey: queryKeys.organizations.members(currentOrg.id),
          })

          // Invalidate profiles query
          if (payload.new && 'id' in payload.new) {
            queryClient.invalidateQueries({
              queryKey: queryKeys.profiles.detail(payload.new.id as string),
            })
          }
        },
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [currentOrg?.id, queryClient])
}
