import { useEffect, useRef, useCallback } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useTheme } from '@ds/hooks'

// ── Custom event names (pages listen for these) ──
export const SHORTCUT_EVENTS = {
  TOGGLE_FILTERS: 'shortcut:toggle-filters',
  EXPORT: 'shortcut:export',
} as const

// ── Guard: should we ignore this keydown? ──
function shouldIgnore(e: KeyboardEvent): boolean {
  const target = e.target as HTMLElement | null
  if (!target) return false

  // Skip when typing in inputs, textareas, selects, contenteditable
  const tag = target.tagName
  if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return true
  if (target.isContentEditable || target.getAttribute('role') === 'textbox') return true

  // Skip when a Radix dialog is open (except our own command palette handled below)
  if (document.querySelector('[data-radix-dialog-content]')) return true

  return false
}

/**
 * Centralised global keyboard shortcuts.
 * Mount once in AppLayout. Returns open/setOpen for CommandPalette.
 *
 * Shortcuts:
 *   Ctrl+K          — toggle command palette
 *   Ctrl+N          — new transfer (/transfers/new)
 *   Ctrl+E          — export (fires custom event, page handles it)
 *   Ctrl+Shift+F    — toggle filter panel (fires custom event, /transfers handles it)
 *   Ctrl+Shift+T    — toggle theme
 *   G → D           — go to Dashboard (vim-style, 1s timeout)
 *   G → T           — go to Transfers
 *   G → I           — go to IB Partners
 */
export function useGlobalShortcuts(commandPaletteOpen: boolean) {
  const navigate = useNavigate()
  const location = useLocation()
  const { toggleTheme } = useTheme()

  // Vim-style "g then X" sequence
  const gPendingRef = useRef(false)
  const gTimerRef = useRef<ReturnType<typeof setTimeout>>(null)

  const clearG = useCallback(() => {
    gPendingRef.current = false
    if (gTimerRef.current) {
      clearTimeout(gTimerRef.current)
      gTimerRef.current = null
    }
  }, [])

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      // Never intercept when command palette is open — let cmdk handle everything
      if (commandPaletteOpen) {
        clearG()
        return
      }

      // ── Ctrl+K / Cmd+K — toggle command palette ──
      // This fires regardless of input focus (standard app convention)
      if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault()
        // Dispatch synthetic event so CommandPalette's onOpenChange still works.
        // CommandPalette listens for this via its own prop callback.
        window.dispatchEvent(new CustomEvent(SHORTCUT_EVENTS_INTERNAL.TOGGLE_PALETTE))
        clearG()
        return
      }

      // For all other shortcuts, skip when in inputs or dialogs
      if (shouldIgnore(e)) {
        clearG()
        return
      }

      // ── Ctrl+Shift+T / Cmd+Shift+T — toggle theme ──
      if (e.key === 'T' && (e.metaKey || e.ctrlKey) && e.shiftKey) {
        e.preventDefault()
        toggleTheme()
        clearG()
        return
      }

      // ── Ctrl+N / Cmd+N — new transfer ──
      if (e.key === 'n' && (e.metaKey || e.ctrlKey) && !e.shiftKey) {
        e.preventDefault()
        navigate('/transfers/new')
        clearG()
        return
      }

      // ── Ctrl+E / Cmd+E — export ──
      if (e.key === 'e' && (e.metaKey || e.ctrlKey) && !e.shiftKey) {
        const exportPages = ['/transfers', '/accounting']
        if (exportPages.some((p) => location.pathname.startsWith(p))) {
          e.preventDefault()
          window.dispatchEvent(new CustomEvent(SHORTCUT_EVENTS.EXPORT))
        }
        clearG()
        return
      }

      // ── Ctrl+Shift+F / Cmd+Shift+F — toggle filters ──
      if (e.key === 'F' && (e.metaKey || e.ctrlKey) && e.shiftKey) {
        if (location.pathname.startsWith('/transfers')) {
          e.preventDefault()
          window.dispatchEvent(new CustomEvent(SHORTCUT_EVENTS.TOGGLE_FILTERS))
        }
        clearG()
        return
      }

      // ── Vim-style G → key sequences ──
      if (!e.metaKey && !e.ctrlKey && !e.altKey && !e.shiftKey) {
        if (e.key === 'g') {
          clearG()
          gPendingRef.current = true
          gTimerRef.current = setTimeout(clearG, 1000)
          return
        }

        if (gPendingRef.current) {
          clearG()
          switch (e.key) {
            case 'd':
              navigate('/')
              break
            case 't':
              navigate('/transfers')
              break
            case 'i':
              navigate('/ib')
              break
          }
          return
        }
      }
    }

    window.addEventListener('keydown', handler)
    return () => {
      window.removeEventListener('keydown', handler)
      clearG()
    }
  }, [commandPaletteOpen, navigate, location.pathname, toggleTheme, clearG])
}

// Internal event for command palette toggle (not exported — only used by CommandPalette)
export const SHORTCUT_EVENTS_INTERNAL = {
  TOGGLE_PALETTE: 'shortcut:toggle-palette',
} as const
