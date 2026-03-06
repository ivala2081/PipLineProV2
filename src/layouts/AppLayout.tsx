import { useState, type FormEvent, type ReactNode } from 'react'
import { useLocation, useNavigate, Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import {
  CaretUpDown,
  Check,
  PencilSimple,
  SignOut,
  Moon,
  Sun,
  Monitor,
  Globe,
  MagnifyingGlass,
  Gear,
} from '@phosphor-icons/react'

import { useAuth } from '@/app/providers/AuthProvider'
import { useOrganization } from '@/app/providers/OrganizationProvider'
import { supabase } from '@/lib/supabase'
import {
  SidebarProvider,
  Sidebar,
  SidebarHeader,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarSeparator,
  SidebarInset,
  SidebarTrigger,
  SidebarRail,
  useSidebar,
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  Avatar,
  AvatarImage,
  AvatarFallback,
  Button,
  Input,
  Label,
  Tag,
  Separator,
  useTheme,
} from '@ds'
import { useLocale } from '@ds/hooks'
import { cn } from '@ds/utils'

import { navGroups } from '@/layouts/nav-config'
import { usePagePermissions } from '@/hooks/usePagePermission'
import { AvatarUpload } from '@/components/AvatarUpload'
import { OnlineCount } from '@/components/OnlineCount'
import { NotificationBell } from '@/components/NotificationBell'
import { CommandPalette } from '@/components/CommandPalette/CommandPalette'
import { BottomNav } from '@/components/BottomNav'
import { PwaUpdatePrompt } from '@/components/PwaUpdatePrompt'

/* ------------------------------------------------------------------ */
/*  Sidebar Brand (logo + org name)                                    */
/* ------------------------------------------------------------------ */

function SidebarBrand() {
  const { currentOrg } = useOrganization()
  const { state } = useSidebar()
  const { resolvedTheme } = useTheme()
  const isCollapsed = state === 'collapsed'
  const logoSize = isCollapsed ? 'size-6' : 'size-8'

  const logoIcon =
    resolvedTheme === 'dark' ? '/logo/logo-icon-white.png' : '/logo/logo-icon-dark.png'

  return (
    <div
      className={cn('flex items-center gap-2.5 py-1', isCollapsed ? 'justify-center px-0' : 'px-2')}
    >
      {/* Logo mark */}
      <div
        className={cn(
          'flex aspect-square shrink-0 items-center justify-center overflow-hidden rounded-lg',
          logoSize,
        )}
      >
        <img src={logoIcon} alt="PipLinePro" className="size-full object-contain" />
      </div>

      {/* Brand text — hidden when sidebar is collapsed */}
      {!isCollapsed && (
        <div className="grid flex-1 text-left leading-tight">
          <span className="truncate text-sm font-bold tracking-tight text-black">
            PipLinePro
            <span className="ml-1 text-[10px] font-medium text-black/30">V2.1</span>
          </span>
          {currentOrg && (
            <span className="truncate text-[11px] text-black/50">{currentOrg.name}</span>
          )}
        </div>
      )}
    </div>
  )
}

/* ------------------------------------------------------------------ */
/*  Sidebar Navigation                                                 */
/* ------------------------------------------------------------------ */

function SidebarNav() {
  const { t } = useTranslation('pages')
  const location = useLocation()
  const { isGod } = useAuth()
  const { membership } = useOrganization()
  const tNav = t as (key: string) => string

  // Determine effective role for nav filtering
  const effectiveRole = isGod ? 'god' : membership?.role
  const { canAccessPage } = usePagePermissions()

  return (
    <>
      {navGroups.map((group, idx) => {
        // Filter items by role and page-level permissions
        const visibleItems = group.items.filter((item) => {
          if (item.roles && !(effectiveRole && item.roles.includes(effectiveRole))) return false
          if (item.page && !canAccessPage(item.page)) return false
          return true
        })
        if (visibleItems.length === 0) return null

        return (
          <SidebarGroup key={group.titleKey || `group-${idx}`}>
            {idx > 0 && <SidebarSeparator className="mb-2" />}
            {group.titleKey && <SidebarGroupLabel>{tNav(group.titleKey)}</SidebarGroupLabel>}
            <SidebarGroupContent>
              <SidebarMenu>
                {visibleItems.map((item) => {
                  const Icon = item.icon
                  const isActive =
                    item.href === '/'
                      ? location.pathname === '/'
                      : location.pathname.startsWith(item.href)

                  return (
                    <SidebarMenuItem key={item.href}>
                      <SidebarMenuButton asChild isActive={isActive} tooltip={tNav(item.titleKey)}>
                        <Link to={item.href}>
                          <Icon size={18} weight={isActive ? 'fill' : 'regular'} />
                          <span>{tNav(item.titleKey)}</span>
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  )
                })}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )
      })}
    </>
  )
}

/* ------------------------------------------------------------------ */
/*  Edit Profile Dialog                                                */
/* ------------------------------------------------------------------ */

function EditProfileDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { t } = useTranslation('pages')
  const { user, profile, refreshProfile } = useAuth()
  const [displayName, setDisplayName] = useState('')
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Sync state when dialog opens (adjusting state during render)
  const [prevOpen, setPrevOpen] = useState(false)
  if (open !== prevOpen) {
    setPrevOpen(open)
    if (open) {
      setDisplayName(profile?.display_name ?? '')
      setError(null)
    }
  }

  const getInitials = (name: string | null) => {
    if (!name) return '?'
    return name
      .split(' ')
      .map((w) => w[0])
      .join('')
      .toUpperCase()
      .slice(0, 2)
  }

  const handleAvatarUpload = async () => {
    await refreshProfile()
  }

  const handleAvatarRemove = async () => {
    await refreshProfile()
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    if (!user) return

    const trimmed = displayName.trim()
    if (!trimmed) {
      setError(t('layout.profile.validation.nameRequired'))
      return
    }

    setIsSaving(true)
    setError(null)

    const { error: dbError } = await supabase
      .from('profiles')
      .update({ display_name: trimmed })
      .eq('id', user.id)

    if (dbError) {
      setError(dbError.message)
      setIsSaving(false)
      return
    }

    await refreshProfile()
    setIsSaving(false)
    onClose()
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent size="sm">
        <DialogHeader>
          <DialogTitle>{t('layout.profile.editTitle')}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Avatar Upload */}
          <div className="flex justify-center">
            <AvatarUpload
              userId={user?.id ?? ''}
              currentAvatarUrl={profile?.avatar_url ?? null}
              fallbackText={getInitials(profile?.display_name ?? null)}
              onUploadSuccess={handleAvatarUpload}
              onRemoveSuccess={handleAvatarRemove}
              size="lg"
              editable={true}
            />
          </div>

          <div className="space-y-2">
            <Label>{t('layout.profile.email')}</Label>
            <Input value={user?.email ?? ''} disabled className="text-black/50" />
          </div>
          <div className="space-y-2">
            <Label>{t('layout.profile.displayName')}</Label>
            <Input
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder={t('layout.profile.displayNamePlaceholder')}
              autoFocus
            />
            {error && <p className="text-xs text-red">{error}</p>}
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose} disabled={isSaving}>
              {t('layout.profile.cancel')}
            </Button>
            <Button type="submit" variant="filled" disabled={isSaving}>
              {isSaving ? t('layout.profile.saving') : t('layout.profile.save')}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

/* ------------------------------------------------------------------ */
/*  User Menu (sidebar footer)                                         */
/* ------------------------------------------------------------------ */

function UserMenu() {
  const { t } = useTranslation('pages')
  const { user, profile, isGod, signOut } = useAuth()
  const { membership } = useOrganization()
  const navigate = useNavigate()
  const [isSigningOut, setIsSigningOut] = useState(false)
  const [editProfileOpen, setEditProfileOpen] = useState(false)

  const email = user?.email ?? ''
  const displayName = profile?.display_name || email.split('@')[0] || '?'
  const initials = displayName.charAt(0).toUpperCase()

  const roleBadge = isGod
    ? { label: 'God', variant: 'red' as const }
    : membership?.role === 'admin'
      ? { label: 'Admin', variant: 'green' as const }
      : membership?.role === 'manager'
        ? { label: 'Manager', variant: 'purple' as const }
        : membership?.role === 'operation'
          ? { label: 'Operation', variant: 'blue' as const }
          : membership?.role === 'ik'
            ? { label: 'İK', variant: 'orange' as const }
            : null

  const handleSignOut = async () => {
    if (isSigningOut) return

    setIsSigningOut(true)
    try {
      const { error } = await signOut()
      if (error) {
        console.error('[AppLayout] Sign out error:', error)
      }
    } finally {
      try {
        localStorage.removeItem('piplinepro-org')
      } catch {
        // ignore
      }
      navigate('/login', { replace: true })
    }
  }

  return (
    <>
      <SidebarMenu>
        <SidebarMenuItem>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <SidebarMenuButton size="lg" className="data-[state=open]:bg-black/8">
                <Avatar className="size-8">
                  <AvatarImage src={profile?.avatar_url ?? undefined} alt={displayName} />
                  <AvatarFallback className="text-xs font-medium">{initials}</AvatarFallback>
                </Avatar>
                <div className="grid flex-1 text-left text-sm leading-tight">
                  <div className="flex items-center gap-1.5">
                    <span className="truncate font-semibold">{displayName}</span>
                    {roleBadge && (
                      <Tag variant={roleBadge.variant} className="shrink-0 text-[9px]">
                        {roleBadge.label}
                      </Tag>
                    )}
                  </div>
                  <span className="truncate text-xs text-black/50">{email}</span>
                </div>
                <CaretUpDown size={16} className="ml-auto text-black/60" />
              </SidebarMenuButton>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              className="w-[--radix-dropdown-menu-trigger-width] min-w-56"
              side="bottom"
              align="end"
              sideOffset={4}
            >
              <DropdownMenuLabel className="font-normal">
                <div className="flex items-start gap-3">
                  <Avatar className="size-9">
                    <AvatarImage src={profile?.avatar_url ?? undefined} alt={displayName} />
                    <AvatarFallback className="text-xs font-medium">{initials}</AvatarFallback>
                  </Avatar>
                  <div className="flex flex-col gap-0.5">
                    <p className="text-sm font-medium leading-tight">{displayName}</p>
                    <p className="text-xs text-black/50 leading-tight">{email}</p>
                    {roleBadge && (
                      <Tag variant={roleBadge.variant} className="mt-1 w-fit text-[10px]">
                        {roleBadge.label}
                      </Tag>
                    )}
                  </div>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onSelect={() => setEditProfileOpen(true)}>
                <PencilSimple size={16} />
                <span>{t('layout.profile.edit')}</span>
              </DropdownMenuItem>
              <DropdownMenuItem onSelect={() => navigate('/settings')}>
                <Gear size={16} />
                <span>{t('nav.settings', 'Settings')}</span>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onSelect={() => void handleSignOut()}>
                <SignOut size={16} />
                <span>{t('layout.signOut')}</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </SidebarMenuItem>
      </SidebarMenu>

      <EditProfileDialog open={editProfileOpen} onClose={() => setEditProfileOpen(false)} />
    </>
  )
}

/* ------------------------------------------------------------------ */
/*  Header Bar                                                         */
/* ------------------------------------------------------------------ */

function HeaderOrgSwitcher() {
  const { t } = useTranslation('pages')
  const { currentOrg, organizations, selectOrg } = useOrganization()

  if (organizations.length === 0) return null

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button className="flex h-8 items-center gap-1.5 rounded-md border border-black/10 bg-black/[0.02] px-2.5 text-xs font-medium text-black/70 hover:bg-black/8 hover:text-black">
          {currentOrg?.logo_url ? (
            <div className="flex size-4 items-center justify-center overflow-hidden rounded border border-black/10 bg-black/5">
              <img
                src={currentOrg.logo_url}
                alt={currentOrg.name}
                className="size-full object-cover"
              />
            </div>
          ) : (
            <div className="flex size-4 items-center justify-center rounded bg-brand/10 text-brand text-[8px] font-bold leading-none">
              {currentOrg?.name.charAt(0).toUpperCase() ?? 'O'}
            </div>
          )}
          <span className="max-w-[120px] truncate">
            {currentOrg?.name ?? t('layout.noOrganization')}
          </span>
          <CaretUpDown size={12} className="text-black/40" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" sideOffset={4} className="min-w-48">
        <DropdownMenuLabel>{t('layout.organizations')}</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {organizations.map((org) => (
          <DropdownMenuItem key={org.id} onSelect={() => selectOrg(org.id)}>
            {org.logo_url ? (
              <div className="flex size-5 items-center justify-center overflow-hidden rounded border border-black/10 bg-black/5">
                <img src={org.logo_url} alt={org.name} className="size-full object-cover" />
              </div>
            ) : (
              <div className="flex aspect-square size-5 items-center justify-center rounded bg-brand/10 text-brand text-[10px] font-bold">
                {org.name.charAt(0).toUpperCase()}
              </div>
            )}
            <span className="truncate">{org.name}</span>
            {org.id === currentOrg?.id && <Check size={14} className="ml-auto text-brand" />}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

function HeaderBar() {
  const { t } = useTranslation('pages')
  const location = useLocation()
  const { theme, toggleTheme, resolvedTheme } = useTheme()
  const { locale, changeLocale, localeNames } = useLocale()
  const tNav = t as (key: string) => string

  const nextLocale = locale === 'en' ? 'tr' : 'en'

  // Find current nav item + its group for breadcrumb
  let currentGroup: (typeof navGroups)[number] | undefined
  let currentItem: (typeof navGroups)[number]['items'][number] | undefined

  for (const group of navGroups) {
    const found = group.items.find((item) =>
      item.href === '/' ? location.pathname === '/' : location.pathname.startsWith(item.href),
    )
    if (found) {
      currentGroup = group
      currentItem = found
      break
    }
  }

  return (
    <header className="relative z-20 flex h-12 shrink-0 items-center gap-2 border-b border-black/15 bg-bg1 px-3 md:h-14 md:px-4">
      <SidebarTrigger className="-ml-1" />
      <button
        onClick={() =>
          window.dispatchEvent(new KeyboardEvent('keydown', { key: 'k', ctrlKey: true }))
        }
        className="flex size-9 items-center justify-center rounded-md text-black/50 hover:bg-black/8 hover:text-black md:hidden"
        aria-label="Search"
      >
        <MagnifyingGlass size={18} />
      </button>
      <Separator orientation="vertical" className="mr-2 hidden h-4 md:block" />

      {/* Breadcrumb: Page name only on mobile, Group > Page on desktop */}
      <nav className="flex items-center gap-1.5 text-sm">
        {currentGroup && currentItem && currentItem.href !== '/' && (
          <>
            <span className="hidden text-black/60 md:inline">{tNav(currentGroup.titleKey)}</span>
            <span className="hidden text-black/30 md:inline">/</span>
          </>
        )}
        {currentItem && (
          <span className="font-medium text-black">{tNav(currentItem.titleKey)}</span>
        )}
      </nav>

      {/* Right side controls */}
      <div className="ml-auto flex items-center gap-1">
        {/* Cmd+K search trigger — hidden on mobile */}
        <button
          onClick={() =>
            window.dispatchEvent(new KeyboardEvent('keydown', { key: 'k', ctrlKey: true }))
          }
          className="hidden h-8 items-center gap-2 rounded-md border border-black/10 bg-black/[0.02] px-2.5 text-xs text-black/50 hover:bg-black/8 hover:text-black/70 md:flex"
        >
          <MagnifyingGlass size={14} />
          <span className="hidden sm:inline">{t('search.placeholder', 'Search...')}</span>
          <kbd className="hidden rounded border border-black/10 bg-black/[0.04] px-1 py-0.5 font-mono text-[10px] sm:inline">
            Ctrl+K
          </kbd>
        </button>
        <Separator orientation="vertical" className="mx-1 hidden h-4 md:block" />
        <span className="hidden md:inline-flex">
          <OnlineCount />
        </span>
        <Separator orientation="vertical" className="mx-1 hidden h-4 md:block" />
        <NotificationBell />
        <Separator orientation="vertical" className="mx-1 hidden h-4 md:block" />
        <HeaderOrgSwitcher />
        <Separator orientation="vertical" className="mx-1 hidden h-4 md:block" />
        <button
          onClick={() => changeLocale(nextLocale)}
          className="flex h-8 items-center gap-1.5 rounded-md px-2 text-xs font-medium text-black/70 hover:bg-black/8 hover:text-black"
          aria-label={t('layout.changeLanguage')}
        >
          <Globe size={16} />
          <span className="hidden sm:inline">
            {localeNames[locale as keyof typeof localeNames]}
          </span>
        </button>
        <button
          onClick={toggleTheme}
          className="flex size-8 items-center justify-center rounded-md text-black/70 hover:bg-black/8 hover:text-black"
          aria-label={t('layout.toggleTheme')}
        >
          {theme === 'system' ? (
            <Monitor size={16} />
          ) : resolvedTheme === 'dark' ? (
            <Sun size={16} />
          ) : (
            <Moon size={16} />
          )}
        </button>
      </div>
    </header>
  )
}

/* ------------------------------------------------------------------ */
/*  App Layout                                                         */
/* ------------------------------------------------------------------ */

export function AppLayout({ children }: { children: ReactNode }) {
  return (
    <SidebarProvider defaultOpen={true}>
      <Sidebar variant="sidebar" collapsible="icon">
        <SidebarHeader>
          <SidebarBrand />
        </SidebarHeader>
        <SidebarContent>
          <SidebarNav />
        </SidebarContent>
        <SidebarFooter>
          <UserMenu />
        </SidebarFooter>
        <SidebarRail />
      </Sidebar>
      <SidebarInset className="max-h-dvh min-w-0 w-full overflow-hidden">
        <HeaderBar />
        <div className="min-h-0 min-w-0 flex-1 overflow-y-auto p-3 pb-20 md:p-6 md:pb-6">
          {children}
        </div>
      </SidebarInset>
      <BottomNav />
      <PwaUpdatePrompt />
      <CommandPalette />
    </SidebarProvider>
  )
}
