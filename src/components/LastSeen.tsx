/**
 * LastSeen Component
 * Displays when a user was last active
 */

import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { formatLastSeen, isUserOnline } from '@/lib/presenceService'
import { cn } from '@ds/utils'

interface LastSeenProps {
  /** User's last_seen_at timestamp */
  lastSeenAt?: string | null
  /** Additional CSS classes */
  className?: string
  /** Prefix text (e.g., "Last seen:") */
  showPrefix?: boolean
}

export function LastSeen({ lastSeenAt, className, showPrefix = false }: LastSeenProps) {
  const { t } = useTranslation('components')
  const [displayTime, setDisplayTime] = useState(() => formatLastSeen(lastSeenAt))
  const online = isUserOnline(lastSeenAt)

  // Update display time every minute
  useEffect(() => {
    const interval = setInterval(() => {
      setDisplayTime(formatLastSeen(lastSeenAt))
    }, 60000) // Update every minute

    return () => clearInterval(interval)
  }, [lastSeenAt])

  // If user is online, show "Online" instead of last seen time
  if (online) {
    return (
      <span className={cn('text-sm text-green-600 dark:text-green-400', className)}>
        {t('presence.online')}
      </span>
    )
  }

  return (
    <span className={cn('text-sm text-gray-500 dark:text-gray-400', className)}>
      {showPrefix && <span className="mr-1">{t('presence.lastSeen')}:</span>}
      {displayTime}
    </span>
  )
}
