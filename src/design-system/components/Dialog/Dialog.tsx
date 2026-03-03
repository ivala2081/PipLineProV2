import * as DialogPrimitive from '@radix-ui/react-dialog'
import { XIcon } from '@phosphor-icons/react'
import type { ComponentProps, FC } from 'react'
import { useTranslation } from 'react-i18next'
import { cn } from '@ds/utils'

export const Dialog = DialogPrimitive.Root
export const DialogTrigger = DialogPrimitive.Trigger
export const DialogClose = DialogPrimitive.Close
export const DialogPortal = DialogPrimitive.Portal

export type DialogOverlayProps = ComponentProps<typeof DialogPrimitive.Overlay>
export const DialogOverlay: FC<DialogOverlayProps> = ({ className, ...props }) => (
  <DialogPrimitive.Overlay
    className={cn('fixed inset-0 z-50 bg-[rgba(4,8,16,0.72)]', className)}
    {...props}
  />
)
DialogOverlay.displayName = 'DialogOverlay'

export type DialogSize = 'sm' | 'md' | 'lg' | 'xl' | '2xl'

const dialogSizeClasses: Record<DialogSize, string> = {
  sm: 'md:max-w-sm',
  md: 'md:max-w-md',
  lg: 'md:max-w-lg',
  xl: 'md:max-w-xl',
  '2xl': 'md:max-w-2xl',
}

export type DialogContentProps = ComponentProps<typeof DialogPrimitive.Content> & {
  size?: DialogSize
}
export const DialogContent: FC<DialogContentProps> = ({
  className,
  children,
  size = 'md',
  ...props
}) => {
  const { t } = useTranslation('components')
  return (
    <DialogPortal>
      <DialogOverlay />
      <DialogPrimitive.Content
        className={cn(
          'ui-surface fixed z-50 bg-bg1',
          // Mobile: full-screen flex column
          'inset-0 flex flex-col',
          // Desktop: centered grid modal
          'md:inset-auto md:left-1/2 md:top-1/2 md:w-full md:-translate-x-1/2 md:-translate-y-1/2',
          'md:grid md:gap-md md:rounded-2xl md:p-lg md:shadow-lg md:max-h-[90dvh] md:overflow-y-auto',
          dialogSizeClasses[size],
          className,
        )}
        {...props}
      >
        {/* Mobile: sticky top bar with close button */}
        <div className="flex shrink-0 items-center justify-end border-b border-black/10 px-4 py-3 md:hidden">
          <DialogPrimitive.Close className="rounded-sm opacity-70 hover:opacity-100 focus:outline-none">
            <XIcon size={20} />
            <span className="sr-only">{t('dialog.close')}</span>
          </DialogPrimitive.Close>
        </div>

        {/* Content: scrollable on mobile, passthrough grid on desktop */}
        <div className="flex-1 overflow-y-auto p-3 md:p-card grid gap-md content-start md:contents">
          {children}
        </div>

        {/* Desktop: absolute close button */}
        <DialogPrimitive.Close className="absolute right-4 top-4 hidden rounded-sm opacity-70 hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-black/5 focus:ring-offset-2 disabled:pointer-events-none md:flex">
          <XIcon size={16} />
          <span className="sr-only">{t('dialog.close')}</span>
        </DialogPrimitive.Close>
      </DialogPrimitive.Content>
    </DialogPortal>
  )
}
DialogContent.displayName = 'DialogContent'

export type DialogHeaderProps = ComponentProps<'div'>
export const DialogHeader: FC<DialogHeaderProps> = ({ className, ...props }) => (
  <div className={cn('flex flex-col gap-1.5 text-left', className)} {...props} />
)
DialogHeader.displayName = 'DialogHeader'

export type DialogFooterProps = ComponentProps<'div'>
export const DialogFooter: FC<DialogFooterProps> = ({ className, ...props }) => (
  <div
    className={cn('flex flex-col-reverse gap-sm md:flex-row md:justify-end', className)}
    {...props}
  />
)
DialogFooter.displayName = 'DialogFooter'

export type DialogTitleProps = ComponentProps<typeof DialogPrimitive.Title>
export const DialogTitle: FC<DialogTitleProps> = ({ className, ...props }) => (
  <DialogPrimitive.Title
    className={cn('text-lg font-semibold leading-none tracking-tight', className)}
    {...props}
  />
)
DialogTitle.displayName = 'DialogTitle'

export type DialogDescriptionProps = ComponentProps<typeof DialogPrimitive.Description>
export const DialogDescription: FC<DialogDescriptionProps> = ({ className, ...props }) => (
  <DialogPrimitive.Description className={cn('text-sm text-black/40', className)} {...props} />
)
DialogDescription.displayName = 'DialogDescription'
