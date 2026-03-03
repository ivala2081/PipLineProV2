/**
 * Imperative Toast Emitter
 *
 * Allows showing toasts from outside React component trees (e.g., queryClient.ts).
 * The AppToastProvider subscribes to this emitter and routes events to the Radix toast UI.
 *
 * @module toastEmitter
 */

type ToastVariant = 'default' | 'success' | 'error' | 'warning'

export interface ToastEvent {
  title?: string
  description?: string
  variant?: ToastVariant
}

type ToastListener = (event: ToastEvent) => void

const listeners = new Set<ToastListener>()

/** Subscribe to imperative toast events. Returns an unsubscribe function. */
export function onToast(listener: ToastListener): () => void {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

/** Emit a toast from anywhere (outside React). */
export function emitToast(event: ToastEvent): void {
  for (const listener of listeners) {
    listener(event)
  }
}
