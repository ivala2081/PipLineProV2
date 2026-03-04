import { useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { queryKeys } from '@/lib/queryKeys'
import { useOrganization } from '@/app/providers/OrganizationProvider'

export interface OrgAlert {
  id: string
  org_id: string
  type: string
  severity: 'info' | 'warning' | 'critical'
  title: string
  message: string
  metadata: {
    triggered_by_id?: string
    triggered_by_name?: string
    count?: number
    window_minutes?: number
    threshold?: number
  }
  triggered_by: string | null
  acknowledged_by: string | null
  acknowledged_at: string | null
  created_at: string
}

export function useAlerts() {
  const { currentOrg, membership } = useOrganization()
  const queryClient = useQueryClient()

  // Only admins and managers can see alerts
  const canViewAlerts =
    !!membership && (membership.role === 'admin' || membership.role === 'manager')

  const { data, isLoading } = useQuery({
    queryKey: queryKeys.alerts.list(currentOrg?.id ?? ''),
    queryFn: async () => {
      if (!currentOrg) throw new Error('No organization selected')

      const { data, error } = await supabase
        .from('org_alerts')
        .select('*')
        .eq('org_id', currentOrg.id)
        .is('acknowledged_at', null)
        .order('created_at', { ascending: false })
        .limit(50)

      if (error) throw error
      return (data as OrgAlert[]) ?? []
    },
    enabled: !!currentOrg && canViewAlerts,
    staleTime: 30_000,
    gcTime: 5 * 60_000,
    meta: { suppressGlobalError: true },
  })

  // Realtime subscription — org_alerts uses org_id not organization_id, so subscribe manually
  useEffect(() => {
    if (!currentOrg?.id || !canViewAlerts) return

    const channel = supabase
      .channel(`org-alerts-${currentOrg.id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'org_alerts',
          filter: `org_id=eq.${currentOrg.id}`,
        },
        () => {
          queryClient.invalidateQueries({
            queryKey: queryKeys.alerts.list(currentOrg.id),
          })
        },
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [currentOrg?.id, canViewAlerts, queryClient])

  const acknowledgeMutation = useMutation({
    mutationFn: async (alertId: string) => {
      const { error } = await supabase.rpc(
        'acknowledge_alert' as never,
        {
          p_alert_id: alertId,
        } as never,
      )
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.alerts.list(currentOrg?.id ?? ''),
      })
    },
    meta: { suppressGlobalError: true },
  })

  return {
    alerts: data ?? [],
    unreadCount: data?.length ?? 0,
    isLoading,
    canViewAlerts,
    acknowledgeAlert: acknowledgeMutation.mutateAsync,
  }
}
