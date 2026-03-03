/**
 * NotificationBell Component
 *
 * Displays a bell icon in the header bar with an unread count badge.
 * Clicking opens a popover with a scrollable list of notifications.
 * Each notification can be clicked to mark it as read and optionally
 * navigate to a relevant page.
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
} from '@phosphor-icons/react'

import { Popover, PopoverTrigger, PopoverContent } from '@ds'
import { cn } from '@ds/utils'
import {
  useNotifications,
  type NotificationType,
  type AppNotification,
} from '@/hooks/useNotifications'

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

/** Icon per notification type */
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

/** Format relative time (e.g. "2m ago", "1h ago", "3d ago") */
function formatRelativeTime(iso: string, justNow: string, ago: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  const seconds = Math.floor(diff / 1000)

  if (seconds < 60) return justNow

  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) return `${minutes}m ${ago}`

  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h ${ago}`

  const days = Math.floor(hours / 24)
  return `${days}d ${ago}`
}

/** Resolve navigation path from notification metadata */
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

  const handleClick = () => {
    if (!notification.read) {
      onRead(notification.id)
    }
    if (path) {
      onNavigate(path)
    }
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      className={cn(
        'flex w-full items-start gap-3 rounded-xl px-3 py-2.5 text-left transition-colors',
        'hover:bg-black/5 dark:hover:bg-white/5',
        !notification.read && 'bg-brand/5',
      )}
    >
      {/* Icon */}
      <div className="mt-0.5 shrink-0">
        <NotificationIcon type={notification.type} />
      </div>

      {/* Body */}
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

      {/* Unread dot */}
      {!notification.read && <span className="mt-1.5 shrink-0 h-2 w-2 rounded-full bg-brand" />}
    </button>
  )
}

/* ------------------------------------------------------------------ */
/*  NotificationBell                                                   */
/* ------------------------------------------------------------------ */

interface NotificationBellProps {
  className?: string
}

export function NotificationBell({ className }: NotificationBellProps) {
  const { t } = useTranslation('components')
  const navigate = useNavigate()
  const { notifications, unreadCount, markAsRead, markAllAsRead, clearAll } = useNotifications()
  const [open, setOpen] = useState(false)

  const justNow = t('notifications.justNow', 'Just now')
  const ago = t('notifications.ago', 'ago')

  const handleNavigate = (path: string) => {
    setOpen(false)
    navigate(path)
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          className={cn(
            'relative flex size-8 items-center justify-center rounded-md text-black/70',
            'hover:bg-black/8 hover:text-black transition-colors',
            className,
          )}
          aria-label={t('notifications.label', 'Notifications')}
        >
          <Bell size={18} weight={unreadCount > 0 ? 'fill' : 'regular'} />

          {/* Badge */}
          {unreadCount > 0 && (
            <span
              className={cn(
                'absolute -top-0.5 -right-0.5 flex items-center justify-center rounded-full',
                'bg-red-500 text-white text-[10px] font-bold leading-none',
                'min-w-[18px] h-[18px] px-1',
                'animate-in zoom-in duration-200',
              )}
            >
              {unreadCount > 99 ? '99+' : unreadCount}
            </span>
          )}
        </button>
      </PopoverTrigger>

      <PopoverContent align="end" className="w-[calc(100vw-2rem)] sm:w-80 p-0 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-black/10">
          <div>
            <p className="text-sm font-semibold text-fg1">
              {t('notifications.title', 'Notifications')}
            </p>
            {unreadCount > 0 && (
              <p className="text-xs text-fg3 mt-0.5">
                {unreadCount} {t('notifications.unread', 'unread')}
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

        {/* Notification list */}
        <div className="max-h-80 overflow-y-auto p-1.5">
          {notifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10 text-center">
              <CheckCircle size={32} weight="light" className="text-fg3/50 mb-2" />
              <p className="text-sm text-fg3">{t('notifications.empty', 'No notifications yet')}</p>
              <p className="text-xs text-fg3/60 mt-1">
                {t('notifications.emptyHint', "You'll see updates here when they happen")}
              </p>
            </div>
          ) : (
            <div className="space-y-0.5">
              {notifications.map((n) => (
                <NotificationItem
                  key={n.id}
                  notification={n}
                  onRead={markAsRead}
                  onNavigate={handleNavigate}
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
