/**
 * Presence Service
 * Handles user online presence tracking via heartbeat mechanism
 */

import { supabase } from './supabase'

/**
 * Update the current user's last_seen_at timestamp
 * This function should be called periodically (heartbeat) to maintain online status
 */
export async function updatePresence(): Promise<void> {
  try {
    const { error } = await supabase.rpc('update_last_seen')

    if (error) {
      console.error('Failed to update presence:', error)
      throw error
    }
  } catch (error) {
    console.error('Error updating presence:', error)
    // Don't throw - we don't want to crash the app if heartbeat fails
  }
}

/**
 * Get online status for a user
 * @param lastSeenAt - The user's last_seen_at timestamp
 * @returns true if user was active in the last 5 minutes
 */
export function isUserOnline(lastSeenAt: string | null | undefined): boolean {
  if (!lastSeenAt) return false

  const lastSeen = new Date(lastSeenAt)
  const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000)

  return lastSeen > fiveMinutesAgo
}

/**
 * Format last seen time as relative string
 * @param lastSeenAt - The user's last_seen_at timestamp
 * @returns Formatted relative time (e.g., "2 minutes ago", "1 hour ago")
 */
export function formatLastSeen(lastSeenAt: string | null | undefined): string {
  if (!lastSeenAt) return 'Never'

  const lastSeen = new Date(lastSeenAt)
  const now = new Date()
  const diffMs = now.getTime() - lastSeen.getTime()
  const diffSecs = Math.floor(diffMs / 1000)
  const diffMins = Math.floor(diffSecs / 60)
  const diffHours = Math.floor(diffMins / 60)
  const diffDays = Math.floor(diffHours / 24)

  if (diffSecs < 60) {
    return 'Just now'
  } else if (diffMins < 60) {
    return `${diffMins} ${diffMins === 1 ? 'minute' : 'minutes'} ago`
  } else if (diffHours < 24) {
    return `${diffHours} ${diffHours === 1 ? 'hour' : 'hours'} ago`
  } else if (diffDays < 7) {
    return `${diffDays} ${diffDays === 1 ? 'day' : 'days'} ago`
  } else {
    // Format as date for older timestamps
    return lastSeen.toLocaleDateString()
  }
}

/**
 * Constants for presence system
 */
export const PRESENCE_CONFIG = {
  /** How often to send heartbeat (ms) */
  HEARTBEAT_INTERVAL: 2 * 60 * 1000, // 2 minutes
  /** User is considered online if active within this time (ms) */
  ONLINE_THRESHOLD: 5 * 60 * 1000, // 5 minutes
} as const
