import type { ComponentProps, FC } from 'react'
import { cn } from '@ds/utils'

export type TableProps = ComponentProps<'table'>
export const Table: FC<TableProps> = ({ className, ...props }) => (
  <div className="relative w-full overflow-auto">
    <table className={cn('w-full caption-bottom text-sm', className)} {...props} />
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
      'h-12 px-4 text-left align-middle font-medium text-black/40 [&:has([role=checkbox])]:pr-0',
      className,
    )}
    {...props}
  />
)
TableHead.displayName = 'TableHead'

export type TableCellProps = ComponentProps<'td'>
export const TableCell: FC<TableCellProps> = ({ className, ...props }) => (
  <td className={cn('p-4 align-middle [&:has([role=checkbox])]:pr-0', className)} {...props} />
)
TableCell.displayName = 'TableCell'

export type TableCaptionProps = ComponentProps<'caption'>
export const TableCaption: FC<TableCaptionProps> = ({ className, ...props }) => (
  <caption className={cn('mt-4 text-sm text-black/40', className)} {...props} />
)
TableCaption.displayName = 'TableCaption'
