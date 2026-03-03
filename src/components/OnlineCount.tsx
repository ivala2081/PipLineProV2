/**
 * OnlineCount Component
 * Displays count of online users in the current organization.
 * Clicking opens a popover listing exactly who is online.
 */

import { useTranslation } from 'react-i18next'
import { Users, ShieldStar, UserRectangle } from '@phosphor-icons/react'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useOrganization } from '@/app/providers/OrganizationProvider'
import { cn } from '@ds/utils'
import { queryKeys } from '@/lib/queryKeys'
import type { OrgMemberRole } from '@/lib/database.types'
import { Popover, PopoverTrigger, PopoverContent, Avatar, AvatarImage, AvatarFallback } from '@ds'

interface OnlineCountProps {
  className?: string
}

interface OnlineMember {
  userId: string
  role: OrgMemberRole
  display_name: string | null
  avatar_url: string | null
  email: string | null
}

export function OnlineCount({ className }: OnlineCountProps) {
  const { t } = useTranslation('components')
  const { currentOrg } = useOrganization()

  const { data: onlineMembers = [] } = useQuery({
    queryKey: queryKeys.presence.onlineMembers(currentOrg?.id),
    queryFn: async (): Promise<OnlineMember[]> => {
      if (!currentOrg?.id) return []

      // Step 1: get all member user_ids + roles for this org
      const { data: members, error: membersError } = await supabase
        .from('organization_members')
        .select('user_id, role')
        .eq('organization_id', currentOrg.id)

      if (membersError) throw membersError
      if (!members?.length) return []

      // Step 2: fetch profiles that were active in the last 5 minutes
      const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString()

      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('id, display_name, avatar_url, email')
        .in(
          'id',
          members.map((m) => m.user_id),
        )
        .gte('last_seen_at', fiveMinutesAgo)

      if (profilesError) throw profilesError
      if (!profiles?.length) return []

      return profiles.map((p) => {
        const member = members.find((m) => m.user_id === p.id)!
        return {
          userId: p.id,
          role: member.role,
          display_name: p.display_name,
          avatar_url: p.avatar_url,
          email: p.email,
        }
      })
    },
    enabled: !!currentOrg?.id,
    refetchInterval: 60000,
  })

  if (!currentOrg) return null

  const count = onlineMembers.length

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          className={cn(
            'flex items-center gap-2 rounded-lg bg-gray-100 dark:bg-gray-800 px-3 py-1.5',
            'cursor-pointer transition-colors hover:bg-gray-200 dark:hover:bg-gray-700',
            className,
          )}
        >
          <Users className="h-4 w-4 text-green-600 dark:text-green-400" weight="fill" />
          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">{count}</span>
          <span className="text-xs text-gray-500 dark:text-gray-400">{t('presence.online')}</span>
        </button>
      </PopoverTrigger>

      <PopoverContent align="end" className="w-72 p-0 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-black/10">
          <div>
            <p className="text-sm font-semibold text-fg1">{t('presence.whoIsOnline')}</p>
            <p className="text-xs text-fg3 mt-0.5">
              {count} {t('presence.online').toLowerCase()}
            </p>
          </div>
          {/* Pulsing green dot */}
          <span className="relative flex h-2.5 w-2.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-green-500" />
          </span>
        </div>

        {/* Member list */}
        <div className="p-2 max-h-72 overflow-y-auto">
          {onlineMembers.length === 0 ? (
            <p className="text-xs text-fg3 text-center py-6">{t('presence.noOneOnline')}</p>
          ) : (
            <ul className="space-y-0.5">
              {onlineMembers.map((member) => {
                const name = member.display_name ?? member.email ?? member.userId
                const RoleIcon = member.role === 'admin' ? ShieldStar : UserRectangle

                return (
                  <li
                    key={member.userId}
                    className="flex items-center gap-3 px-2 py-2 rounded-xl hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
                  >
                    {/* Avatar with online dot */}
                    <div className="relative shrink-0">
                      <Avatar className="h-8 w-8">
                        {member.avatar_url && <AvatarImage src={member.avatar_url} alt={name} />}
                        <AvatarFallback>
                          <RoleIcon size={18} weight="fill" className="text-black/35" />
                        </AvatarFallback>
                      </Avatar>
                      <span className="absolute -bottom-0.5 -right-0.5 block h-2.5 w-2.5 rounded-full bg-green-500 border-2 border-white dark:border-gray-900 shadow-[0_0_4px_rgba(34,197,94,0.6)]" />
                    </div>

                    {/* Name + role */}
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-fg1 truncate">{name}</p>
                      <p className="text-xs text-fg3 capitalize">{member.role}</p>
                    </div>
                  </li>
                )
              })}
            </ul>
          )}
        </div>
      </PopoverContent>
    </Popover>
  )
}
