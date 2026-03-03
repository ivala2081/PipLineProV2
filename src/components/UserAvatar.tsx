/**
 * UserAvatar Component
 * Avatar component with optional online presence indicator
 */

import { ShieldStar, UserRectangle } from '@phosphor-icons/react'
import { Avatar, AvatarImage, AvatarFallback } from '@ds'
import { OnlineIndicator } from './OnlineIndicator'
import { cn } from '@ds/utils'

type UserRole = 'god' | 'admin' | 'manager' | 'operation'

interface UserAvatarProps {
  /** Avatar image URL */
  src?: string | null
  /** User's name (unused when no src, kept for alt text) */
  name?: string
  /** Role determines the fallback icon */
  role?: UserRole | null
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

const iconSizes = {
  sm: 20,
  md: 24,
  lg: 28,
  xl: 36,
}

const indicatorSizeClasses = {
  sm: 'h-2 w-2 border',
  md: 'h-2.5 w-2.5 border-2',
  lg: 'h-3 w-3 border-2',
  xl: 'h-4 w-4 border-2',
}

export function UserAvatar({
  src,
  name,
  role,
  size = 'md',
  showPresence = false,
  lastSeenAt,
  className,
}: UserAvatarProps) {
  const iconProps = { size: iconSizes[size], weight: 'fill' as const, className: 'text-black/35' }

  return (
    <div className="relative inline-block">
      <Avatar className={cn(sizeClasses[size], className)}>
        {src && <AvatarImage src={src} alt={name} />}
        <AvatarFallback>
          {role === 'god' || role === 'admin' ? (
            <ShieldStar {...iconProps} />
          ) : (
            <UserRectangle {...iconProps} />
          )}
        </AvatarFallback>
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
