import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react'
import { onToast } from '@/lib/toastEmitter'
import {
  ToastProvider as RadixToastProvider,
  Toast,
  ToastTitle,
  ToastDescription,
  ToastClose,
  ToastViewport,
} from '@ds'

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

type ToastVariant = 'default' | 'success' | 'error' | 'warning'

interface ToastItem {
  id: string
  title?: string
  description?: string
  variant: ToastVariant
}

interface ToastContextValue {
  toast: (options: { title?: string; description?: string; variant?: ToastVariant }) => void
}

/* ------------------------------------------------------------------ */
/*  Context                                                            */
/* ------------------------------------------------------------------ */

const ToastContext = createContext<ToastContextValue>({ toast: () => {} })

/* ------------------------------------------------------------------ */
/*  Provider                                                           */
/* ------------------------------------------------------------------ */

let toastCounter = 0

export function AppToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([])

  const toast = useCallback(
    ({
      title,
      description,
      variant = 'default',
    }: {
      title?: string
      description?: string
      variant?: ToastVariant
    }) => {
      const id = `toast-${++toastCounter}`
      setToasts((prev) => [...prev, { id, title, description, variant }])

      setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== id))
      }, 5000)
    },
    [],
  )

  // Bridge imperative toasts (from MutationCache / queryClient) into the React toast UI
  useEffect(() => onToast((event) => toast(event)), [toast])

  const handleOpenChange = useCallback((open: boolean, id: string) => {
    if (!open) {
      setToasts((prev) => prev.filter((t) => t.id !== id))
    }
  }, [])

  return (
    <ToastContext.Provider value={{ toast }}>
      <RadixToastProvider swipeDirection="right">
        {children}
        {toasts.map((t) => (
          <Toast
            key={t.id}
            variant={t.variant}
            open
            onOpenChange={(open: boolean) => handleOpenChange(open, t.id)}
          >
            <div className="grid gap-1">
              {t.title && <ToastTitle>{t.title}</ToastTitle>}
              {t.description && <ToastDescription>{t.description}</ToastDescription>}
            </div>
            <ToastClose />
          </Toast>
        ))}
        <ToastViewport />
      </RadixToastProvider>
    </ToastContext.Provider>
  )
}

/* ------------------------------------------------------------------ */
/*  Hook                                                               */
/* ------------------------------------------------------------------ */

// eslint-disable-next-line react-refresh/only-export-components
export function useToast() {
  return useContext(ToastContext)
}
