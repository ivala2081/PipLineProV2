import { useReducer, useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import { useQueryClient } from '@tanstack/react-query'
import { ArrowUp, ChartBar, CaretLeft, CaretRight } from '@phosphor-icons/react'
import { supabase } from '@/lib/supabase'
import { useOrganization } from '@/app/providers/OrganizationProvider'
import { queryKeys } from '@/lib/queryKeys'
import type { TransferRow } from '@/hooks/useTransfers'
import { TransferAuditDialog } from './TransferAuditDialog'
import { TransferRowItem } from './TransferRowItem'
import { TransferDetailSheet } from './TransferDetailSheet'
import { DailySummaryDialog } from './DailySummaryDialog'
import { groupByDate, TH_CLASS, type DateGroup } from './transfersTableUtils'
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  Tag,
  Skeleton,
  Button,
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationEllipsis,
  EmptyState,
} from '@ds'

/* ── Props ──────────────────────────────────────────── */

interface TransfersTableProps {
  transfers: TransferRow[]
  isLoading: boolean
  page: number
  pageSize: number
  total: number
  dateCounts: Record<string, number>
  fetchTransfersByDate: (dateKey: string) => Promise<TransferRow[]>
  onPageChange: (page: number) => void
  onEdit: (transfer: TransferRow) => void
  onDelete: (transfer: TransferRow) => void
}

/* ── State ──────────────────────────────────────────── */

interface TableState {
  detailRow: TransferRow | null
  auditRow: TransferRow | null
  summaryGroup: DateGroup | null
  summaryTransfers: TransferRow[]
  isFetchingSummary: boolean
  isApplyingRate: boolean
  customRates: Record<string, number>
}

type TableAction =
  | { type: 'OPEN_DETAIL'; row: TransferRow }
  | { type: 'CLOSE_DETAIL' }
  | { type: 'OPEN_AUDIT'; row: TransferRow }
  | { type: 'CLOSE_AUDIT' }
  | { type: 'OPEN_SUMMARY'; group: DateGroup }
  | { type: 'SUMMARY_LOADED'; transfers: TransferRow[] }
  | { type: 'SUMMARY_FALLBACK'; transfers: TransferRow[] }
  | { type: 'CLOSE_SUMMARY' }
  | { type: 'SET_RATE'; dateKey: string; rate: number }
  | { type: 'RESET_RATE'; dateKey: string }
  | { type: 'APPLY_RATE_START' }
  | { type: 'APPLY_RATE_DONE'; transfers: TransferRow[] }

const initialState: TableState = {
  detailRow: null,
  auditRow: null,
  summaryGroup: null,
  summaryTransfers: [],
  isFetchingSummary: false,
  isApplyingRate: false,
  customRates: {},
}

function reducer(state: TableState, action: TableAction): TableState {
  switch (action.type) {
    case 'OPEN_DETAIL':
      return { ...state, detailRow: action.row }
    case 'CLOSE_DETAIL':
      return { ...state, detailRow: null }
    case 'OPEN_AUDIT':
      return { ...state, auditRow: action.row }
    case 'CLOSE_AUDIT':
      return { ...state, auditRow: null }
    case 'OPEN_SUMMARY':
      return { ...state, summaryGroup: action.group, isFetchingSummary: true }
    case 'SUMMARY_LOADED':
      return { ...state, summaryTransfers: action.transfers, isFetchingSummary: false }
    case 'SUMMARY_FALLBACK':
      return { ...state, summaryTransfers: action.transfers, isFetchingSummary: false }
    case 'CLOSE_SUMMARY':
      return { ...state, summaryGroup: null, summaryTransfers: [] }
    case 'SET_RATE':
      return { ...state, customRates: { ...state.customRates, [action.dateKey]: action.rate } }
    case 'RESET_RATE': {
      const newRates = { ...state.customRates }
      delete newRates[action.dateKey]
      return { ...state, customRates: newRates }
    }
    case 'APPLY_RATE_START':
      return { ...state, isApplyingRate: true }
    case 'APPLY_RATE_DONE':
      return { ...state, isApplyingRate: false, summaryTransfers: action.transfers }
    default:
      return state
  }
}

const SECURITY_PIN = '4561'

/* ── Component ──────────────────────────────────────── */

export function TransfersTable({
  transfers,
  isLoading,
  page,
  pageSize,
  total,
  dateCounts,
  fetchTransfersByDate,
  onPageChange,
  onEdit,
  onDelete,
}: TransfersTableProps) {
  const { t, i18n } = useTranslation('pages')
  const lang = i18n.language
  const { currentOrg } = useOrganization()
  const queryClient = useQueryClient()
  const [state, dispatch] = useReducer(reducer, initialState)

  const totalPages = Math.ceil(total / pageSize)
  const from = (page - 1) * pageSize + 1
  const to = Math.min(page * pageSize, total)

  /* ── Handlers ─────────────────────────────────── */

  const handleOpenSummary = useCallback(
    async (group: DateGroup) => {
      dispatch({ type: 'OPEN_SUMMARY', group })
      try {
        const allTransfers = await fetchTransfersByDate(group.dateKey)
        dispatch({ type: 'SUMMARY_LOADED', transfers: allTransfers })
      } catch (error) {
        console.error('Failed to fetch transfers for summary:', error)
        dispatch({ type: 'SUMMARY_FALLBACK', transfers: group.transfers })
      }
    },
    [fetchTransfersByDate],
  )

  const handleView = useCallback((row: TransferRow) => {
    dispatch({ type: 'OPEN_DETAIL', row })
  }, [])

  const handleAudit = useCallback((row: TransferRow) => {
    dispatch({ type: 'OPEN_AUDIT', row })
  }, [])

  const handleSaveRate = useCallback(
    async (dateKey: string, rate: number) => {
      dispatch({ type: 'SET_RATE', dateKey, rate })

      if (!currentOrg) return

      dispatch({ type: 'APPLY_RATE_START' })

      try {
        // Fetch all USD transfers for this date
        const startOfDay = `${dateKey}T00:00:00`
        const endOfDay = `${dateKey}T23:59:59`

        const { data: usdTransfers } = await supabase
          .from('transfers')
          .select('id, amount')
          .eq('organization_id', currentOrg.id)
          .eq('currency', 'USD')
          .gte('transfer_date', startOfDay)
          .lte('transfer_date', endOfDay)

        if (usdTransfers && usdTransfers.length > 0) {
          // Update each USD transfer with the new rate and recalculated amount_try
          await Promise.all(
            usdTransfers.map((t) =>
              supabase
                .from('transfers')
                .update({
                  exchange_rate: rate,
                  amount_try: Math.round(t.amount * rate * 100) / 100,
                } as never)
                .eq('id', t.id),
            ),
          )
        }

        // Invalidate transfer queries so lists refresh
        queryClient.invalidateQueries({ queryKey: queryKeys.transfers.lists() })

        // Re-fetch summary transfers to refresh the dialog in place
        const refreshed = await fetchTransfersByDate(dateKey)
        dispatch({ type: 'APPLY_RATE_DONE', transfers: refreshed })
      } catch (error) {
        console.error('Failed to apply exchange rate:', error)
        dispatch({ type: 'APPLY_RATE_DONE', transfers: state.summaryTransfers })
      }
    },
    [currentOrg, fetchTransfersByDate, queryClient, state.summaryTransfers],
  )

  const handleResetRate = useCallback((dateKey: string) => {
    dispatch({ type: 'RESET_RATE', dateKey })
  }, [])

  /* ── Loading skeleton ─────────────────────────── */

  if (isLoading) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 2 }).map((_, g) => (
          <div key={g} className="overflow-hidden rounded-xl border border-black/10">
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

  /* ── Empty state ──────────────────────────────── */

  if (transfers.length === 0) {
    return (
      <EmptyState
        icon={ArrowUp}
        title={t('transfers.empty.title')}
        description={t('transfers.empty.description')}
      />
    )
  }

  /* ── Group transfers by date ──────────────────── */

  const groups = groupByDate(transfers, lang)

  /* ── Page numbers for pagination ──────────────── */

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
          <div key={group.dateKey} className="overflow-hidden rounded-xl border border-black/10">
            {/* Date header */}
            <div className="flex items-center justify-between bg-black/[0.02] px-4 py-2.5">
              <div className="flex items-center gap-2.5">
                <span className="text-sm font-semibold text-black/70">{group.label}</span>
                <Tag variant="default" className="h-5 text-xs">
                  {dateCounts[group.dateKey] ?? group.transfers.length}{' '}
                  {t('transfers.summary.transfersLabel')}
                </Tag>
              </div>
              <Button
                variant="ghost"
                size="sm"
                className="h-7 gap-1.5 px-2.5 text-xs font-medium text-black/40 hover:text-black/70"
                onClick={() => handleOpenSummary(group)}
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
                    <TableHead className={TH_CLASS}>{t('transfers.columns.fullName')}</TableHead>
                    <TableHead className={TH_CLASS}>
                      {t('transfers.columns.paymentMethod')}
                    </TableHead>
                    <TableHead className={TH_CLASS}>{t('transfers.columns.time')}</TableHead>
                    <TableHead className={TH_CLASS}>{t('transfers.columns.category')}</TableHead>
                    <TableHead className={`${TH_CLASS} text-right`}>
                      {t('transfers.columns.amount')}
                    </TableHead>
                    <TableHead className={`${TH_CLASS} text-right`}>
                      {t('transfers.columns.commission')}
                    </TableHead>
                    <TableHead className={`${TH_CLASS} text-right`}>
                      {t('transfers.columns.net')}
                    </TableHead>
                    <TableHead className={TH_CLASS}>{t('transfers.columns.currency')}</TableHead>
                    <TableHead className={TH_CLASS}>{t('transfers.columns.psp')}</TableHead>
                    <TableHead className={TH_CLASS}>{t('transfers.columns.type')}</TableHead>
                    <TableHead className="w-20 px-2" />
                  </TableRow>
                </TableHeader>
                <TableBody className="divide-y divide-black/[0.04]">
                  {group.transfers.map((row) => (
                    <TransferRowItem
                      key={row.id}
                      row={row}
                      lang={lang}
                      onView={handleView}
                      onEdit={onEdit}
                      onDelete={onDelete}
                      onAudit={handleAudit}
                    />
                  ))}
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
                      <PaginationLink isActive={page === p} onClick={() => onPageChange(p)}>
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

      {/* Daily Summary Dialog */}
      <DailySummaryDialog
        group={state.summaryGroup}
        transfers={state.summaryTransfers}
        isFetching={state.isFetchingSummary}
        isApplyingRate={state.isApplyingRate}
        customRates={state.customRates}
        onClose={() => dispatch({ type: 'CLOSE_SUMMARY' })}
        onSaveRate={handleSaveRate}
        onResetRate={handleResetRate}
        securityPin={SECURITY_PIN}
      />

      {/* Detail Sheet */}
      <TransferDetailSheet
        row={state.detailRow}
        onClose={() => dispatch({ type: 'CLOSE_DETAIL' })}
      />

      {/* Audit Dialog */}
      <TransferAuditDialog
        transferId={state.auditRow?.id ?? null}
        transferName={state.auditRow?.full_name ?? null}
        open={state.auditRow !== null}
        onClose={() => dispatch({ type: 'CLOSE_AUDIT' })}
      />
    </>
  )
}
