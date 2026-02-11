import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import {
  DotsThree,
  PencilSimple,
  Trash,
  ArrowUp,
  CaretLeft,
  CaretRight,
  Eye,
  ClockCounterClockwise,
} from '@phosphor-icons/react'
import type { TransferRow } from '@/hooks/useTransfers'
import { TransferAuditDialog } from './TransferAuditDialog'
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
  Tag,
  Skeleton,
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  Button,
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
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
  const date = d.toLocaleDateString('tr-TR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  })
  const time = d.toLocaleTimeString('tr-TR', {
    hour: '2-digit',
    minute: '2-digit',
  })
  return { date, time }
}

function formatNumber(n: number) {
  return n.toLocaleString('tr-TR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })
}

function DetailRow({
  label,
  children,
}: {
  label: string
  children: React.ReactNode
}) {
  return (
    <div className="flex items-center justify-between py-2.5">
      <span className="text-[13px] text-black/45">{label}</span>
      <span className="text-[13px] font-medium text-black/90">{children}</span>
    </div>
  )
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
  const [detailRow, setDetailRow] = useState<TransferRow | null>(null)
  const [auditRow, setAuditRow] = useState<TransferRow | null>(null)
  const totalPages = Math.ceil(total / pageSize)
  const from = (page - 1) * pageSize + 1
  const to = Math.min(page * pageSize, total)

  if (isLoading) {
    return (
      <div className="overflow-hidden rounded-xl border border-black/[0.06]">
        <div className="bg-black/[0.015] px-4 py-3">
          <Skeleton className="h-4 w-48 rounded-md" />
        </div>
        <div className="divide-y divide-black/[0.04]">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="flex items-center gap-4 px-4 py-3.5">
              <Skeleton className="h-4 w-28 rounded-md" />
              <Skeleton className="h-4 w-20 rounded-md" />
              <Skeleton className="h-4 w-16 rounded-md" />
              <Skeleton className="ml-auto h-4 w-20 rounded-md" />
            </div>
          ))}
        </div>
      </div>
    )
  }

  if (transfers.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-black/[0.06] bg-bg1 py-20">
        <div className="flex size-12 items-center justify-center rounded-full bg-black/[0.04]">
          <ArrowUp size={20} className="text-black/30" />
        </div>
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
    <>
      <div className="overflow-hidden rounded-xl border border-black/[0.06]">
        <div className="overflow-x-auto">
          <Table className="min-w-[900px]">
            <TableHeader>
              <TableRow className="bg-black/[0.015] hover:bg-black/[0.015]">
                <TableHead className="h-10 whitespace-nowrap px-4 text-[11px] font-semibold uppercase tracking-wider text-black/40">
                  {t('transfers.columns.fullName')}
                </TableHead>
                <TableHead className="h-10 whitespace-nowrap px-4 text-[11px] font-semibold uppercase tracking-wider text-black/40">
                  {t('transfers.columns.paymentMethod')}
                </TableHead>
                <TableHead className="h-10 whitespace-nowrap px-4 text-[11px] font-semibold uppercase tracking-wider text-black/40">
                  {t('transfers.columns.date')}
                </TableHead>
                <TableHead className="h-10 whitespace-nowrap px-4 text-[11px] font-semibold uppercase tracking-wider text-black/40">
                  {t('transfers.columns.category')}
                </TableHead>
                <TableHead className="h-10 whitespace-nowrap px-4 text-right text-[11px] font-semibold uppercase tracking-wider text-black/40">
                  {t('transfers.columns.amount')}
                </TableHead>
                <TableHead className="h-10 whitespace-nowrap px-4 text-right text-[11px] font-semibold uppercase tracking-wider text-black/40">
                  {t('transfers.columns.commission')}
                </TableHead>
                <TableHead className="h-10 whitespace-nowrap px-4 text-right text-[11px] font-semibold uppercase tracking-wider text-black/40">
                  {t('transfers.columns.net')}
                </TableHead>
                <TableHead className="h-10 whitespace-nowrap px-4 text-[11px] font-semibold uppercase tracking-wider text-black/40">
                  {t('transfers.columns.currency')}
                </TableHead>
                <TableHead className="h-10 whitespace-nowrap px-4 text-[11px] font-semibold uppercase tracking-wider text-black/40">
                  {t('transfers.columns.psp')}
                </TableHead>
                <TableHead className="h-10 whitespace-nowrap px-4 text-[11px] font-semibold uppercase tracking-wider text-black/40">
                  {t('transfers.columns.type')}
                </TableHead>
                <TableHead className="h-10 w-20 px-2" />
              </TableRow>
            </TableHeader>
            <TableBody className="divide-y divide-black/[0.04]">
              {transfers.map((row) => {
                const isDeposit = row.category?.is_deposit ?? true
                const { date, time } = formatDate(row.transfer_date)
                return (
                  <TableRow
                    key={row.id}
                    className="hover:bg-black/[0.015]"
                  >
                    <TableCell className="transfers-table-data whitespace-nowrap px-4 py-3">
                      <span className="text-[13px] font-medium text-black/90">
                        {row.full_name}
                      </span>
                    </TableCell>
                    <TableCell className="transfers-table-data whitespace-nowrap px-4 py-3 text-[13px] text-black/60">
                      {row.payment_method?.name ?? '—'}
                    </TableCell>
                    <TableCell className="transfers-table-data whitespace-nowrap px-4 py-3">
                      <div className="flex flex-col">
                        <span className="text-[13px] text-black/80">
                          {date}
                        </span>
                        <span className="text-[11px] text-black/40">
                          {time}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="transfers-table-data whitespace-nowrap px-4 py-3">
                      <Tag variant={isDeposit ? 'default' : 'red'}>
                        {row.category?.name ?? '—'}
                      </Tag>
                    </TableCell>
                    <TableCell className="whitespace-nowrap px-4 py-3 text-right">
                      <span
                        className={`font-mono text-[13px] font-medium tabular-nums ${row.amount >= 0 ? 'text-green' : 'text-red'}`}
                      >
                        {formatNumber(Math.abs(row.amount))}
                      </span>
                    </TableCell>
                    <TableCell className="transfers-table-data commission-amount whitespace-nowrap px-4 py-3 text-right font-mono text-[13px] tabular-nums text-black/50">
                      {formatNumber(row.commission)}
                    </TableCell>
                    <TableCell className="whitespace-nowrap px-4 py-3 text-right">
                      <span
                        className={`font-mono text-[13px] font-semibold tabular-nums ${row.net >= 0 ? 'text-green' : 'text-red'}`}
                      >
                        {formatNumber(row.net)}
                      </span>
                    </TableCell>
                    <TableCell className="transfers-table-data whitespace-nowrap px-4 py-3">
                      <Tag variant="default">{row.currency}</Tag>
                    </TableCell>
                    <TableCell className="transfers-table-data whitespace-nowrap px-4 py-3 text-[13px] text-black/60">
                      {row.psp?.name ?? '—'}
                    </TableCell>
                    <TableCell className="transfers-table-data whitespace-nowrap px-4 py-3 text-[13px] text-black/60">
                      {row.type?.name
                        ? t(`transfers.typeValues.${row.type.name}`, { defaultValue: row.type.name })
                        : '—'}
                    </TableCell>
                    <TableCell className="transfers-table-data whitespace-nowrap px-2 py-3">
                      <div className="flex items-center justify-end gap-0.5">
                        <Button
                          variant="ghost"
                          className="size-7 p-0 text-black/30 hover:text-black/70"
                          onClick={() => setDetailRow(row)}
                        >
                          <Eye size={15} />
                        </Button>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              variant="ghost"
                              className="size-7 p-0 text-black/40 hover:text-black/70"
                            >
                              <DotsThree size={16} weight="bold" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" sideOffset={4}>
                            <DropdownMenuItem onClick={() => onEdit(row)}>
                              <PencilSimple size={14} />
                              {t('transfers.settings.editItem')}
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => setAuditRow(row)}>
                              <ClockCounterClockwise size={14} />
                              {t('transfers.audit.button')}
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
                      </div>
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        </div>

        {/* Footer: count + pagination */}
        {(totalPages > 1 || total > 0) && (
          <div className="flex items-center justify-between border-t border-black/[0.06] bg-black/[0.015] px-4 py-2.5">
            <span className="text-xs text-black/40">
              {from}–{to} / {total}
            </span>

            {totalPages > 1 && (
              <div className="flex items-center gap-1">
                <button
                  onClick={() => onPageChange(Math.max(1, page - 1))}
                  disabled={page <= 1}
                  className="flex size-7 items-center justify-center rounded-md text-black/50 hover:bg-black/[0.06] hover:text-black/80 disabled:pointer-events-none disabled:opacity-30"
                >
                  <CaretLeft size={14} weight="bold" />
                </button>

                {Array.from({ length: Math.min(totalPages, 5) }).map(
                  (_, i) => {
                    let pageNum: number
                    if (totalPages <= 5) {
                      pageNum = i + 1
                    } else if (page <= 3) {
                      pageNum = i + 1
                    } else if (page >= totalPages - 2) {
                      pageNum = totalPages - 4 + i
                    } else {
                      pageNum = page - 2 + i
                    }

                    return (
                      <button
                        key={pageNum}
                        onClick={() => onPageChange(pageNum)}
                        className={`flex size-7 items-center justify-center rounded-md text-xs font-medium ${
                          page === pageNum
                            ? 'bg-black/[0.08] text-black'
                            : 'text-black/50 hover:bg-black/[0.04] hover:text-black/80'
                        }`}
                      >
                        {pageNum}
                      </button>
                    )
                  },
                )}

                <button
                  onClick={() =>
                    onPageChange(Math.min(totalPages, page + 1))
                  }
                  disabled={page >= totalPages}
                  className="flex size-7 items-center justify-center rounded-md text-black/50 hover:bg-black/[0.06] hover:text-black/80 disabled:pointer-events-none disabled:opacity-30"
                >
                  <CaretRight size={14} weight="bold" />
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Detail Sheet */}
      <Sheet
        open={detailRow !== null}
        onOpenChange={(open) => {
          if (!open) setDetailRow(null)
        }}
      >
        <SheetContent side="right" className="w-full sm:max-w-md">
          <SheetHeader>
            <SheetTitle>{t('transfers.detail.title')}</SheetTitle>
          </SheetHeader>

          {detailRow && (
            <div className="mt-6 space-y-0 divide-y divide-black/[0.06]">
              <DetailRow label={t('transfers.columns.fullName')}>
                {detailRow.full_name}
              </DetailRow>
              <DetailRow label={t('transfers.columns.paymentMethod')}>
                {detailRow.payment_method?.name ?? '—'}
              </DetailRow>
              <DetailRow label={t('transfers.columns.date')}>
                {formatDate(detailRow.transfer_date).date}{' '}
                <span className="text-black/40">
                  {formatDate(detailRow.transfer_date).time}
                </span>
              </DetailRow>
              <DetailRow label={t('transfers.columns.category')}>
                <Tag
                  variant={
                    (detailRow.category?.is_deposit ?? true) ? 'default' : 'red'
                  }
                >
                  {detailRow.category?.name ?? '—'}
                </Tag>
              </DetailRow>
              <DetailRow label={t('transfers.columns.amount')}>
                <span
                  className={`font-mono tabular-nums ${detailRow.amount >= 0 ? 'text-green' : 'text-red'}`}
                >
                  {formatNumber(Math.abs(detailRow.amount))}
                </span>
              </DetailRow>
              <DetailRow label={t('transfers.columns.commission')}>
                <span className="commission-amount font-mono tabular-nums text-black/50">
                  {formatNumber(detailRow.commission)}
                </span>
              </DetailRow>
              <DetailRow label={t('transfers.columns.net')}>
                <span
                  className={`font-mono font-semibold tabular-nums ${detailRow.net >= 0 ? 'text-green' : 'text-red'}`}
                >
                  {formatNumber(detailRow.net)}
                </span>
              </DetailRow>
              <DetailRow label={t('transfers.columns.currency')}>
                <Tag variant="default">{detailRow.currency}</Tag>
              </DetailRow>
              <DetailRow label={t('transfers.columns.psp')}>
                {detailRow.psp?.name ?? '—'}
              </DetailRow>
              <DetailRow label={t('transfers.columns.type')}>
                {detailRow.type?.name
                  ? t(`transfers.typeValues.${detailRow.type.name}`, { defaultValue: detailRow.type.name })
                  : '—'}
              </DetailRow>
              <DetailRow label={t('transfers.columns.crmId')}>
                <span className="font-mono text-[12px]">
                  {detailRow.crm_id || '—'}
                </span>
              </DetailRow>
              <DetailRow label={t('transfers.columns.metaId')}>
                <span className="font-mono text-[12px]">
                  {detailRow.meta_id || '—'}
                </span>
              </DetailRow>
            </div>
          )}
        </SheetContent>
      </Sheet>

      {/* Audit Dialog */}
      <TransferAuditDialog
        transferId={auditRow?.id ?? null}
        transferName={auditRow?.full_name ?? null}
        open={auditRow !== null}
        onClose={() => setAuditRow(null)}
      />
    </>
  )
}
