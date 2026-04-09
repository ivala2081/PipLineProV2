import { useState, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { CheckCircle, CurrencyDollar, PencilSimple, Calculator } from '@phosphor-icons/react'
import {
  Tag,
  EmptyState,
  Skeleton,
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  Label,
  Input,
  Button,
} from '@ds'
import {
  useIBCommissionsQuery,
  useIBCommissionMutations,
} from '@/hooks/queries/useIBCommissionsQuery'
import type { IBCommissionWithPartner } from '@/hooks/queries/useIBCommissionsQuery'
import { useIBPartnersQuery } from '@/hooks/queries/useIBPartnersQuery'
import { useToast } from '@/hooks/useToast'
import { ibCommissionOverrideSchema } from '@/schemas/ibSchema'
import type { IBCommissionOverrideValues } from '@/schemas/ibSchema'
import { CommissionCalculateDialog } from './CommissionCalculateDialog'

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface CommissionsTabProps {
  isAdmin: boolean
  showCalculateDialog: boolean
  onShowCalculateDialog: (show: boolean) => void
}

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

const fmtNumber = new Intl.NumberFormat('en-US', {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
})

function getStatusVariant(status: string): 'blue' | 'green' | 'default' {
  switch (status) {
    case 'confirmed':
      return 'blue'
    case 'paid':
      return 'green'
    default:
      return 'default'
  }
}

function formatPeriod(start: string, end: string): string {
  const fmt = (d: string) =>
    new Date(d + 'T00:00:00').toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    })
  return `${fmt(start)} — ${fmt(end)}`
}

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export function CommissionsTab({
  isAdmin,
  showCalculateDialog,
  onShowCalculateDialog,
}: CommissionsTabProps) {
  const { t } = useTranslation('pages')
  const { toast } = useToast()

  const { commissions, isLoading } = useIBCommissionsQuery()
  const { overrideCommission, confirmCommission, markPaid } = useIBCommissionMutations()
  const { partners } = useIBPartnersQuery()

  /* ---- State ---- */

  const [filterPartnerId, setFilterPartnerId] = useState('')
  const [filterStatus, setFilterStatus] = useState('')
  const [overrideTarget, setOverrideTarget] = useState<IBCommissionWithPartner | null>(null)
  const [confirmingId, setConfirmingId] = useState<string | null>(null)

  /* ---- Override form ---- */

  const {
    register,
    handleSubmit,
    reset: resetForm,
    formState: { errors, isSubmitting: isOverrideSubmitting },
  } = useForm<IBCommissionOverrideValues>({
    resolver: zodResolver(ibCommissionOverrideSchema),
  })

  const handleOverrideOpen = (commission: IBCommissionWithPartner) => {
    resetForm({
      override_amount: commission.override_amount ?? undefined,
      override_reason: commission.override_reason ?? '',
    })
    setOverrideTarget(commission)
  }

  const handleOverrideClose = () => {
    setOverrideTarget(null)
    resetForm()
  }

  const handleOverrideSubmit = async (values: IBCommissionOverrideValues) => {
    if (!overrideTarget) return
    try {
      await overrideCommission.mutateAsync({
        id: overrideTarget.id,
        override_amount: values.override_amount,
        override_reason: values.override_reason,
      })
      toast({ title: t('ib.commissions.overrideSuccess'), variant: 'success' })
      handleOverrideClose()
    } catch {
      toast({ title: t('ib.commissions.overrideError'), variant: 'error' })
    }
  }

  /* ---- Actions ---- */

  const handleConfirm = async (id: string) => {
    setConfirmingId(id)
    try {
      await confirmCommission.mutateAsync(id)
      toast({ title: t('ib.commissions.confirmSuccess'), variant: 'success' })
    } catch {
      toast({ title: t('ib.commissions.confirmError'), variant: 'error' })
    } finally {
      setConfirmingId(null)
    }
  }

  const handleMarkPaid = async (id: string) => {
    try {
      await markPaid.mutateAsync(id)
      toast({ title: t('ib.commissions.markPaidSuccess'), variant: 'success' })
    } catch {
      toast({ title: t('ib.commissions.markPaidError'), variant: 'error' })
    }
  }

  /* ---- Filtered data ---- */

  const filtered = useMemo(() => {
    let result = commissions
    if (filterPartnerId) {
      result = result.filter((c) => c.ib_partner_id === filterPartnerId)
    }
    if (filterStatus) {
      result = result.filter((c) => c.status === filterStatus)
    }
    return result
  }, [commissions, filterPartnerId, filterStatus])

  /* ---- Render ---- */

  return (
    <div className="space-y-md">
      {/* Filters */}
      <div className="flex flex-col gap-sm sm:flex-row sm:items-center">
        <Select
          value={filterPartnerId || '__all__'}
          onValueChange={(v) => setFilterPartnerId(v === '__all__' ? '' : v)}
        >
          <SelectTrigger selectSize="sm" className="h-9 w-full text-xs sm:w-48">
            <SelectValue placeholder={t('ib.commissions.allPartners')} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__all__">{t('ib.commissions.allPartners')}</SelectItem>
            {partners.map((p) => (
              <SelectItem key={p.id} value={p.id}>
                {p.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          value={filterStatus || '__all__'}
          onValueChange={(v) => setFilterStatus(v === '__all__' ? '' : v)}
        >
          <SelectTrigger selectSize="sm" className="h-9 w-full text-xs sm:w-40">
            <SelectValue placeholder={t('ib.commissions.allStatuses')} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__all__">{t('ib.commissions.allStatuses')}</SelectItem>
            <SelectItem value="draft">{t('ib.commissions.statuses.draft')}</SelectItem>
            <SelectItem value="confirmed">{t('ib.commissions.statuses.confirmed')}</SelectItem>
            <SelectItem value="paid">{t('ib.commissions.statuses.paid')}</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Loading */}
      {isLoading ? (
        <div className="space-y-sm">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-12 w-full rounded-md" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        /* Empty state */
        <EmptyState
          icon={Calculator}
          title={
            filterPartnerId || filterStatus
              ? t('ib.commissions.noResults')
              : t('ib.commissions.empty')
          }
          description={filterPartnerId || filterStatus ? undefined : t('ib.commissions.emptyDesc')}
        />
      ) : (
        /* Table */
        <Table cardOnMobile>
          <TableHeader>
            <TableRow>
              <TableHead>{t('ib.commissions.partner')}</TableHead>
              <TableHead>{t('ib.commissions.period')}</TableHead>
              <TableHead>{t('ib.commissions.agreementType')}</TableHead>
              <TableHead className="text-right">{t('ib.commissions.calculatedAmount')}</TableHead>
              <TableHead className="text-right">{t('ib.commissions.overrideAmount')}</TableHead>
              <TableHead className="text-right">{t('ib.commissions.finalAmount')}</TableHead>
              <TableHead>{t('ib.commissions.currency')}</TableHead>
              <TableHead>{t('ib.commissions.status')}</TableHead>
              {isAdmin && <TableHead className="w-32" />}
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.map((commission) => (
              <TableRow key={commission.id}>
                <TableCell data-label={t('ib.commissions.partner')}>
                  <span className="font-medium">{commission.ib_partner?.name ?? '—'}</span>
                </TableCell>
                <TableCell data-label={t('ib.commissions.period')}>
                  <span className="text-sm text-black/60">
                    {formatPeriod(commission.period_start, commission.period_end)}
                  </span>
                </TableCell>
                <TableCell data-label={t('ib.commissions.agreementType')}>
                  {t(`ib.partners.agreements.${commission.agreement_type}`)}
                </TableCell>
                <TableCell
                  data-label={t('ib.commissions.calculatedAmount')}
                  className="text-right tabular-nums"
                >
                  {fmtNumber.format(commission.calculated_amount)}
                </TableCell>
                <TableCell
                  data-label={t('ib.commissions.overrideAmount')}
                  className="text-right tabular-nums"
                >
                  {commission.override_amount != null
                    ? fmtNumber.format(commission.override_amount)
                    : '—'}
                </TableCell>
                <TableCell
                  data-label={t('ib.commissions.finalAmount')}
                  className="text-right font-medium tabular-nums"
                >
                  {fmtNumber.format(commission.final_amount)}
                </TableCell>
                <TableCell data-label={t('ib.commissions.currency')}>
                  <Tag variant="default">{commission.currency}</Tag>
                </TableCell>
                <TableCell data-label={t('ib.commissions.status')}>
                  <Tag variant={getStatusVariant(commission.status)}>
                    {t(`ib.commissions.statuses.${commission.status}`)}
                  </Tag>
                </TableCell>
                {isAdmin && (
                  <TableCell isActions>
                    <div className="flex items-center justify-end gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 gap-1 px-2 text-xs"
                        onClick={() => handleOverrideOpen(commission)}
                      >
                        <PencilSimple size={14} />
                        {t('ib.commissions.override')}
                      </Button>
                      {commission.status === 'draft' && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 gap-1 px-2 text-xs"
                          onClick={() => handleConfirm(commission.id)}
                          disabled={confirmingId === commission.id}
                        >
                          <CheckCircle size={14} />
                          {confirmingId === commission.id
                            ? t('ib.commissions.confirming')
                            : t('ib.commissions.confirm')}
                        </Button>
                      )}
                      {commission.status === 'confirmed' && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 gap-1 px-2 text-xs"
                          onClick={() => handleMarkPaid(commission.id)}
                          disabled={markPaid.isPending}
                        >
                          <CurrencyDollar size={14} />
                          {t('ib.commissions.markPaid')}
                        </Button>
                      )}
                    </div>
                  </TableCell>
                )}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}

      {/* Override Dialog */}
      <Dialog open={!!overrideTarget} onOpenChange={() => handleOverrideClose()}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('ib.commissions.overrideDialog.title')}</DialogTitle>
            <DialogDescription>
              {t('ib.commissions.overrideDialog.description', {
                partner: overrideTarget?.ib_partner?.name ?? '',
              })}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit(handleOverrideSubmit)} className="space-y-md">
            <div className="space-y-sm">
              <Label htmlFor="override_amount">{t('ib.commissions.overrideDialog.amount')}</Label>
              <Input
                id="override_amount"
                type="number"
                step="0.01"
                {...register('override_amount')}
              />
              {errors.override_amount && (
                <p className="text-xs text-red">{errors.override_amount.message}</p>
              )}
            </div>
            <div className="space-y-sm">
              <Label htmlFor="override_reason">{t('ib.commissions.overrideDialog.reason')}</Label>
              <textarea
                id="override_reason"
                rows={3}
                className="w-full rounded-md bg-bg2/75 px-3 py-2 text-sm text-black inset-ring inset-ring-black/15 focus:outline-none focus:ring-4 focus:ring-brand/20 focus:inset-ring-brand/55"
                {...register('override_reason')}
              />
              {errors.override_reason && (
                <p className="text-xs text-red">{errors.override_reason.message}</p>
              )}
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={handleOverrideClose}>
                {t('ib.commissions.cancel')}
              </Button>
              <Button type="submit" variant="filled" disabled={isOverrideSubmitting}>
                {isOverrideSubmitting
                  ? t('ib.commissions.saving')
                  : t('ib.commissions.saveOverride')}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Calculate Dialog */}
      <CommissionCalculateDialog
        open={showCalculateDialog}
        onClose={() => onShowCalculateDialog(false)}
      />
    </div>
  )
}
