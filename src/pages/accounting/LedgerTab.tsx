import type { AccountingEntry } from '@/lib/database.types'
import { LedgerTable } from './LedgerTable'

interface LedgerTabProps {
  entries: AccountingEntry[]
  isLoading: boolean
  page: number
  pageSize: number
  total: number
  onPageChange: (page: number) => void
  onEdit: (entry: AccountingEntry) => void
  onDelete: (entry: AccountingEntry) => void
}

export function LedgerTab({
  entries,
  isLoading,
  page,
  pageSize,
  total,
  onPageChange,
  onEdit,
  onDelete,
}: LedgerTabProps) {
  return (
    <LedgerTable
      entries={entries}
      isLoading={isLoading}
      page={page}
      pageSize={pageSize}
      total={total}
      onPageChange={onPageChange}
      onEdit={onEdit}
      onDelete={onDelete}
    />
  )
}
