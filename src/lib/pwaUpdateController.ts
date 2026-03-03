type UpdateFn = (reloadPage?: boolean) => Promise<void>
type Listener = (updateFn: UpdateFn) => void

const listeners: Set<Listener> = new Set()
let pendingUpdate: UpdateFn | null = null

export const pwaUpdateController = {
  setUpdateReady(updateFn: UpdateFn) {
    pendingUpdate = updateFn
    listeners.forEach((fn) => fn(updateFn))
  },

  subscribe(listener: Listener) {
    listeners.add(listener)
    // If update already pending when component mounts, notify immediately
    if (pendingUpdate) listener(pendingUpdate)
    return () => {
      listeners.delete(listener)
    }
  },
}
