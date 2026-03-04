import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { ArrowCounterClockwise, Trash, Warning } from '@phosphor-icons/react'
import { supabase } from '@/lib/supabase'
import { useOrganization } from '@/app/providers/OrganizationProvider'
import { useAuth } from '@/app/providers/AuthProvider'
import { queryKeys } from '@/lib/queryKeys'
import { Skeleton, Button } from '@ds'
import { PinDialog } from './PinDialog'
import { formatNumber } from './transfersTableUtils'

interface TrashedTransfer {
  id: string
  full_name: string
  amount: number
  currency: string
  deleted_at: string
  deleted_by: string | null
  deleter?: { display_name: string | null; email: string | null } | null
}

export function TrashTab() {
  const { t, i18n } = useTranslation('pages')
  const lang = i18n.language
  const { currentOrg } = useOrganization()
  const { isGod } = useAuth()
  const queryClient = useQueryClient()
  const [purgeTarget, setPurgeTarget] = useState<TrashedTransfer | null>(null)
  const [pinOpen, setPinOpen] = useState(false)
  const [pendingAction, setPendingAction] = useState<(() => void) | null>(null)

  const { data: trashed, isLoading } = useQuery({
    queryKey: [...queryKeys.transfers.all, 'trash', currentOrg?.id ?? ''],
    queryFn: async () => {
      if (!currentOrg) throw new Error('No org')
      const { data, error } = await supabase
        .from('transfers')
        .select(
          'id, full_name, amount, currency, deleted_at, deleted_by, deleter:profiles!deleted_by(display_name, email)',
        )
        .eq('organization_id', currentOrg.id)
        .not('deleted_at', 'is', null)
        .order('deleted_at', { ascending: false })
        .limit(100)
      if (error) throw error
      return (data as unknown as TrashedTransfer[]) ?? []
    },
    enabled: !!currentOrg,
    staleTime: 30_000,
  })

  const restoreMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('transfers')
        .update({ deleted_at: null, deleted_by: null } as never)
        .eq('id', id)
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.transfers.all })
    },
  })

  const purgeMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('transfers').delete().eq('id', id)
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: [...queryKeys.transfers.all, 'trash', currentOrg?.id ?? ''],
      })
    },
  })

  const handleRestore = (item: TrashedTransfer) => {
    setPendingAction(() => () => restoreMutation.mutate(item.id))
    setPinOpen(true)
  }

  const handlePurge = (item: TrashedTransfer) => {
    setPurgeTarget(item)
    setPendingAction(() => () => purgeMutation.mutate(item.id))
    setPinOpen(true)
  }

  const handlePinVerified = () => {
    pendingAction?.()
    setPinOpen(false)
    setPurgeTarget(null)
    setPendingAction(null)
  }

  if (isLoading) {
    return (
      <div className="space-y-2 py-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-12 rounded-lg" />
        ))}
      </div>
    )
  }

  if (!trashed || trashed.length === 0) {
    return (
      <div className="py-16 text-center">
        <Trash size={32} weight="light" className="mx-auto mb-2 text-black/20" />
        <p className="text-sm font-medium text-black/40">
          {t('transfers.trash.empty', 'Trash is empty')}
        </p>
        <p className="mt-1 text-xs text-black/25">
          {t('transfers.trash.emptyHint', 'Deleted transfers appear here for 30 days')}
        </p>
      </div>
    )
  }

  return (
    <>
      {/* Warning banner */}
      <div className="mb-4 flex items-start gap-2 rounded-lg border border-orange/20 bg-orange/5 px-3 py-2.5">
        <Warning size={14} className="mt-0.5 shrink-0 text-orange" />
        <p className="text-xs text-black/60">
          {t(
            'transfers.trash.warning',
            'Permanently deleted transfers cannot be recovered. Restored transfers return to the main list.',
          )}
        </p>
      </div>

      <div className="overflow-hidden rounded-xl border border-black/[0.06]">
        {trashed.map((item, i) => {
          const deletedDate = new Date(item.deleted_at).toLocaleDateString(
            lang === 'tr' ? 'tr-TR' : 'en-US',
            {
              day: '2-digit',
              month: '2-digit',
              year: 'numeric',
            },
          )
          const deleterName =
            (item.deleter as { display_name: string | null; email: string | null } | null)
              ?.display_name ??
            (item.deleter as { display_name: string | null; email: string | null } | null)?.email ??
            '—'

          return (
            <div
              key={item.id}
              className={`flex items-center gap-3 px-4 py-3 ${i < trashed.length - 1 ? 'border-b border-black/[0.06]' : ''}`}
            >
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-black/70">{item.full_name}</p>
                <p className="text-xs text-black/35">
                  {t('transfers.trash.deletedAt', 'Deleted')} {deletedDate}
                  {item.deleted_by && ` ${t('transfers.trash.by', 'by')} ${deleterName}`}
                </p>
              </div>
              <span className="shrink-0 font-mono text-sm text-black/50">
                {formatNumber(Math.abs(item.amount), lang)} {item.currency}
              </span>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleRestore(item)}
                disabled={restoreMutation.isPending}
                className="shrink-0 gap-1.5 text-xs"
              >
                <ArrowCounterClockwise size={13} />
                {t('transfers.trash.restore', 'Restore')}
              </Button>
              {isGod && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handlePurge(item)}
                  disabled={purgeMutation.isPending}
                  className="shrink-0 gap-1.5 text-xs text-red/70 hover:text-red"
                >
                  <Trash size={13} />
                  {t('transfers.trash.purge', 'Purge')}
                </Button>
              )}
            </div>
          )
        })}
      </div>

      <PinDialog
        open={pinOpen}
        onClose={() => {
          setPinOpen(false)
          setPurgeTarget(null)
          setPendingAction(null)
        }}
        onVerified={handlePinVerified}
        title={
          purgeTarget
            ? t('transfers.trash.confirmPurge', 'Confirm Permanent Delete')
            : t('transfers.trash.confirmRestore', 'Confirm Restore')
        }
        description={
          purgeTarget
            ? t(
                'transfers.trash.confirmPurgeDesc',
                'Enter your PIN to permanently delete this transfer. This cannot be undone.',
              )
            : t('transfers.trash.confirmRestoreDesc', 'Enter your PIN to restore this transfer.')
        }
      />
    </>
  )
}
