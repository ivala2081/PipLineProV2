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
  CheckSquare,
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
  SelectValue,
  SelectContent,
  SelectItem,
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationEllipsis,
  EmptyState,
  DatePicker,
  VirtualTableBody,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@ds'

/* ── Props ──────────────────────────────────────────── */

interface Employee {
  id: string
  full_name: string
}

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
  onPageSizeChange: (size: number) => void
  onEdit: (transfer: TransferRow) => void
  onDelete: (transfer: TransferRow) => void
  lookupData: LookupQueries
  employees: Employee[]
  loadMore: () => void
  hasMore: boolean
  isLoadMoreMode: boolean
  setIsLoadMoreMode: (v: boolean) => void
}

/* ── State ──────────────────────────────────────────── */

interface TransferOriginal {
  id: string
  currency: string
  amount: number
  exchange_rate: number | null
  amount_try: number | null
  amount_usd: number
}

interface TableState {
  detailRow: TransferRow | null
  auditRow: TransferRow | null
  summaryGroup: DateGroup | null
  summaryTransfers: TransferRow[]
  isFetchingSummary: boolean
  isApplyingRate: boolean
  customRates: Record<string, number>
  originalRatesData: Record<string, TransferOriginal[]>
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
  | { type: 'STORE_ORIGINALS'; dateKey: string; originals: TransferOriginal[] }
  | { type: 'CLEAR_ORIGINALS'; dateKey: string }

const initialState: TableState = {
  detailRow: null,
  auditRow: null,
  summaryGroup: null,
  summaryTransfers: [],
  isFetchingSummary: false,
  isApplyingRate: false,
  customRates: {},
  originalRatesData: {},
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
    case 'STORE_ORIGINALS': {
      // Guard: only store once per dateKey — prevents subsequent saves from overwriting true originals
      if (state.originalRatesData[action.dateKey]) return state
      return {
        ...state,
        originalRatesData: { ...state.originalRatesData, [action.dateKey]: action.originals },
      }
    }
    case 'CLEAR_ORIGINALS': {
      const newOriginals = { ...state.originalRatesData }
      delete newOriginals[action.dateKey]
      return { ...state, originalRatesData: newOriginals }
    }
    default:
      return state
  }
}

/** Groups with more rows than this threshold use virtual scrolling */
const VIRTUAL_THRESHOLD = 50
const ROW_HEIGHT_PX = 48
const VIRTUAL_MAX_HEIGHT = 600

function fmtCompact(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000) return `${(n / 1_000).toFixed(0)}K`
  return n.toFixed(0)
}

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
  onPageSizeChange,
  onEdit,
  onDelete,
  lookupData,
  employees,
  loadMore,
  hasMore,
  isLoadMoreMode,
  setIsLoadMoreMode,
}: TransfersTableProps) {
  const { t, i18n } = useTranslation('pages')
  const lang = i18n.language
  const amtLocale = (lang === 'tr' ? 'tr' : 'en') as 'tr' | 'en'
  const { currentOrg } = useOrganization()
  const baseCurrency = currentOrg?.base_currency ?? 'TRY'
  const queryClient = useQueryClient()
  const [state, dispatch] = useReducer(reducer, initialState)
  const [filtersOpen, setFiltersOpen] = useState(false)
  const [selectionMode, setSelectionMode] = useState(false)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [showBulkEdit, setShowBulkEdit] = useState(false)
  const [bulkPspId, setBulkPspId] = useState<string | null>(null)
  const [bulkTypeId, setBulkTypeId] = useState<string | null>(null)

  // Amount filter display states
  const [amountMinDisplay, setAmountMinDisplay] = useState('')
  const [amountMaxDisplay, setAmountMaxDisplay] = useState('')
  useEffect(() => {
    if (!filters.amountMin) setAmountMinDisplay('') // eslint-disable-line react-hooks/set-state-in-effect -- syncing derived display state
  }, [filters.amountMin])
  useEffect(() => {
    if (!filters.amountMax) setAmountMaxDisplay('') // eslint-disable-line react-hooks/set-state-in-effect -- syncing derived display state
  }, [filters.amountMax])

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
        const startOfDay = localDayStart(dateKey)
        const endOfDay = localDayEnd(dateKey)

        // Unified fetch: get all fields needed for snapshot + updates in one query
        const { data: allTransfers } = await supabase
          .from('transfers')
          .select('id, currency, amount, exchange_rate, amount_try, amount_usd')
          .eq('organization_id', currentOrg.id)
          .gte('transfer_date', startOfDay)
          .lte('transfer_date', endOfDay)

        const typed = (allTransfers || []) as TransferOriginal[]

        // Snapshot originals BEFORE applying new rate (guard prevents overwrite on re-save)
        dispatch({ type: 'STORE_ORIGINALS', dateKey, originals: typed })

        const usdTransfers = typed.filter((t) => t.currency === 'USD' || t.currency === 'USDT')
        const tryTransfers = typed.filter((t) => t.currency !== 'USD' && t.currency !== 'USDT')

        const updates: Promise<unknown>[] = [
          // USD transfers: recalculate TRY equivalent
          ...usdTransfers.map((t) =>
            supabase
              .from('transfers')
              .update({
                exchange_rate: rate,
                amount_try: Math.round(t.amount * rate * 100) / 100,
              })
              .eq('id', t.id),
          ),
          // TRY transfers: recalculate USD equivalent
          ...tryTransfers.map((t) =>
            supabase
              .from('transfers')
              .update({
                exchange_rate: rate,
                amount_usd: rate > 0 ? Math.round((t.amount / rate) * 100) / 100 : 0,
              })
              .eq('id', t.id),
          ),
        ]

        if (updates.length > 0) await Promise.all(updates)

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

  const handleResetRate = useCallback(
    async (dateKey: string) => {
      const originals = state.originalRatesData[dateKey]

      if (originals && currentOrg) {
        dispatch({ type: 'APPLY_RATE_START' })
        try {
          const usdOriginals = originals.filter(
            (t) => t.currency === 'USD' || t.currency === 'USDT',
          )
          const tryOriginals = originals.filter(
            (t) => t.currency !== 'USD' && t.currency !== 'USDT',
          )

          const updates: Promise<unknown>[] = [
            // USD transfers: restore original exchange_rate + amount_try
            ...usdOriginals.map((t) =>
              supabase
                .from('transfers')
                .update({ exchange_rate: t.exchange_rate, amount_try: t.amount_try })
                .eq('id', t.id),
            ),
            // TRY transfers: restore original exchange_rate + amount_usd
            ...tryOriginals.map((t) =>
              supabase
                .from('transfers')
                .update({ exchange_rate: t.exchange_rate, amount_usd: t.amount_usd })
                .eq('id', t.id),
            ),
          ]

          if (updates.length > 0) await Promise.all(updates)

          queryClient.invalidateQueries({ queryKey: queryKeys.transfers.lists() })

          const refreshed = await fetchTransfersByDate(dateKey)
          dispatch({ type: 'APPLY_RATE_DONE', transfers: refreshed })
        } catch (error) {
          console.error('Failed to restore original exchange rates:', error)
          dispatch({ type: 'APPLY_RATE_DONE', transfers: state.summaryTransfers })
        }
      }

      // Always clear local state regardless of DB outcome
      dispatch({ type: 'RESET_RATE', dateKey })
      dispatch({ type: 'CLEAR_ORIGINALS', dateKey })
    },
    [
      currentOrg,
      fetchTransfersByDate,
      queryClient,
      state.originalRatesData,
      state.summaryTransfers,
    ],
  )

  /* ── Bulk ops ────────────────────────────────── */

  const allSelected = transfers.length > 0 && selectedIds.size === transfers.length
  const toggleAll = () => {
    if (allSelected) {
      setSelectedIds(new Set())
    } else {
      setSelectedIds(new Set(transfers.map((t) => t.id)))
    }
  }

  const handleExportCsv = () => {
    const rows = transfers.filter((t) => selectedIds.has(t.id))
    const header = [
      'Date',
      'Name',
      'Category',
      'Amount',
      'Currency',
      'Commission',
      'Net',
      'PSP',
      'Type',
      'CRM ID',
      'META ID',
    ]
    const csvRows = rows.map((t) => [
      t.transfer_date,
      t.full_name,
      t.category?.is_deposit ? 'Deposit' : 'Withdrawal',
      String(Math.abs(t.amount)),
      t.currency,
      t.category?.is_deposit
        ? String(Math.round(Math.abs(t.amount) * (t.psp?.commission_rate ?? 0) * 100) / 100)
        : '0',
      String(t.amount),
      t.psp?.name ?? '',
      t.type?.name ?? '',
      t.crm_id ?? '',
      t.meta_id ?? '',
    ])
    const csv = [header, ...csvRows]
      .map((r) => r.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(','))
      .join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `transfers-${Date.now()}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  const handleBulkEditSave = async () => {
    const updates: Record<string, unknown> = {}
    if (bulkPspId) updates.psp_id = bulkPspId
    if (bulkTypeId) updates.type_id = bulkTypeId
    if (Object.keys(updates).length === 0) return
    await supabase
      .from('transfers')
      .update(updates as never)
      .in('id', [...selectedIds])
    queryClient.invalidateQueries({ queryKey: queryKeys.transfers.lists() })
    setShowBulkEdit(false)
    setSelectedIds(new Set())
    setBulkPspId(null)
    setBulkTypeId(null)
  }

  /* ── Filter bar ──────────────────────────────── */

  const filterBar = (
    <div className="space-y-sm mb-md">
      {/* Search + toggle row */}
      <div className="flex items-center gap-sm">
        <div className="relative flex-1 min-w-0 sm:min-w-[280px]">
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
        <Button
          variant={selectionMode ? 'filled' : 'outline'}
          size="sm"
          className="h-8 gap-1.5 px-2.5 text-xs"
          onClick={() => {
            setSelectionMode((v) => !v)
            setSelectedIds(new Set())
          }}
        >
          <CheckSquare size={14} weight={selectionMode ? 'fill' : 'regular'} />
          {t('transfers.bulk.select', 'Select')}
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
        <div className="rounded-lg border border-black/[0.08] bg-gradient-to-b from-black/[0.02] to-black/[0.015] p-3 md:p-4">
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
                  <SelectItem value="TRY">TRY</SelectItem>
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

            {/* PSP */}
            <div className="space-y-1.5">
              <label className="block text-[10px] font-semibold uppercase tracking-widest text-black/40">
                {t('transfers.filters.psp', 'PSP')}
              </label>
              <Select
                value={filters.pspId ?? '__all__'}
                onValueChange={(v) => onFilterChange('pspId', v === '__all__' ? null : v)}
              >
                <SelectTrigger selectSize="sm" className="h-9 w-full text-xs">
                  <SelectValue placeholder={t('transfers.filters.allPsps', 'All PSPs')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__all__">
                    {t('transfers.filters.allPsps', 'All PSPs')}
                  </SelectItem>
                  {lookupData.psps.map((psp) => (
                    <SelectItem key={psp.id} value={psp.id}>
                      {psp.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Employee */}
            <div className="space-y-1.5">
              <label className="block text-[10px] font-semibold uppercase tracking-widest text-black/40">
                {t('transfers.filters.employee', 'Employee')}
              </label>
              <Select
                value={filters.employeeId ?? '__all__'}
                onValueChange={(v) => onFilterChange('employeeId', v === '__all__' ? null : v)}
              >
                <SelectTrigger selectSize="sm" className="h-9 w-full text-xs">
                  <SelectValue placeholder={t('transfers.filters.allEmployees', 'All Employees')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__all__">
                    {t('transfers.filters.allEmployees', 'All Employees')}
                  </SelectItem>
                  {employees.map((emp) => (
                    <SelectItem key={emp.id} value={emp.id}>
                      {emp.full_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Amount Min */}
            <div className="space-y-1.5">
              <label className="block text-[10px] font-semibold uppercase tracking-widest text-black/40">
                {t('transfers.filters.minAmount', 'Min Amount')}{' '}
                <span className="normal-case text-black/25">{baseCurrency}</span>
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
                {t('transfers.filters.maxAmount', 'Max Amount')}{' '}
                <span className="normal-case text-black/25">{baseCurrency}</span>
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
            {/* Bulk toolbar */}
            {selectedIds.size > 0 && (
              <div className="flex items-center gap-2 rounded-lg border border-black/10 bg-black/[0.03] px-3 py-2">
                <span className="text-xs font-medium text-black/50">
                  {t('transfers.bulk.selected', '{{count}} selected', { count: selectedIds.size })}
                </span>
                <Button
                  size="sm"
                  variant="outline"
                  className="h-7 gap-1 px-2.5 text-xs"
                  onClick={handleExportCsv}
                >
                  {t('transfers.bulk.exportCsv', 'Export CSV')}
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="h-7 gap-1 px-2.5 text-xs"
                  onClick={() => setShowBulkEdit(true)}
                >
                  {t('transfers.bulk.edit', 'Edit')}
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-7 gap-1 px-2 text-xs text-black/40 hover:text-black/70"
                  onClick={() => setSelectedIds(new Set())}
                >
                  {t('transfers.bulk.clear', 'Clear')}
                </Button>
              </div>
            )}

            {/* Date-grouped cards */}
            {groups.map((group) => {
              const groupNet = group.transfers.reduce((sum, t) => {
                const typN = t.type?.name?.toLowerCase() ?? ''
                if (typN.includes('blok') || typN.includes('blocked')) return sum
                return sum + (t.amount_try ?? t.amount ?? 0)
              }, 0)

              return (
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
                      <span
                        className={`font-mono text-xs font-medium tabular-nums ${groupNet >= 0 ? 'text-green' : 'text-red'}`}
                      >
                        {groupNet >= 0 ? '+' : '−'}
                        {fmtCompact(Math.abs(groupNet))}
                      </span>
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
                  {/* Table header always renders normally */}
                  <Table cardOnMobile>
                    <TableHeader>
                      <TableRow className="bg-black/[0.015] hover:bg-black/[0.015]">
                        {selectionMode && (
                          <TableHead className="w-4 pl-3 pr-1">
                            <input
                              type="checkbox"
                              checked={allSelected}
                              onChange={toggleAll}
                              className="size-3.5 cursor-pointer rounded border-black/20"
                            />
                          </TableHead>
                        )}
                        <TableHead className={TH_CLASS}>
                          {t('transfers.columns.fullName')}
                        </TableHead>
                        <TableHead className={TH_CLASS}>
                          {t('transfers.columns.paymentMethod')}
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
                        <TableHead className={`${TH_CLASS} text-right`}>
                          {t('transfers.table.netUsd', 'Net USD')}
                        </TableHead>
                        <TableHead className={TH_CLASS}>
                          {t('transfers.columns.currency')}
                        </TableHead>
                        <TableHead className={TH_CLASS}>{t('transfers.columns.psp')}</TableHead>
                        <TableHead className={TH_CLASS}>{t('transfers.columns.type')}</TableHead>
                        <TableHead className="w-20 px-2" />
                      </TableRow>
                    </TableHeader>

                    {/* Use virtual scrolling for large groups, standard body otherwise */}
                    {group.transfers.length > VIRTUAL_THRESHOLD ? null : (
                      <TableBody className="divide-y divide-black/[0.04]">
                        {group.transfers.map((row) => (
                          <TransferRowItem
                            key={row.id}
                            row={row}
                            lang={lang}
                            isSelected={selectionMode ? selectedIds.has(row.id) : undefined}
                            onToggleSelect={
                              selectionMode
                                ? () =>
                                    setSelectedIds((prev) => {
                                      const next = new Set(prev)
                                      if (next.has(row.id)) next.delete(row.id)
                                      else next.add(row.id)
                                      return next
                                    })
                                : undefined
                            }
                            onView={handleView}
                            onEdit={onEdit}
                            onDelete={onDelete}
                            onAudit={handleAudit}
                          />
                        ))}
                      </TableBody>
                    )}
                  </Table>

                  {/* Virtual body renders outside the <table> above with its own scroll container */}
                  {group.transfers.length > VIRTUAL_THRESHOLD && (
                    <VirtualTableBody<TransferRow>
                      items={group.transfers}
                      rowHeight={ROW_HEIGHT_PX}
                      maxHeight={VIRTUAL_MAX_HEIGHT}
                      overscan={5}
                      tbodyClassName="divide-y divide-black/[0.04]"
                      renderRow={(row) => (
                        <TransferRowItem
                          key={row.id}
                          row={row}
                          lang={lang}
                          isSelected={selectionMode ? selectedIds.has(row.id) : undefined}
                          onToggleSelect={
                            selectionMode
                              ? () =>
                                  setSelectedIds((prev) => {
                                    const next = new Set(prev)
                                    if (next.has(row.id)) next.delete(row.id)
                                    else next.add(row.id)
                                    return next
                                  })
                              : undefined
                          }
                          onView={handleView}
                          onEdit={onEdit}
                          onDelete={onDelete}
                          onAudit={handleAudit}
                        />
                      )}
                    />
                  )}
                </div>
              )
            })}

            {/* Pagination footer */}
            {(totalPages > 1 || total > 0) && (
              <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-black/10 bg-black/[0.015] px-4 py-2">
                <div className="flex items-center gap-3">
                  <span className="text-xs tabular-nums text-black/40">
                    {isLoadMoreMode ? `${transfers.length} / ${total}` : `${from}–${to} / ${total}`}
                  </span>
                  {/* Page size selector */}
                  <Select
                    value={String(pageSize)}
                    onValueChange={(v) => {
                      onPageSizeChange(Number(v))
                      onPageChange(1)
                      setIsLoadMoreMode(false)
                    }}
                  >
                    <SelectTrigger selectSize="sm" className="h-7 w-16 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="25">25</SelectItem>
                      <SelectItem value="50">50</SelectItem>
                      <SelectItem value="100">100</SelectItem>
                    </SelectContent>
                  </Select>
                  {/* Load More toggle */}
                  <Button
                    variant={isLoadMoreMode ? 'filled' : 'outline'}
                    size="sm"
                    className="h-7 px-2.5 text-xs"
                    onClick={() => {
                      if (isLoadMoreMode) {
                        setIsLoadMoreMode(false)
                        onPageChange(1)
                      } else {
                        loadMore()
                      }
                    }}
                  >
                    {isLoadMoreMode
                      ? hasMore
                        ? t('transfers.pagination.loadMore', 'Load More')
                        : t('transfers.pagination.allLoaded', 'All Loaded')
                      : t('transfers.pagination.loadMoreMode', 'Load More')}
                  </Button>
                </div>

                {!isLoadMoreMode && totalPages > 1 && (
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

                {isLoadMoreMode && hasMore && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-7 px-3 text-xs"
                    onClick={loadMore}
                  >
                    {t('transfers.pagination.loadMore', 'Load More')}
                  </Button>
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

      {/* Bulk Edit Dialog */}
      <Dialog open={showBulkEdit} onOpenChange={(open) => !open && setShowBulkEdit(false)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>{t('transfers.bulk.editTitle', 'Edit Selected Transfers')}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <p className="text-sm text-black/50">
              {t('transfers.bulk.editDescription', '{{count}} transfers will be updated', {
                count: selectedIds.size,
              })}
            </p>
            <div className="space-y-1.5">
              <label className="text-sm font-medium">
                {t('transfers.bulk.editPsp', 'Change PSP')}
              </label>
              <Select
                value={bulkPspId ?? '__none__'}
                onValueChange={(v) => setBulkPspId(v === '__none__' ? null : v)}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder={t('transfers.bulk.keepExisting', 'Keep existing')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">
                    {t('transfers.bulk.keepExisting', 'Keep existing')}
                  </SelectItem>
                  {lookupData.psps.map((psp) => (
                    <SelectItem key={psp.id} value={psp.id}>
                      {psp.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium">
                {t('transfers.bulk.editType', 'Change Type')}
              </label>
              <Select
                value={bulkTypeId ?? '__none__'}
                onValueChange={(v) => setBulkTypeId(v === '__none__' ? null : v)}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder={t('transfers.bulk.keepExisting', 'Keep existing')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">
                    {t('transfers.bulk.keepExisting', 'Keep existing')}
                  </SelectItem>
                  {lookupData.transferTypes.map((type: TransferType) => (
                    <SelectItem key={type.id} value={type.id}>
                      {type.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowBulkEdit(false)}>
              {t('transfers.bulk.cancel', 'Cancel')}
            </Button>
            <Button variant="filled" onClick={handleBulkEditSave}>
              {t('transfers.bulk.saveChanges', 'Save Changes')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
