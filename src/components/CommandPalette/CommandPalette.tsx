import { useEffect, useState, useCallback, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Command } from 'cmdk'
import {
  MagnifyingGlass,
  ArrowsLeftRight,
  CreditCard,
  Users,
  IdentificationCard,
  Handshake,
  CircleNotch,
  ArrowRight,
  Plus,
  Moon,
  Globe,
} from '@phosphor-icons/react'
import { supabase } from '@/lib/supabase'
import { useOrganization } from '@/app/providers/OrganizationProvider'
import { navGroups, type NavItem } from '@/layouts/nav-config'
import { usePagePermissions } from '@/hooks/usePagePermission'
import { useTheme } from '@ds/hooks'
import { useLocale } from '@ds/hooks'
import { SHORTCUT_EVENTS_INTERNAL } from '@/hooks/useGlobalShortcuts'
import { ShortcutHint } from '@/components/ShortcutHint'

interface SearchResult {
  id: string
  label: string
  description?: string
  href: string
  group: string
}

// Derive nav items from the single source of truth (nav-config.ts)
const NAV_ITEMS: NavItem[] = navGroups.flatMap((g) => g.items)

const GROUP_ICONS: Record<string, React.ComponentType<{ size?: number; className?: string }>> = {
  Transfers: ArrowsLeftRight,
  PSPs: CreditCard,
  Members: Users,
  Employees: IdentificationCard,
  IB: Handshake,
}

interface ActionCommand {
  id: string
  labelKey: string
  icon: React.ComponentType<{ size?: number; className?: string }>
  shortcut?: string
}

const ACTION_COMMANDS: ActionCommand[] = [
  {
    id: 'action-new-transfer',
    labelKey: 'commandPalette.actions.newTransfer',
    icon: Plus,
    shortcut: 'Ctrl+N',
  },
  {
    id: 'action-toggle-theme',
    labelKey: 'layout.toggleTheme',
    icon: Moon,
    shortcut: 'Ctrl+Shift+T',
  },
  { id: 'action-toggle-language', labelKey: 'layout.changeLanguage', icon: Globe },
]

interface CommandPaletteProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function CommandPalette({ open, onOpenChange }: CommandPaletteProps) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<SearchResult[]>([])
  const [searching, setSearching] = useState(false)
  const navigate = useNavigate()
  const { t } = useTranslation('pages')
  const { currentOrg } = useOrganization()
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(null)
  const { toggleTheme } = useTheme()
  const { locale, changeLocale } = useLocale()
  const { canAccessPage } = usePagePermissions()

  // Listen for toggle event from useGlobalShortcuts
  useEffect(() => {
    const handler = () => onOpenChange(!open)
    window.addEventListener(SHORTCUT_EVENTS_INTERNAL.TOGGLE_PALETTE, handler)
    return () => window.removeEventListener(SHORTCUT_EVENTS_INTERNAL.TOGGLE_PALETTE, handler)
  }, [open, onOpenChange])

  const runSearch = useCallback(
    async (q: string) => {
      const trimmed = q.trim()
      if (trimmed.length < 2) {
        setResults([])
        setSearching(false)
        return
      }

      setSearching(true)
      const term = `%${trimmed}%`
      const items: SearchResult[] = []

      // Use async IIFEs so TypeScript infers Supabase return types correctly
      const promises: Promise<void>[] = []

      // 1. Transfers — org-scoped, search full_name / crm_id / meta_id
      if (currentOrg?.id) {
        promises.push(
          (async () => {
            const { data } = await supabase
              .from('transfers')
              .select('id, full_name, crm_id, amount, currency')
              .eq('organization_id', currentOrg.id)
              .or(`full_name.ilike.${term},crm_id.ilike.${term},meta_id.ilike.${term}`)
              .limit(5)
            if (data) {
              for (const row of data) {
                items.push({
                  id: `transfer-${row.id}`,
                  label: row.full_name || row.crm_id || 'Transfer',
                  description: `${Math.abs(row.amount)} ${row.currency}`,
                  href: `/transfers?search=${encodeURIComponent(row.full_name || row.crm_id || '')}`,
                  group: 'Transfers',
                })
              }
            }
          })(),
        )
      }

      // 2. PSPs — org-local + global, search by name
      if (currentOrg?.id) {
        promises.push(
          (async () => {
            const { data } = await supabase
              .from('psps')
              .select('id, name')
              .or(`organization_id.eq.${currentOrg.id},scope.eq.global`)
              .ilike('name', term)
              .limit(5)
            if (data) {
              for (const row of data) {
                items.push({
                  id: `psp-${row.id}`,
                  label: row.name,
                  href: `/psps/${row.id}`,
                  group: 'PSPs',
                })
              }
            }
          })(),
        )
      }

      // 3. Members — two-step: get org member IDs, then search profiles.
      if (currentOrg?.id) {
        promises.push(
          (async () => {
            const { data: memberRows } = await supabase
              .from('organization_members')
              .select('user_id')
              .eq('organization_id', currentOrg.id)
            if (!memberRows?.length) return
            const memberIds = memberRows.map((m) => m.user_id)
            const { data } = await supabase
              .from('profiles')
              .select('id, display_name, email')
              .in('id', memberIds)
              .or(`display_name.ilike.${term},email.ilike.${term}`)
              .limit(5)
            if (data) {
              for (const row of data) {
                items.push({
                  id: `member-${row.id}`,
                  label: row.display_name || row.email || 'Member',
                  description: row.email ?? undefined,
                  href: '/members',
                  group: 'Members',
                })
              }
            }
          })(),
        )
      }

      // 4. HR Employees — org-scoped, search full_name / email
      if (currentOrg?.id) {
        promises.push(
          (async () => {
            const { data } = await supabase
              .from('hr_employees')
              .select('id, full_name, email, role')
              .eq('organization_id', currentOrg.id)
              .or(`full_name.ilike.${term},email.ilike.${term}`)
              .limit(5)
            if (data) {
              for (const row of data) {
                items.push({
                  id: `employee-${row.id}`,
                  label: row.full_name,
                  description: `${row.role} · ${row.email}`,
                  href: '/hr',
                  group: 'Employees',
                })
              }
            }
          })(),
        )
      }

      // 5. IB — org-scoped, search by name or referral_code
      if (currentOrg?.id) {
        promises.push(
          (async () => {
            const { data } = await supabase
              .from('ib_partners')
              .select('id, name, referral_code, status')
              .eq('organization_id', currentOrg.id)
              .or(`name.ilike.${term},referral_code.ilike.${term}`)
              .limit(5)
            if (data) {
              for (const row of data) {
                items.push({
                  id: `ib-${row.id}`,
                  label: row.name,
                  description: `${row.referral_code} · ${row.status}`,
                  href: '/ib',
                  group: 'IB',
                })
              }
            }
          })(),
        )
      }

      await Promise.allSettled(promises)
      setResults(items)
      setSearching(false)
    },
    [currentOrg],
  )

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(
      () => {
        if (!query.trim()) {
          setResults([])
        } else {
          void runSearch(query)
        }
      },
      query.trim() ? 300 : 0,
    )
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
    }
  }, [query, runSearch])

  const handleSelect = (href: string) => {
    onOpenChange(false)
    setQuery('')
    setResults([])
    navigate(href)
  }

  const handleAction = useCallback(
    (actionId: string) => {
      onOpenChange(false)
      setQuery('')
      setResults([])
      switch (actionId) {
        case 'action-new-transfer':
          navigate('/transfers/new')
          break
        case 'action-toggle-theme':
          toggleTheme()
          break
        case 'action-toggle-language':
          changeLocale(locale === 'en' ? 'tr' : 'en')
          break
      }
    },
    [onOpenChange, navigate, toggleTheme, changeLocale, locale],
  )

  // Filter nav items client-side — permission-aware + i18n
  const filteredNav = NAV_ITEMS.filter((item) => {
    if (item.page && canAccessPage(item.page) === false) return false
    if (query.trim()) return t(item.titleKey).toLowerCase().includes(query.toLowerCase())
    return true
  })

  // Filter action commands client-side
  const filteredActions = ACTION_COMMANDS.filter((action) => {
    if (query.trim()) return t(action.labelKey).toLowerCase().includes(query.toLowerCase())
    return true
  })

  // Group DB results by entity type
  const groups = new Map<string, SearchResult[]>()
  for (const r of results) {
    const arr = groups.get(r.group) ?? []
    arr.push(r)
    groups.set(r.group, arr)
  }

  return (
    // shouldFilter={false} is the critical fix:
    // cmdk's built-in filter was hiding all DB results because it matched
    // Command.Item value (a UUID) against the typed query — UUIDs never match.
    // We handle all filtering ourselves (nav: client-side, data: via Supabase).
    <Command.Dialog
      open={open}
      onOpenChange={onOpenChange}
      shouldFilter={false}
      label={t('search.title', 'Search')}
      className="fixed inset-0 z-50 flex items-start justify-center pt-[10vh] md:pt-[20vh]"
    >
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black/50" onClick={() => onOpenChange(false)} />

      {/* Dialog */}
      <div className="relative z-10 w-full max-w-lg overflow-hidden rounded-xl border border-black/10 bg-bg1 shadow-2xl">
        {/* Search input */}
        <div className="flex items-center gap-2 border-b border-black/[0.06] px-4">
          {searching ? (
            <CircleNotch size={16} className="shrink-0 animate-spin text-black/40" />
          ) : (
            <MagnifyingGlass size={16} className="shrink-0 text-black/30" />
          )}
          <Command.Input
            value={query}
            onValueChange={setQuery}
            placeholder={t(
              'commandPalette.placeholder',
              'Search transfers, PSPs, members, partners...',
            )}
            className="h-12 w-full bg-transparent text-sm text-black outline-none placeholder:text-black/30"
          />
          <kbd className="hidden shrink-0 rounded border border-black/10 bg-black/[0.04] px-1.5 py-0.5 font-mono text-[10px] text-black/30 sm:block">
            ESC
          </kbd>
        </div>

        {/* Results */}
        <Command.List className="max-h-[360px] overflow-y-auto p-2">
          <Command.Empty className="px-4 py-8 text-center text-xs text-black/35">
            {searching
              ? t('search.searching', 'Searching...')
              : t('search.noResults', 'No results found.')}
          </Command.Empty>

          {/* Navigation group */}
          {filteredNav.length > 0 && (
            <Command.Group
              heading={t('search.navigation', 'Navigation')}
              className="[&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:py-1.5 [&_[cmdk-group-heading]]:text-[10px] [&_[cmdk-group-heading]]:font-semibold [&_[cmdk-group-heading]]:uppercase [&_[cmdk-group-heading]]:tracking-wider [&_[cmdk-group-heading]]:text-black/30"
            >
              {filteredNav.map((item) => {
                const Icon = item.icon
                const label = t(item.titleKey)
                return (
                  <Command.Item
                    key={item.href}
                    value={`nav-${item.titleKey}`}
                    onSelect={() => handleSelect(item.href)}
                    className="flex cursor-pointer items-center gap-3 rounded-lg px-3 py-2 text-sm text-black/70 transition-colors data-[selected=true]:bg-black/[0.06] data-[selected=true]:text-black"
                  >
                    <Icon size={16} className="shrink-0 text-black/30" />
                    <span>{label}</span>
                    <ArrowRight size={13} className="ml-auto shrink-0 text-black/20" />
                  </Command.Item>
                )
              })}
            </Command.Group>
          )}

          {/* Actions group */}
          {filteredActions.length > 0 && (
            <Command.Group
              heading={t('commandPalette.actions.heading', 'Actions')}
              className="[&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:py-1.5 [&_[cmdk-group-heading]]:text-[10px] [&_[cmdk-group-heading]]:font-semibold [&_[cmdk-group-heading]]:uppercase [&_[cmdk-group-heading]]:tracking-wider [&_[cmdk-group-heading]]:text-black/30"
            >
              {filteredActions.map((action) => {
                const Icon = action.icon
                return (
                  <Command.Item
                    key={action.id}
                    value={action.id}
                    onSelect={() => handleAction(action.id)}
                    className="flex cursor-pointer items-center gap-3 rounded-lg px-3 py-2 text-sm text-black/70 transition-colors data-[selected=true]:bg-black/[0.06] data-[selected=true]:text-black"
                  >
                    <Icon size={16} className="shrink-0 text-black/30" />
                    <span>{t(action.labelKey)}</span>
                    {action.shortcut && <ShortcutHint keys={action.shortcut} />}
                  </Command.Item>
                )
              })}
            </Command.Group>
          )}

          {/* Dynamic DB results grouped by entity type */}
          {Array.from(groups.entries()).map(([groupName, groupItems]) => {
            const GroupIcon = GROUP_ICONS[groupName]
            return (
              <Command.Group
                key={groupName}
                heading={groupName}
                className="[&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:py-1.5 [&_[cmdk-group-heading]]:text-[10px] [&_[cmdk-group-heading]]:font-semibold [&_[cmdk-group-heading]]:uppercase [&_[cmdk-group-heading]]:tracking-wider [&_[cmdk-group-heading]]:text-black/30"
              >
                {groupItems.map((item) => (
                  <Command.Item
                    key={item.id}
                    value={item.id}
                    onSelect={() => handleSelect(item.href)}
                    className="flex cursor-pointer items-center justify-between gap-3 rounded-lg px-3 py-2 text-sm text-black/70 transition-colors data-[selected=true]:bg-black/[0.06] data-[selected=true]:text-black"
                  >
                    <div className="flex min-w-0 items-center gap-3">
                      {GroupIcon && <GroupIcon size={15} className="shrink-0 text-black/30" />}
                      <span className="truncate">{item.label}</span>
                    </div>
                    {item.description && (
                      <span className="shrink-0 text-xs text-black/30">{item.description}</span>
                    )}
                  </Command.Item>
                ))}
              </Command.Group>
            )
          })}
        </Command.List>
      </div>
    </Command.Dialog>
  )
}
