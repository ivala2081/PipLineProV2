import * as ToastPrimitive from '@radix-ui/react-toast'
import { X } from '@phosphor-icons/react'
import { cva, type VariantProps } from 'class-variance-authority'
import type { ComponentProps, FC } from 'react'
import { cn } from '@ds/utils'

export const ToastProvider = ToastPrimitive.Provider

export type ToastViewportProps = ComponentProps<typeof ToastPrimitive.Viewport>
export const ToastViewport: FC<ToastViewportProps> = ({ className, ...props }) => (
  <ToastPrimitive.Viewport
    className={cn(
      'fixed top-0 z-[100] flex max-h-screen w-full flex-col-reverse p-4 sm:bottom-0 sm:right-0 sm:top-auto sm:flex-col md:max-w-[420px]',
      className,
    )}
    {...props}
  />
)
ToastViewport.displayName = 'ToastViewport'

const toastVariants = cva(
  'group pointer-events-auto relative flex w-full items-center justify-between gap-4 overflow-hidden rounded-xl border border-black/10 p-4 pr-8 shadow-lg transition-all data-[swipe=cancel]:translate-x-0 data-[swipe=end]:translate-x-[var(--radix-toast-swipe-end-x)] data-[swipe=move]:translate-x-[var(--radix-toast-swipe-move-x)] data-[state=open]:animate-in data-[state=closed]:animate-out data-[swipe=end]:animate-out',
  {
    variants: {
      variant: {
        default: 'bg-bg1 text-black',
        success: 'bg-green/10 text-green border-green/20',
        error: 'bg-red/10 text-red border-red/20',
        warning: 'bg-yellow/10 text-yellow border-yellow/20',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  },
)

export type ToastProps = ComponentProps<typeof ToastPrimitive.Root> &
  VariantProps<typeof toastVariants>
export const Toast: FC<ToastProps> = ({ className, variant, ...props }) => (
  <ToastPrimitive.Root className={cn(toastVariants({ variant }), className)} {...props} />
)
Toast.displayName = 'Toast'

export type ToastActionProps = ComponentProps<typeof ToastPrimitive.Action>
export const ToastAction: FC<ToastActionProps> = ({ className, ...props }) => (
  <ToastPrimitive.Action
    className={cn(
      'inline-flex h-8 shrink-0 items-center justify-center rounded-lg border border-black/10 bg-transparent px-3 text-sm font-medium transition-colors hover:bg-black/5 focus:outline-none focus:ring-2 focus:ring-black/5 disabled:pointer-events-none disabled:opacity-50',
      className,
    )}
    {...props}
  />
)
ToastAction.displayName = 'ToastAction'

export type ToastCloseProps = ComponentProps<typeof ToastPrimitive.Close>
export const ToastClose: FC<ToastCloseProps> = ({ className, ...props }) => (
  <ToastPrimitive.Close
    className={cn(
      'absolute right-2 top-2 rounded-md p-1 text-black/40 opacity-0 transition-opacity hover:text-black focus:opacity-100 focus:outline-none focus:ring-2 group-hover:opacity-100',
      className,
    )}
    toast-close=""
    {...props}
  >
    <X size={16} />
  </ToastPrimitive.Close>
)
ToastClose.displayName = 'ToastClose'

export type ToastTitleProps = ComponentProps<typeof ToastPrimitive.Title>
export const ToastTitle: FC<ToastTitleProps> = ({ className, ...props }) => (
  <ToastPrimitive.Title className={cn('text-sm font-semibold', className)} {...props} />
)
ToastTitle.displayName = 'ToastTitle'

export type ToastDescriptionProps = ComponentProps<typeof ToastPrimitive.Description>
export const ToastDescription: FC<ToastDescriptionProps> = ({ className, ...props }) => (
  <ToastPrimitive.Description className={cn('text-sm opacity-90', className)} {...props} />
)
ToastDescription.displayName = 'ToastDescription'
