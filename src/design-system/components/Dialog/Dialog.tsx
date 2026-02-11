import * as DialogPrimitive from '@radix-ui/react-dialog'
import { X } from '@phosphor-icons/react'
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
    className={cn(
      'fixed inset-0 z-50 bg-[rgba(4,8,16,0.72)]',
      className,
    )}
    {...props}
  />
)
DialogOverlay.displayName = 'DialogOverlay'

export type DialogContentProps = ComponentProps<typeof DialogPrimitive.Content>
export const DialogContent: FC<DialogContentProps> = ({
  className,
  children,
  ...props
}) => {
  const { t } = useTranslation('components')
  return (
    <DialogPortal>
      <DialogOverlay />
      <DialogPrimitive.Content
        className={cn(
          'ui-surface fixed left-1/2 top-1/2 z-50 grid w-full max-w-lg -translate-x-1/2 -translate-y-1/2 gap-4 rounded-2xl bg-bg1 p-6 shadow-lg',
          className,
        )}
        {...props}
      >
        {children}
        <DialogPrimitive.Close className="absolute right-4 top-4 rounded-sm opacity-70 hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-black/5 focus:ring-offset-2 disabled:pointer-events-none">
          <X size={16} />
          <span className="sr-only">{t('dialog.close')}</span>
        </DialogPrimitive.Close>
      </DialogPrimitive.Content>
    </DialogPortal>
  )
}
DialogContent.displayName = 'DialogContent'

export type DialogHeaderProps = ComponentProps<'div'>
export const DialogHeader: FC<DialogHeaderProps> = ({ className, ...props }) => (
  <div className={cn('flex flex-col gap-1.5 text-center sm:text-left', className)} {...props} />
)
DialogHeader.displayName = 'DialogHeader'

export type DialogFooterProps = ComponentProps<'div'>
export const DialogFooter: FC<DialogFooterProps> = ({ className, ...props }) => (
  <div className={cn('flex flex-col-reverse sm:flex-row sm:justify-end sm:gap-2', className)} {...props} />
)
DialogFooter.displayName = 'DialogFooter'

export type DialogTitleProps = ComponentProps<typeof DialogPrimitive.Title>
export const DialogTitle: FC<DialogTitleProps> = ({ className, ...props }) => (
  <DialogPrimitive.Title className={cn('text-lg font-semibold leading-none tracking-tight', className)} {...props} />
)
DialogTitle.displayName = 'DialogTitle'

export type DialogDescriptionProps = ComponentProps<typeof DialogPrimitive.Description>
export const DialogDescription: FC<DialogDescriptionProps> = ({ className, ...props }) => (
  <DialogPrimitive.Description className={cn('text-sm text-black/40', className)} {...props} />
)
DialogDescription.displayName = 'DialogDescription'
