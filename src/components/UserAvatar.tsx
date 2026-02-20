/**
 * UserAvatar Component
 * Avatar component with optional online presence indicator
 */

import { Avatar, AvatarImage, AvatarFallback } from '@ds'
import { OnlineIndicator } from './OnlineIndicator'
import { cn } from '@ds/utils'

interface UserAvatarProps {
  /** Avatar image URL */
  src?: string | null
  /** User's name for fallback initials */
  name?: string
  /** Size variant */
  size?: 'sm' | 'md' | 'lg' | 'xl'
  /** Show online presence indicator */
  showPresence?: boolean
  /** User's last_seen_at timestamp (required if showPresence is true) */
  lastSeenAt?: string | null
  /** Additional CSS classes */
  className?: string
}

const sizeClasses = {
  sm: 'h-8 w-8 text-xs',
  md: 'h-10 w-10 text-sm',
  lg: 'h-12 w-12 text-base',
  xl: 'h-16 w-16 text-lg',
}

const indicatorSizeClasses = {
  sm: 'h-2 w-2 border',
  md: 'h-2.5 w-2.5 border-2',
  lg: 'h-3 w-3 border-2',
  xl: 'h-4 w-4 border-2',
}

/**
 * Get initials from name (first letter of first and last name)
 */
function getInitials(name?: string): string {
  if (!name) return '?'

  const parts = name.trim().split(/\s+/)
  if (parts.length === 1) {
    return parts[0].charAt(0).toUpperCase()
  }

  return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase()
}

export function UserAvatar({
  src,
  name,
  size = 'md',
  showPresence = false,
  lastSeenAt,
  className,
}: UserAvatarProps) {
  const initials = getInitials(name)

  return (
    <div className="relative inline-block">
      <Avatar className={cn(sizeClasses[size], className)}>
        {src && <AvatarImage src={src} alt={name} />}
        <AvatarFallback>{initials}</AvatarFallback>
      </Avatar>

      {showPresence && (
        <div className="absolute bottom-0 right-0">
          <OnlineIndicator
            lastSeenAt={lastSeenAt}
            size={size === 'sm' ? 'sm' : size === 'md' ? 'sm' : 'md'}
            className={cn(indicatorSizeClasses[size])}
          />
        </div>
      )}
    </div>
  )
}
