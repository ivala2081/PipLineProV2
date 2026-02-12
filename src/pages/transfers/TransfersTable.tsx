import { useState, useRef, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import {
  DotsThree,
  PencilSimple,
  Trash,
  ArrowUp,
  Eye,
  ClockCounterClockwise,
  ChartBar,
  Coins,
  Bank,
  CreditCard,
  CurrencyDollar,
  CaretLeft,
  CaretRight,
  Check,
  X,
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
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationEllipsis,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  EmptyState,
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

/* ── Helpers ─────────────────────────────────────────── */

interface DateGroup {
  dateKey: string
  label: string
  transfers: TransferRow[]
}

function groupByDate(transfers: TransferRow[], lang: string): DateGroup[] {
  const map = new Map<string, TransferRow[]>()
  for (const t of transfers) {
    const key = t.transfer_date.slice(0, 10)
    const arr = map.get(key) ?? []
    arr.push(t)
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
    transfers: items,
  }))
}

function formatTime(dateStr: string) {
  return new Date(dateStr).toLocaleTimeString('tr-TR', {
    hour: '2-digit',
    minute: '2-digit',
  })
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

interface DaySummary {
  deposits: number
  withdrawals: number
  net: number
  commission: number
  count: number
  depositCount: number
  withdrawalCount: number
  totalBank: number
  totalCreditCard: number
  totalUsd: number
  netWithCommUsd: number
  netWithoutCommUsd: number
  dayRate: number
}

function computeDaySummary(transfers: TransferRow[]): DaySummary {
  let deposits = 0
  let withdrawals = 0
  let commission = 0
  let depositCount = 0
  let withdrawalCount = 0
  let totalBank = 0
  let totalCreditCard = 0
  let totalUsd = 0
  let netWithoutCommUsd = 0
  let commissionUsd = 0
  let rateSum = 0
  let rateCount = 0

  for (const t of transfers) {
    const tryAmount = Math.abs(t.amount_try ?? 0)
    const commTry =
      t.currency === 'USD' ? t.commission * (t.exchange_rate ?? 1) : t.commission
    const rate = t.exchange_rate ?? 1

    if (t.category?.is_deposit) {
      deposits += tryAmount
      depositCount++
    } else {
      withdrawals += tryAmount
      withdrawalCount++
    }
    commission += commTry

    const method = t.payment_method?.name?.toLowerCase() ?? ''
    if (method.includes('bank')) totalBank += tryAmount
    if (method.includes('credit')) totalCreditCard += tryAmount
    if (t.currency === 'USD') totalUsd += Math.abs(t.amount ?? 0)

    // USD equivalents for net calculations
    netWithoutCommUsd += t.amount_usd ?? 0
    commissionUsd +=
      t.currency === 'USD' ? t.commission : t.commission / rate

    if (rate > 0) {
      rateSum += rate
      rateCount++
    }
  }

  return {
    deposits,
    withdrawals,
    net: deposits - withdrawals,
    commission,
    count: transfers.length,
    depositCount,
    withdrawalCount,
    totalBank,
    totalCreditCard,
    totalUsd,
    netWithoutCommUsd,
    netWithCommUsd: netWithoutCommUsd - commissionUsd,
    dayRate: rateCount > 0 ? rateSum / rateCount : 0,
  }
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
      <span className="text-sm text-black/45">{label}</span>
      <span className="text-sm font-medium text-black/90">{children}</span>
    </div>
  )
}

/* ── Column header class ─────────────────────────────── */

const TH_CLASS =
  'whitespace-nowrap text-xs font-semibold uppercase tracking-wider text-black/40'

/* ── Component ───────────────────────────────────────── */

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
  const { t, i18n } = useTranslation('pages')
  const [detailRow, setDetailRow] = useState<TransferRow | null>(null)
  const [auditRow, setAuditRow] = useState<TransferRow | null>(null)
  const [summaryGroup, setSummaryGroup] = useState<DateGroup | null>(null)
  const [customRate, setCustomRate] = useState<number | null>(null)
  const [isEditingRate, setIsEditingRate] = useState(false)
  const rateInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (isEditingRate && rateInputRef.current) {
      rateInputRef.current.focus()
      rateInputRef.current.select()
    }
  }, [isEditingRate])
  const totalPages = Math.ceil(total / pageSize)
  const from = (page - 1) * pageSize + 1
  const to = Math.min(page * pageSize, total)

  /* ── Loading skeleton ───────────────────────────── */
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
              <Skeleton className="h-7 w-20 rounded-md" />
            </div>
            <div className="divide-y divide-black/[0.04]">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="flex items-center gap-4 px-4 py-3.5">
                  <Skeleton className="h-4 w-28 rounded-md" />
                  <Skeleton className="h-4 w-20 rounded-md" />
                  <Skeleton className="h-4 w-12 rounded-md" />
                  <Skeleton className="h-5 w-16 rounded-full" />
                  <Skeleton className="ml-auto h-4 w-20 rounded-md" />
                  <Skeleton className="h-4 w-16 rounded-md" />
                  <Skeleton className="h-4 w-20 rounded-md" />
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    )
  }

  /* ── Empty state ────────────────────────────────── */
  if (transfers.length === 0) {
    return (
      <EmptyState
        icon={ArrowUp}
        title={t('transfers.empty.title')}
        description={t('transfers.empty.description')}
      />
    )
  }

  /* ── Group transfers by date ────────────────────── */
  const groups = groupByDate(transfers, i18n.language)

  /* ── Page numbers for pagination ────────────────── */
  function getPageNumbers(): (number | 'ellipsis')[] {
    if (totalPages <= 5) {
      return Array.from({ length: totalPages }, (_, i) => i + 1)
    }
    if (page <= 3) {
      return [1, 2, 3, 4, 'ellipsis', totalPages]
    }
    if (page >= totalPages - 2) {
      return [1, 'ellipsis', totalPages - 3, totalPages - 2, totalPages - 1, totalPages]
    }
    return [1, 'ellipsis', page - 1, page, page + 1, 'ellipsis', totalPages]
  }

  return (
    <>
      {/* Date-grouped cards */}
      <div className="space-y-3">
        {groups.map((group) => (
          <div
            key={group.dateKey}
            className="overflow-hidden rounded-xl border border-black/10"
          >
            {/* Date header */}
            <div className="flex items-center justify-between bg-black/[0.02] px-4 py-2.5">
              <span className="text-sm font-semibold text-black/70">
                {group.label}
              </span>
              <Button
                variant="ghost"
                size="sm"
                className="h-7 gap-1.5 px-2.5 text-xs font-medium text-black/40 hover:text-black/70"
                onClick={() => setSummaryGroup(group)}
              >
                <ChartBar size={14} />
                {t('transfers.summary.label')}
              </Button>
            </div>

            {/* Table for this date group */}
            <div className="overflow-x-auto">
              <Table className="min-w-[900px]">
                <TableHeader>
                  <TableRow className="bg-black/[0.015] hover:bg-black/[0.015]">
                    <TableHead className={TH_CLASS}>
                      {t('transfers.columns.fullName')}
                    </TableHead>
                    <TableHead className={TH_CLASS}>
                      {t('transfers.columns.paymentMethod')}
                    </TableHead>
                    <TableHead className={TH_CLASS}>
                      {t('transfers.columns.time')}
                    </TableHead>
                    <TableHead className={TH_CLASS}>
                      {t('transfers.columns.category')}
                    </TableHead>
                    <TableHead className={`${TH_CLASS} text-right`}>
                      {t('transfers.columns.amount')}
                    </TableHead>
                    <TableHead className={`${TH_CLASS} text-right`}>
                      {t('transfers.columns.commission')}
                    </TableHead>
                    <TableHead className={`${TH_CLASS} text-right`}>
                      {t('transfers.columns.net')}
                    </TableHead>
                    <TableHead className={TH_CLASS}>
                      {t('transfers.columns.currency')}
                    </TableHead>
                    <TableHead className={TH_CLASS}>
                      {t('transfers.columns.psp')}
                    </TableHead>
                    <TableHead className={TH_CLASS}>
                      {t('transfers.columns.type')}
                    </TableHead>
                    <TableHead className="w-20 px-2" />
                  </TableRow>
                </TableHeader>
                <TableBody className="divide-y divide-black/[0.04]">
                  {group.transfers.map((row) => {
                    const isDeposit = row.category?.is_deposit ?? true
                    const time = formatTime(row.transfer_date)
                    return (
                      <TableRow
                        key={row.id}
                        className="hover:bg-black/[0.015]"
                      >
                        <TableCell className="whitespace-nowrap">
                          <span className="text-sm font-medium text-black/90">
                            {row.full_name}
                          </span>
                        </TableCell>
                        <TableCell className="whitespace-nowrap text-sm text-black/60">
                          {row.payment_method?.name ?? '—'}
                        </TableCell>
                        <TableCell className="whitespace-nowrap">
                          <span className="text-sm text-black/80">
                            {time}
                          </span>
                        </TableCell>
                        <TableCell className="whitespace-nowrap">
                          <Tag variant={isDeposit ? 'default' : 'red'}>
                            {row.category?.name ?? '—'}
                          </Tag>
                        </TableCell>
                        <TableCell className="whitespace-nowrap text-right">
                          <span
                            className={`font-mono text-sm font-medium tabular-nums ${row.amount >= 0 ? 'text-green' : 'text-red'}`}
                          >
                            {formatNumber(Math.abs(row.amount))}
                          </span>
                        </TableCell>
                        <TableCell className="whitespace-nowrap text-right font-mono text-sm tabular-nums text-black/50">
                          {formatNumber(row.commission)}
                        </TableCell>
                        <TableCell className="whitespace-nowrap text-right">
                          <span
                            className={`font-mono text-sm font-semibold tabular-nums ${row.net >= 0 ? 'text-green' : 'text-red'}`}
                          >
                            {formatNumber(row.net)}
                          </span>
                        </TableCell>
                        <TableCell className="whitespace-nowrap">
                          <Tag variant="default">{row.currency}</Tag>
                        </TableCell>
                        <TableCell className="whitespace-nowrap text-sm text-black/60">
                          {row.psp?.name ?? '—'}
                        </TableCell>
                        <TableCell className="whitespace-nowrap text-sm text-black/60">
                          {row.type?.name
                            ? t(`transfers.typeValues.${row.type.name}`, {
                                defaultValue: row.type.name,
                              })
                            : '—'}
                        </TableCell>
                        <TableCell className="whitespace-nowrap px-2">
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
                                <DropdownMenuItem
                                  onClick={() => setAuditRow(row)}
                                >
                                  <ClockCounterClockwise size={14} />
                                  {t('transfers.audit.button')}
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  className="text-red"
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
          </div>
        ))}
      </div>

      {/* Pagination footer */}
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
                    onClick={() =>
                      onPageChange(Math.min(totalPages, page + 1))
                    }
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

      {/* Daily Summary Dialog */}
      <Dialog
        open={summaryGroup !== null}
        onOpenChange={(open) => {
          if (!open) {
            setSummaryGroup(null)
            setCustomRate(null)
            setIsEditingRate(false)
          }
        }}
      >
        <DialogContent size="md" className="max-h-[85vh] gap-0 overflow-y-auto p-0">
          {summaryGroup && (() => {
            const s = computeDaySummary(summaryGroup.transfers)
            const vol = s.deposits + s.withdrawals
            const depositPct = vol > 0 ? (s.deposits / vol) * 100 : 50

            return (
              <>
                {/* ── Hero zone ────────────────────── */}
                <div className={`px-6 pt-6 pb-5 ${s.net >= 0 ? 'bg-green/[0.03]' : 'bg-red/[0.03]'}`}>
                  <DialogHeader>
                    <DialogTitle className="text-sm font-semibold">{summaryGroup.label}</DialogTitle>
                  </DialogHeader>
                  <p className="mt-0.5 text-[12px] text-black/40">
                    {t('transfers.summary.count', { count: s.count })}
                    {' · '}
                    {t('transfers.summary.countDetail', {
                      deposits: s.depositCount,
                      withdrawals: s.withdrawalCount,
                    })}
                  </p>

                  <p
                    className={`mt-4 font-mono text-[2rem] font-bold leading-none tabular-nums ${s.net >= 0 ? 'text-green' : 'text-red'}`}
                  >
                    {s.net >= 0 ? '+' : '−'}{formatNumber(Math.abs(s.net))}
                    <span className="ml-1.5 text-sm opacity-40">₺</span>
                  </p>
                  <p className="mt-1 text-[12px] text-black/30">{t('transfers.summary.net')}</p>
                </div>

                {/* ── Deposit / Withdrawal ────────── */}
                <div className="grid grid-cols-2">
                  <div className="border-r border-b border-black/10 px-6 py-4">
                    <div className="flex items-center gap-1.5">
                      <div className="size-1.5 rounded-full bg-green" />
                      <span className="text-[12px] text-black/45">{t('transfers.summary.deposits')}</span>
                    </div>
                    <p className="mt-1.5 font-mono text-lg font-bold tabular-nums text-black/80">
                      {formatNumber(s.deposits)}
                      <span className="ml-1 text-[12px] font-medium text-black/25">₺</span>
                    </p>
                    <p className="mt-0.5 text-xs tabular-nums text-black/25">
                      {s.depositCount} {t('transfers.summary.deposits').toLowerCase()}
                    </p>
                  </div>
                  <div className="border-b border-black/10 px-6 py-4">
                    <div className="flex items-center gap-1.5">
                      <div className="size-1.5 rounded-full bg-red" />
                      <span className="text-[12px] text-black/45">{t('transfers.summary.withdrawals')}</span>
                    </div>
                    <p className="mt-1.5 font-mono text-lg font-bold tabular-nums text-black/80">
                      {formatNumber(s.withdrawals)}
                      <span className="ml-1 text-[12px] font-medium text-black/25">₺</span>
                    </p>
                    <p className="mt-0.5 text-xs tabular-nums text-black/25">
                      {s.withdrawalCount} {t('transfers.summary.withdrawals').toLowerCase()}
                    </p>
                  </div>
                </div>

                {/* Proportion bar */}
                <div className="flex h-1">
                  <div className="bg-green/60" style={{ width: `${depositPct}%` }} />
                  <div className="bg-red/60" style={{ width: `${100 - depositPct}%` }} />
                </div>

                {/* ── Breakdown rows ──────────────── */}
                <div className="px-6 py-4">
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2.5">
                        <Bank size={16} className="text-black/30" />
                        <span className="text-sm text-black/60">{t('transfers.summary.totalBank')}</span>
                      </div>
                      <span className="font-mono text-sm font-semibold tabular-nums text-black/70">
                        {formatNumber(s.totalBank)} ₺
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2.5">
                        <CreditCard size={16} className="text-black/30" />
                        <span className="text-sm text-black/60">{t('transfers.summary.totalCreditCard')}</span>
                      </div>
                      <span className="font-mono text-sm font-semibold tabular-nums text-black/70">
                        {formatNumber(s.totalCreditCard)} ₺
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2.5">
                        <CurrencyDollar size={16} className="text-black/30" />
                        <span className="text-sm text-black/60">{t('transfers.summary.totalUsd')}</span>
                      </div>
                      <span className="font-mono text-sm font-semibold tabular-nums text-black/70">
                        {formatNumber(s.totalUsd)} $
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2.5">
                        <Coins size={16} className="text-black/30" />
                        <span className="text-sm text-black/60">{t('transfers.summary.commission')}</span>
                      </div>
                      <span className="font-mono text-sm font-semibold tabular-nums text-black/70">
                        {formatNumber(s.commission)} ₺
                      </span>
                    </div>
                  </div>
                </div>

                {/* ── USD section ─────────────────── */}
                {(() => {
                  const effectiveRate = customRate ?? s.dayRate
                  const overrideActive = customRate !== null
                  const adjNetWithoutCommUsd = effectiveRate > 0 ? s.net / effectiveRate : 0
                  const adjNetWithCommUsd = effectiveRate > 0 ? (s.net - s.commission) / effectiveRate : 0

                  return (
                    <div className="border-t border-black/10 bg-black/[0.02] px-6 py-4">
                      <div className="flex items-center justify-between">
                        <span className="text-[12px] font-medium text-black/40">
                          {t('transfers.summary.dayRate')}
                        </span>
                        <div className="flex items-center gap-1.5">
                          {isEditingRate ? (
                            <>
                              <input
                                ref={rateInputRef}
                                type="number"
                                step="0.0001"
                                defaultValue={(customRate ?? s.dayRate).toFixed(4)}
                                className="h-7 w-24 rounded border border-black/10 bg-white px-2 text-right font-mono text-sm font-bold tabular-nums text-black/70 outline-none focus:border-black/25"
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') {
                                    const val = parseFloat(rateInputRef.current?.value ?? '')
                                    if (!isNaN(val) && val > 0) {
                                      setCustomRate(val)
                                    }
                                    setIsEditingRate(false)
                                  } else if (e.key === 'Escape') {
                                    setIsEditingRate(false)
                                  }
                                }}
                              />
                              <button
                                className="flex size-6 items-center justify-center rounded text-green hover:bg-green/10"
                                onClick={() => {
                                  const val = parseFloat(rateInputRef.current?.value ?? '')
                                  if (!isNaN(val) && val > 0) {
                                    setCustomRate(val)
                                  }
                                  setIsEditingRate(false)
                                }}
                              >
                                <Check size={14} weight="bold" />
                              </button>
                              <button
                                className="flex size-6 items-center justify-center rounded text-red hover:bg-red/10"
                                onClick={() => setIsEditingRate(false)}
                              >
                                <X size={14} weight="bold" />
                              </button>
                            </>
                          ) : (
                            <>
                              <span className={`font-mono text-sm font-bold tabular-nums ${overrideActive ? 'text-orange' : 'text-black/60'}`}>
                                {effectiveRate.toFixed(4)}
                              </span>
                              {overrideActive && (
                                <span className="text-xs text-black/25">
                                  ({t('transfers.summary.original')}: {s.dayRate.toFixed(4)})
                                </span>
                              )}
                              <button
                                className="flex size-6 items-center justify-center rounded text-black/30 hover:bg-black/5 hover:text-black/60"
                                onClick={() => setIsEditingRate(true)}
                                title={t('transfers.summary.editRate')}
                              >
                                <PencilSimple size={13} />
                              </button>
                              {overrideActive && (
                                <button
                                  className="flex size-6 items-center justify-center rounded text-black/25 hover:bg-black/5 hover:text-black/50"
                                  onClick={() => setCustomRate(null)}
                                  title={t('transfers.summary.resetRate')}
                                >
                                  <X size={12} />
                                </button>
                              )}
                            </>
                          )}
                        </div>
                      </div>

                      <div className="mt-4 grid grid-cols-2 gap-4">
                        <div>
                          <p className="text-xs text-black/35">{t('transfers.summary.netWithComm')}</p>
                          <p
                            className={`mt-1 font-mono text-lg font-bold tabular-nums ${adjNetWithCommUsd >= 0 ? 'text-green' : 'text-red'}`}
                          >
                            {adjNetWithCommUsd >= 0 ? '+' : '−'}{formatNumber(Math.abs(adjNetWithCommUsd))}
                            <span className="ml-0.5 text-xs opacity-40">$</span>
                          </p>
                          <p className="mt-0.5 text-xs text-black/20">{t('transfers.summary.afterCommission')}</p>
                        </div>
                        <div>
                          <p className="text-xs text-black/35">{t('transfers.summary.netWithoutComm')}</p>
                          <p
                            className={`mt-1 font-mono text-lg font-bold tabular-nums ${adjNetWithoutCommUsd >= 0 ? 'text-green' : 'text-red'}`}
                          >
                            {adjNetWithoutCommUsd >= 0 ? '+' : '−'}{formatNumber(Math.abs(adjNetWithoutCommUsd))}
                            <span className="ml-0.5 text-xs opacity-40">$</span>
                          </p>
                          <p className="mt-0.5 text-xs text-black/20">{t('transfers.summary.beforeCommission')}</p>
                        </div>
                      </div>
                    </div>
                  )
                })()}
              </>
            )
          })()}
        </DialogContent>
      </Dialog>

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
                <span className="font-mono tabular-nums text-black/50">
                  {formatNumber(detailRow.commission)}
                </span>
              </DetailRow>
              <DetailRow label={t('transfers.columns.commissionRateSnapshot')}>
                <span className="font-mono tabular-nums text-black/50">
                  {detailRow.commission_rate_snapshot != null
                    ? `${(detailRow.commission_rate_snapshot * 100).toFixed(1)}%`
                    : '—'}
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
              <DetailRow label={t('transfers.columns.exchangeRate')}>
                <span className="font-mono tabular-nums">
                  {detailRow.exchange_rate?.toFixed(4) ?? '—'}
                </span>
              </DetailRow>
              <DetailRow label={t('transfers.columns.tlEquivalent')}>
                <span className="font-mono tabular-nums text-blue">
                  {formatNumber(Math.abs(detailRow.amount_try ?? 0))} TL
                </span>
              </DetailRow>
              <DetailRow label={t('transfers.columns.usdEquivalent')}>
                <span className="font-mono tabular-nums text-green">
                  {formatNumber(Math.abs(detailRow.amount_usd ?? 0))} USD
                </span>
              </DetailRow>
              <DetailRow label={t('transfers.columns.psp')}>
                {detailRow.psp?.name ?? '—'}
              </DetailRow>
              <DetailRow label={t('transfers.columns.type')}>
                {detailRow.type?.name
                  ? t(`transfers.typeValues.${detailRow.type.name}`, {
                      defaultValue: detailRow.type.name,
                    })
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
