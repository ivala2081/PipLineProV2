import { useEffect, useState, useCallback, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Command } from 'cmdk'
import {
  MagnifyingGlass,
  House,
  ArrowsLeftRight,
  BookOpen,
  CreditCard,
  Users,
  Buildings,
  Shield,
  IdentificationCard,
  Gear,
  Brain,
  CircleNotch,
  ArrowRight,
} from '@phosphor-icons/react'
import { supabase } from '@/lib/supabase'
import { useOrganization } from '@/app/providers/OrganizationProvider'

interface SearchResult {
  id: string
  label: string
  description?: string
  href: string
  group: string
}

const NAV_ITEMS = [
  { label: 'Dashboard', href: '/', icon: House },
  { label: 'Transfers', href: '/transfers', icon: ArrowsLeftRight },
  { label: 'Accounting', href: '/accounting', icon: BookOpen },
  { label: 'PSPs', href: '/psps', icon: CreditCard },
  { label: 'Members', href: '/members', icon: Users },
  { label: 'Organizations', href: '/organizations', icon: Buildings },
  { label: 'Security', href: '/security', icon: Shield },
  { label: 'HR', href: '/hr', icon: IdentificationCard },
  { label: 'Settings', href: '/settings', icon: Gear },
  { label: 'AI Assistant', href: '/ai', icon: Brain },
]

const GROUP_ICONS: Record<string, React.ComponentType<{ size?: number; className?: string }>> = {
  Transfers: ArrowsLeftRight,
  PSPs: CreditCard,
  Members: Users,
  Employees: IdentificationCard,
}

export function CommandPalette() {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<SearchResult[]>([])
  const [searching, setSearching] = useState(false)
  const navigate = useNavigate()
  const { t } = useTranslation('pages')
  const { currentOrg } = useOrganization()
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(null)

  // Keyboard shortcut: Ctrl+K / Cmd+K
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault()
        setOpen((prev) => !prev)
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])

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
      //    profiles.id → auth.users.id ← organization_members.user_id (no direct FK),
      //    so we can't use PostgREST !inner join from profiles side.
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

      await Promise.allSettled(promises)
      setResults(items)
      setSearching(false)
    },
    // React Compiler infers `currentOrg` (the object); optional-chaining in the
    // dep array is less specific and triggers preserve-manual-memoization.
    // Using the full object is safe — runSearch only reads currentOrg.id.
    [currentOrg],
  )

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    // Avoid synchronous setState inside effect body (react-hooks/set-state-in-effect).
    // Use a 0 ms timeout for the clear path so the setState is always async.
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
    setOpen(false)
    setQuery('')
    setResults([])
    navigate(href)
  }

  // Filter nav items client-side
  const filteredNav = query.trim()
    ? NAV_ITEMS.filter((item) => item.label.toLowerCase().includes(query.toLowerCase()))
    : NAV_ITEMS

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
      onOpenChange={setOpen}
      shouldFilter={false}
      label={t('search.title', 'Search')}
      className="fixed inset-0 z-50 flex items-start justify-center pt-[20vh]"
    >
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black/50" onClick={() => setOpen(false)} />

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
            placeholder={t('search.placeholder', 'Search transfers, PSPs, members, employees...')}
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
              {filteredNav.map((item) => (
                <Command.Item
                  key={item.href}
                  value={`nav-${item.label}`}
                  onSelect={() => handleSelect(item.href)}
                  className="flex cursor-pointer items-center gap-3 rounded-lg px-3 py-2 text-sm text-black/70 transition-colors data-[selected=true]:bg-black/[0.06] data-[selected=true]:text-black"
                >
                  <item.icon size={16} className="shrink-0 text-black/30" />
                  <span>{item.label}</span>
                  <ArrowRight size={13} className="ml-auto shrink-0 text-black/20" />
                </Command.Item>
              ))}
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
