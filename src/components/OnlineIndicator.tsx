/**
 * OnlineIndicator Component
 * Displays a visual indicator of user's online status
 */

import { isUserOnline } from '@/lib/presenceService';
import { cn } from '@ds/utils';

interface OnlineIndicatorProps {
  /** User's last_seen_at timestamp */
  lastSeenAt?: string | null;
  /** Size variant */
  size?: 'sm' | 'md' | 'lg';
  /** Additional CSS classes */
  className?: string;
  /** Show label next to indicator */
  showLabel?: boolean;
}

export function OnlineIndicator({
  lastSeenAt,
  size = 'md',
  className,
  showLabel = false,
}: OnlineIndicatorProps) {
  const online = isUserOnline(lastSeenAt);

  const sizeClasses = {
    sm: 'h-2 w-2',
    md: 'h-2.5 w-2.5',
    lg: 'h-3 w-3',
  };

  const labelSizeClasses = {
    sm: 'text-xs',
    md: 'text-sm',
    lg: 'text-base',
  };

  return (
    <div className={cn('flex items-center gap-1.5', className)}>
      <span
        className={cn(
          'rounded-full border-2 border-white dark:border-gray-900',
          sizeClasses[size],
          online
            ? 'bg-green-500 shadow-[0_0_4px_rgba(34,197,94,0.6)]'
            : 'bg-gray-400 dark:bg-gray-600'
        )}
        aria-label={online ? 'Online' : 'Offline'}
      />
      {showLabel && (
        <span
          className={cn(
            'font-medium',
            labelSizeClasses[size],
            online ? 'text-green-600 dark:text-green-400' : 'text-gray-500'
          )}
        >
          {online ? 'Online' : 'Offline'}
        </span>
      )}
    </div>
  );
}
