import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from 'react'
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
  count: number
  createdAt: number
}

interface ToastOptions {
  title?: string
  description?: string
  variant?: ToastVariant
  invalidates?: string
}

interface ToastContextValue {
  toast: (options: ToastOptions) => void
}

/* ------------------------------------------------------------------ */
/*  Constants                                                          */
/* ------------------------------------------------------------------ */

const DISMISS_MS: Record<ToastVariant, number> = {
  error: 8000,
  warning: 6000,
  success: 3000,
  default: 5000,
}

const FOLD_WINDOW = 2000
const MAX_VISIBLE = 3

/* ------------------------------------------------------------------ */
/*  Context                                                            */
/* ------------------------------------------------------------------ */

const ToastContext = createContext<ToastContextValue>({ toast: () => {} })

/* ------------------------------------------------------------------ */
/*  Provider                                                           */
/* ------------------------------------------------------------------ */

let toastCounter = 0

interface TimeoutOp {
  id: string
  variant: ToastVariant
  action: 'schedule' | 'cancel'
}

export function AppToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([])
  const timersRef = useRef(new Map<string, ReturnType<typeof setTimeout>>())
  const pendingRef = useRef<TimeoutOp[]>([])

  // ── Process timeout side-effects after state commits ───────────────
  useEffect(() => {
    const ops = pendingRef.current.splice(0)
    const timers = timersRef.current

    for (const op of ops) {
      if (op.action === 'cancel') {
        const t = timers.get(op.id)
        if (t) {
          clearTimeout(t)
          timers.delete(op.id)
        }
      } else {
        const existing = timers.get(op.id)
        if (existing) clearTimeout(existing)
        const { id, variant } = op
        timers.set(
          id,
          setTimeout(() => {
            timers.delete(id)
            setToasts((prev) => prev.filter((t) => t.id !== id))
          }, DISMISS_MS[variant]),
        )
      }
    }
  }, [toasts])

  // ── Cleanup on unmount ─────────────────────────────────────────────
  useEffect(() => {
    const timers = timersRef.current
    return () => {
      for (const t of timers.values()) clearTimeout(t)
      timers.clear()
    }
  }, [])

  // ── Toast dispatch ─────────────────────────────────────────────────
  const toast = useCallback(
    ({ title, description, variant = 'default', invalidates }: ToastOptions) => {
      const now = Date.now()
      const newId = `toast-${++toastCounter}`

      setToasts((prev) => {
        let next = [...prev]

        // 1. Invalidation — remove toasts whose title matches
        if (invalidates) {
          for (const t of next) {
            if (t.title === invalidates) {
              pendingRef.current.push({ id: t.id, variant: t.variant, action: 'cancel' })
            }
          }
          next = next.filter((t) => t.title !== invalidates)
        }

        // 2. Folding — merge with existing if same title+variant within window
        const idx = title
          ? next.findIndex(
              (t) => t.title === title && t.variant === variant && now - t.createdAt < FOLD_WINDOW,
            )
          : -1

        if (idx >= 0) {
          const existing = next[idx]
          next[idx] = { ...existing, count: existing.count + 1 }
          pendingRef.current.push({ id: existing.id, variant, action: 'schedule' })
          return next
        }

        // 3. New toast
        next.push({ id: newId, title, description, variant, count: 1, createdAt: now })
        pendingRef.current.push({ id: newId, variant, action: 'schedule' })
        return next
      })
    },
    [],
  )

  // Bridge imperative toasts (from MutationCache / queryClient) into the React toast UI
  useEffect(() => onToast((event) => toast(event)), [toast])

  const handleOpenChange = useCallback((open: boolean, id: string) => {
    if (!open) {
      const t = timersRef.current.get(id)
      if (t) {
        clearTimeout(t)
        timersRef.current.delete(id)
      }
      setToasts((prev) => prev.filter((t) => t.id !== id))
    }
  }, [])

  return (
    <ToastContext.Provider value={{ toast }}>
      <RadixToastProvider swipeDirection="right">
        {children}
        {toasts.slice(0, MAX_VISIBLE).map((t) => (
          <Toast
            key={t.id}
            variant={t.variant}
            open
            onOpenChange={(open: boolean) => handleOpenChange(open, t.id)}
          >
            <div className="grid gap-1">
              {t.title && (
                <ToastTitle>
                  {t.title}
                  {t.count > 1 && (
                    <span className="ml-1.5 inline-flex rounded-full bg-black/10 px-1.5 py-0.5 text-[10px] font-bold tabular-nums">
                      ×{t.count}
                    </span>
                  )}
                </ToastTitle>
              )}
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
