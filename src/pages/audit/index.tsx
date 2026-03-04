import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import {
  CaretLeft,
  CaretRight,
  PencilSimple,
  Plus,
  ArrowCounterClockwise,
  Trash,
} from '@phosphor-icons/react'
import {
  useOrgAuditLogQuery,
  type OrgAuditFilters,
  type OrgAuditEntry,
} from '@/hooks/queries/useOrgAuditLogQuery'
import { useOrgMembersQuery } from '@/hooks/queries/useOrgMembersQuery'
import { useOrganization } from '@/app/providers/OrganizationProvider'
import { PageHeader, Tag, Skeleton } from '@ds'

/* ── Helpers ────────────────────────────────────────────────────────── */

function formatDateTime(dateStr: string) {
  const d = new Date(dateStr)
  return {
    date: d.toLocaleDateString(undefined, { day: '2-digit', month: '2-digit', year: 'numeric' }),
    time: d.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' }),
  }
}

function ActionTag({ action }: { action: string }) {
  switch (action) {
    case 'created':
      return (
        <Tag variant="green" className="text-[11px]">
          Created
        </Tag>
      )
    case 'updated':
      return (
        <Tag variant="yellow" className="text-[11px]">
          Updated
        </Tag>
      )
    case 'deleted':
      return (
        <Tag variant="red" className="text-[11px]">
          Deleted
        </Tag>
      )
    case 'restored':
      return (
        <Tag variant="blue" className="text-[11px]">
          Restored
        </Tag>
      )
    default:
      return <Tag className="text-[11px]">{action}</Tag>
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

/* ── Filter bar ────────────────────────────────────────────────────── */

function FilterBar({
  filters,
  onChange,
  members,
}: {
  filters: OrgAuditFilters
  onChange: (next: OrgAuditFilters) => void
  members: Array<{ user_id: string; label: string }>
}) {
  const { t } = useTranslation('pages')
  const inputCls =
    'h-8 rounded-lg border border-black/10 bg-bg1 px-2 text-xs text-black/70 focus:outline-none focus:ring-1 focus:ring-brand/50'

  return (
    <div className="flex flex-wrap items-center gap-2">
      <select
        value={filters.actorId ?? ''}
        onChange={(e) => onChange({ ...filters, actorId: e.target.value || null })}
        className={inputCls}
      >
        <option value="">{t('audit.filters.allActors', 'All actors')}</option>
        {members.map((m) => (
          <option key={m.user_id} value={m.user_id}>
            {m.label}
          </option>
        ))}
      </select>

      <select
        value={filters.action ?? ''}
        onChange={(e) => onChange({ ...filters, action: e.target.value || null })}
        className={inputCls}
      >
        <option value="">{t('audit.filters.allActions', 'All actions')}</option>
        <option value="created">{t('audit.actions.created', 'Created')}</option>
        <option value="updated">{t('audit.actions.updated', 'Updated')}</option>
        <option value="deleted">{t('audit.actions.deleted', 'Deleted')}</option>
        <option value="restored">{t('audit.actions.restored', 'Restored')}</option>
      </select>

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

      {(filters.actorId || filters.action || filters.from || filters.to) && (
        <button
          type="button"
          onClick={() => onChange({ actorId: null, action: null, from: null, to: null })}
          className="h-8 rounded-lg border border-black/10 px-2.5 text-xs text-black/45 hover:border-black/20 hover:text-black/70"
        >
          {t('audit.filters.clear', 'Clear')}
        </button>
      )}
    </div>
  )
}

/* ── Audit Row ──────────────────────────────────────────────────────── */

function AuditRow({ entry }: { entry: OrgAuditEntry }) {
  const { t } = useTranslation('pages')
  const [expanded, setExpanded] = useState(false)
  const { date, time } = formatDateTime(entry.created_at)
  const changedFieldCount = entry.changes ? Object.keys(entry.changes).length : 0

  return (
    <div className="border-b border-black/[0.06] last:border-0">
      <div className="flex items-center gap-3 px-4 py-3">
        <div className="flex size-7 shrink-0 items-center justify-center rounded-full bg-black/[0.04]">
          <ActionIcon action={entry.action} />
        </div>
        <div className="w-32 shrink-0">
          <p className="truncate text-xs font-medium text-black/80">
            {entry.performer_name ?? entry.performed_by?.slice(0, 8) ?? '—'}
          </p>
        </div>
        <div className="w-20 shrink-0">
          <ActionTag action={entry.action} />
        </div>
        <div className="min-w-0 flex-1">
          {entry.transfer_name ? (
            <Link
              to="/transfers"
              className="truncate text-xs text-black/70 underline decoration-black/20 underline-offset-2 hover:text-black"
            >
              {entry.transfer_name}
            </Link>
          ) : (
            <span className="text-xs text-black/30">—</span>
          )}
        </div>
        {changedFieldCount > 0 && (
          <button
            type="button"
            onClick={() => setExpanded((v) => !v)}
            className="shrink-0 rounded-md px-2 py-0.5 text-[11px] font-medium text-black/50 hover:bg-black/[0.04] hover:text-black/70"
          >
            {changedFieldCount}{' '}
            {t('audit.fields', { count: changedFieldCount, defaultValue: 'field(s)' })}
          </button>
        )}
        <div className="shrink-0 text-right">
          <p className="font-mono text-[11px] text-black/50">{time}</p>
          <p className="font-mono text-[10px] text-black/30">{date}</p>
        </div>
      </div>

      {expanded && entry.changes && (
        <div className="bg-black/[0.015] px-4 pb-3">
          <div className="space-y-1 pt-1">
            {Object.entries(entry.changes).map(([field, change]) => (
              <div key={field} className="rounded-md bg-bg1 px-2.5 py-1.5 text-xs">
                <span className="font-medium text-black/50">
                  {t(`transfers.audit.fields.${field}`, { defaultValue: field })}
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
  const { currentOrg } = useOrganization()
  const [page, setPage] = useState(1)
  const [filters, setFilters] = useState<OrgAuditFilters>({
    from: null,
    to: null,
    actorId: null,
    action: null,
  })

  const { entries, total, pageSize, isLoading, error } = useOrgAuditLogQuery(filters, page)
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

  return (
    <div className="mx-auto max-w-5xl space-y-4">
      <PageHeader
        title={t('audit.title', 'Audit Log')}
        subtitle={t('audit.subtitle', 'All transfer changes across your organization')}
      />

      <FilterBar filters={filters} onChange={handleFiltersChange} members={members} />

      <div className="overflow-hidden rounded-xl border border-black/[0.06] bg-bg1">
        <div className="flex items-center gap-3 border-b border-black/[0.06] bg-black/[0.02] px-4 py-2">
          <div className="w-7 shrink-0" />
          <div className="w-32 shrink-0 text-[11px] font-semibold uppercase tracking-wide text-black/35">
            {t('audit.columns.actor', 'Actor')}
          </div>
          <div className="w-20 shrink-0 text-[11px] font-semibold uppercase tracking-wide text-black/35">
            {t('audit.columns.action', 'Action')}
          </div>
          <div className="min-w-0 flex-1 text-[11px] font-semibold uppercase tracking-wide text-black/35">
            {t('audit.columns.transfer', 'Transfer')}
          </div>
          <div className="shrink-0 text-[11px] font-semibold uppercase tracking-wide text-black/35">
            {t('audit.columns.changes', 'Changes')}
          </div>
          <div className="shrink-0 text-right text-[11px] font-semibold uppercase tracking-wide text-black/35">
            {t('audit.columns.time', 'Time')}
          </div>
        </div>

        {isLoading ? (
          <div>
            {Array.from({ length: 8 }).map((_, i) => (
              <div
                key={i}
                className="flex items-center gap-3 border-b border-black/[0.04] px-4 py-3"
              >
                <Skeleton className="size-7 rounded-full" />
                <Skeleton className="h-3 w-28 rounded" />
                <Skeleton className="h-5 w-16 rounded-full" />
                <Skeleton className="h-3 w-40 rounded" />
                <Skeleton className="ml-auto h-3 w-16 rounded" />
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
            {entries.map((entry) => (
              <AuditRow key={entry.id} entry={entry} />
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
              className="flex size-8 items-center justify-center rounded-md text-black/50 hover:bg-black/[0.06] disabled:pointer-events-none disabled:opacity-30"
            >
              <CaretRight size={14} weight="bold" />
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
