'use client'

import { SidebarSimple } from '@phosphor-icons/react'
import { Slot } from '@radix-ui/react-slot'
import { cva, type VariantProps } from 'class-variance-authority'
import {
  type ComponentProps,
  type CSSProperties,
  createContext,
  type FC,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react'
import { useTranslation } from 'react-i18next'
import { cn } from '@ds/utils'
import { useIsMobile } from '@ds/hooks'
import { Button, type ButtonProps } from '../Button'
import { Input, type InputProps } from '../Input'
import { Separator, type SeparatorProps } from '../Separator'
import { Sheet, SheetContent } from '../Sheet'
import { Skeleton } from '../Skeleton'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '../Tooltip'

const SIDEBAR_COOKIE_NAME = 'sidebar:state'
const SIDEBAR_COOKIE_MAX_AGE = 60 * 60 * 24 * 7
const SIDEBAR_WIDTH = '14rem'
const SIDEBAR_WIDTH_ICON = '2.75rem'
const SIDEBAR_KEYBOARD_SHORTCUT = 'b'

type SidebarContextType = {
  state: 'expanded' | 'collapsed'
  open: boolean
  setOpen: (open: boolean) => void
  openMobile: boolean
  setOpenMobile: (open: boolean) => void
  isMobile: boolean
  toggleSidebar: () => void
}

const SidebarContext = createContext<SidebarContextType | null>(null)

// eslint-disable-next-line react-refresh/only-export-components -- Sidebar exports provider + hooks + components
export function useSidebar() {
  const context = useContext(SidebarContext)
  if (!context) throw new Error('useSidebar must be used within a SidebarProvider.')
  return context
}

export type SidebarProviderProps = ComponentProps<'div'> & {
  defaultOpen?: boolean
  open?: boolean
  onOpenChange?: (open: boolean) => void
}

export const SidebarProvider: FC<SidebarProviderProps> = ({
  defaultOpen = true,
  open: openProp,
  onOpenChange: setOpenProp,
  className,
  style,
  children,
  ...props
}) => {
  const isMobile = useIsMobile()
  const [openMobile, setOpenMobile] = useState(false)
  const [_open, _setOpen] = useState(defaultOpen)
  const open = openProp ?? _open

  const setOpen = useCallback(
    (value: boolean | ((value: boolean) => boolean)) => {
      const openState = typeof value === 'function' ? value(open) : value
      if (setOpenProp) {
        setOpenProp(openState)
      } else {
        _setOpen(openState)
      }
      document.cookie = `${SIDEBAR_COOKIE_NAME}=${openState}; path=/; max-age=${SIDEBAR_COOKIE_MAX_AGE}`
    },
    [setOpenProp, open],
  )

  const toggleSidebar = useCallback(() => {
    return isMobile ? setOpenMobile((o) => !o) : setOpen((o) => !o)
  }, [isMobile, setOpen])

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === SIDEBAR_KEYBOARD_SHORTCUT && (event.metaKey || event.ctrlKey)) {
        event.preventDefault()
        toggleSidebar()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [toggleSidebar])

  const state = open ? 'expanded' : 'collapsed'

  const contextValue = useMemo<SidebarContextType>(
    () => ({ state, open, setOpen, isMobile, openMobile, setOpenMobile, toggleSidebar }),
    [state, open, setOpen, isMobile, openMobile, setOpenMobile, toggleSidebar],
  )

  return (
    <SidebarContext value={contextValue}>
      <TooltipProvider delayDuration={0}>
        <div
          style={
            {
              '--sidebar-width': SIDEBAR_WIDTH,
              '--sidebar-width-icon': SIDEBAR_WIDTH_ICON,
              ...style,
            } as CSSProperties
          }
          className={cn(
            'group/sidebar-wrapper flex min-h-svh w-full bg-bg1 has-[[data-variant=inset]]:bg-bg2',
            className,
          )}
          {...props}
        >
          {children}
        </div>
      </TooltipProvider>
    </SidebarContext>
  )
}
SidebarProvider.displayName = 'SidebarProvider'

export type SidebarProps = ComponentProps<'div'> & {
  side?: 'left' | 'right'
  variant?: 'sidebar' | 'floating' | 'inset'
  collapsible?: 'offcanvas' | 'icon' | 'none'
}

export const Sidebar: FC<SidebarProps> = ({
  side = 'left',
  variant = 'sidebar',
  collapsible = 'offcanvas',
  className,
  children,
  ...props
}) => {
  const { isMobile, state, openMobile, setOpenMobile } = useSidebar()

  if (collapsible === 'none') {
    return (
      <div
        className={cn('flex h-full w-[--sidebar-width] flex-col bg-bg2 text-black', className)}
        {...props}
      >
        {children}
      </div>
    )
  }

  if (isMobile) {
    return (
      <Sheet open={openMobile} onOpenChange={setOpenMobile}>
        <SheetContent
          data-sidebar="sidebar"
          data-mobile="true"
          className="w-[--sidebar-width] bg-bg2 p-0 [&>button]:hidden"
          side={side}
        >
          <div className="flex h-full w-full flex-col">{children}</div>
        </SheetContent>
      </Sheet>
    )
  }

  return (
    <div
      className={cn(
        'group peer hidden shrink-0 md:block',
        'data-[state=expanded]:w-[var(--sidebar-width)]',
        'data-[state=collapsed][data-collapsible=offcanvas]:w-0',
        'data-[state=collapsed][data-collapsible=icon]:w-[var(--sidebar-width-icon)]',
      )}
      data-state={state}
      data-collapsible={state === 'collapsed' ? collapsible : ''}
      data-variant={variant}
      data-side={side}
    >
      <div
        className={cn(
          'relative h-svh w-[var(--sidebar-width)] bg-bg1',
          'group-data-[collapsible=offcanvas]:w-0',
          'group-data-[side=right]:rotate-180',
          variant === 'floating' || variant === 'inset'
            ? 'group-data-[collapsible=icon]:w-[calc(var(--sidebar-width-icon)_+_theme(spacing.4))]'
            : 'group-data-[collapsible=icon]:w-[var(--sidebar-width-icon)]',
        )}
      />
      <div
        className={cn(
          'fixed inset-y-0 z-10 hidden h-svh w-[var(--sidebar-width)] md:flex',
          side === 'left'
            ? 'left-0 group-data-[collapsible=offcanvas]:left-[calc(var(--sidebar-width)*-1)]'
            : 'right-0 group-data-[collapsible=offcanvas]:right-[calc(var(--sidebar-width)*-1)]',
          variant === 'floating' || variant === 'inset'
            ? 'p-2 group-data-[collapsible=icon]:w-[calc(var(--sidebar-width-icon)_+_theme(spacing.4)_+2px)]'
            : 'group-data-[collapsible=icon]:w-[var(--sidebar-width-icon)]',
          className,
        )}
      >
        <div
          data-sidebar="sidebar"
          className="flex h-full w-full flex-col bg-bg2 group-data-[variant=floating]:rounded-lg group-data-[variant=floating]:border group-data-[variant=floating]:border-black/10 group-data-[variant=floating]:shadow"
        >
          {children}
        </div>
      </div>
    </div>
  )
}
Sidebar.displayName = 'Sidebar'

export type SidebarTriggerProps = ButtonProps
export const SidebarTrigger: FC<SidebarTriggerProps> = ({ className, onClick, ...props }) => {
  const { toggleSidebar } = useSidebar()
  const { t } = useTranslation('components')
  return (
    <Button
      variant="borderless"
      size="sm"
      className={cn('h-auto w-auto md:h-7 md:w-7', className)}
      onClick={(event: React.MouseEvent<HTMLButtonElement>) => {
        onClick?.(event)
        toggleSidebar()
      }}
      leftContent={<SidebarSimple size={16} />}
      {...props}
    >
      <span className="sr-only">{t('sidebar.toggle')}</span>
    </Button>
  )
}
SidebarTrigger.displayName = 'SidebarTrigger'

export type SidebarInsetProps = ComponentProps<'main'>
export const SidebarInset: FC<SidebarInsetProps> = ({ className, ...props }) => (
  <main
    className={cn(
      'relative flex min-h-svh min-w-0 flex-1 flex-col bg-bg1',
      'peer-data-[variant=inset]:min-h-[calc(100svh-theme(spacing.4))] md:peer-data-[variant=inset]:m-2 md:peer-data-[variant=inset]:ml-0 md:peer-data-[variant=inset]:rounded-xl md:peer-data-[variant=inset]:shadow',
      className,
    )}
    {...props}
  />
)
SidebarInset.displayName = 'SidebarInset'

export type SidebarHeaderProps = ComponentProps<'div'>
export const SidebarHeader: FC<SidebarHeaderProps> = ({ className, ...props }) => (
  <div className={cn('flex flex-col gap-2 p-2', className)} {...props} />
)
SidebarHeader.displayName = 'SidebarHeader'

export type SidebarFooterProps = ComponentProps<'div'>
export const SidebarFooter: FC<SidebarFooterProps> = ({ className, ...props }) => (
  <div className={cn('flex flex-col gap-2 p-2', className)} {...props} />
)
SidebarFooter.displayName = 'SidebarFooter'

export type SidebarSeparatorProps = SeparatorProps
export const SidebarSeparator: FC<SidebarSeparatorProps> = ({ className, ...props }) => (
  <Separator className={cn('mx-2 w-auto', className)} {...props} />
)
SidebarSeparator.displayName = 'SidebarSeparator'

export type SidebarContentProps = ComponentProps<'div'>
export const SidebarContent: FC<SidebarContentProps> = ({ className, ...props }) => (
  <div
    className={cn(
      'flex min-h-0 flex-1 flex-col gap-2 overflow-auto group-data-[collapsible=icon]:overflow-hidden',
      className,
    )}
    {...props}
  />
)
SidebarContent.displayName = 'SidebarContent'

export type SidebarGroupProps = ComponentProps<'div'>
export const SidebarGroup: FC<SidebarGroupProps> = ({ className, ...props }) => (
  <div className={cn('relative flex w-full min-w-0 flex-col p-2', className)} {...props} />
)
SidebarGroup.displayName = 'SidebarGroup'

export type SidebarGroupLabelProps = ComponentProps<'div'> & { asChild?: boolean }
export const SidebarGroupLabel: FC<SidebarGroupLabelProps> = ({
  className,
  asChild = false,
  ...props
}) => {
  const Comp = asChild ? Slot : 'div'
  return (
    <Comp
      className={cn(
        'flex h-8 shrink-0 items-center rounded-md px-2 text-xs font-medium text-black/40 outline-none [&>svg]:size-4 [&>svg]:shrink-0 group-data-[collapsible=icon]:-mt-8 group-data-[collapsible=icon]:opacity-0',
        className,
      )}
      {...props}
    />
  )
}
SidebarGroupLabel.displayName = 'SidebarGroupLabel'

export type SidebarGroupContentProps = ComponentProps<'div'>
export const SidebarGroupContent: FC<SidebarGroupContentProps> = ({ className, ...props }) => (
  <div className={cn('w-full text-sm', className)} {...props} />
)
SidebarGroupContent.displayName = 'SidebarGroupContent'

export type SidebarMenuProps = ComponentProps<'ul'>
export const SidebarMenu: FC<SidebarMenuProps> = ({ className, ...props }) => (
  <ul className={cn('flex w-full min-w-0 flex-col gap-1', className)} {...props} />
)
SidebarMenu.displayName = 'SidebarMenu'

export type SidebarMenuItemProps = ComponentProps<'li'>
export const SidebarMenuItem: FC<SidebarMenuItemProps> = ({ className, ...props }) => (
  <li className={cn('group/menu-item relative', className)} {...props} />
)
SidebarMenuItem.displayName = 'SidebarMenuItem'

const sidebarMenuButtonVariants = cva(
  'peer/menu-button flex w-full cursor-pointer items-center gap-2 overflow-hidden rounded-md p-2 text-left text-black text-sm outline-none hover:bg-black/4 focus-visible:ring-2 active:bg-black/4 disabled:pointer-events-none disabled:opacity-50 data-[active=true]:bg-black/10 data-[active=true]:font-medium [&>span:last-child]:truncate [&>svg]:size-4 [&>svg]:shrink-0',
  {
    variants: {
      variant: {
        default: 'hover:bg-black/10',
        outline: 'bg-transparent hover:bg-black/4',
      },
      size: {
        default: 'h-8 text-sm',
        sm: 'h-7 text-xs',
        lg: 'h-12 text-sm group-data-[collapsible=icon]:!p-0',
      },
    },
    defaultVariants: { variant: 'default', size: 'default' },
  },
)

export type SidebarMenuButtonProps = ComponentProps<'button'> & {
  asChild?: boolean
  isActive?: boolean
  tooltip?: string | ComponentProps<typeof TooltipContent>
} & VariantProps<typeof sidebarMenuButtonVariants>

export const SidebarMenuButton: FC<SidebarMenuButtonProps> = ({
  asChild = false,
  isActive = false,
  variant = 'default',
  size = 'default',
  tooltip,
  className,
  ...props
}) => {
  const Comp = asChild ? Slot : 'button'
  const { isMobile, state } = useSidebar()

  const button = (
    <Comp
      data-sidebar="menu-button"
      data-size={size}
      data-active={isActive}
      className={cn(sidebarMenuButtonVariants({ variant, size }), className)}
      {...props}
    />
  )

  if (!tooltip) return button

  const tooltipProps = typeof tooltip === 'string' ? { children: tooltip } : tooltip

  return (
    <Tooltip>
      <TooltipTrigger asChild>{button}</TooltipTrigger>
      <TooltipContent
        side="right"
        align="center"
        hidden={state !== 'collapsed' || isMobile}
        {...tooltipProps}
      />
    </Tooltip>
  )
}
SidebarMenuButton.displayName = 'SidebarMenuButton'

export type SidebarMenuSubProps = ComponentProps<'ul'>
export const SidebarMenuSub: FC<SidebarMenuSubProps> = ({ className, ...props }) => (
  <ul
    className={cn(
      'mx-3.5 flex min-w-0 translate-x-px flex-col gap-1 border-l border-black/10 px-2.5 py-0.5',
      className,
    )}
    {...props}
  />
)
SidebarMenuSub.displayName = 'SidebarMenuSub'

export type SidebarMenuSubItemProps = ComponentProps<'li'>
export const SidebarMenuSubItem: FC<SidebarMenuSubItemProps> = (props) => <li {...props} />
SidebarMenuSubItem.displayName = 'SidebarMenuSubItem'

export type SidebarMenuSubButtonProps = ComponentProps<'a'> & {
  asChild?: boolean
  size?: 'sm' | 'md'
  isActive?: boolean
}
export const SidebarMenuSubButton: FC<SidebarMenuSubButtonProps> = ({
  asChild = false,
  size = 'md',
  isActive,
  className,
  ...props
}) => {
  const Comp = asChild ? Slot : 'a'
  return (
    <Comp
      data-sidebar="menu-sub-button"
      data-size={size}
      data-active={isActive}
      className={cn(
        'flex h-7 min-w-0 -translate-x-px items-center gap-2 overflow-hidden rounded-md px-2 text-black/40 outline-none hover:bg-black/4 hover:text-black focus-visible:ring-2 active:bg-black/4 active:text-black disabled:pointer-events-none disabled:opacity-50 [&>span:last-child]:truncate [&>svg]:size-4 [&>svg]:shrink-0 [&>svg]:text-black/40',
        'data-[active=true]:text-black',
        size === 'sm' && 'text-xs',
        size === 'md' && 'text-sm',
        className,
      )}
      {...props}
    />
  )
}
SidebarMenuSubButton.displayName = 'SidebarMenuSubButton'

export type SidebarInputProps = InputProps
export const SidebarInput: FC<SidebarInputProps> = ({ className, ...props }) => (
  <Input
    className={cn(
      'h-8 w-full bg-bg1 shadow-none focus-visible:ring-2 focus-visible:ring-black/5',
      className,
    )}
    {...props}
  />
)
SidebarInput.displayName = 'SidebarInput'

export type SidebarMenuSkeletonProps = ComponentProps<'div'> & { showIcon?: boolean }
export const SidebarMenuSkeleton: FC<SidebarMenuSkeletonProps> = ({
  className,
  showIcon = false,
  ...props
}) => (
  <div className={cn('flex h-8 items-center gap-2 rounded-md px-2', className)} {...props}>
    {showIcon && <Skeleton className="size-4 rounded-md" data-sidebar="menu-skeleton-icon" />}
    <Skeleton
      className="h-4 max-w-[--skeleton-width] flex-1"
      data-sidebar="menu-skeleton-text"
      style={{ '--skeleton-width': '70%' } as CSSProperties}
    />
  </div>
)
SidebarMenuSkeleton.displayName = 'SidebarMenuSkeleton'

export type SidebarRailProps = ComponentProps<'button'>
export const SidebarRail: FC<SidebarRailProps> = ({ className, ...props }) => {
  const { toggleSidebar } = useSidebar()
  const { t } = useTranslation('components')
  return (
    <button
      data-sidebar="rail"
      aria-label={t('sidebar.toggle')}
      tabIndex={-1}
      onClick={toggleSidebar}
      title={t('sidebar.toggle')}
      className={cn(
        'absolute inset-y-0 z-20 hidden w-4 -translate-x-1/2 after:absolute after:inset-y-0 after:left-1/2 after:w-[2px] hover:after:bg-black/10 group-data-[side=left]:-right-4 group-data-[side=right]:left-0 sm:flex',
        '[[data-side=left]_&]:cursor-w-resize [[data-side=right]_&]:cursor-e-resize',
        '[[data-side=left][data-state=collapsed]_&]:cursor-e-resize [[data-side=right][data-state=collapsed]_&]:cursor-w-resize',
        className,
      )}
      {...props}
    />
  )
}
SidebarRail.displayName = 'SidebarRail'
