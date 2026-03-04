/**
 * NotificationBell Component
 *
 * Displays a bell icon in the header bar with an unread count badge.
 * Shows broadcast notifications + org alerts (velocity, etc.) for admins/managers.
 */

import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import {
  Bell,
  ArrowsLeftRight,
  SealCheck,
  EnvelopeSimple,
  ClockCountdown,
  CheckCircle,
  Checks,
  Trash,
  Warning,
  X,
} from '@phosphor-icons/react'

import { Popover, PopoverTrigger, PopoverContent } from '@ds'
import { cn } from '@ds/utils'
import {
  useNotifications,
  type NotificationType,
  type AppNotification,
} from '@/hooks/useNotifications'
import { useAlerts, type OrgAlert } from '@/hooks/useAlerts'

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

function NotificationIcon({ type }: { type: NotificationType }) {
  switch (type) {
    case 'transfer_created':
      return <ArrowsLeftRight size={16} weight="fill" className="text-blue-500" />
    case 'transfer_approved':
      return <SealCheck size={16} weight="fill" className="text-green-500" />
    case 'invitation_received':
      return <EnvelopeSimple size={16} weight="fill" className="text-purple-500" />
    case 'daily_closing_reminder':
      return <ClockCountdown size={16} weight="fill" className="text-red-500" />
    default:
      return <Bell size={16} weight="fill" className="text-fg3" />
  }
}

function formatRelativeTime(iso: string, justNow: string, ago: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  const seconds = Math.floor(diff / 1000)
  if (seconds < 60) return justNow
  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) return `${minutes}m ${ago}`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h ${ago}`
  return `${Math.floor(hours / 24)}d ${ago}`
}

function getNavigationPath(notification: AppNotification): string | null {
  switch (notification.type) {
    case 'transfer_created':
    case 'transfer_approved':
      return '/transfers'
    case 'invitation_received':
      return '/settings'
    default:
      return null
  }
}

/* ------------------------------------------------------------------ */
/*  Notification Item                                                  */
/* ------------------------------------------------------------------ */

function NotificationItem({
  notification,
  onRead,
  onNavigate,
  justNow,
  ago,
}: {
  notification: AppNotification
  onRead: (id: string) => void
  onNavigate: (path: string) => void
  justNow: string
  ago: string
}) {
  const path = getNavigationPath(notification)
  return (
    <button
      type="button"
      onClick={() => {
        if (!notification.read) onRead(notification.id)
        if (path) onNavigate(path)
      }}
      className={cn(
        'flex w-full items-start gap-3 rounded-xl px-3 py-2.5 text-left transition-colors',
        'hover:bg-black/5 dark:hover:bg-white/5',
        !notification.read && 'bg-brand/5',
      )}
    >
      <div className="mt-0.5 shrink-0">
        <NotificationIcon type={notification.type} />
      </div>
      <div className="min-w-0 flex-1">
        <p
          className={cn(
            'text-sm leading-snug',
            notification.read ? 'text-fg2' : 'font-medium text-fg1',
          )}
        >
          {notification.title}
        </p>
        <p className="mt-0.5 text-xs text-fg3 leading-snug">{notification.message}</p>
        <p className="mt-0.5 text-[11px] text-fg3/70">
          {formatRelativeTime(notification.createdAt, justNow, ago)}
        </p>
      </div>
      {!notification.read && <span className="mt-1.5 shrink-0 h-2 w-2 rounded-full bg-brand" />}
    </button>
  )
}

/* ------------------------------------------------------------------ */
/*  Alert Item (velocity alerts, etc.)                                 */
/* ------------------------------------------------------------------ */

function AlertItem({
  alert,
  onAcknowledge,
  justNow,
  ago,
}: {
  alert: OrgAlert
  onAcknowledge: (id: string) => void
  justNow: string
  ago: string
}) {
  const color =
    alert.severity === 'critical'
      ? 'text-red-500'
      : alert.severity === 'warning'
        ? 'text-orange-500'
        : 'text-blue-500'
  return (
    <div className="flex w-full items-start gap-3 rounded-xl bg-orange-500/5 px-3 py-2.5">
      <div className="mt-0.5 shrink-0">
        <Warning size={16} weight="fill" className={color} />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium leading-snug text-fg1">{alert.title}</p>
        <p className="mt-0.5 text-xs text-fg3 leading-snug">{alert.message}</p>
        <p className="mt-0.5 text-[11px] text-fg3/70">
          {formatRelativeTime(alert.created_at, justNow, ago)}
        </p>
      </div>
      <button
        type="button"
        onClick={() => onAcknowledge(alert.id)}
        className="mt-0.5 shrink-0 rounded p-0.5 text-black/30 hover:bg-black/5 hover:text-black/60"
        title="Dismiss"
      >
        <X size={12} weight="bold" />
      </button>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/*  NotificationBell                                                   */
/* ------------------------------------------------------------------ */

export function NotificationBell({ className }: { className?: string }) {
  const { t } = useTranslation('components')
  const navigate = useNavigate()
  const { notifications, unreadCount, markAsRead, markAllAsRead, clearAll } = useNotifications()
  const { alerts, unreadCount: alertCount, canViewAlerts, acknowledgeAlert } = useAlerts()
  const [open, setOpen] = useState(false)

  const totalUnread = unreadCount + alertCount
  const justNow = t('notifications.justNow', 'Just now')
  const ago = t('notifications.ago', 'ago')
  const hasContent = notifications.length > 0 || (canViewAlerts && alerts.length > 0)

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          className={cn(
            'relative flex size-8 items-center justify-center rounded-md text-black/70 hover:bg-black/8 hover:text-black transition-colors',
            className,
          )}
          aria-label={t('notifications.label', 'Notifications')}
        >
          <Bell size={18} weight={totalUnread > 0 ? 'fill' : 'regular'} />
          {totalUnread > 0 && (
            <span className="absolute -top-0.5 -right-0.5 flex items-center justify-center rounded-full bg-red-500 text-white text-[10px] font-bold leading-none min-w-[18px] h-[18px] px-1 animate-in zoom-in duration-200">
              {totalUnread > 99 ? '99+' : totalUnread}
            </span>
          )}
        </button>
      </PopoverTrigger>

      <PopoverContent align="end" className="w-[calc(100vw-2rem)] sm:w-80 p-0 overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 border-b border-black/10">
          <div>
            <p className="text-sm font-semibold text-fg1">
              {t('notifications.title', 'Notifications')}
            </p>
            {totalUnread > 0 && (
              <p className="text-xs text-fg3 mt-0.5">
                {totalUnread} {t('notifications.unread', 'unread')}
              </p>
            )}
          </div>
          <div className="flex items-center gap-2">
            {unreadCount > 0 && (
              <button
                type="button"
                onClick={markAllAsRead}
                className="flex items-center gap-1 text-xs text-brand hover:text-brand/80 transition-colors"
                title={t('notifications.markAllRead', 'Mark all as read')}
              >
                <Checks size={14} />
                <span className="hidden sm:inline">
                  {t('notifications.markAllRead', 'Mark all as read')}
                </span>
              </button>
            )}
            {notifications.length > 0 && (
              <button
                type="button"
                onClick={clearAll}
                className="flex items-center gap-1 text-xs text-fg3 hover:text-red-500 transition-colors"
                title={t('notifications.clearAll', 'Clear all')}
              >
                <Trash size={14} />
              </button>
            )}
          </div>
        </div>

        <div className="max-h-80 overflow-y-auto p-1.5">
          {!hasContent ? (
            <div className="flex flex-col items-center justify-center py-10 text-center">
              <CheckCircle size={32} weight="light" className="text-fg3/50 mb-2" />
              <p className="text-sm text-fg3">{t('notifications.empty', 'No notifications yet')}</p>
              <p className="text-xs text-fg3/60 mt-1">
                {t('notifications.emptyHint', "You'll see updates here when they happen")}
              </p>
            </div>
          ) : (
            <div className="space-y-0.5">
              {canViewAlerts && alerts.length > 0 && (
                <>
                  {alerts.map((alert) => (
                    <AlertItem
                      key={alert.id}
                      alert={alert}
                      onAcknowledge={acknowledgeAlert}
                      justNow={justNow}
                      ago={ago}
                    />
                  ))}
                  {notifications.length > 0 && (
                    <div className="my-1 border-t border-black/[0.06]" />
                  )}
                </>
              )}
              {notifications.map((n) => (
                <NotificationItem
                  key={n.id}
                  notification={n}
                  onRead={markAsRead}
                  onNavigate={(path) => {
                    setOpen(false)
                    navigate(path)
                  }}
                  justNow={justNow}
                  ago={ago}
                />
              ))}
            </div>
          )}
        </div>
      </PopoverContent>
    </Popover>
  )
}
