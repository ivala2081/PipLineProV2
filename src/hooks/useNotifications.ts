/**
 * useNotifications Hook
 *
 * Subscribes to Supabase Realtime broadcast channel `notifications:{orgId}`
 * and maintains a local notification state with localStorage persistence.
 *
 * ## Notification types
 * - transfer_created
 * - transfer_approved
 * - invitation_received
 * - daily_closing_reminder
 *
 * ## How notifications are sent (server-side)
 *
 * Notifications are received via Supabase Realtime **broadcast** events.
 * The server (Edge Function, database trigger, or admin script) should
 * broadcast to the channel like so:
 *
 * ```ts
 * // SERVER-SIDE: Send a notification to an organization channel
 * import { createClient } from '@supabase/supabase-js'
 *
 * const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
 *
 * await supabase.channel(`notifications:${orgId}`).send({
 *   type: 'broadcast',
 *   event: 'notification',
 *   payload: {
 *     id: crypto.randomUUID(),
 *     type: 'transfer_created',           // NotificationType
 *     title: 'New Transfer',
 *     message: 'New transfer created by John Doe',
 *     createdAt: new Date().toISOString(),
 *     metadata: { transferId: '...', userId: '...' },
 *   },
 * })
 * ```
 *
 * Possible trigger points:
 * - Database triggers on `transfers` INSERT/UPDATE -> call Edge Function
 * - `organization_invitations` INSERT trigger -> broadcast `invitation_received`
 * - Scheduled Edge Function -> broadcast `daily_closing_reminder`
 */

import { useEffect, useState, useCallback, useRef } from 'react'
import { supabase } from '@/lib/supabase'
import { useOrganization } from '@/app/providers/OrganizationProvider'
import { emitToast } from '@/lib/toastEmitter'
import type { RealtimeChannel } from '@supabase/supabase-js'

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

export type NotificationType =
  | 'transfer_created'
  | 'transfer_approved'
  | 'invitation_received'
  | 'daily_closing_reminder'

export interface AppNotification {
  id: string
  type: NotificationType
  title: string
  message: string
  createdAt: string // ISO 8601
  read: boolean
  metadata?: Record<string, unknown>
}

interface NotificationPayload {
  id: string
  type: NotificationType
  title?: string
  message: string
  createdAt?: string
  /** @deprecated Use `createdAt` instead */
  timestamp?: string
  metadata?: Record<string, unknown>
}

/* ------------------------------------------------------------------ */
/*  Title defaults per type (fallback when title is not provided)       */
/* ------------------------------------------------------------------ */

const DEFAULT_TITLES: Record<NotificationType, string> = {
  transfer_created: 'New Transfer',
  transfer_approved: 'Transfer Approved',
  invitation_received: 'Invitation Received',
  daily_closing_reminder: 'Daily Closing Reminder',
}

/* ------------------------------------------------------------------ */
/*  localStorage helpers                                               */
/* ------------------------------------------------------------------ */

const STORAGE_KEY_PREFIX = 'piplinepro-notifications'
const MAX_NOTIFICATIONS = 50

function storageKey(orgId: string): string {
  return `${STORAGE_KEY_PREFIX}-${orgId}`
}

function loadStoredNotifications(orgId: string): AppNotification[] {
  try {
    const raw = localStorage.getItem(storageKey(orgId))
    if (!raw) return []
    const parsed = JSON.parse(raw) as AppNotification[]
    // Ensure we don't return more than MAX_NOTIFICATIONS
    return Array.isArray(parsed) ? parsed.slice(0, MAX_NOTIFICATIONS) : []
  } catch {
    return []
  }
}

function persistNotifications(orgId: string, notifications: AppNotification[]) {
  try {
    const capped = notifications.slice(0, MAX_NOTIFICATIONS)
    localStorage.setItem(storageKey(orgId), JSON.stringify(capped))
  } catch {
    // localStorage full or unavailable -- silently ignore
  }
}

function clearStoredNotifications(orgId: string) {
  try {
    localStorage.removeItem(storageKey(orgId))
  } catch {
    // silently ignore
  }
}

/* ------------------------------------------------------------------ */
/*  Hook                                                               */
/* ------------------------------------------------------------------ */

export function useNotifications() {
  const { currentOrg } = useOrganization()
  const [notifications, setNotifications] = useState<AppNotification[]>([])
  const channelRef = useRef<RealtimeChannel | null>(null)
  const orgIdRef = useRef<string | null>(null)

  // Initialize notifications from localStorage when org changes
  useEffect(() => {
    if (!currentOrg?.id) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- reset on org change
      setNotifications([])
      orgIdRef.current = null
      return
    }

    orgIdRef.current = currentOrg.id
    const stored = loadStoredNotifications(currentOrg.id)

    setNotifications(stored)
  }, [currentOrg?.id])

  // Persist notifications to localStorage whenever they change
  useEffect(() => {
    if (!orgIdRef.current) return
    persistNotifications(orgIdRef.current, notifications)
  }, [notifications])

  // Subscribe to Supabase Realtime broadcast channel
  useEffect(() => {
    if (!currentOrg?.id) return

    const orgId = currentOrg.id

    const channel = supabase
      .channel(`notifications:${orgId}`)
      .on('broadcast', { event: 'notification' }, (message) => {
        const payload = message.payload as NotificationPayload

        if (!payload?.id || !payload?.type || !payload?.message) {
          console.warn('[useNotifications] Received malformed notification:', payload)
          return
        }

        const title = payload.title || DEFAULT_TITLES[payload.type] || 'Notification'
        const createdAt = payload.createdAt || payload.timestamp || new Date().toISOString()

        const notification: AppNotification = {
          id: payload.id,
          type: payload.type,
          title,
          message: payload.message,
          createdAt,
          read: false,
          metadata: payload.metadata,
        }

        setNotifications((prev) => {
          // Prevent duplicates
          if (prev.some((n) => n.id === notification.id)) return prev
          // Prepend new notification and cap at MAX_NOTIFICATIONS
          return [notification, ...prev].slice(0, MAX_NOTIFICATIONS)
        })

        // Show a toast for the new notification
        emitToast({
          title,
          description: payload.message,
          variant: 'default',
        })
      })
      .subscribe()

    channelRef.current = channel

    return () => {
      supabase.removeChannel(channel)
      channelRef.current = null
    }
  }, [currentOrg?.id])

  // Mark a single notification as read
  const markAsRead = useCallback(
    (notificationId: string) => {
      if (!currentOrg?.id) return

      setNotifications((prev) =>
        prev.map((n) => (n.id === notificationId ? { ...n, read: true } : n)),
      )
    },
    [currentOrg?.id],
  )

  // Mark all notifications as read
  const markAllAsRead = useCallback(() => {
    if (!currentOrg?.id) return

    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })))
  }, [currentOrg?.id])

  // Clear all notifications from the list and localStorage
  const clearAll = useCallback(() => {
    if (currentOrg?.id) {
      clearStoredNotifications(currentOrg.id)
    }
    setNotifications([])
  }, [currentOrg])

  const unreadCount = notifications.filter((n) => !n.read).length

  return {
    notifications,
    unreadCount,
    markAsRead,
    markAllAsRead,
    clearAll,
  }
}
