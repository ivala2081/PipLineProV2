import { useLocation, Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import {
  House,
  ArrowsLeftRight,
  Brain,
  DotsThreeOutline,
  Users,
  IdentificationCard,
} from '@phosphor-icons/react'
import type { ComponentType } from 'react'
import type { IconProps } from '@phosphor-icons/react'
import { usePagePermissions } from '@/hooks/usePagePermission'
import { useSidebar } from '@ds'
import { cn } from '@ds/utils'

interface BottomNavItem {
  titleKey: string
  href: string
  icon: ComponentType<IconProps>
  /** 'more' opens the sidebar instead of navigating */
  action?: 'more'
  page?: string
}

const bottomNavItems: BottomNavItem[] = [
  { titleKey: 'nav.dashboard', href: '/', icon: House, page: 'dashboard' },
  { titleKey: 'nav.transfers', href: '/transfers', icon: ArrowsLeftRight, page: 'transfers' },
  { titleKey: 'nav.hr', href: '/hr', icon: IdentificationCard, page: 'hr' },
  { titleKey: 'nav.members', href: '/members', icon: Users, page: 'members' },
  { titleKey: 'nav.future', href: '/ai', icon: Brain, page: 'ai' },
  { titleKey: 'nav.more', href: '#', icon: DotsThreeOutline, action: 'more' },
]

export function BottomNav() {
  const { t } = useTranslation('pages')
  const location = useLocation()
  const { canAccessPage } = usePagePermissions()
  const { toggleSidebar } = useSidebar()

  // Filter items by page-level permissions, then pick max 5 (4 nav + More)
  const visibleItems = bottomNavItems.filter((item) => {
    if (item.page && !canAccessPage(item.page)) return false
    return true
  })

  // If HR is not visible, keep Members; otherwise remove Members to keep 5 items max
  const hasHr = visibleItems.some((item) => item.href === '/hr')
  const items = hasHr
    ? visibleItems.filter((item) => item.href !== '/members')
    : visibleItems.filter((item) => item.href !== '/hr')

  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-black/10 bg-bg1/95 backdrop-blur-lg md:hidden">
      <div
        className="mx-auto grid h-16 max-w-lg items-center"
        style={{
          gridTemplateColumns: `repeat(${items.length}, 1fr)`,
          paddingBottom: 'env(safe-area-inset-bottom, 0px)',
        }}
      >
        {items.map((item) => {
          const isMore = item.action === 'more'
          const isActive =
            !isMore &&
            (item.href === '/'
              ? location.pathname === '/'
              : location.pathname.startsWith(item.href))
          const Icon = item.icon

          const content = (
            <div
              className={cn(
                'flex flex-col items-center justify-center gap-0.5 text-[10px] font-medium transition-all duration-150 active:scale-95',
                isActive ? 'text-brand' : 'text-black/45 active:text-black/70',
              )}
            >
              <Icon size={22} weight={isActive ? 'fill' : 'regular'} />
              <span className="leading-none">{t(item.titleKey)}</span>
            </div>
          )

          if (isMore) {
            return (
              <button
                key="more"
                onClick={() => toggleSidebar()}
                className="flex h-full items-center justify-center"
              >
                {content}
              </button>
            )
          }

          return (
            <Link
              key={item.href}
              to={item.href}
              className="flex h-full items-center justify-center"
            >
              {content}
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
