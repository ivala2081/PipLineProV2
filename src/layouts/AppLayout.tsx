import { useEffect, useState, type FormEvent, type ReactNode } from 'react'
import { useLocation, useNavigate, Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import {
  Buildings,
  CaretUpDown,
  Check,
  PencilSimple,
  SignOut,
  Moon,
  Sun,
  Globe,
  Lightning,
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

import { navGroups } from '@/layouts/nav-config'

/* ------------------------------------------------------------------ */
/*  Sidebar Brand (logo + org name)                                    */
/* ------------------------------------------------------------------ */

function SidebarBrand() {
  const { currentOrg } = useOrganization()
  const { state } = useSidebar()
  const isCollapsed = state === 'collapsed'

  return (
    <div className="flex items-center gap-2.5 px-2 py-1">
      {/* Logo mark */}
      <div className="flex aspect-square size-8 shrink-0 items-center justify-center rounded-lg bg-brand text-white">
        <Lightning size={18} weight="fill" />
      </div>

      {/* Brand text — hidden when sidebar is collapsed */}
      {!isCollapsed && (
        <div className="grid flex-1 text-left leading-tight">
          <span className="truncate text-sm font-bold tracking-tight text-black">
            PipLinePro
          </span>
          {currentOrg && (
            <span className="truncate text-[11px] text-black/50">
              {currentOrg.name}
            </span>
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
  const tNav = t as (key: string) => string

  return (
    <>
      {navGroups.map((group, idx) => (
        <SidebarGroup key={group.titleKey}>
          {idx > 0 && <SidebarSeparator className="mb-2" />}
          <SidebarGroupLabel>{tNav(group.titleKey)}</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {group.items.map((item) => {
                const Icon = item.icon
                const isActive = item.href === '/'
                  ? location.pathname === '/'
                  : location.pathname.startsWith(item.href)

                return (
                  <SidebarMenuItem key={item.href}>
                    <SidebarMenuButton
                      asChild
                      isActive={isActive}
                      tooltip={tNav(item.titleKey)}
                    >
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
      ))}
    </>
  )
}

/* ------------------------------------------------------------------ */
/*  Edit Profile Dialog                                                */
/* ------------------------------------------------------------------ */

function EditProfileDialog({
  open,
  onClose,
}: {
  open: boolean
  onClose: () => void
}) {
  const { t } = useTranslation('pages')
  const { user, profile, refreshProfile } = useAuth()
  const [displayName, setDisplayName] = useState('')
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Sync state when dialog opens
  useEffect(() => {
    if (open) {
      setDisplayName(profile?.display_name ?? '')
      setError(null)
    }
  }, [open, profile?.display_name])

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
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>{t('layout.profile.editTitle')}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label>{t('layout.profile.email')}</Label>
            <Input
              value={user?.email ?? ''}
              disabled
              className="text-black/50"
            />
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
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={isSaving}
            >
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
      : membership?.role === 'operation'
        ? { label: 'Operation', variant: 'blue' as const }
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
              <SidebarMenuButton
                size="lg"
                className="data-[state=open]:bg-black/8"
              >
                <Avatar className="size-8">
                  <AvatarImage src={profile?.avatar_url ?? undefined} alt={displayName} />
                  <AvatarFallback className="text-xs font-medium">{initials}</AvatarFallback>
                </Avatar>
                <div className="grid flex-1 text-left text-sm leading-tight">
                  <span className="truncate font-semibold">{displayName}</span>
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
              <DropdownMenuSeparator />
              <DropdownMenuItem onSelect={() => void handleSignOut()}>
                <SignOut size={16} />
                <span>{t('layout.signOut')}</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </SidebarMenuItem>
      </SidebarMenu>

      <EditProfileDialog
        open={editProfileOpen}
        onClose={() => setEditProfileOpen(false)}
      />
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
          <Buildings size={14} />
          <span className="max-w-[120px] truncate">{currentOrg?.name ?? t('layout.noOrganization')}</span>
          <CaretUpDown size={12} className="text-black/40" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" sideOffset={4} className="min-w-48">
        <DropdownMenuLabel>{t('layout.organizations')}</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {organizations.map((org) => (
          <DropdownMenuItem
            key={org.id}
            onSelect={() => selectOrg(org.id)}
          >
            <div className="flex aspect-square size-5 items-center justify-center rounded bg-brand/10 text-brand text-[10px] font-bold">
              {org.name.charAt(0).toUpperCase()}
            </div>
            <span className="truncate">{org.name}</span>
            {org.id === currentOrg?.id && (
              <Check size={14} className="ml-auto text-brand" />
            )}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

function HeaderBar() {
  const { t } = useTranslation('pages')
  const location = useLocation()
  const { toggleTheme, resolvedTheme } = useTheme()
  const { locale, changeLocale, localeNames } = useLocale()
  const tNav = t as (key: string) => string

  const nextLocale = locale === 'en' ? 'tr' : 'en'

  // Find current nav item + its group for breadcrumb
  let currentGroup: (typeof navGroups)[number] | undefined
  let currentItem: (typeof navGroups)[number]['items'][number] | undefined

  for (const group of navGroups) {
    const found = group.items.find((item) =>
      item.href === '/'
        ? location.pathname === '/'
        : location.pathname.startsWith(item.href),
    )
    if (found) {
      currentGroup = group
      currentItem = found
      break
    }
  }

  return (
    <header className="relative z-20 flex h-14 shrink-0 items-center gap-2 border-b border-black/15 bg-bg1 px-4">
      <SidebarTrigger className="-ml-1" />
      <Separator orientation="vertical" className="mr-2 h-4" />

      {/* Breadcrumb: Group > Page */}
      <nav className="flex items-center gap-1.5 text-sm">
        {currentGroup && currentItem && currentItem.href !== '/' && (
          <>
            <span className="text-black/60">{tNav(currentGroup.titleKey)}</span>
            <span className="text-black/30">/</span>
          </>
        )}
        {currentItem && (
          <span className="font-medium text-black">{tNav(currentItem.titleKey)}</span>
        )}
      </nav>

      {/* Right side controls */}
      <div className="ml-auto flex items-center gap-1">
        <HeaderOrgSwitcher />
        <Separator orientation="vertical" className="mx-1 h-4" />
        <button
          onClick={() => changeLocale(nextLocale)}
          className="flex h-8 items-center gap-1.5 rounded-md px-2 text-xs font-medium text-black/70 hover:bg-black/8 hover:text-black"
          aria-label={t('layout.changeLanguage')}
        >
          <Globe size={16} />
          <span className="hidden sm:inline">{localeNames[locale as keyof typeof localeNames]}</span>
        </button>
        <button
          onClick={toggleTheme}
          className="flex size-8 items-center justify-center rounded-md text-black/70 hover:bg-black/8 hover:text-black"
          aria-label={t('layout.toggleTheme')}
        >
          {resolvedTheme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
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
      <SidebarInset className="max-h-svh min-w-0 w-full overflow-hidden">
        <HeaderBar />
        <div className="min-h-0 min-w-0 flex-1 overflow-y-auto p-4 md:p-6">
          {children}
        </div>
      </SidebarInset>
    </SidebarProvider>
  )
}
