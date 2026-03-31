import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useTranslation } from 'react-i18next'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  Button,
  Input,
  Label,
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from '@ds'
import { useToast } from '@/hooks/useToast'
import { useIBReferralMutations } from '@/hooks/queries/useIBReferralsQuery'
import type { IBReferralWithPartner } from '@/hooks/queries/useIBReferralsQuery'
import { ibReferralSchema, type IBReferralFormValues } from '@/schemas/ibSchema'

/* ------------------------------------------------------------------ */
/*  Types                                                               */
/* ------------------------------------------------------------------ */

interface ReferralDialogProps {
  open: boolean
  onClose: () => void
  referral: IBReferralWithPartner | null
  partners: Array<{ id: string; name: string }>
}

/* ------------------------------------------------------------------ */
/*  Status options                                                      */
/* ------------------------------------------------------------------ */

const REFERRAL_STATUS_OPTIONS = [
  { value: 'registered' },
  { value: 'ftd' },
  { value: 'active' },
  { value: 'churned' },
] as const

/* ------------------------------------------------------------------ */
/*  Component                                                           */
/* ------------------------------------------------------------------ */

export function ReferralDialog({ open, onClose, referral, partners }: ReferralDialogProps) {
  const { t } = useTranslation('pages')
  const { toast } = useToast()
  const { createReferral, updateReferral } = useIBReferralMutations()
  const isEdit = !!referral
  const saving = createReferral.isPending || updateReferral.isPending

  const form = useForm<IBReferralFormValues>({
    resolver: zodResolver(ibReferralSchema),
    defaultValues: {
      ib_partner_id: '',
      client_name: '',
      is_ftd: false,
      ftd_date: '',
      ftd_amount: undefined,
      lots_traded: 0,
      status: 'registered',
      notes: '',
    },
  })

  const isFtd = form.watch('is_ftd')

  /* Reset form on open / referral change */
  useEffect(() => {
    if (open) {
      if (referral) {
        form.reset({
          ib_partner_id: referral.ib_partner_id,
          client_name: referral.client_name,
          is_ftd: referral.is_ftd ?? false,
          ftd_date: referral.ftd_date ?? '',
          ftd_amount: referral.ftd_amount != null ? Number(referral.ftd_amount) : undefined,
          lots_traded: referral.lots_traded != null ? Number(referral.lots_traded) : 0,
          status: (referral.status as IBReferralFormValues['status']) ?? 'registered',
          notes: referral.notes ?? '',
        })
      } else {
        form.reset({
          ib_partner_id: '',
          client_name: '',
          is_ftd: false,
          ftd_date: '',
          ftd_amount: undefined,
          lots_traded: 0,
          status: 'registered',
          notes: '',
        })
      }
    }
  }, [open, referral, form])

  /* Submit */
  const handleSubmit = form.handleSubmit(async (data) => {
    try {
      if (isEdit && referral) {
        await updateReferral.mutateAsync({ id: referral.id, data })
      } else {
        await createReferral.mutateAsync(data)
      }

      toast({
        title: isEdit ? t('ib.referrals.updated') : t('ib.referrals.created'),
        variant: 'success',
      })
      onClose()
    } catch {
      toast({
        title: t('ib.referrals.saveError'),
        variant: 'error',
      })
    }
  })

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent size="md" onInteractOutside={(e) => e.preventDefault()}>
        <DialogHeader>
          <DialogTitle>
            {isEdit ? t('ib.referrals.editTitle') : t('ib.referrals.addTitle')}
          </DialogTitle>
          <DialogDescription>
            {isEdit ? t('ib.referrals.editDesc') : t('ib.referrals.addDesc')}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 pt-2">
          {/* Partner */}
          <div className="space-y-1.5">
            <Label>{t('ib.referrals.partner')}</Label>
            <Select
              value={form.watch('ib_partner_id')}
              onValueChange={(v) => form.setValue('ib_partner_id', v, { shouldValidate: true })}
            >
              <SelectTrigger>
                <SelectValue placeholder={t('ib.referrals.selectPartner')} />
              </SelectTrigger>
              <SelectContent>
                {partners.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {form.formState.errors.ib_partner_id && (
              <p className="text-xs text-red">{form.formState.errors.ib_partner_id.message}</p>
            )}
          </div>

          {/* Client Name */}
          <div className="space-y-1.5">
            <Label>{t('ib.referrals.clientName')}</Label>
            <Input
              {...form.register('client_name')}
              placeholder={t('ib.referrals.clientNamePlaceholder')}
            />
            {form.formState.errors.client_name && (
              <p className="text-xs text-red">{form.formState.errors.client_name.message}</p>
            )}
          </div>

          {/* Is FTD toggle */}
          <div className="space-y-1.5">
            <Label>{t('ib.referrals.isFtd')}</Label>
            <Button
              type="button"
              variant={isFtd ? 'filled' : 'outline'}
              size="sm"
              onClick={() => form.setValue('is_ftd', !isFtd, { shouldValidate: true })}
            >
              {isFtd ? t('ib.referrals.ftdYes') : t('ib.referrals.ftdNo')}
            </Button>
          </div>

          {/* FTD Date + Amount (conditional) */}
          {isFtd && (
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>{t('ib.referrals.ftdDate')}</Label>
                <Input type="date" {...form.register('ftd_date')} />
                {form.formState.errors.ftd_date && (
                  <p className="text-xs text-red">{form.formState.errors.ftd_date.message}</p>
                )}
              </div>
              <div className="space-y-1.5">
                <Label>{t('ib.referrals.ftdAmount')}</Label>
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  {...form.register('ftd_amount', { valueAsNumber: true })}
                  placeholder="0.00"
                />
                {form.formState.errors.ftd_amount && (
                  <p className="text-xs text-red">{form.formState.errors.ftd_amount.message}</p>
                )}
              </div>
            </div>
          )}

          {/* Lots Traded */}
          <div className="space-y-1.5">
            <Label>{t('ib.referrals.lotsTraded')}</Label>
            <Input
              type="number"
              step="0.01"
              min="0"
              {...form.register('lots_traded', { valueAsNumber: true })}
              placeholder="0.00"
            />
            {form.formState.errors.lots_traded && (
              <p className="text-xs text-red">{form.formState.errors.lots_traded.message}</p>
            )}
          </div>

          {/* Status */}
          <div className="space-y-1.5">
            <Label>{t('ib.referrals.status')}</Label>
            <Select
              value={form.watch('status')}
              onValueChange={(v) =>
                form.setValue('status', v as IBReferralFormValues['status'], {
                  shouldValidate: true,
                })
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {REFERRAL_STATUS_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {t('ib.referrals.statuses.' + opt.value)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Notes */}
          <div className="space-y-1.5">
            <Label>{t('ib.referrals.notes')}</Label>
            <textarea
              {...form.register('notes')}
              rows={2}
              placeholder={t('ib.referrals.notesPlaceholder')}
              className="w-full rounded-md bg-bg2/75 px-3 py-2 text-sm text-black inset-ring inset-ring-black/15 focus:outline-none focus:ring-4 focus:ring-brand/20 focus:inset-ring-brand/55"
            />
          </div>

          {/* Actions */}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              {t('ib.referrals.cancel')}
            </Button>
            <Button type="submit" variant="filled" disabled={saving}>
              {saving
                ? t('ib.referrals.saving')
                : isEdit
                  ? t('ib.referrals.save')
                  : t('ib.referrals.create')}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
