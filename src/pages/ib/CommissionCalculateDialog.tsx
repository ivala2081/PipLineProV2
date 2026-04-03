import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  Label,
  Input,
  Button,
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from '@ds'
import { useIBPartnersQuery } from '@/hooks/queries/useIBPartnersQuery'
import { useIBCommissionMutations } from '@/hooks/queries/useIBCommissionsQuery'
import { useToast } from '@/hooks/useToast'
import { ibCalculateSchema } from '@/schemas/ibSchema'
import type { IBCalculateFormValues } from '@/schemas/ibSchema'

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface CommissionCalculateDialogProps {
  open: boolean
  onClose: () => void
}

interface TypeResult {
  type: string
  calculated_amount: number
  breakdown: Record<string, unknown>
  currency: string
}

interface CalculationResult {
  total_amount: number
  types: TypeResult[]
  currency: string
}

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

const fmtNumber = new Intl.NumberFormat('en-US', {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
})

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export function CommissionCalculateDialog({ open, onClose }: CommissionCalculateDialogProps) {
  const { t } = useTranslation('pages')
  const { toast } = useToast()

  const { partners } = useIBPartnersQuery()
  const { calculateCommission } = useIBCommissionMutations()

  const [result, setResult] = useState<CalculationResult | null>(null)

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset: resetForm,
    formState: { errors },
  } = useForm<IBCalculateFormValues>({
    resolver: zodResolver(ibCalculateSchema),
  })

  const selectedPartnerId = watch('ib_partner_id')
  const selectedPartner = partners.find((p) => p.id === selectedPartnerId)

  /* ---- Handlers ---- */

  const handleClose = () => {
    setResult(null)
    resetForm()
    onClose()
  }

  const handleCalculate = async (values: IBCalculateFormValues) => {
    if (!selectedPartner) return

    try {
      const calcResult = await calculateCommission.mutateAsync({
        ib_partner_id: values.ib_partner_id,
        period_start: values.period_start,
        period_end: values.period_end,
      })
      setResult(calcResult as CalculationResult)
      toast({ title: t('ib.commissions.calculateSuccess'), variant: 'success' })
    } catch {
      toast({ title: t('ib.commissions.calculateError'), variant: 'error' })
    }
  }

  /* ---- Render ---- */

  return (
    <Dialog open={open} onOpenChange={() => handleClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t('ib.commissions.calculateDialog.title')}</DialogTitle>
          <DialogDescription>{t('ib.commissions.calculateDialog.description')}</DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(handleCalculate)} className="space-y-md">
          {/* Partner */}
          <div className="space-y-sm">
            <Label htmlFor="calc_partner">{t('ib.commissions.partner')}</Label>
            <Select
              value={selectedPartnerId ?? ''}
              onValueChange={(v) => setValue('ib_partner_id', v, { shouldValidate: true })}
            >
              <SelectTrigger id="calc_partner" selectSize="sm" className="w-full">
                <SelectValue placeholder={t('ib.commissions.calculateDialog.selectPartner')} />
              </SelectTrigger>
              <SelectContent>
                {partners.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.ib_partner_id && (
              <p className="text-xs text-error">{errors.ib_partner_id.message}</p>
            )}
          </div>

          {/* Period Start */}
          <div className="space-y-sm">
            <Label htmlFor="calc_period_start">{t('ib.commissions.periodStart')}</Label>
            <Input id="calc_period_start" type="date" {...register('period_start')} />
            {errors.period_start && (
              <p className="text-xs text-error">{errors.period_start.message}</p>
            )}
          </div>

          {/* Period End */}
          <div className="space-y-sm">
            <Label htmlFor="calc_period_end">{t('ib.commissions.periodEnd')}</Label>
            <Input id="calc_period_end" type="date" {...register('period_end')} />
            {errors.period_end && <p className="text-xs text-error">{errors.period_end.message}</p>}
          </div>

          {/* Result section */}
          {result && (
            <div className="rounded-lg border border-black/10 bg-black/[0.02] p-4 space-y-sm">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-black/60">
                  {t('ib.commissions.calculatedAmount')}
                </span>
                <span className="text-lg font-semibold tabular-nums">
                  {fmtNumber.format(result.total_amount)}{' '}
                  <span className="text-sm font-normal text-black/50">{result.currency}</span>
                </span>
              </div>

              {result.types.length > 0 && (
                <div className="space-y-2">
                  {result.types.map((typeResult) => (
                    <div key={typeResult.type} className="space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-medium text-black/50">
                          {t(`ib.partners.agreements.${typeResult.type}`)}
                        </span>
                        <span className="font-mono text-xs tabular-nums text-black/70">
                          {fmtNumber.format(typeResult.calculated_amount)} {typeResult.currency}
                        </span>
                      </div>
                      {typeResult.breakdown && Object.keys(typeResult.breakdown).length > 0 && (
                        <div className="rounded-md bg-black/[0.03] p-3">
                          {Object.entries(typeResult.breakdown).map(([key, value]) => (
                            <div
                              key={key}
                              className="flex items-center justify-between py-1 text-sm"
                            >
                              <span className="text-black/60">{key}</span>
                              <span className="font-mono text-xs tabular-nums text-black/80">
                                {typeof value === 'number'
                                  ? fmtNumber.format(value)
                                  : String(value)}
                              </span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={handleClose}>
              {t('ib.commissions.cancel')}
            </Button>
            {!result ? (
              <Button type="submit" variant="filled" disabled={calculateCommission.isPending}>
                {calculateCommission.isPending
                  ? t('ib.commissions.calculating')
                  : t('ib.commissions.calculate')}
              </Button>
            ) : (
              <Button type="button" variant="filled" onClick={handleClose}>
                {t('ib.commissions.done')}
              </Button>
            )}
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
