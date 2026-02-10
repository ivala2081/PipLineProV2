import { useState, useEffect, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import type { TransferRow, TransferFormData } from '@/hooks/useTransfers'
import { computeTransfer } from '@/hooks/useTransfers'
import type { useLookupData } from '@/hooks/useLookupData'
import type { useTransfers } from '@/hooks/useTransfers'
import { useToast } from '@/hooks/useToast'
import { basicInputClasses, disabledInputClasses, focusInputClasses } from '@ds/components/Input'
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
import { cn } from '@ds/utils'

interface TransferDialogProps {
  open: boolean
  onClose: () => void
  transfer: TransferRow | null
  lookupData: ReturnType<typeof useLookupData>
  onSubmit: ReturnType<typeof useTransfers>
}

export function TransferDialog({
  open,
  onClose,
  transfer,
  lookupData,
  onSubmit,
}: TransferDialogProps) {
  const { t } = useTranslation('pages')
  const { toast } = useToast()
  const isEdit = !!transfer

  const [fullName, setFullName] = useState('')
  const [paymentMethodId, setPaymentMethodId] = useState('')
  const [transferDate, setTransferDate] = useState('')
  const [categoryId, setCategoryId] = useState('')
  const [rawAmount, setRawAmount] = useState('')
  const [currency, setCurrency] = useState<'TL' | 'USD'>('TL')
  const [pspId, setPspId] = useState('')
  const [typeId, setTypeId] = useState('')
  const [crmId, setCrmId] = useState('')
  const [metaId, setMetaId] = useState('')
  const [saving, setSaving] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})

  // Reset form when dialog opens/closes or transfer changes
  useEffect(() => {
    if (open) {
      if (transfer) {
        setFullName(transfer.full_name)
        setPaymentMethodId(transfer.payment_method_id)
        setTransferDate(
          transfer.transfer_date
            ? new Date(transfer.transfer_date).toISOString().slice(0, 16)
            : '',
        )
        setCategoryId(transfer.category_id)
        setRawAmount(String(Math.abs(transfer.amount)))
        setCurrency(transfer.currency)
        setPspId(transfer.psp_id)
        setTypeId(transfer.type_id)
        setCrmId(transfer.crm_id ?? '')
        setMetaId(transfer.meta_id ?? '')
      } else {
        setFullName('')
        setPaymentMethodId('')
        setTransferDate(new Date().toISOString().slice(0, 16))
        setCategoryId('')
        setRawAmount('')
        setCurrency('TL')
        setPspId('')
        setTypeId('')
        setCrmId('')
        setMetaId('')
      }
      setErrors({})
      setSaving(false)
    }
  }, [open, transfer])

  // Live commission/net computation
  const selectedCategory = useMemo(
    () => lookupData.categories.find((c) => c.id === categoryId),
    [lookupData.categories, categoryId],
  )
  const selectedPsp = useMemo(
    () => lookupData.psps.find((p) => p.id === pspId),
    [lookupData.psps, pspId],
  )

  const computed = useMemo(() => {
    const amt = parseFloat(rawAmount) || 0
    if (!selectedCategory || !selectedPsp || amt <= 0) {
      return { amount: 0, commission: 0, net: 0 }
    }
    return computeTransfer(amt, selectedCategory, selectedPsp)
  }, [rawAmount, selectedCategory, selectedPsp])

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {}
    if (!fullName.trim()) newErrors.fullName = t('transfers.validation.fullNameRequired')
    if (!paymentMethodId) newErrors.paymentMethod = t('transfers.validation.paymentMethodRequired')
    if (!transferDate) newErrors.date = t('transfers.validation.dateRequired')
    if (!categoryId) newErrors.category = t('transfers.validation.categoryRequired')
    const amt = parseFloat(rawAmount)
    if (!rawAmount || isNaN(amt)) newErrors.amount = t('transfers.validation.amountRequired')
    else if (amt <= 0) newErrors.amount = t('transfers.validation.amountPositive')
    if (!pspId) newErrors.psp = t('transfers.validation.pspRequired')
    if (!typeId) newErrors.type = t('transfers.validation.typeRequired')
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async () => {
    if (!validate() || !selectedCategory || !selectedPsp) return

    setSaving(true)

    const formData: TransferFormData = {
      full_name: fullName.trim(),
      payment_method_id: paymentMethodId,
      transfer_date: new Date(transferDate).toISOString(),
      category_id: categoryId,
      raw_amount: parseFloat(rawAmount),
      currency,
      psp_id: pspId,
      type_id: typeId,
      crm_id: crmId.trim() || undefined,
      meta_id: metaId.trim() || undefined,
    }

    const result = isEdit
      ? await onSubmit.updateTransfer(transfer!.id, formData, selectedCategory, selectedPsp)
      : await onSubmit.createTransfer(formData, selectedCategory, selectedPsp)

    setSaving(false)

    if (result.error) {
      toast({ title: t('transfers.toast.error'), variant: 'error' })
    } else {
      toast({
        title: isEdit ? t('transfers.toast.updated') : t('transfers.toast.created'),
        variant: 'success',
      })
      onClose()
    }
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {isEdit ? t('transfers.editTransfer') : t('transfers.addTransfer')}
          </DialogTitle>
          <DialogDescription>
            {t('transfers.subtitle')}
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {/* Full Name */}
          <div className="sm:col-span-2">
            <Label className="mb-1 text-sm font-medium">{t('transfers.form.fullName')}</Label>
            <Input
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder={t('transfers.form.fullNamePlaceholder')}
            />
            {errors.fullName && <p className="mt-1 text-xs text-red-500">{errors.fullName}</p>}
          </div>

          {/* Payment Method */}
          <div>
            <Label className="mb-1 text-sm font-medium">{t('transfers.form.paymentMethod')}</Label>
            <Select value={paymentMethodId} onValueChange={setPaymentMethodId}>
              <SelectTrigger>
                <SelectValue placeholder={t('transfers.form.selectPaymentMethod')} />
              </SelectTrigger>
              <SelectContent>
                {lookupData.paymentMethods.map((pm) => (
                  <SelectItem key={pm.id} value={pm.id}>
                    {pm.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.paymentMethod && <p className="mt-1 text-xs text-red-500">{errors.paymentMethod}</p>}
          </div>

          {/* Date & Time */}
          <div>
            <Label className="mb-1 text-sm font-medium">{t('transfers.form.date')}</Label>
            <input
              type="datetime-local"
              value={transferDate}
              onChange={(e) => setTransferDate(e.target.value)}
              className={cn(
                basicInputClasses,
                disabledInputClasses,
                focusInputClasses,
                'w-full',
              )}
            />
            {errors.date && <p className="mt-1 text-xs text-red-500">{errors.date}</p>}
          </div>

          {/* Category */}
          <div>
            <Label className="mb-1 text-sm font-medium">{t('transfers.form.category')}</Label>
            <Select value={categoryId} onValueChange={setCategoryId}>
              <SelectTrigger>
                <SelectValue placeholder={t('transfers.form.selectCategory')} />
              </SelectTrigger>
              <SelectContent>
                {lookupData.categories.map((cat) => (
                  <SelectItem key={cat.id} value={cat.id}>
                    {cat.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.category && <p className="mt-1 text-xs text-red-500">{errors.category}</p>}
          </div>

          {/* Amount */}
          <div>
            <Label className="mb-1 text-sm font-medium">{t('transfers.form.amount')}</Label>
            <Input
              type="number"
              min="0"
              step="0.01"
              value={rawAmount}
              onChange={(e) => setRawAmount(e.target.value)}
              placeholder="0.00"
            />
            <p className="mt-1 text-xs text-black/40">{t('transfers.form.amountHint')}</p>
            {errors.amount && <p className="mt-1 text-xs text-red-500">{errors.amount}</p>}
          </div>

          {/* Currency */}
          <div>
            <Label className="mb-1 text-sm font-medium">{t('transfers.form.currency')}</Label>
            <Select value={currency} onValueChange={(v) => setCurrency(v as 'TL' | 'USD')}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="TL">TL</SelectItem>
                <SelectItem value="USD">USD</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* PSP */}
          <div>
            <Label className="mb-1 text-sm font-medium">{t('transfers.form.psp')}</Label>
            <Select value={pspId} onValueChange={setPspId}>
              <SelectTrigger>
                <SelectValue placeholder={t('transfers.form.selectPsp')} />
              </SelectTrigger>
              <SelectContent>
                {lookupData.psps.map((psp) => (
                  <SelectItem key={psp.id} value={psp.id}>
                    {psp.name} ({(psp.commission_rate * 100).toFixed(1)}%)
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.psp && <p className="mt-1 text-xs text-red-500">{errors.psp}</p>}
          </div>

          {/* Type */}
          <div>
            <Label className="mb-1 text-sm font-medium">{t('transfers.form.type')}</Label>
            <Select value={typeId} onValueChange={setTypeId}>
              <SelectTrigger>
                <SelectValue placeholder={t('transfers.form.selectType')} />
              </SelectTrigger>
              <SelectContent>
                {lookupData.transferTypes.map((tt) => (
                  <SelectItem key={tt.id} value={tt.id}>
                    {tt.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.type && <p className="mt-1 text-xs text-red-500">{errors.type}</p>}
          </div>

          {/* Commission (read-only) */}
          <div>
            <Label className="mb-1 text-sm font-medium">{t('transfers.form.commission')}</Label>
            <div className="rounded-2xl bg-black/5 px-5 py-4 text-lg text-black/60">
              {computed.commission.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
            <p className="mt-1 text-xs text-black/40">{t('transfers.form.commissionAuto')}</p>
          </div>

          {/* Net (read-only) */}
          <div>
            <Label className="mb-1 text-sm font-medium">{t('transfers.form.net')}</Label>
            <div className={cn(
              'rounded-2xl bg-black/5 px-5 py-4 text-lg',
              computed.net >= 0 ? 'text-green-600' : 'text-red-600',
            )}>
              {computed.net.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
            <p className="mt-1 text-xs text-black/40">{t('transfers.form.netAuto')}</p>
          </div>

          {/* CRM ID */}
          <div>
            <Label className="mb-1 text-sm font-medium">{t('transfers.form.crmId')}</Label>
            <Input
              value={crmId}
              onChange={(e) => setCrmId(e.target.value)}
              placeholder={t('transfers.form.crmIdPlaceholder')}
            />
          </div>

          {/* META ID */}
          <div>
            <Label className="mb-1 text-sm font-medium">{t('transfers.form.metaId')}</Label>
            <Input
              value={metaId}
              onChange={(e) => setMetaId(e.target.value)}
              placeholder={t('transfers.form.metaIdPlaceholder')}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            {t('transfers.form.cancel')}
          </Button>
          <Button variant="filled" onClick={handleSubmit} disabled={saving}>
            {saving ? t('transfers.form.saving') : t('transfers.form.save')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
