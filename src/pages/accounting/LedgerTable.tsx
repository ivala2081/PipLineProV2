import { useState, useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import {
  DotsThree,
  PencilSimple,
  Trash,
  ArrowUp,
  CaretLeft,
  CaretRight,
  ChartBar,
  MagnifyingGlass,
  X,
  Funnel,
} from '@phosphor-icons/react'
import type { AccountingEntry } from '@/lib/database.types'
import type { LedgerFilters } from '@/hooks/queries/useAccountingQuery'
import { LedgerDailySummaryDialog } from './LedgerDailySummaryDialog'
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
  Input,
  DatePicker,
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
  fetchEntriesByDate: (dateKey: string) => Promise<AccountingEntry[]>
  filters: LedgerFilters
  onFilterChange: <K extends keyof LedgerFilters>(key: K, value: LedgerFilters[K]) => void
  onClearFilters: () => void
  hasActiveFilters: boolean
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

const TH_CLASS = 'whitespace-nowrap text-xs font-semibold uppercase tracking-wider text-black/40'

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
  fetchEntriesByDate,
  filters,
  onFilterChange,
  onClearFilters,
  hasActiveFilters,
}: LedgerTableProps) {
  const { t, i18n } = useTranslation('pages')
  const totalPages = Math.ceil(total / pageSize)
  const from = (page - 1) * pageSize + 1
  const to = Math.min(page * pageSize, total)

  // Filter bar expanded state
  const [filtersOpen, setFiltersOpen] = useState(false)

  // Summary dialog state
  const [summaryGroup, setSummaryGroup] = useState<DateGroup | null>(null)
  const [summaryEntries, setSummaryEntries] = useState<AccountingEntry[]>([])
  const [isFetchingSummary, setIsFetchingSummary] = useState(false)

  const handleOpenSummary = useCallback(
    async (group: DateGroup) => {
      setSummaryGroup(group)
      setIsFetchingSummary(true)
      try {
        const allEntries = await fetchEntriesByDate(group.dateKey)
        setSummaryEntries(allEntries)
      } catch {
        // Fallback to entries already visible on this page
        setSummaryEntries(group.entries)
      }
      setIsFetchingSummary(false)
    },
    [fetchEntriesByDate],
  )

  const handleCloseSummary = useCallback(() => {
    setSummaryGroup(null)
    setSummaryEntries([])
  }, [])

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
            placeholder={t('accounting.filters.search')}
            value={filters.search ?? ''}
            onChange={(e) => onFilterChange('search', e.target.value || null)}
            className="h-8 pl-8 pr-8 text-xs"
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
          {t('accounting.filters.label')}
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
            {t('accounting.filters.clear')}
          </Button>
        )}
      </div>

      {/* Expanded filter dropdowns */}
      {filtersOpen && (
        <div className="rounded-lg border border-black/[0.08] bg-gradient-to-b from-black/[0.02] to-black/[0.015] p-4">
          {/* Grid layout for better space utilization */}
          <div className="grid gap-md md:grid-cols-2 lg:grid-cols-3">
            {/* Type & Status Group */}
            <div className="space-y-sm">
              <label className="block text-[10px] font-semibold uppercase tracking-widest text-black/40">
                {t('accounting.filters.typeStatus', 'Type & Status')}
              </label>
              <div className="space-y-sm">
                <Select
                  value={filters.entryType ?? '__all__'}
                  onValueChange={(v) => onFilterChange('entryType', v === '__all__' ? null : v)}
                >
                  <SelectTrigger selectSize="sm" className="h-9 w-full text-xs">
                    <SelectValue placeholder={t('accounting.filters.allTypes')} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__all__">{t('accounting.filters.allTypes')}</SelectItem>
                    <SelectItem value="ODEME">{t('accounting.entryTypes.ODEME')}</SelectItem>
                    <SelectItem value="TRANSFER">{t('accounting.entryTypes.TRANSFER')}</SelectItem>
                  </SelectContent>
                </Select>
                <Select
                  value={filters.direction ?? '__all__'}
                  onValueChange={(v) => onFilterChange('direction', v === '__all__' ? null : v)}
                >
                  <SelectTrigger selectSize="sm" className="h-9 w-full text-xs">
                    <SelectValue placeholder={t('accounting.filters.allDirections')} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__all__">{t('accounting.filters.allDirections')}</SelectItem>
                    <SelectItem value="in">{t('accounting.directions.in')}</SelectItem>
                    <SelectItem value="out">{t('accounting.directions.out')}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Financial Group */}
            <div className="space-y-sm">
              <label className="block text-[10px] font-semibold uppercase tracking-widest text-black/40">
                {t('accounting.filters.financial', 'Financial')}
              </label>
              <div className="space-y-sm">
                <Select
                  value={filters.register ?? '__all__'}
                  onValueChange={(v) => onFilterChange('register', v === '__all__' ? null : v)}
                >
                  <SelectTrigger selectSize="sm" className="h-9 w-full text-xs">
                    <SelectValue placeholder={t('accounting.filters.allRegisters')} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__all__">{t('accounting.filters.allRegisters')}</SelectItem>
                    <SelectItem value="USDT">USDT</SelectItem>
                    <SelectItem value="NAKIT_TL">Cash TL</SelectItem>
                    <SelectItem value="NAKIT_USD">Cash USD</SelectItem>
                  </SelectContent>
                </Select>
                <Select
                  value={filters.currency ?? '__all__'}
                  onValueChange={(v) => onFilterChange('currency', v === '__all__' ? null : v)}
                >
                  <SelectTrigger selectSize="sm" className="h-9 w-full text-xs">
                    <SelectValue placeholder={t('accounting.filters.allCurrencies')} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__all__">{t('accounting.filters.allCurrencies')}</SelectItem>
                    <SelectItem value="TL">TL</SelectItem>
                    <SelectItem value="USD">USD</SelectItem>
                    <SelectItem value="USDT">USDT</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Amount Range Group */}
            <div className="space-y-sm">
              <label className="block text-[10px] font-semibold uppercase tracking-widest text-black/40">
                {t('accounting.filters.amountRange', 'Amount Range')}
              </label>
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1.5">
                  <span className="text-[10px] font-medium text-black/40">
                    {t('accounting.filters.minAmount', 'Min')}
                  </span>
                  <Input
                    type="number"
                    inputSize="sm"
                    placeholder="0.00"
                    step="0.01"
                    min="0"
                    value={filters.amountMin ?? ''}
                    onChange={(e) => onFilterChange('amountMin', e.target.value || null)}
                    className="h-9 w-full text-xs"
                  />
                </div>
                <div className="space-y-1.5">
                  <span className="text-[10px] font-medium text-black/40">
                    {t('accounting.filters.maxAmount', 'Max')}
                  </span>
                  <Input
                    type="number"
                    inputSize="sm"
                    placeholder="0.00"
                    step="0.01"
                    min="0"
                    value={filters.amountMax ?? ''}
                    onChange={(e) => onFilterChange('amountMax', e.target.value || null)}
                    className="h-9 w-full text-xs"
                  />
                </div>
              </div>
            </div>

            {/* Periods Group */}
            <div className="space-y-sm">
              <label className="block text-[10px] font-semibold uppercase tracking-widest text-black/40">
                {t('accounting.filters.periods', 'Periods')}
              </label>
              <div className="space-y-sm">
                <Input
                  type="text"
                  inputSize="sm"
                  placeholder={t(
                    'accounting.filters.costPeriodPlaceholder',
                    'Cost Period (YYYY-MM)',
                  )}
                  value={filters.costPeriod ?? ''}
                  onChange={(e) => onFilterChange('costPeriod', e.target.value || null)}
                  className="h-9 w-full text-xs"
                />
                <Input
                  type="text"
                  inputSize="sm"
                  placeholder={t(
                    'accounting.filters.paymentPeriodPlaceholder',
                    'Payment Period (YYYY-MM)',
                  )}
                  value={filters.paymentPeriod ?? ''}
                  onChange={(e) => onFilterChange('paymentPeriod', e.target.value || null)}
                  className="h-9 w-full text-xs"
                />
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )

  const groups = groupByDate(entries, i18n.language)

  function getPageNumbers(): (number | 'ellipsis')[] {
    if (totalPages <= 5) return Array.from({ length: totalPages }, (_, i) => i + 1)
    if (page <= 3) return [1, 2, 3, 4, 'ellipsis', totalPages]
    if (page >= totalPages - 2)
      return [1, 'ellipsis', totalPages - 3, totalPages - 2, totalPages - 1, totalPages]
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
                    <Skeleton className="h-4 w-40 rounded-md" />
                    <Skeleton className="h-4 w-16 rounded-md" />
                    <Skeleton className="h-5 w-12 rounded-full" />
                    <Skeleton className="ml-auto h-4 w-20 rounded-md" />
                    <Skeleton className="h-4 w-14 rounded-md" />
                  </div>
                ))}
              </div>
            </div>
          ))
        ) : entries.length === 0 ? (
          <EmptyState
            icon={ArrowUp}
            title={
              hasActiveFilters ? t('accounting.filters.noResults') : t('accounting.empty.title')
            }
            description={
              hasActiveFilters
                ? t('accounting.filters.noResultsDescription')
                : t('accounting.empty.description')
            }
          />
        ) : (
          <>
            {groups.map((group) => (
              <div
                key={group.dateKey}
                className="overflow-hidden rounded-xl border border-black/10"
              >
                <div className="flex items-center justify-between bg-black/[0.02] px-4 py-2.5">
                  <div className="flex items-center gap-2.5">
                    <span className="text-sm font-semibold text-black/70">{group.label}</span>
                    <Tag variant="default" className="h-5 text-xs">
                      {group.entries.length} {t('accounting.dailySummary.entries', 'entries')}
                    </Tag>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 gap-1.5 px-2.5 text-xs font-medium text-black/40 hover:text-black/70"
                    onClick={() => handleOpenSummary(group)}
                  >
                    <ChartBar size={14} />
                    {t('accounting.dailySummary.label', 'Summary')}
                  </Button>
                </div>

                <Table cardOnMobile>
                  <TableHeader>
                    <TableRow className="bg-black/[0.015] hover:bg-black/[0.015]">
                      <TableHead className={TH_CLASS}>
                        {t('accounting.columns.description')}
                      </TableHead>
                      <TableHead className={TH_CLASS}>{t('accounting.columns.type')}</TableHead>
                      <TableHead className={TH_CLASS}>
                        {t('accounting.columns.direction')}
                      </TableHead>
                      <TableHead className={`${TH_CLASS} text-right`}>
                        {t('accounting.columns.amount')}
                      </TableHead>
                      <TableHead className={TH_CLASS}>{t('accounting.columns.currency')}</TableHead>
                      <TableHead className={TH_CLASS}>{t('accounting.columns.register')}</TableHead>
                      <TableHead className={TH_CLASS}>
                        {t('accounting.columns.costPeriod')}
                      </TableHead>
                      <TableHead className="w-16 px-2" />
                    </TableRow>
                  </TableHeader>
                  <TableBody className="divide-y divide-black/[0.04]">
                    {group.entries.map((row) => (
                      <TableRow key={row.id} className="hover:bg-black/[0.015]">
                        <TableCell
                          className="whitespace-nowrap"
                          data-label={t('accounting.columns.description')}
                        >
                          <span className="text-sm font-medium text-black/90">
                            {row.description}
                          </span>
                        </TableCell>
                        <TableCell
                          className="whitespace-nowrap"
                          data-label={t('accounting.columns.type')}
                        >
                          <Tag variant="default">
                            {row.entry_type === 'ODEME'
                              ? t('accounting.entryTypes.ODEME')
                              : t('accounting.entryTypes.TRANSFER')}
                          </Tag>
                        </TableCell>
                        <TableCell
                          className="whitespace-nowrap"
                          data-label={t('accounting.columns.direction')}
                        >
                          <Tag variant={row.direction === 'in' ? 'default' : 'red'}>
                            {row.direction === 'in'
                              ? t('accounting.directions.in')
                              : t('accounting.directions.out')}
                          </Tag>
                        </TableCell>
                        <TableCell
                          className="whitespace-nowrap text-right"
                          data-label={t('accounting.columns.amount')}
                        >
                          <span
                            className={`font-mono text-sm font-medium tabular-nums ${row.direction === 'in' ? 'text-green' : 'text-red'}`}
                          >
                            {row.direction === 'in' ? '+' : '-'}
                            {formatNumber(row.amount)}
                          </span>
                        </TableCell>
                        <TableCell
                          className="whitespace-nowrap"
                          data-label={t('accounting.columns.currency')}
                        >
                          <Tag variant="default">{row.currency}</Tag>
                        </TableCell>
                        <TableCell
                          className="whitespace-nowrap text-sm text-black/60"
                          data-label={t('accounting.columns.register')}
                        >
                          {REGISTER_LABELS[row.register] || row.register}
                        </TableCell>
                        <TableCell
                          className="whitespace-nowrap text-sm text-black/50"
                          data-label={t('accounting.columns.costPeriod')}
                        >
                          {row.cost_period || '—'}
                        </TableCell>
                        <TableCell className="whitespace-nowrap px-2" isActions>
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
                              <DropdownMenuItem className="text-red" onClick={() => onDelete(row)}>
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
            ))}

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
      <LedgerDailySummaryDialog
        group={summaryGroup}
        entries={summaryEntries}
        isFetching={isFetchingSummary}
        onClose={handleCloseSummary}
      />
    </>
  )
}
