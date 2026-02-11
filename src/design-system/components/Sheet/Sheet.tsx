import * as SheetPrimitive from '@radix-ui/react-dialog'
import { X } from '@phosphor-icons/react'
import { cva, type VariantProps } from 'class-variance-authority'
import type { ComponentProps, FC } from 'react'
import { useTranslation } from 'react-i18next'
import { cn } from '@ds/utils'

export const Sheet = SheetPrimitive.Root
export const SheetTrigger = SheetPrimitive.Trigger
export const SheetClose = SheetPrimitive.Close
export const SheetPortal = SheetPrimitive.Portal

export type SheetOverlayProps = ComponentProps<typeof SheetPrimitive.Overlay>
export const SheetOverlay: FC<SheetOverlayProps> = ({ className, ...props }) => (
  <SheetPrimitive.Overlay
    className={cn(
      'fixed inset-0 z-50 bg-[rgba(4,8,16,0.72)]',
      className,
    )}
    {...props}
  />
)
SheetOverlay.displayName = 'SheetOverlay'

const sheetContentVariants = cva(
  'ui-surface fixed z-50 gap-4 bg-bg1 p-6 shadow-lg',
  {
    variants: {
      side: {
        top: 'inset-x-0 top-0 border-b',
        bottom: 'inset-x-0 bottom-0 border-t',
        left: 'inset-y-0 left-0 h-full w-3/4 border-r sm:max-w-sm',
        right: 'inset-y-0 right-0 h-full w-3/4 border-l sm:max-w-sm',
      },
    },
    defaultVariants: {
      side: 'right',
    },
  },
)

export type SheetContentProps = ComponentProps<typeof SheetPrimitive.Content> &
  VariantProps<typeof sheetContentVariants>

export const SheetContent: FC<SheetContentProps> = ({
  side = 'right',
  className,
  children,
  ...props
}) => {
  const { t } = useTranslation('components')
  return (
    <SheetPortal>
      <SheetOverlay />
      <SheetPrimitive.Content className={cn(sheetContentVariants({ side }), className)} {...props}>
        <SheetPrimitive.Close className="absolute right-4 top-4 rounded-sm opacity-70 hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-black/5 focus:ring-offset-2 disabled:pointer-events-none">
          <X size={16} />
          <span className="sr-only">{t('sheet.close')}</span>
        </SheetPrimitive.Close>
        {children}
      </SheetPrimitive.Content>
    </SheetPortal>
  )
}
SheetContent.displayName = 'SheetContent'

export type SheetHeaderProps = ComponentProps<'div'>
export const SheetHeader: FC<SheetHeaderProps> = ({ className, ...props }) => (
  <div className={cn('flex flex-col gap-2 text-center sm:text-left', className)} {...props} />
)
SheetHeader.displayName = 'SheetHeader'

export type SheetFooterProps = ComponentProps<'div'>
export const SheetFooter: FC<SheetFooterProps> = ({ className, ...props }) => (
  <div className={cn('flex flex-col-reverse sm:flex-row sm:justify-end sm:gap-2', className)} {...props} />
)
SheetFooter.displayName = 'SheetFooter'

export type SheetTitleProps = ComponentProps<typeof SheetPrimitive.Title>
export const SheetTitle: FC<SheetTitleProps> = ({ className, ...props }) => (
  <SheetPrimitive.Title className={cn('text-lg font-semibold text-black', className)} {...props} />
)
SheetTitle.displayName = 'SheetTitle'

export type SheetDescriptionProps = ComponentProps<typeof SheetPrimitive.Description>
export const SheetDescription: FC<SheetDescriptionProps> = ({ className, ...props }) => (
  <SheetPrimitive.Description className={cn('text-sm text-black/40', className)} {...props} />
)
SheetDescription.displayName = 'SheetDescription'
