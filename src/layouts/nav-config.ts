import type { ComponentType } from 'react'
import type { IconProps } from '@phosphor-icons/react'
import {
  House,
  ArrowsLeftRight,
  BookOpen,
  CreditCard,
  Users,
  Buildings,
  Brain,
  Shield,
  IdentificationCard,
} from '@phosphor-icons/react'

export type NavItem = {
  titleKey: string
  href: string
  icon: ComponentType<IconProps>
  /** If set, only users with one of these effective roles can see this item */
  roles?: string[]
}

export type NavGroup = {
  titleKey: string
  items: NavItem[]
}

export const navGroups: NavGroup[] = [
  {
    titleKey: 'nav.groups.main',
    items: [{ titleKey: 'nav.dashboard', href: '/', icon: House }],
  },
  {
    titleKey: 'nav.groups.dataEntry',
    items: [
      { titleKey: 'nav.transfers', href: '/transfers', icon: ArrowsLeftRight },
      {
        titleKey: 'nav.accounting',
        href: '/accounting',
        icon: BookOpen,
        roles: ['god', 'admin', 'manager'],
      },
    ],
  },
  {
    titleKey: 'nav.groups.management',
    items: [
      {
        titleKey: 'nav.members',
        href: '/members',
        icon: Users,
      },
      { titleKey: 'nav.psps', href: '/psps', icon: CreditCard, roles: ['god', 'admin'] },
      {
        titleKey: 'nav.hr',
        href: '/hr',
        icon: IdentificationCard,
        roles: ['god', 'admin'],
      },
    ],
  },
  {
    titleKey: 'nav.groups.system',
    items: [
      {
        titleKey: 'nav.organizations',
        href: '/organizations',
        icon: Buildings,
        roles: ['god', 'admin'],
      },
      {
        titleKey: 'nav.security',
        href: '/security',
        icon: Shield,
        roles: ['god', 'admin', 'manager'],
      },
    ],
  },
  {
    titleKey: 'nav.groups.ai',
    items: [{ titleKey: 'nav.future', href: '/future', icon: Brain }],
  },
]
