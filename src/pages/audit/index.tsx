import { useState, useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import {
  CaretLeft,
  CaretRight,
  PencilSimple,
  Plus,
  ArrowCounterClockwise,
  Trash,
  MagnifyingGlass,
  DownloadSimple,
} from '@phosphor-icons/react'
import {
  useOrgAuditLogQuery,
  useOrgAuditLogStats,
  type OrgAuditFilters,
  type OrgAuditEntry,
} from '@/hooks/queries/useOrgAuditLogQuery'
import { useOrgMembersQuery } from '@/hooks/queries/useOrgMembersQuery'
import { useOrganization } from '@/app/providers/OrganizationProvider'
import { usePagePermissions } from '@/hooks/usePagePermission'
import { supabase } from '@/lib/supabase'
import { PageHeader, Tag, Skeleton, Tabs, TabsList, TabsTrigger, TabsContent } from '@ds'
import { TrashTab } from '@/pages/transfers/TrashTab'
import { TransferFixTab } from '@/pages/transfer-fix'
import { TransferDetailSheet } from '@/pages/transfers/TransferDetailSheet'
import type { TransferRow } from '@/hooks/useTransfers'

/* ── Field labels ────────────────────────────────────────────────── */

const FIELD_LABELS: Record<string, string> = {
  full_name: 'Full Name',
  amount: 'Amount',
  exchange_rate: 'Exchange Rate',
  amount_try: 'Amount (TRY)',
  amount_usd: 'Amount (USD)',
  psp_id: 'PSP',
  payment_method_id: 'Payment Method',
  category_id: 'Category',
  type_id: 'Transfer Type',
  currency: 'Currency',
  transfer_date: 'Transfer Date',
  notes: 'Notes',
  crm_id: 'CRM ID',
  meta_id: 'Meta ID',
  is_first_deposit: 'First Deposit',
}

/* ── Helpers ────────────────────────────────────────────────────────── */

function formatDateTime(dateStr: string) {
  const d = new Date(dateStr)
  return {
    date: d.toLocaleDateString(undefined, { day: '2-digit', month: '2-digit', year: 'numeric' }),
    time: d.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' }),
  }
}

function formatRelative(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime()
  const minutes = Math.floor(diff / 60_000)
  if (minutes < 1) return 'just now'
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  if (days < 30) return `${days}d ago`
  return formatDateTime(dateStr).date
}

function groupByDate(entries: OrgAuditEntry[]): Array<{ date: string; entries: OrgAuditEntry[] }> {
  const map = new Map<string, OrgAuditEntry[]>()
  for (const entry of entries) {
    const date = entry.created_at.slice(0, 10)
    if (!map.has(date)) map.set(date, [])
    map.get(date)!.push(entry)
  }
  return Array.from(map.entries()).map(([date, items]) => ({ date, entries: items }))
}

function exportToCsv(entries: OrgAuditEntry[]) {
  const headers = ['Date', 'Time', 'Actor', 'Action', 'Transfer', 'Changes']
  const rows = entries.map((e) => {
    const { date, time } = formatDateTime(e.created_at)
    const changesText = e.changes
      ? Object.entries(e.changes)
          .map(
            ([k, v]) => `${FIELD_LABELS[k] ?? k}: ${String(v.old ?? '')} → ${String(v.new ?? '')}`,
          )
          .join('; ')
      : ''
    return [date, time, e.performer_name ?? '', e.action, e.transfer_name ?? '', changesText]
  })
  const csv = [headers, ...rows]
    .map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(','))
    .join('\n')
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `audit-log-${new Date().toISOString().slice(0, 10)}.csv`
  a.click()
  URL.revokeObjectURL(url)
}

/* ── ActionTag / ActionIcon ──────────────────────────────────────── */

function ActionTag({ action }: { action: string }) {
  switch (action) {
    case 'created':
      return (
        <Tag variant="green" className="text-xs">
          Created
        </Tag>
      )
    case 'updated':
      return (
        <Tag variant="yellow" className="text-xs">
          Updated
        </Tag>
      )
    case 'deleted':
      return (
        <Tag variant="red" className="text-xs">
          Deleted
        </Tag>
      )
    case 'restored':
      return (
        <Tag variant="blue" className="text-xs">
          Restored
        </Tag>
      )
    default:
      return <Tag className="text-xs">{action}</Tag>
  }
}

function ActionIcon({ action }: { action: string }) {
  switch (action) {
    case 'created':
      return <Plus size={13} weight="bold" className="text-green" />
    case 'updated':
      return <PencilSimple size={13} className="text-orange" />
    case 'deleted':
      return <Trash size={13} className="text-red" />
    case 'restored':
      return <ArrowCounterClockwise size={13} className="text-blue" />
    default:
      return <PencilSimple size={13} className="text-black/40" />
  }
}

/* ── Stats Bar ───────────────────────────────────────────────────── */

interface AuditStats {
  created: number
  updated: number
  deleted: number
  restored: number
}

function StatsBar({ stats }: { stats: AuditStats | undefined }) {
  if (!stats) return null
  const items = [
    { label: 'Created', value: stats.created, color: 'text-green' },
    { label: 'Updated', value: stats.updated, color: 'text-orange' },
    { label: 'Deleted', value: stats.deleted, color: 'text-red' },
    { label: 'Restored', value: stats.restored, color: 'text-blue' },
  ]
  return (
    <div className="flex flex-wrap gap-2">
      {items.map(({ label, value, color }) => (
        <div
          key={label}
          className="flex items-center gap-1.5 rounded-lg border border-black/[0.06] bg-bg1 px-3 py-1.5"
        >
          <span className={`text-sm font-semibold ${color}`}>{value}</span>
          <span className="text-xs text-black/40">{label}</span>
        </div>
      ))}
    </div>
  )
}

/* ── Filter bar ──────────────────────────────────────────────────── */

function FilterBar({
  filters,
  onChange,
  members,
  onExport,
  exporting,
}: {
  filters: OrgAuditFilters
  onChange: (next: OrgAuditFilters) => void
  members: Array<{ user_id: string; label: string }>
  onExport: () => void
  exporting: boolean
}) {
  const inputCls =
    'h-8 rounded-lg border border-black/10 bg-bg1 px-2 text-xs text-black/60 focus:outline-none focus:ring-2 focus:ring-brand/20'

  const hasFilters =
    !!filters.actorId || !!filters.action || !!filters.from || !!filters.to || !!filters.search

  return (
    <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center">
      {/* Search */}
      <div className="relative">
        <MagnifyingGlass
          size={13}
          className="absolute left-2.5 top-1/2 -translate-y-1/2 text-black/35"
        />
        <input
          type="text"
          placeholder="Search by name…"
          value={filters.search ?? ''}
          onChange={(e) => onChange({ ...filters, search: e.target.value || null })}
          className={`${inputCls} w-44 pl-7`}
        />
      </div>

      {/* Actor */}
      <select
        value={filters.actorId ?? ''}
        onChange={(e) => onChange({ ...filters, actorId: e.target.value || null })}
        className={inputCls}
      >
        <option value="">All actors</option>
        {members.map((m) => (
          <option key={m.user_id} value={m.user_id}>
            {m.label}
          </option>
        ))}
      </select>

      {/* Action */}
      <select
        value={filters.action ?? ''}
        onChange={(e) => onChange({ ...filters, action: e.target.value || null })}
        className={inputCls}
      >
        <option value="">All actions</option>
        <option value="created">Created</option>
        <option value="updated">Updated</option>
        <option value="deleted">Deleted</option>
        <option value="restored">Restored</option>
      </select>

      {/* Date range */}
      <input
        type="date"
        value={filters.from ?? ''}
        onChange={(e) => onChange({ ...filters, from: e.target.value || null })}
        className={inputCls}
      />
      <input
        type="date"
        value={filters.to ?? ''}
        onChange={(e) => onChange({ ...filters, to: e.target.value || null })}
        className={inputCls}
      />

      {/* Clear */}
      {hasFilters && (
        <button
          type="button"
          onClick={() =>
            onChange({ actorId: null, action: null, from: null, to: null, search: null })
          }
          className="h-8 rounded-lg border border-black/10 px-2.5 text-xs text-black/40 hover:border-black/20 hover:text-black/60"
        >
          Clear
        </button>
      )}

      {/* Export */}
      <button
        type="button"
        onClick={onExport}
        disabled={exporting}
        className="flex h-8 items-center gap-1.5 rounded-lg border border-black/10 px-2.5 text-xs text-black/40 hover:border-black/20 hover:text-black/60 disabled:opacity-50 sm:ml-auto"
      >
        <DownloadSimple size={13} />
        {exporting ? 'Exporting…' : 'Export CSV'}
      </button>
    </div>
  )
}

/* ── Date Divider ────────────────────────────────────────────────── */

function DateDivider({ dateStr }: { dateStr: string }) {
  const label = new Date(dateStr).toLocaleDateString(undefined, {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
  return (
    <div className="border-b border-black/[0.06] bg-black/[0.015] px-4 py-2">
      <span className="text-xs font-semibold uppercase tracking-wide text-black/40">{label}</span>
    </div>
  )
}

/* ── Audit Row ───────────────────────────────────────────────────── */

function AuditRow({
  entry,
  onTransferClick,
  loadingId,
}: {
  entry: OrgAuditEntry
  onTransferClick: (transferId: string) => void
  loadingId: string | null
}) {
  const { t } = useTranslation('pages')
  const [expanded, setExpanded] = useState(false)
  const { date, time } = formatDateTime(entry.created_at)
  const changedFieldCount = entry.changes ? Object.keys(entry.changes).length : 0
  const relative = formatRelative(entry.created_at)
  const isLoading = loadingId === entry.transfer_id

  return (
    <div className="border-b border-black/[0.06] last:border-0">
      <div className="flex items-start gap-3 px-4 py-3">
        {/* Icon */}
        <div className="mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-full bg-black/[0.04]">
          <ActionIcon action={entry.action} />
        </div>

        {/* Content */}
        <div className="min-w-0 flex-1">
          {/* Row 1: actor + action tag + relative time */}
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-medium text-black/60">
              {entry.performer_name ?? entry.performed_by?.slice(0, 8) ?? '—'}
            </span>
            <ActionTag action={entry.action} />
            <div className="ml-auto shrink-0 text-right" title={`${date} ${time}`}>
              <span className="font-mono text-xs text-black/40">{relative}</span>
              <span className="ml-1 hidden font-mono text-xs text-black/40 sm:inline">
                · {time}
              </span>
            </div>
          </div>

          {/* Row 2: transfer name + changes button */}
          <div className="mt-0.5 flex items-center gap-2">
            {entry.transfer_name ? (
              <button
                type="button"
                onClick={() => onTransferClick(entry.transfer_id)}
                disabled={isLoading}
                className="truncate text-xs text-black/60 underline decoration-black/20 underline-offset-2 hover:text-black/80 disabled:opacity-50"
              >
                {isLoading ? 'Loading…' : entry.transfer_name}
              </button>
            ) : (
              <span className="text-xs text-black/30">—</span>
            )}

            {changedFieldCount > 0 && (
              <button
                type="button"
                onClick={() => setExpanded((v) => !v)}
                className="ml-auto shrink-0 rounded-md px-2 py-0.5 text-xs font-medium text-black/40 hover:bg-black/[0.04] hover:text-black/60"
              >
                {changedFieldCount}{' '}
                {t('audit.fields', { count: changedFieldCount, defaultValue: 'field(s)' })}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Changes diff */}
      {expanded && entry.changes && (
        <div className="bg-black/[0.015] px-4 pb-3">
          <div className="space-y-1 pt-1">
            {Object.entries(entry.changes).map(([field, change]) => (
              <div key={field} className="rounded-md bg-bg1 px-2.5 py-1.5 text-xs">
                <span className="font-medium text-black/50">
                  {FIELD_LABELS[field] ??
                    t(`transfers.audit.fields.${field}`, { defaultValue: field })}
                </span>
                <span className="text-black/30">{' : '}</span>
                <span className="text-red/70 line-through">{String(change.old ?? '—')}</span>
                <span className="text-black/30">{' → '}</span>
                <span className="text-green/70">{String(change.new ?? '—')}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

/* ── Page ───────────────────────────────────────────────────────────── */

export function AuditLogPage() {
  const { t } = useTranslation('pages')
  const { currentOrg, membership } = useOrganization()
  const { canAccessPage } = usePagePermissions()
  const canTrash = canAccessPage('trash') ?? false
  const canTransferFix = canAccessPage('transfer-fix') ?? false

  const [page, setPage] = useState(1)
  const [filters, setFilters] = useState<OrgAuditFilters>({
    from: null,
    to: null,
    actorId: null,
    action: null,
    search: null,
  })
  const [detailRow, setDetailRow] = useState<TransferRow | null>(null)
  const [loadingId, setLoadingId] = useState<string | null>(null)
  const [exporting, setExporting] = useState(false)

  const { entries, total, pageSize, isLoading, error } = useOrgAuditLogQuery(filters, page)
  const { data: stats } = useOrgAuditLogStats(filters)
  const { data: membersData } = useOrgMembersQuery(currentOrg?.id ?? '')
  const members =
    membersData?.map((m) => ({
      user_id: m.user_id,
      label: m.profile?.display_name ?? m.user_id.slice(0, 8),
    })) ?? []

  const totalPages = Math.ceil(total / pageSize)

  const handleFiltersChange = (next: OrgAuditFilters) => {
    setFilters(next)
    setPage(1)
  }

  const handleTransferClick = useCallback(async (transferId: string) => {
    setLoadingId(transferId)
    const { data } = await supabase
      .from('transfers')
      .select(
        '*, category:transfer_categories(name,is_deposit), payment_method:payment_methods(name), psp:psps(name,commission_rate), type:transfer_types(name)',
      )
      .eq('id', transferId)
      .single()
    setLoadingId(null)
    if (data) setDetailRow(data as unknown as TransferRow)
  }, [])

  const handleExport = useCallback(async () => {
    if (!currentOrg) return
    setExporting(true)
    const { data } = await supabase.rpc(
      'get_org_audit_log' as never,
      {
        p_org_id: currentOrg.id,
        p_from: filters.from ?? null,
        p_to: filters.to ?? null,
        p_actor_id: filters.actorId ?? null,
        p_action: filters.action ?? null,
        p_search: filters.search ?? null,
        p_limit: 1000,
        p_offset: 0,
      } as never,
    )
    setExporting(false)
    if (data) exportToCsv(data as OrgAuditEntry[])
  }, [currentOrg, filters])

  const grouped = groupByDate(entries)

  return (
    <div className="mx-auto max-w-5xl space-y-4">
      <PageHeader
        title={t('audit.title', 'Audit Log')}
        subtitle={t('audit.subtitle', 'All transfer changes across your organization')}
      />

      <Tabs defaultValue="log">
        <TabsList>
          <TabsTrigger value="log">{t('audit.tabs.log', 'Audit Log')}</TabsTrigger>
          {canTrash && <TabsTrigger value="trash">{t('audit.tabs.trash', 'Trash')}</TabsTrigger>}
          {canTransferFix && <TabsTrigger value="transfer-fix">Transfer Fix</TabsTrigger>}
        </TabsList>

        <TabsContent value="log" className="space-y-4">
          <FilterBar
            filters={filters}
            onChange={handleFiltersChange}
            members={members}
            onExport={handleExport}
            exporting={exporting}
          />

          <StatsBar stats={stats} />

          <div className="overflow-hidden rounded-xl border border-black/[0.06] bg-bg1">
            {isLoading ? (
              <div>
                {Array.from({ length: 8 }).map((_, i) => (
                  <div
                    key={i}
                    className="flex items-center gap-3 border-b border-black/[0.04] px-4 py-3"
                  >
                    <Skeleton className="size-7 rounded-full" />
                    <div className="flex-1 space-y-1.5">
                      <Skeleton className="h-3 w-32 rounded" />
                      <Skeleton className="h-3 w-48 rounded" />
                    </div>
                    <Skeleton className="h-3 w-14 rounded" />
                  </div>
                ))}
              </div>
            ) : error ? (
              <div className="py-16 text-center">
                <p className="text-sm text-red/60">{error}</p>
              </div>
            ) : entries.length === 0 ? (
              <div className="py-16 text-center">
                <p className="text-sm font-medium text-black/40">
                  {t('audit.empty', 'No audit entries found')}
                </p>
                <p className="mt-1 text-xs text-black/25">
                  {t('audit.emptyHint', 'Changes to transfers will appear here')}
                </p>
              </div>
            ) : (
              <div>
                {grouped.map(({ date, entries: dateEntries }) => (
                  <div key={date}>
                    <DateDivider dateStr={date} />
                    {dateEntries.map((entry) => (
                      <AuditRow
                        key={entry.id}
                        entry={entry}
                        onTransferClick={handleTransferClick}
                        loadingId={loadingId}
                      />
                    ))}
                  </div>
                ))}
              </div>
            )}
          </div>

          {totalPages > 1 && (
            <div className="flex items-center justify-between">
              <span className="text-xs text-black/40">
                {(page - 1) * pageSize + 1}–{Math.min(page * pageSize, total)} / {total}
              </span>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setPage(Math.max(1, page - 1))}
                  disabled={page <= 1}
                  aria-label="Previous page"
                  className="flex size-8 items-center justify-center rounded-md text-black/50 hover:bg-black/[0.06] disabled:pointer-events-none disabled:opacity-30"
                >
                  <CaretLeft size={14} weight="bold" />
                </button>
                <span className="px-2 text-xs text-black/50">
                  {page} / {totalPages}
                </span>
                <button
                  onClick={() => setPage(Math.min(totalPages, page + 1))}
                  disabled={page >= totalPages}
                  aria-label="Next page"
                  className="flex size-8 items-center justify-center rounded-md text-black/50 hover:bg-black/[0.06] disabled:pointer-events-none disabled:opacity-30"
                >
                  <CaretRight size={14} weight="bold" />
                </button>
              </div>
            </div>
          )}
        </TabsContent>

        {canTrash && (
          <TabsContent value="trash">
            <TrashTab />
          </TabsContent>
        )}

        {canTransferFix && (
          <TabsContent value="transfer-fix">
            <TransferFixTab />
          </TabsContent>
        )}
      </Tabs>

      <TransferDetailSheet row={detailRow} onClose={() => setDetailRow(null)} />
    </div>
  )
}
