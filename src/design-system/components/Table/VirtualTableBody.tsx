import type { ReactNode } from 'react'
import { useVirtualTable } from '@/hooks/useVirtualTable'
import { cn } from '@ds/utils'

export interface VirtualTableBodyProps<T> {
  /** The full array of items to render */
  items: T[]
  /** Render function — receives the item and its real index in `items` */
  renderRow: (item: T, index: number) => ReactNode
  /** Estimated row height in pixels (default 48) */
  rowHeight?: number
  /** Rows to render outside the visible area (default 5) */
  overscan?: number
  /** Max height of the scrollable container in pixels (default 600) */
  maxHeight?: number
  /** Extra className for the scroll container */
  className?: string
  /** Extra className for the tbody */
  tbodyClassName?: string
}

/**
 * Drop-in virtual `<tbody>` that renders only the visible rows.
 *
 * Wrap it around a `<table>` that already has its `<thead>`. The component
 * creates its own scroll container so the header stays fixed while the body scrolls.
 *
 * ```tsx
 * <VirtualTableBody
 *   items={rows}
 *   renderRow={(row, i) => <MyTableRow key={row.id} row={row} />}
 *   rowHeight={48}
 *   maxHeight={600}
 * />
 * ```
 */
export function VirtualTableBody<T>({
  items,
  renderRow,
  rowHeight = 48,
  overscan = 5,
  maxHeight = 600,
  className,
  tbodyClassName,
}: VirtualTableBodyProps<T>) {
  const { scrollRef, virtualRows, paddingTop, paddingBottom } = useVirtualTable({
    items,
    estimateSize: rowHeight,
    overscan,
  })

  return (
    <div ref={scrollRef} className={cn('overflow-auto', className)} style={{ maxHeight }}>
      <table className="w-full caption-bottom text-sm">
        <tbody className={tbodyClassName}>
          {/* Top spacer row — keeps the scroll thumb proportional */}
          {paddingTop > 0 && (
            <tr>
              <td style={{ height: paddingTop, padding: 0, border: 'none' }} />
            </tr>
          )}

          {virtualRows.map((virtualRow) => {
            const item = items[virtualRow.index]
            return renderRow(item, virtualRow.index)
          })}

          {/* Bottom spacer row */}
          {paddingBottom > 0 && (
            <tr>
              <td style={{ height: paddingBottom, padding: 0, border: 'none' }} />
            </tr>
          )}
        </tbody>
      </table>
    </div>
  )
}

VirtualTableBody.displayName = 'VirtualTableBody'
