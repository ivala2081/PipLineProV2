import { useRef, useCallback } from 'react'
import { useVirtualizer } from '@tanstack/react-virtual'

export interface UseVirtualTableOptions<T> {
  /** The full list of items to virtualise */
  items: T[]
  /** Estimated height of each row in pixels */
  estimateSize: number
  /** Number of rows to render above / below the visible window (default 5) */
  overscan?: number
}

export interface UseVirtualTableReturn<T> {
  /** Ref that must be attached to the scrollable container element */
  scrollRef: React.RefObject<HTMLDivElement | null>
  /** The virtualizer instance from @tanstack/react-virtual */
  virtualizer: ReturnType<typeof useVirtualizer<HTMLDivElement, Element>>
  /** The virtual row descriptors currently in the viewport (+ overscan) */
  virtualRows: ReturnType<
    ReturnType<typeof useVirtualizer<HTMLDivElement, Element>>['getVirtualItems']
  >
  /** Total height of all rows (px) — used to size the inner container */
  totalHeight: number
  /** Padding above the first rendered row (px) */
  paddingTop: number
  /** Padding below the last rendered row (px) */
  paddingBottom: number
  /** Helper to get the source item for a given virtual row index */
  getItem: (virtualIndex: number) => T
}

/**
 * Generic hook that wires up @tanstack/react-virtual for a table body.
 *
 * Usage:
 * ```tsx
 * const { scrollRef, virtualRows, totalHeight, paddingTop, paddingBottom, getItem } =
 *   useVirtualTable({ items: myRows, estimateSize: 48 })
 * ```
 */
export function useVirtualTable<T>({
  items,
  estimateSize,
  overscan = 5,
}: UseVirtualTableOptions<T>): UseVirtualTableReturn<T> {
  const scrollRef = useRef<HTMLDivElement>(null)

  const virtualizer = useVirtualizer({
    count: items.length,
    getScrollElement: () => scrollRef.current,
    estimateSize: () => estimateSize,
    overscan,
  })

  const virtualRows = virtualizer.getVirtualItems()
  const totalHeight = virtualizer.getTotalSize()

  const paddingTop = virtualRows.length > 0 ? virtualRows[0].start : 0
  const paddingBottom =
    virtualRows.length > 0 ? totalHeight - virtualRows[virtualRows.length - 1].end : 0

  const getItem = useCallback((virtualIndex: number) => items[virtualIndex], [items])

  return {
    scrollRef,
    virtualizer,
    virtualRows,
    totalHeight,
    paddingTop,
    paddingBottom,
    getItem,
  }
}
