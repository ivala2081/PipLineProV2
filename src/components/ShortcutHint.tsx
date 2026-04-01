const isMac = typeof navigator !== 'undefined' && /Mac|iPhone|iPad|iPod/.test(navigator.userAgent)

/** Maps generic modifier names to OS-specific symbols. */
function formatKey(key: string): string {
  if (isMac) {
    return key
      .replace(/Ctrl\+/g, '⌘')
      .replace(/Alt\+/g, '⌥')
      .replace(/Shift\+/g, '⇧')
  }
  return key
}

/**
 * Renders a keyboard shortcut badge.
 * Pass a generic string like "Ctrl+N" — on Mac it renders ⌘N, on Windows it stays Ctrl+N.
 */
export function ShortcutHint({ keys, className }: { keys: string; className?: string }) {
  return (
    <kbd
      className={
        className ??
        'ml-auto shrink-0 rounded border border-black/10 bg-black/[0.04] px-1.5 py-0.5 font-mono text-[10px] text-black/30'
      }
    >
      {formatKey(keys)}
    </kbd>
  )
}
