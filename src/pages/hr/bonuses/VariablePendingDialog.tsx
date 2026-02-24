import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { CurrencyDollar, Info } from '@phosphor-icons/react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  Button,
  Input,
  Label,
} from '@ds'
import { useToast } from '@/hooks/useToast'
import {
  useBonusMutations,
  type HrBonusAgreement,
  type HrBonusPayment,
  type HrEmployee,
} from '@/hooks/queries/useHrQuery'
import { formatAmount, parseAmount, numberToDisplay, amountPlaceholder } from '@/lib/formatAmount'

interface VariablePendingDialogProps {
  open: boolean
  onClose: () => void
  agreement: HrBonusAgreement | null
  employees: HrEmployee[]
  periodLabel: string // e.g. "Şubat 2026"
  existingPending: HrBonusPayment | null
}

export function VariablePendingDialog({
  open,
  onClose,
  agreement,
  employees,
  periodLabel,
  existingPending,
}: VariablePendingDialogProps) {
  const { i18n } = useTranslation('pages')
  const { toast } = useToast()
  const lang = i18n.language === 'tr' ? 'tr' : 'en'
  const { createVariablePending } = useBonusMutations()

  const employee = employees.find((e) => e.id === agreement?.employee_id)
  const [amountDisplay, setAmountDisplay] = useState('')
  const [amount, setAmount] = useState(0)

  useEffect(() => {
    if (open) {
      const existing = existingPending?.amount_usdt ?? 0
      setAmount(existing)
      setAmountDisplay(existing > 0 ? numberToDisplay(existing, lang) : '')
    }
  }, [open, existingPending, lang])

  const handleSubmit = async () => {
    if (!agreement) return
    try {
      await createVariablePending.mutateAsync({
        agreement_id: agreement.id,
        employee_id: agreement.employee_id,
        period: periodLabel,
        amount_usdt: amount,
      })
      toast({
        title:
          amount > 0
            ? lang === 'tr'
              ? 'Değişken prim kaydedildi'
              : 'Variable bonus saved'
            : lang === 'tr'
              ? 'Değişken prim silindi'
              : 'Variable bonus cleared',
        variant: 'success',
      })
      onClose()
    } catch {
      toast({ title: lang === 'tr' ? 'Bir hata oluştu' : 'Something went wrong', variant: 'error' })
    }
  }

  const isPending = createVariablePending.isPending

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent
        size="md"
        className="max-h-[90vh] overflow-y-auto"
        onInteractOutside={(e) => e.preventDefault()}
      >
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base sm:text-lg">
            <CurrencyDollar size={20} className="text-orange" weight="duotone" />
            {lang === 'tr' ? 'Değişken Prim Gir' : 'Enter Variable Bonus'}
          </DialogTitle>
          <DialogDescription className="text-xs text-black/55">
            {employee && <span className="font-medium text-black/70">{employee.full_name}</span>}
            {agreement && <> — {agreement.title}</>}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-md">
          {/* Info */}
          <div className="flex items-start gap-2 rounded-lg border border-blue/20 bg-blue/5 px-3 py-2.5 text-xs text-black/60">
            <Info size={14} weight="fill" className="mt-0.5 shrink-0 text-blue" />
            <span>
              {lang === 'tr'
                ? 'Bu tutar muhasebede işlenmez. Toplu ödeme yapıldığında muhasebe kaydı oluşturulur.'
                : 'This amount is not posted to accounting yet. It will be recorded when bulk payout is processed.'}
            </span>
          </div>

          {/* Period (read-only) */}
          <div>
            <Label className="mb-1 text-xs font-medium tracking-wide text-black/70">
              {lang === 'tr' ? 'Dönem' : 'Period'}
            </Label>
            <Input value={periodLabel} readOnly className="cursor-not-allowed opacity-60" />
          </div>

          {/* Amount */}
          <div>
            <Label className="mb-1 text-xs font-medium tracking-wide text-black/70">
              {lang === 'tr' ? 'Hakedilen Tutar (USDT)' : 'Earned Amount (USDT)'}
            </Label>
            <Input
              type="text"
              inputMode="decimal"
              value={amountDisplay}
              onChange={(e) => {
                const formatted = formatAmount(e.target.value, lang)
                setAmountDisplay(formatted)
                setAmount(parseAmount(formatted, lang))
              }}
              placeholder={amountPlaceholder(lang)}
            />
            {existingPending && (
              <p className="mt-1 text-[11px] text-orange/70">
                {lang === 'tr'
                  ? `Mevcut: ${existingPending.amount_usdt.toLocaleString()} USDT — 0 girerseniz silinir.`
                  : `Current: ${existingPending.amount_usdt.toLocaleString()} USDT — enter 0 to clear.`}
              </p>
            )}
          </div>

          {/* Actions */}
          <div className="flex items-center justify-between gap-2 pt-1">
            <Button type="button" variant="outline" size="sm" onClick={onClose}>
              {lang === 'tr' ? 'İptal' : 'Cancel'}
            </Button>
            <Button
              type="button"
              variant="filled"
              size="sm"
              disabled={isPending}
              onClick={() => void handleSubmit()}
            >
              {isPending
                ? lang === 'tr'
                  ? 'Kaydediliyor...'
                  : 'Saving...'
                : lang === 'tr'
                  ? 'Kaydet'
                  : 'Save'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
