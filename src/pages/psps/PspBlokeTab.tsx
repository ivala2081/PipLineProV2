import { useState, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { ShieldWarning, CheckCircle, XCircle, Clock } from '@phosphor-icons/react'
import {
  Card,
  StatCard,
  EmptyState,
  Skeleton,
  Tag,
  Button,
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  Input,
  Label,
} from '@ds'
import {
  usePspBlokeQuery,
  useBlokeResolutionMutation,
  type BlokeStatus,
  type BlokeTransfer,
} from '@/hooks/queries/usePspBlokeQuery'
import { useToast } from '@/hooks/useToast'

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

function fmtNum(v: number): string {
  return Math.abs(v).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

function fmtDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })
}

function StatusBadge({
  status,
  t,
}: {
  status: BlokeStatus
  t: (key: string, fallback?: string) => string
}) {
  const map: Record<BlokeStatus, { variant: 'yellow' | 'green' | 'red'; label: string }> = {
    pending: { variant: 'yellow', label: t('psps.bloke.pending', 'Pending') },
    resolved: { variant: 'green', label: t('psps.bloke.resolved', 'Resolved') },
    written_off: { variant: 'red', label: t('psps.bloke.writtenOff', 'Written Off') },
  }
  const cfg = map[status]
  return (
    <Tag variant={cfg.variant} size="sm">
      {cfg.label}
    </Tag>
  )
}

/* ------------------------------------------------------------------ */
/*  Resolution Dialog                                                  */
/* ------------------------------------------------------------------ */

function ResolutionDialog({
  open,
  onClose,
  transfer,
  targetStatus,
  onConfirm,
  isPending,
}: {
  open: boolean
  onClose: () => void
  transfer: BlokeTransfer | null
  targetStatus: 'resolved' | 'written_off'
  onConfirm: (date: string, notes: string) => void
  isPending: boolean
}) {
  const { t } = useTranslation('pages')
  const [date, setDate] = useState(() => new Date().toISOString().split('T')[0])
  const [notes, setNotes] = useState('')

  const title =
    targetStatus === 'resolved'
      ? t('psps.bloke.resolveDialog.resolveTitle', 'Resolve Blocked Transfer')
      : t('psps.bloke.resolveDialog.writeOffTitle', 'Write Off Blocked Transfer')

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent size="sm">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>

        {transfer && (
          <p className="text-sm text-black/60">
            {transfer.fullName} — {fmtNum(transfer.amount)} {transfer.currency}
          </p>
        )}

        <div className="space-y-3 pt-2">
          <div>
            <Label className="mb-1 text-xs font-medium">
              {t('psps.bloke.resolveDialog.date', 'Resolution Date')}
            </Label>
            <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
          </div>
          <div>
            <Label className="mb-1 text-xs font-medium">
              {t('psps.bloke.resolveDialog.notes', 'Notes')}
            </Label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder={t(
                'psps.bloke.resolveDialog.notesPlaceholder',
                'Enter resolution details...',
              )}
              rows={3}
              className="w-full resize-none rounded-xl border border-black/10 bg-bg1 px-3 py-2 text-sm outline-none transition-colors focus:border-brand focus:ring-1 focus:ring-brand"
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" size="sm" onClick={onClose} disabled={isPending}>
            {t('psps.bloke.resolveDialog.cancel', 'Cancel')}
          </Button>
          <Button size="sm" onClick={() => onConfirm(date, notes)} disabled={isPending}>
            {isPending
              ? t('psps.bloke.resolveDialog.saving', 'Saving...')
              : t('psps.bloke.resolveDialog.confirm', 'Confirm')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

/* ------------------------------------------------------------------ */
/*  BlokeTab                                                           */
/* ------------------------------------------------------------------ */

interface BlokeTabProps {
  pspId: string
  isAdmin: boolean
}

export function BlokeTab({ pspId, isAdmin }: BlokeTabProps) {
  const { t } = useTranslation('pages')
  const toast = useToast()
  const { data: transfers, isLoading } = usePspBlokeQuery(pspId)
  const resolutionMutation = useBlokeResolutionMutation(pspId)

  const [filter, setFilter] = useState<BlokeStatus | 'all'>('all')
  const [dialogOpen, setDialogOpen] = useState(false)
  const [dialogTarget, setDialogTarget] = useState<'resolved' | 'written_off'>('resolved')
  const [selectedTransfer, setSelectedTransfer] = useState<BlokeTransfer | null>(null)

  const filtered = useMemo(() => {
    if (!transfers) return []
    if (filter === 'all') return transfers
    return transfers.filter((t) => t.status === filter)
  }, [transfers, filter])

  const counts = useMemo(() => {
    if (!transfers) return { pending: 0, resolved: 0, written_off: 0, total: 0 }
    return transfers.reduce(
      (acc, t) => {
        acc[t.status]++
        acc.total++
        return acc
      },
      { pending: 0, resolved: 0, written_off: 0, total: 0 },
    )
  }, [transfers])

  function openDialog(transfer: BlokeTransfer, status: 'resolved' | 'written_off') {
    setSelectedTransfer(transfer)
    setDialogTarget(status)
    setDialogOpen(true)
  }

  async function handleConfirm(date: string, notes: string) {
    if (!selectedTransfer) return
    try {
      await resolutionMutation.mutateAsync({
        transferId: selectedTransfer.transferId,
        status: dialogTarget,
        date,
        notes,
      })
      toast.success(
        dialogTarget === 'resolved'
          ? t('psps.bloke.toast.resolved', 'Transfer marked as resolved')
          : t('psps.bloke.toast.writtenOff', 'Transfer marked as written off'),
      )
      setDialogOpen(false)
      setSelectedTransfer(null)
    } catch {
      toast.error(t('psps.bloke.toast.error', 'An error occurred'))
    }
  }

  if (isLoading) {
    return (
      <div className="space-y-4 py-4">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-20 rounded-xl" />
          ))}
        </div>
        <Skeleton className="h-48 rounded-xl" />
      </div>
    )
  }

  if (!transfers?.length) {
    return (
      <div className="py-8">
        <EmptyState
          title={t('psps.bloke.noData', 'No blocked transfers for this PSP.')}
          icon={ShieldWarning}
        />
      </div>
    )
  }

  return (
    <div className="space-y-4 py-4">
      {/* ── Stat Cards ── */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatCard
          icon={ShieldWarning}
          label={t('psps.bloke.stats.total', 'Total Blocked')}
          value={counts.total}
        />
        <StatCard
          icon={Clock}
          iconBg="bg-yellow-500/10"
          iconColor="text-yellow-600"
          label={t('psps.bloke.stats.pending', 'Pending')}
          value={counts.pending}
        />
        <StatCard
          icon={CheckCircle}
          iconBg="bg-green-500/10"
          iconColor="text-green-600"
          label={t('psps.bloke.stats.resolved', 'Resolved')}
          value={counts.resolved}
        />
        <StatCard
          icon={XCircle}
          iconBg="bg-red-500/10"
          iconColor="text-red-500"
          label={t('psps.bloke.stats.writtenOff', 'Written Off')}
          value={counts.written_off}
        />
      </div>

      {/* ── Filter Buttons ── */}
      <div className="flex flex-wrap gap-2">
        {(['all', 'pending', 'resolved', 'written_off'] as const).map((key) => (
          <button
            key={key}
            onClick={() => setFilter(key)}
            className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
              filter === key ? 'bg-brand text-white' : 'bg-black/5 text-black/60 hover:bg-black/10'
            }`}
          >
            {key === 'all'
              ? t('psps.bloke.all', 'All')
              : key === 'pending'
                ? t('psps.bloke.pending', 'Pending')
                : key === 'resolved'
                  ? t('psps.bloke.resolved', 'Resolved')
                  : t('psps.bloke.writtenOff', 'Written Off')}{' '}
            ({key === 'all' ? counts.total : counts[key]})
          </button>
        ))}
      </div>

      {/* ── Table ── */}
      <Card padding="default" className="border border-black/10 bg-bg1">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t('psps.bloke.columns.name', 'Name')}</TableHead>
                <TableHead>{t('psps.bloke.columns.date', 'Date')}</TableHead>
                <TableHead className="text-right">
                  {t('psps.bloke.columns.amount', 'Amount')}
                </TableHead>
                <TableHead>{t('psps.bloke.columns.method', 'Method')}</TableHead>
                <TableHead>{t('psps.bloke.columns.status', 'Status')}</TableHead>
                <TableHead>{t('psps.bloke.columns.resolutionDate', 'Resolved On')}</TableHead>
                {isAdmin && (
                  <TableHead className="text-right">
                    {t('psps.bloke.columns.actions', 'Actions')}
                  </TableHead>
                )}
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((tr) => (
                <TableRow key={tr.transferId}>
                  <TableCell className="font-medium">{tr.fullName}</TableCell>
                  <TableCell>{fmtDate(tr.transferDate)}</TableCell>
                  <TableCell className="text-right tabular-nums">
                    {fmtNum(tr.amount)} {tr.currency}
                  </TableCell>
                  <TableCell>{tr.paymentMethod}</TableCell>
                  <TableCell>
                    <StatusBadge status={tr.status} t={t} />
                  </TableCell>
                  <TableCell>{tr.resolutionDate ? fmtDate(tr.resolutionDate) : '—'}</TableCell>
                  {isAdmin && (
                    <TableCell className="text-right">
                      {tr.status === 'pending' && (
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => openDialog(tr, 'resolved')}
                          >
                            {t('psps.bloke.markResolved', 'Mark Resolved')}
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => openDialog(tr, 'written_off')}
                          >
                            {t('psps.bloke.markWrittenOff', 'Write Off')}
                          </Button>
                        </div>
                      )}
                    </TableCell>
                  )}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </Card>

      {/* ── Resolution Dialog ── */}
      <ResolutionDialog
        open={dialogOpen}
        onClose={() => {
          setDialogOpen(false)
          setSelectedTransfer(null)
        }}
        transfer={selectedTransfer}
        targetStatus={dialogTarget}
        onConfirm={handleConfirm}
        isPending={resolutionMutation.isPending}
      />
    </div>
  )
}
