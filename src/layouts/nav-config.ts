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
  ClipboardText,
  Handshake,
} from '@phosphor-icons/react'

export type NavItem = {
  titleKey: string
  href: string
  icon: ComponentType<IconProps>
  /** If set, visibility is controlled by page-level permission (role_permissions table) */
  page?: string
}

export type NavGroup = {
  titleKey: string
  items: NavItem[]
}

export const navGroups: NavGroup[] = [
  {
    titleKey: 'nav.groups.main',
    items: [{ titleKey: 'nav.dashboard', href: '/', icon: House, page: 'dashboard' }],
  },
  {
    titleKey: 'nav.groups.dataEntry',
    items: [
      { titleKey: 'nav.transfers', href: '/transfers', icon: ArrowsLeftRight, page: 'transfers' },
      {
        titleKey: 'nav.accounting',
        href: '/accounting',
        icon: BookOpen,
        page: 'accounting',
      },
    ],
  },
  {
    titleKey: 'nav.groups.partners',
    items: [{ titleKey: 'nav.ib', href: '/ib', icon: Handshake, page: 'ib' }],
  },
  {
    titleKey: 'nav.groups.management',
    items: [
      {
        titleKey: 'nav.members',
        href: '/members',
        icon: Users,
        page: 'members',
      },
      { titleKey: 'nav.psps', href: '/psps', icon: CreditCard, page: 'psps' },
      {
        titleKey: 'nav.hr',
        href: '/hr',
        icon: IdentificationCard,
        page: 'hr',
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
        page: 'organizations',
      },
      {
        titleKey: 'nav.security',
        href: '/security',
        icon: Shield,
        page: 'security',
      },
      {
        titleKey: 'nav.audit',
        href: '/audit',
        icon: ClipboardText,
        page: 'audit',
      },
    ],
  },
  {
    titleKey: 'nav.groups.ai',
    items: [{ titleKey: 'nav.future', href: '/ai', icon: Brain, page: 'ai' }],
  },
]
