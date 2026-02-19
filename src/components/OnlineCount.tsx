/**
 * OnlineCount Component
 * Displays count of online users in the current organization
 */

import { useTranslation } from 'react-i18next'
import { Users } from '@phosphor-icons/react'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useOrganization } from '@/app/providers/OrganizationProvider'
import { cn } from '@ds/utils'
import { queryKeys } from '@/lib/queryKeys'

interface OnlineCountProps {
  /** Additional CSS classes */
  className?: string
  /** Show detailed tooltip on hover */
  showTooltip?: boolean
}

export function OnlineCount({ className, showTooltip = true }: OnlineCountProps) {
  const { t } = useTranslation('components')
  const { currentOrg } = useOrganization()

  // Fetch online members count
  const { data: onlineCount = 0 } = useQuery({
    queryKey: queryKeys.presence.onlineCount(currentOrg?.id),
    queryFn: async () => {
      if (!currentOrg?.id) return 0

      // Calculate the threshold for "online" (5 minutes ago)
      const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString()

      const { data, error } = await supabase
        .from('organization_members')
        .select('user_id, profiles!inner(last_seen_at)')
        .eq('organization_id', currentOrg.id)
        .gte('profiles.last_seen_at', fiveMinutesAgo)

      if (error) throw error
      return data?.length ?? 0
    },
    enabled: !!currentOrg?.id,
    refetchInterval: 60000, // Refetch every minute
  })

  if (!currentOrg) return null

  return (
    <div
      className={cn(
        'flex items-center gap-2 rounded-lg bg-gray-100 dark:bg-gray-800 px-3 py-1.5',
        className,
      )}
      title={showTooltip ? t('presence.onlineMembers') : undefined}
    >
      <Users className="h-4 w-4 text-green-600 dark:text-green-400" weight="fill" />
      <span className="text-sm font-medium text-gray-700 dark:text-gray-300">{onlineCount}</span>
      <span className="text-xs text-gray-500 dark:text-gray-400">{t('presence.online')}</span>
    </div>
  )
}
