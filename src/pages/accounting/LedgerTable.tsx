import { useTranslation } from 'react-i18next'
import {
  DotsThree,
  PencilSimple,
  Trash,
  ArrowUp,
  CaretLeft,
  CaretRight,
} from '@phosphor-icons/react'
import type { AccountingEntry } from '@/lib/database.types'
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
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationEllipsis,
  EmptyState,
} from '@ds'

interface LedgerTableProps {
  entries: AccountingEntry[]
  isLoading: boolean
  page: number
  pageSize: number
  total: number
  onPageChange: (page: number) => void
  onEdit: (entry: AccountingEntry) => void
  onDelete: (entry: AccountingEntry) => void
}

/* ── Helpers ─────────────────────────────────────────── */

interface DateGroup {
  dateKey: string
  label: string
  entries: AccountingEntry[]
}

function groupByDate(entries: AccountingEntry[], lang: string): DateGroup[] {
  const map = new Map<string, AccountingEntry[]>()
  for (const e of entries) {
    const key = e.entry_date.slice(0, 10)
    const arr = map.get(key) ?? []
    arr.push(e)
    map.set(key, arr)
  }
  const locale = lang === 'tr' ? 'tr-TR' : 'en-US'
  return Array.from(map, ([dateKey, items]) => ({
    dateKey,
    label: new Date(dateKey + 'T00:00:00').toLocaleDateString(locale, {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
      weekday: 'long',
    }),
    entries: items,
  }))
}

function formatNumber(n: number) {
  return n.toLocaleString('tr-TR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })
}

const REGISTER_LABELS: Record<string, string> = {
  USDT: 'USDT',
  NAKIT_TL: 'Cash TL',
  NAKIT_USD: 'Cash USD',
}

const TH_CLASS =
  'whitespace-nowrap text-xs font-semibold uppercase tracking-wider text-black/40'

/* ── Component ───────────────────────────────────────── */

export function LedgerTable({
  entries,
  isLoading,
  page,
  pageSize,
  total,
  onPageChange,
  onEdit,
  onDelete,
}: LedgerTableProps) {
  const { t, i18n } = useTranslation('pages')
  const totalPages = Math.ceil(total / pageSize)
  const from = (page - 1) * pageSize + 1
  const to = Math.min(page * pageSize, total)

  if (isLoading) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 2 }).map((_, g) => (
          <div
            key={g}
            className="overflow-hidden rounded-xl border border-black/10"
          >
            <div className="flex items-center justify-between bg-black/[0.02] px-4 py-2.5">
              <Skeleton className="h-4 w-48 rounded-md" />
            </div>
            <div className="divide-y divide-black/[0.04]">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="flex items-center gap-4 px-4 py-3.5">
                  <Skeleton className="h-4 w-40 rounded-md" />
                  <Skeleton className="h-4 w-16 rounded-md" />
                  <Skeleton className="h-5 w-12 rounded-full" />
                  <Skeleton className="ml-auto h-4 w-20 rounded-md" />
                  <Skeleton className="h-4 w-14 rounded-md" />
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    )
  }

  if (entries.length === 0) {
    return (
      <EmptyState
        icon={ArrowUp}
        title={t('accounting.empty.title')}
        description={t('accounting.empty.description')}
      />
    )
  }

  const groups = groupByDate(entries, i18n.language)

  function getPageNumbers(): (number | 'ellipsis')[] {
    if (totalPages <= 5)
      return Array.from({ length: totalPages }, (_, i) => i + 1)
    if (page <= 3) return [1, 2, 3, 4, 'ellipsis', totalPages]
    if (page >= totalPages - 2)
      return [1, 'ellipsis', totalPages - 3, totalPages - 2, totalPages - 1, totalPages]
    return [1, 'ellipsis', page - 1, page, page + 1, 'ellipsis', totalPages]
  }

  return (
    <>
      <div className="space-y-3">
        {groups.map((group) => (
          <div
            key={group.dateKey}
            className="overflow-hidden rounded-xl border border-black/10"
          >
            <div className="flex items-center justify-between bg-black/[0.02] px-4 py-2.5">
              <span className="text-sm font-semibold text-black/70">
                {group.label}
              </span>
            </div>

            <div className="overflow-x-auto">
              <Table className="min-w-[900px]">
                <TableHeader>
                  <TableRow className="bg-black/[0.015] hover:bg-black/[0.015]">
                    <TableHead className={TH_CLASS}>
                      {t('accounting.columns.description')}
                    </TableHead>
                    <TableHead className={TH_CLASS}>
                      {t('accounting.columns.type')}
                    </TableHead>
                    <TableHead className={TH_CLASS}>
                      {t('accounting.columns.direction')}
                    </TableHead>
                    <TableHead className={`${TH_CLASS} text-right`}>
                      {t('accounting.columns.amount')}
                    </TableHead>
                    <TableHead className={TH_CLASS}>
                      {t('accounting.columns.currency')}
                    </TableHead>
                    <TableHead className={TH_CLASS}>
                      {t('accounting.columns.register')}
                    </TableHead>
                    <TableHead className={TH_CLASS}>
                      {t('accounting.columns.costPeriod')}
                    </TableHead>
                    <TableHead className="w-16 px-2" />
                  </TableRow>
                </TableHeader>
                <TableBody className="divide-y divide-black/[0.04]">
                  {group.entries.map((row) => (
                    <TableRow key={row.id} className="hover:bg-black/[0.015]">
                      <TableCell className="whitespace-nowrap">
                        <span className="text-sm font-medium text-black/90">
                          {row.description}
                        </span>
                      </TableCell>
                      <TableCell className="whitespace-nowrap">
                        <Tag variant="default">
                          {row.entry_type === 'ODEME'
                            ? t('accounting.entryTypes.ODEME')
                            : t('accounting.entryTypes.TRANSFER')}
                        </Tag>
                      </TableCell>
                      <TableCell className="whitespace-nowrap">
                        <Tag variant={row.direction === 'in' ? 'default' : 'red'}>
                          {row.direction === 'in'
                            ? t('accounting.directions.in')
                            : t('accounting.directions.out')}
                        </Tag>
                      </TableCell>
                      <TableCell className="whitespace-nowrap text-right">
                        <span
                          className={`font-mono text-sm font-medium tabular-nums ${row.direction === 'in' ? 'text-green' : 'text-red'}`}
                        >
                          {row.direction === 'in' ? '+' : '-'}
                          {formatNumber(row.amount)}
                        </span>
                      </TableCell>
                      <TableCell className="whitespace-nowrap">
                        <Tag variant="default">{row.currency}</Tag>
                      </TableCell>
                      <TableCell className="whitespace-nowrap text-sm text-black/60">
                        {REGISTER_LABELS[row.register] || row.register}
                      </TableCell>
                      <TableCell className="whitespace-nowrap text-sm text-black/50">
                        {row.cost_period || '—'}
                      </TableCell>
                      <TableCell className="whitespace-nowrap px-2">
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
                              {t('accounting.actions.edit')}
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              className="text-red"
                              onClick={() => onDelete(row)}
                            >
                              <Trash size={14} />
                              {t('accounting.actions.delete')}
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>
        ))}
      </div>

      {/* Pagination */}
      {(totalPages > 1 || total > 0) && (
        <div className="flex items-center justify-between rounded-lg border border-black/10 bg-black/[0.015] px-4 py-2">
          <span className="text-xs tabular-nums text-black/40">
            {from}–{to} / {total}
          </span>
          {totalPages > 1 && (
            <Pagination className="mx-0 w-auto">
              <PaginationContent>
                <PaginationItem>
                  <PaginationLink
                    onClick={() => onPageChange(Math.max(1, page - 1))}
                    disabled={page <= 1}
                    aria-label="Previous page"
                  >
                    <CaretLeft size={14} weight="bold" />
                  </PaginationLink>
                </PaginationItem>
                {getPageNumbers().map((p, i) =>
                  p === 'ellipsis' ? (
                    <PaginationItem key={`e-${i}`}>
                      <PaginationEllipsis />
                    </PaginationItem>
                  ) : (
                    <PaginationItem key={p}>
                      <PaginationLink
                        isActive={page === p}
                        onClick={() => onPageChange(p)}
                      >
                        {p}
                      </PaginationLink>
                    </PaginationItem>
                  ),
                )}
                <PaginationItem>
                  <PaginationLink
                    onClick={() => onPageChange(Math.min(totalPages, page + 1))}
                    disabled={page >= totalPages}
                    aria-label="Next page"
                  >
                    <CaretRight size={14} weight="bold" />
                  </PaginationLink>
                </PaginationItem>
              </PaginationContent>
            </Pagination>
          )}
        </div>
      )}
    </>
  )
}
