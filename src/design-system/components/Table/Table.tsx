import type { ComponentProps, FC } from 'react'
import { cn } from '@ds/utils'

export type TableProps = ComponentProps<'table'> & {
  /** Renders each row as a card on screens smaller than md (768px). Add data-label to TableCell and isActions to the actions cell. */
  cardOnMobile?: boolean
}
export const Table: FC<TableProps> = ({ className, cardOnMobile, ...props }) => (
  <div className="relative w-full overflow-auto">
    <table
      className={cn('w-full caption-bottom text-sm', className)}
      {...(cardOnMobile ? { 'data-card-mobile': '' } : {})}
      {...props}
    />
  </div>
)
Table.displayName = 'Table'

export type TableHeaderProps = ComponentProps<'thead'>
export const TableHeader: FC<TableHeaderProps> = ({ className, ...props }) => (
  <thead className={cn('[&_tr]:border-b', className)} {...props} />
)
TableHeader.displayName = 'TableHeader'

export type TableBodyProps = ComponentProps<'tbody'>
export const TableBody: FC<TableBodyProps> = (props) => <tbody {...props} />
TableBody.displayName = 'TableBody'

export type TableFooterProps = ComponentProps<'tfoot'>
export const TableFooter: FC<TableFooterProps> = ({ className, ...props }) => (
  <tfoot className={cn('border-t bg-black/5 font-medium', className)} {...props} />
)
TableFooter.displayName = 'TableFooter'

export type TableRowProps = ComponentProps<'tr'>
export const TableRow: FC<TableRowProps> = (props) => <tr {...props} />
TableRow.displayName = 'TableRow'

export type TableHeadProps = ComponentProps<'th'>
export const TableHead: FC<TableHeadProps> = ({ className, ...props }) => (
  <th
    className={cn(
      'h-10 whitespace-nowrap px-4 text-left align-middle text-xs font-semibold uppercase tracking-wider text-black/40 [&:has([role=checkbox])]:pr-0',
      className,
    )}
    {...props}
  />
)
TableHead.displayName = 'TableHead'

export type TableCellProps = ComponentProps<'td'> & {
  /** Renders this cell as the actions row at the bottom of a card (use with cardOnMobile on Table). */
  isActions?: boolean
}
export const TableCell: FC<TableCellProps> = ({ className, isActions, ...props }) => (
  <td
    className={cn('px-4 py-3 align-middle [&:has([role=checkbox])]:pr-0', className)}
    {...(isActions ? { 'data-actions': '' } : {})}
    {...props}
  />
)
TableCell.displayName = 'TableCell'

export type TableCaptionProps = ComponentProps<'caption'>
export const TableCaption: FC<TableCaptionProps> = ({ className, ...props }) => (
  <caption className={cn('mt-4 text-sm text-black/40', className)} {...props} />
)
TableCaption.displayName = 'TableCaption'
