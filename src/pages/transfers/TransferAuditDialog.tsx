import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import {
  UserCircle,
  PencilSimple,
  Plus,
  CaretLeft,
  CaretRight,
  ArrowCounterClockwise,
} from '@phosphor-icons/react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, Skeleton } from '@ds'
import { supabase } from '@/lib/supabase'
import { queryKeys } from '@/lib/queryKeys'
import { useTransferAuditQuery } from '@/hooks/queries/useTransferAuditQuery'
import type { AuditLogEntry } from '@/hooks/queries/useTransferAuditQuery'
import { PinDialog } from './PinDialog'

interface TransferAuditDialogProps {
  transferId: string | null
  transferName: string | null
  open: boolean
  onClose: () => void
}

// Fields that can be rolled back with a direct update (non-financial)
const ROLLBACK_FIELDS = new Set([
  'full_name',
  'crm_id',
  'meta_id',
  'notes',
  'type_id',
  'payment_method_id',
  'transfer_date',
])

function formatDateTime(dateStr: string) {
  const d = new Date(dateStr)
  const date = d.toLocaleDateString('tr-TR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  })
  const time = d.toLocaleTimeString('tr-TR', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  })
  return { date, time }
}

function AuditEntry({
  entry,
  t,
  onRollback,
}: {
  entry: AuditLogEntry
  t: (key: string, opts?: Record<string, unknown>) => string
  onRollback: (field: string, oldValue: unknown) => void
}) {
  const { date, time } = formatDateTime(entry.created_at)
  const isCreated = entry.action === 'created'
  const isDeleted = entry.action === 'deleted'
  const isRestored = entry.action === 'restored'
  const performerName =
    entry.performer?.display_name || entry.performer?.email || t('transfers.audit.unknownUser')

  const changedFieldCount = entry.changes ? Object.keys(entry.changes).length : 0

  const iconClass = isCreated
    ? 'bg-green/10 text-green'
    : isDeleted
      ? 'bg-red/10 text-red'
      : isRestored
        ? 'bg-blue/10 text-blue'
        : 'bg-orange/10 text-orange'

  return (
    <div className="flex gap-sm py-3">
      <div
        className={`mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-full ${iconClass}`}
      >
        {isCreated ? <Plus size={14} weight="bold" /> : <PencilSimple size={14} />}
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-sm">
          <UserCircle size={14} className="shrink-0 text-black/40" />
          <span className="text-sm font-medium text-black/80">{performerName}</span>
        </div>
        <p className="mt-0.5 text-[12px] text-black/50">
          {isCreated
            ? t('transfers.audit.actionCreated')
            : isDeleted
              ? t('transfers.audit.actionDeleted', 'Deleted')
              : isRestored
                ? t('transfers.audit.actionRestored', 'Restored')
                : t('transfers.audit.actionUpdated', { count: changedFieldCount })}
        </p>
        {entry.action === 'updated' && entry.changes && changedFieldCount > 0 && (
          <div className="mt-2 space-y-1">
            {Object.entries(entry.changes).map(([field, change]) => {
              const canRollback = ROLLBACK_FIELDS.has(field)
              return (
                <div key={field} className="rounded-md bg-black/[0.02] px-2.5 py-1.5 text-xs">
                  <div className="flex items-center gap-1.5">
                    <span className="font-medium text-black/50">
                      {t(`transfers.audit.fields.${field}`, { defaultValue: field })}
                    </span>
                    <span className="text-black/30">{' : '}</span>
                    <span className="text-red/80 line-through">{String(change.old ?? '—')}</span>
                    <span className="text-black/30">{' → '}</span>
                    <span className="text-green/80">{String(change.new ?? '—')}</span>
                    {canRollback && (
                      <button
                        onClick={() => onRollback(field, change.old)}
                        title={t('transfers.audit.rollback', 'Rollback this field')}
                        className="ml-auto flex shrink-0 items-center gap-0.5 rounded px-1.5 py-0.5 text-[10px] text-black/40 hover:bg-black/[0.06] hover:text-black/70"
                      >
                        <ArrowCounterClockwise size={10} />
                        {t('transfers.audit.rollbackBtn', 'Rollback')}
                      </button>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}
        <p className="mt-1.5 text-xs text-black/35">
          {date} {time}
        </p>
      </div>
    </div>
  )
}

export function TransferAuditDialog({
  transferId,
  transferName,
  open,
  onClose,
}: TransferAuditDialogProps) {
  const { t } = useTranslation('pages')
  const queryClient = useQueryClient()
  const [page, setPage] = useState(1)
  const [pinOpen, setPinOpen] = useState(false)
  const [pendingRollback, setPendingRollback] = useState<{
    field: string
    oldValue: unknown
  } | null>(null)

  const { entries, total, pageSize, isLoading, error } = useTransferAuditQuery(
    open ? transferId : null,
    page,
  )

  const rollbackMutation = useMutation({
    mutationFn: async ({ field, oldValue }: { field: string; oldValue: unknown }) => {
      if (!transferId) throw new Error('No transfer ID')
      const { error } = await supabase
        .from('transfers')
        .update({ [field]: oldValue ?? null } as never)
        .eq('id', transferId)
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.transfers.audit(transferId ?? '', page) })
      queryClient.invalidateQueries({ queryKey: queryKeys.transfers.lists() })
    },
  })

  const handleRollbackClick = (field: string, oldValue: unknown) => {
    setPendingRollback({ field, oldValue })
    setPinOpen(true)
  }

  const handlePinVerified = () => {
    if (pendingRollback) {
      rollbackMutation.mutate(pendingRollback)
    }
    setPinOpen(false)
    setPendingRollback(null)
  }

  const totalPages = Math.ceil(total / pageSize)
  const from = (page - 1) * pageSize + 1
  const to = Math.min(page * pageSize, total)

  const handleOpenChange = (isOpen: boolean) => {
    if (!isOpen) {
      onClose()
      setPage(1)
    }
  }

  return (
    <>
      <Dialog open={open} onOpenChange={handleOpenChange}>
        <DialogContent size="md">
          <DialogHeader>
            <DialogTitle>{t('transfers.audit.title')}</DialogTitle>
            {transferName && <DialogDescription>{transferName}</DialogDescription>}
          </DialogHeader>

          <div className="max-h-[400px] overflow-y-auto">
            {isLoading ? (
              <div className="space-y-md py-2">
                {Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className="flex gap-sm">
                    <Skeleton className="size-8 shrink-0 rounded-full" />
                    <div className="flex-1 space-y-sm">
                      <Skeleton className="h-4 w-32 rounded-md" />
                      <Skeleton className="h-3 w-48 rounded-md" />
                      <Skeleton className="h-3 w-20 rounded-md" />
                    </div>
                  </div>
                ))}
              </div>
            ) : error ? (
              <div className="py-10 text-center">
                <p className="text-sm text-red/70">{error}</p>
              </div>
            ) : entries.length === 0 ? (
              <div className="py-10 text-center">
                <p className="text-sm text-black/40">{t('transfers.audit.empty')}</p>
              </div>
            ) : (
              <div className="divide-y divide-black/[0.06]">
                {entries.map((entry) => (
                  <AuditEntry key={entry.id} entry={entry} t={t} onRollback={handleRollbackClick} />
                ))}
              </div>
            )}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between border-t border-black/10 pt-3">
              <span className="text-xs text-black/40">
                {from}–{to} / {total}
              </span>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setPage(Math.max(1, page - 1))}
                  disabled={page <= 1}
                  className="flex size-7 items-center justify-center rounded-md text-black/50 hover:bg-black/[0.06] hover:text-black/80 disabled:pointer-events-none disabled:opacity-30"
                >
                  <CaretLeft size={14} weight="bold" />
                </button>
                {Array.from({ length: Math.min(totalPages, 5) }).map((_, i) => {
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
                      onClick={() => setPage(pageNum)}
                      className={`flex size-7 items-center justify-center rounded-md text-xs font-medium ${
                        page === pageNum
                          ? 'bg-black/[0.08] text-black'
                          : 'text-black/50 hover:bg-black/[0.04] hover:text-black/80'
                      }`}
                    >
                      {pageNum}
                    </button>
                  )
                })}
                <button
                  onClick={() => setPage(Math.min(totalPages, page + 1))}
                  disabled={page >= totalPages}
                  className="flex size-7 items-center justify-center rounded-md text-black/50 hover:bg-black/[0.06] hover:text-black/80 disabled:pointer-events-none disabled:opacity-30"
                >
                  <CaretRight size={14} weight="bold" />
                </button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <PinDialog
        open={pinOpen}
        onClose={() => {
          setPinOpen(false)
          setPendingRollback(null)
        }}
        onVerified={handlePinVerified}
        title={t('transfers.audit.rollbackConfirm', 'Confirm Rollback')}
        description={
          pendingRollback
            ? t('transfers.audit.rollbackConfirmDesc', {
                field: t(`transfers.audit.fields.${pendingRollback.field}`, {
                  defaultValue: pendingRollback.field,
                }),
                defaultValue: `Enter your PIN to rollback the "${pendingRollback.field}" field to its previous value.`,
              })
            : ''
        }
      />
    </>
  )
}
