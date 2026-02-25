import { useReducer, useCallback, useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { useQueryClient } from '@tanstack/react-query'
import {
  ArrowUp,
  ChartBar,
  CaretLeft,
  CaretRight,
  MagnifyingGlass,
  X,
  Funnel,
} from '@phosphor-icons/react'
import type { TransferFilters } from '@/hooks/queries/useTransfersQuery'
import type { LookupQueries } from '@/hooks/queries/useLookupQueries'
import type { PaymentMethod, TransferType } from '@/lib/transferLookups'
import { supabase } from '@/lib/supabase'
import { useOrganization } from '@/app/providers/OrganizationProvider'
import { queryKeys } from '@/lib/queryKeys'
import { localDayStart, localDayEnd } from '@/lib/date'
import { formatAmount, parseAmount, amountPlaceholder } from '@/lib/formatAmount'
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
  Input,
  Select,
  SelectTrigger,
  SelectContent,
  SelectItem,
  SelectValue,
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationEllipsis,
  EmptyState,
  DatePicker,
} from '@ds'

/* ── Props ──────────────────────────────────────────── */

interface TransfersTableProps {
  transfers: TransferRow[]
  isLoading: boolean
  page: number
  pageSize: number
  total: number
  dateCounts: Record<string, number>
  filters: TransferFilters
  onFilterChange: <K extends keyof TransferFilters>(key: K, value: TransferFilters[K]) => void
  onClearFilters: () => void
  hasActiveFilters: boolean
  fetchTransfersByDate: (dateKey: string) => Promise<TransferRow[]>
  onPageChange: (page: number) => void
  onEdit: (transfer: TransferRow) => void
  onDelete: (transfer: TransferRow) => void
  lookupData: LookupQueries
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
  filters,
  onFilterChange,
  onClearFilters,
  hasActiveFilters,
  fetchTransfersByDate,
  onPageChange,
  onEdit,
  onDelete,
  lookupData,
}: TransfersTableProps) {
  const { t, i18n } = useTranslation('pages')
  const lang = i18n.language
  const amtLocale = (lang === 'tr' ? 'tr' : 'en') as 'tr' | 'en'
  const { currentOrg } = useOrganization()
  const queryClient = useQueryClient()
  const [state, dispatch] = useReducer(reducer, initialState)
  const [filtersOpen, setFiltersOpen] = useState(false)

  // Amount filter display states
  const [amountMinDisplay, setAmountMinDisplay] = useState('')
  const [amountMaxDisplay, setAmountMaxDisplay] = useState('')
  useEffect(() => {
    if (!filters.amountMin) setAmountMinDisplay('')
  }, [filters.amountMin]) // eslint-disable-line react-hooks/set-state-in-effect -- syncing derived display state
  useEffect(() => {
    if (!filters.amountMax) setAmountMaxDisplay('')
  }, [filters.amountMax]) // eslint-disable-line react-hooks/set-state-in-effect -- syncing derived display state

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
        const startOfDay = localDayStart(dateKey)
        const endOfDay = localDayEnd(dateKey)

        const { data: usdTransfers } = await supabase
          .from('transfers')
          .select('id, amount')
          .eq('organization_id', currentOrg.id)
          .eq('currency', 'USD')
          .gte('transfer_date', startOfDay)
          .lte('transfer_date', endOfDay)

        const typedUsdTransfers = (usdTransfers || []) as { id: string; amount: number }[]
        if (typedUsdTransfers.length > 0) {
          // Update each USD transfer with the new rate and recalculated amount_try
          await Promise.all(
            typedUsdTransfers.map((t) =>
              supabase
                .from('transfers')
                .update({
                  exchange_rate: rate,
                  amount_try: Math.round(t.amount * rate * 100) / 100,
                })
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

  /* ── Filter bar ──────────────────────────────── */

  const filterBar = (
    <div className="space-y-sm mb-md">
      {/* Search + toggle row */}
      <div className="flex items-center gap-sm">
        <div className="relative flex-1 min-w-[280px] sm:min-w-[320px]">
          <MagnifyingGlass
            size={15}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-black/35"
          />
          <Input
            type="text"
            inputSize="sm"
            autoComplete="off"
            placeholder={t('transfers.filters.search', 'Search name, CRM ID, META ID...')}
            value={filters.search ?? ''}
            onChange={(e) => onFilterChange('search', e.target.value || null)}
            className="h-8 w-full pl-8 pr-8 text-xs"
          />
          {filters.search && (
            <button
              type="button"
              onClick={() => onFilterChange('search', null)}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-black/30 hover:text-black/60"
            >
              <X size={13} />
            </button>
          )}
        </div>
        <DatePicker
          dateFrom={filters.dateFrom}
          dateTo={filters.dateTo}
          onChange={(from, to) => {
            onFilterChange('dateFrom', from)
            onFilterChange('dateTo', to)
          }}
        />

        <Button
          variant={hasActiveFilters ? 'filled' : 'outline'}
          size="sm"
          className="h-8 gap-1.5 px-2.5 text-xs"
          onClick={() => setFiltersOpen(!filtersOpen)}
        >
          <Funnel size={14} weight={hasActiveFilters ? 'fill' : 'regular'} />
          {t('transfers.filters.label', 'Filters')}
          {hasActiveFilters && (
            <span className="ml-0.5 flex size-4 items-center justify-center rounded-full bg-white/20 text-[10px] font-bold">
              {Object.values(filters).filter((v) => v != null && v !== '').length}
            </span>
          )}
        </Button>
        {hasActiveFilters && (
          <Button
            variant="ghost"
            size="sm"
            className="h-8 gap-1 px-2 text-xs text-black/40 hover:text-black/70"
            onClick={onClearFilters}
          >
            <X size={13} />
            {t('transfers.filters.clear', 'Clear')}
          </Button>
        )}
      </div>

      {/* Expanded filter dropdowns */}
      {filtersOpen && (
        <div className="rounded-lg border border-black/[0.08] bg-gradient-to-b from-black/[0.02] to-black/[0.015] p-4">
          <div className="grid gap-md md:grid-cols-2 lg:grid-cols-4">
            {/* Transaction Type */}
            <div className="space-y-1.5">
              <label className="block text-[10px] font-semibold uppercase tracking-widest text-black/40">
                {t('transfers.filters.transactionType', 'Transaction Type')}
              </label>
              <Select
                value={filters.categoryType ?? '__all__'}
                onValueChange={(v) => onFilterChange('categoryType', v === '__all__' ? null : v)}
              >
                <SelectTrigger selectSize="sm" className="h-9 w-full text-xs">
                  <SelectValue placeholder={t('transfers.filters.allTypes', 'All Types')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__all__">
                    {t('transfers.filters.allTypes', 'All Types')}
                  </SelectItem>
                  <SelectItem value="deposit">
                    {t('transfers.filters.deposit', 'Deposit')}
                  </SelectItem>
                  <SelectItem value="withdrawal">
                    {t('transfers.filters.withdrawal', 'Withdrawal')}
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Currency */}
            <div className="space-y-1.5">
              <label className="block text-[10px] font-semibold uppercase tracking-widest text-black/40">
                {t('transfers.filters.currency', 'Currency')}
              </label>
              <Select
                value={filters.currency ?? '__all__'}
                onValueChange={(v) => onFilterChange('currency', v === '__all__' ? null : v)}
              >
                <SelectTrigger selectSize="sm" className="h-9 w-full text-xs">
                  <SelectValue
                    placeholder={t('transfers.filters.allCurrencies', 'All Currencies')}
                  />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__all__">
                    {t('transfers.filters.allCurrencies', 'All Currencies')}
                  </SelectItem>
                  <SelectItem value="TL">TL</SelectItem>
                  <SelectItem value="USD">USD</SelectItem>
                  <SelectItem value="USDT">USDT</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Payment Method */}
            <div className="space-y-1.5">
              <label className="block text-[10px] font-semibold uppercase tracking-widest text-black/40">
                {t('transfers.filters.paymentMethod', 'Payment Method')}
              </label>
              <Select
                value={filters.paymentMethodId ?? '__all__'}
                onValueChange={(v) => onFilterChange('paymentMethodId', v === '__all__' ? null : v)}
              >
                <SelectTrigger selectSize="sm" className="h-9 w-full text-xs">
                  <SelectValue
                    placeholder={t('transfers.filters.allPaymentMethods', 'All Methods')}
                  />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__all__">
                    {t('transfers.filters.allPaymentMethods', 'All Methods')}
                  </SelectItem>
                  {lookupData.paymentMethods.map((method: PaymentMethod) => (
                    <SelectItem key={method.id} value={method.id}>
                      {method.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Type */}
            <div className="space-y-1.5">
              <label className="block text-[10px] font-semibold uppercase tracking-widest text-black/40">
                {t('transfers.filters.type', 'Type')}
              </label>
              <Select
                value={filters.typeId ?? '__all__'}
                onValueChange={(v) => onFilterChange('typeId', v === '__all__' ? null : v)}
              >
                <SelectTrigger selectSize="sm" className="h-9 w-full text-xs">
                  <SelectValue placeholder={t('transfers.filters.allTransferTypes', 'All Types')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__all__">
                    {t('transfers.filters.allTransferTypes', 'All Types')}
                  </SelectItem>
                  {lookupData.transferTypes.map((type: TransferType) => (
                    <SelectItem key={type.id} value={type.id}>
                      {type.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Amount Min */}
            <div className="space-y-1.5">
              <label className="block text-[10px] font-semibold uppercase tracking-widest text-black/40">
                {t('transfers.filters.minAmount', 'Min Amount')}
              </label>
              <Input
                type="text"
                inputMode="decimal"
                inputSize="sm"
                placeholder={amountPlaceholder(amtLocale)}
                value={amountMinDisplay}
                onChange={(e) => {
                  const formatted = formatAmount(e.target.value, amtLocale)
                  setAmountMinDisplay(formatted)
                  const num = parseAmount(formatted, amtLocale)
                  onFilterChange('amountMin', num ? String(num) : null)
                }}
                className="h-9 w-full text-xs"
              />
            </div>

            {/* Amount Max */}
            <div className="space-y-1.5">
              <label className="block text-[10px] font-semibold uppercase tracking-widest text-black/40">
                {t('transfers.filters.maxAmount', 'Max Amount')}
              </label>
              <Input
                type="text"
                inputMode="decimal"
                inputSize="sm"
                placeholder={amountPlaceholder(amtLocale)}
                value={amountMaxDisplay}
                onChange={(e) => {
                  const formatted = formatAmount(e.target.value, amtLocale)
                  setAmountMaxDisplay(formatted)
                  const num = parseAmount(formatted, amtLocale)
                  onFilterChange('amountMax', num ? String(num) : null)
                }}
                className="h-9 w-full text-xs"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  )

  /* ── Group transfers by date (for data view) ───── */

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
      <div className="space-y-sm">
        {filterBar}
        {isLoading ? (
          Array.from({ length: 2 }).map((_, g) => (
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
          ))
        ) : transfers.length === 0 ? (
          <EmptyState
            icon={ArrowUp}
            title={
              hasActiveFilters
                ? t('transfers.filters.noResults', 'No matching transfers')
                : t('transfers.empty.title')
            }
            description={
              hasActiveFilters
                ? t('transfers.filters.noResultsDescription', 'Try adjusting your filters.')
                : t('transfers.empty.description')
            }
          />
        ) : (
          <>
            {/* Date-grouped cards */}
            {groups.map((group) => (
              <div
                key={group.dateKey}
                className="overflow-hidden rounded-xl border border-black/10"
              >
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
                <Table cardOnMobile>
                  <TableHeader>
                    <TableRow className="bg-black/[0.015] hover:bg-black/[0.015]">
                      <TableHead className={TH_CLASS}>{t('transfers.columns.fullName')}</TableHead>
                      <TableHead className={TH_CLASS}>
                        {t('transfers.columns.paymentMethod')}
                      </TableHead>
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
            ))}

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
          </>
        )}
      </div>

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
