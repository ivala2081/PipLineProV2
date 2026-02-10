import { useTranslation } from 'react-i18next'
import { DotsThree, PencilSimple, Trash } from '@phosphor-icons/react'
import type { TransferRow } from '@/hooks/useTransfers'
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
  Tag,
  Skeleton,
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationPrevious,
  PaginationNext,
  PaginationLink,
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  Button,
} from '@ds'

interface TransfersTableProps {
  transfers: TransferRow[]
  isLoading: boolean
  page: number
  pageSize: number
  total: number
  onPageChange: (page: number) => void
  onEdit: (transfer: TransferRow) => void
  onDelete: (transfer: TransferRow) => void
}

function formatDate(dateStr: string) {
  const d = new Date(dateStr)
  return d.toLocaleDateString('tr-TR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function formatNumber(n: number) {
  return n.toLocaleString('tr-TR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })
}

export function TransfersTable({
  transfers,
  isLoading,
  page,
  pageSize,
  total,
  onPageChange,
  onEdit,
  onDelete,
}: TransfersTableProps) {
  const { t } = useTranslation('pages')
  const totalPages = Math.ceil(total / pageSize)

  if (isLoading) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-12 w-full rounded-xl" />
        ))}
      </div>
    )
  }

  if (transfers.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 rounded-2xl border border-black/5 bg-bg1 py-20">
        <div className="text-center">
          <p className="text-sm font-medium text-black/60">
            {t('transfers.empty.title')}
          </p>
          <p className="mt-1 text-xs text-black/40">
            {t('transfers.empty.description')}
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>{t('transfers.columns.fullName')}</TableHead>
            <TableHead>{t('transfers.columns.paymentMethod')}</TableHead>
            <TableHead>{t('transfers.columns.date')}</TableHead>
            <TableHead>{t('transfers.columns.category')}</TableHead>
            <TableHead className="text-right">{t('transfers.columns.amount')}</TableHead>
            <TableHead className="text-right">{t('transfers.columns.commission')}</TableHead>
            <TableHead className="text-right">{t('transfers.columns.net')}</TableHead>
            <TableHead>{t('transfers.columns.currency')}</TableHead>
            <TableHead>{t('transfers.columns.psp')}</TableHead>
            <TableHead>{t('transfers.columns.type')}</TableHead>
            <TableHead>{t('transfers.columns.crmId')}</TableHead>
            <TableHead>{t('transfers.columns.metaId')}</TableHead>
            <TableHead className="w-10" />
          </TableRow>
        </TableHeader>
        <TableBody>
          {transfers.map((row) => {
            const isDeposit = row.category?.is_deposit ?? true
            return (
              <TableRow key={row.id}>
                <TableCell className="font-medium">{row.full_name}</TableCell>
                <TableCell>{row.payment_method?.name ?? '—'}</TableCell>
                <TableCell className="whitespace-nowrap text-sm">
                  {formatDate(row.transfer_date)}
                </TableCell>
                <TableCell>
                  <Tag variant={isDeposit ? 'green' : 'red'}>
                    {row.category?.name ?? '—'}
                  </Tag>
                </TableCell>
                <TableCell
                  className={`text-right font-mono ${row.amount >= 0 ? 'text-green-600' : 'text-red-600'}`}
                >
                  {formatNumber(row.amount)}
                </TableCell>
                <TableCell className="text-right font-mono">
                  {formatNumber(row.commission)}
                </TableCell>
                <TableCell
                  className={`text-right font-mono ${row.net >= 0 ? 'text-green-600' : 'text-red-600'}`}
                >
                  {formatNumber(row.net)}
                </TableCell>
                <TableCell>
                  <Tag variant="default">{row.currency}</Tag>
                </TableCell>
                <TableCell>{row.psp?.name ?? '—'}</TableCell>
                <TableCell>{row.type?.name ?? '—'}</TableCell>
                <TableCell className="text-black/40">{row.crm_id ?? '—'}</TableCell>
                <TableCell className="text-black/40">{row.meta_id ?? '—'}</TableCell>
                <TableCell>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="ghost"
                        className="h-8 w-8 p-0"
                      >
                        <DotsThree size={16} weight="bold" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => onEdit(row)}>
                        <PencilSimple size={14} />
                        {t('transfers.settings.editItem')}
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        className="text-red-600"
                        onClick={() => onDelete(row)}
                      >
                        <Trash size={14} />
                        {t('transfers.settings.deleteItem')}
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            )
          })}
        </TableBody>
      </Table>

      {totalPages > 1 && (
        <Pagination>
          <PaginationContent>
            <PaginationItem>
              <PaginationPrevious
                onClick={() => onPageChange(Math.max(1, page - 1))}
                className={page <= 1 ? 'pointer-events-none opacity-50' : 'cursor-pointer'}
              />
            </PaginationItem>
            {Array.from({ length: Math.min(totalPages, 5) }).map((_, i) => {
              const pageNum = i + 1
              return (
                <PaginationItem key={pageNum}>
                  <PaginationLink
                    onClick={() => onPageChange(pageNum)}
                    isActive={page === pageNum}
                    className="cursor-pointer"
                  >
                    {pageNum}
                  </PaginationLink>
                </PaginationItem>
              )
            })}
            <PaginationItem>
              <PaginationNext
                onClick={() => onPageChange(Math.min(totalPages, page + 1))}
                className={page >= totalPages ? 'pointer-events-none opacity-50' : 'cursor-pointer'}
              />
            </PaginationItem>
          </PaginationContent>
        </Pagination>
      )}
    </div>
  )
}
