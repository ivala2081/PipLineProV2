import type { ComponentType } from 'react'
import type { IconProps } from '@phosphor-icons/react'
import {
  House,
  ArrowsLeftRight,
  Table,
  ClipboardText,
  Users,
  Buildings,
} from '@phosphor-icons/react'

export type NavItem = {
  titleKey: string
  href: string
  icon: ComponentType<IconProps>
}

export type NavGroup = {
  titleKey: string
  items: NavItem[]
}

export const navGroups: NavGroup[] = [
  {
    titleKey: 'nav.groups.main',
    items: [
      { titleKey: 'nav.dashboard', href: '/', icon: House },
    ],
  },
  {
    titleKey: 'nav.groups.dataEntry',
    items: [
      { titleKey: 'nav.transfers', href: '/transfers', icon: ArrowsLeftRight },
      { titleKey: 'nav.module2', href: '/module-2', icon: Table },
      { titleKey: 'nav.module3', href: '/module-3', icon: ClipboardText },
    ],
  },
  {
    titleKey: 'nav.groups.management',
    items: [
      { titleKey: 'nav.members', href: '/members', icon: Users },
    ],
  },
  {
    titleKey: 'nav.groups.system',
    items: [
      { titleKey: 'nav.organizations', href: '/organizations', icon: Buildings },
    ],
  },
]
