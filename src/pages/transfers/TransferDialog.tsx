import { useEffect, useMemo } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useTranslation } from 'react-i18next'
import type { TransferRow } from '@/hooks/useTransfers'
import type { useLookupQueries } from '@/hooks/queries/useLookupQueries'
import type { useTransfersQuery } from '@/hooks/queries/useTransfersQuery'
import { useToast } from '@/hooks/useToast'
import { transferFormSchema, type TransferFormValues } from '@/schemas/transferSchema'
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
  lookupData: ReturnType<typeof useLookupQueries>
  onSubmit: ReturnType<typeof useTransfersQuery>
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

  const form = useForm<TransferFormValues>({
    resolver: zodResolver(transferFormSchema),
    defaultValues: {
      full_name: '',
      payment_method_id: '',
      transfer_date: new Date().toISOString().slice(0, 16),
      category_id: '',
      raw_amount: 0,
      currency: 'TL',
      psp_id: '',
      type_id: '',
      crm_id: '',
      meta_id: '',
    },
  })

  // Reset form when dialog opens/closes or transfer changes
  useEffect(() => {
    if (open) {
      if (transfer) {
        form.reset({
          full_name: transfer.full_name,
          payment_method_id: transfer.payment_method_id,
          transfer_date: transfer.transfer_date
            ? new Date(transfer.transfer_date).toISOString().slice(0, 16)
            : '',
          category_id: transfer.category_id,
          raw_amount: Math.abs(transfer.amount),
          currency: transfer.currency,
          psp_id: transfer.psp_id,
          type_id: transfer.type_id,
          crm_id: transfer.crm_id ?? '',
          meta_id: transfer.meta_id ?? '',
        })
      } else {
        form.reset({
          full_name: '',
          payment_method_id: '',
          transfer_date: new Date().toISOString().slice(0, 16),
          category_id: '',
          raw_amount: 0,
          currency: 'TL',
          psp_id: '',
          type_id: '',
          crm_id: '',
          meta_id: '',
        })
      }
    }
  }, [open, transfer, form])

  // Watch category/psp for submission computation
  const [categoryId, pspId] = form.watch(['category_id', 'psp_id'])

  const selectedCategory = useMemo(
    () => lookupData.categories.find((c) => c.id === categoryId),
    [lookupData.categories, categoryId],
  )
  const selectedPsp = useMemo(
    () => lookupData.psps.find((p) => p.id === pspId),
    [lookupData.psps, pspId],
  )

  const handleSubmit = form.handleSubmit(async (data) => {
    if (!selectedCategory || !selectedPsp) {
      toast({ title: t('transfers.toast.error'), variant: 'error' })
      return
    }

    try {
      const formData = {
        ...data,
        transfer_date: new Date(data.transfer_date).toISOString(),
      }

      if (isEdit && transfer) {
        await onSubmit.updateTransfer(
          transfer.id,
          formData,
          selectedCategory,
          selectedPsp,
        )
        toast({
          title: t('transfers.toast.updated'),
          variant: 'success',
        })
      } else {
        await onSubmit.createTransfer(formData, selectedCategory, selectedPsp)
        toast({
          title: t('transfers.toast.created'),
          variant: 'success',
        })
      }
      onClose()
    } catch (error) {
      toast({ title: t('transfers.toast.error'), variant: 'error' })
    }
  })

  const isSubmitting = onSubmit.isCreating || onSubmit.isUpdating

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {isEdit ? t('transfers.editTransfer') : t('transfers.addTransfer')}
          </DialogTitle>
          <DialogDescription>{t('transfers.subtitle')}</DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {/* Full Name */}
          <div className="sm:col-span-2">
            <Label className="mb-1 text-sm font-medium">
              {t('transfers.form.fullName')}
            </Label>
            <Input
              {...form.register('full_name')}
              placeholder={t('transfers.form.fullNamePlaceholder')}
            />
            {form.formState.errors.full_name && (
              <p className="mt-1 text-xs text-red-500">
                {form.formState.errors.full_name.message}
              </p>
            )}
          </div>

          {/* Payment Method */}
          <div>
            <Label className="mb-1 text-sm font-medium">
              {t('transfers.form.paymentMethod')}
            </Label>
            <Select
              value={form.watch('payment_method_id')}
              onValueChange={(value) => form.setValue('payment_method_id', value)}
            >
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
            {form.formState.errors.payment_method_id && (
              <p className="mt-1 text-xs text-red-500">
                {form.formState.errors.payment_method_id.message}
              </p>
            )}
          </div>

          {/* Date & Time */}
          <div>
            <Label className="mb-1 text-sm font-medium">
              {t('transfers.form.date')}
            </Label>
            <input
              type="datetime-local"
              {...form.register('transfer_date')}
              className={cn(
                basicInputClasses,
                disabledInputClasses,
                focusInputClasses,
                'w-full',
              )}
            />
            {form.formState.errors.transfer_date && (
              <p className="mt-1 text-xs text-red-500">
                {form.formState.errors.transfer_date.message}
              </p>
            )}
          </div>

          {/* Category */}
          <div>
            <Label className="mb-1 text-sm font-medium">
              {t('transfers.form.category')}
            </Label>
            <Select
              value={form.watch('category_id')}
              onValueChange={(value) => form.setValue('category_id', value)}
            >
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
            {form.formState.errors.category_id && (
              <p className="mt-1 text-xs text-red-500">
                {form.formState.errors.category_id.message}
              </p>
            )}
          </div>

          {/* Amount */}
          <div>
            <Label className="mb-1 text-sm font-medium">
              {t('transfers.form.amount')}
            </Label>
            <Input
              type="number"
              min="0"
              step="0.01"
              {...form.register('raw_amount')}
              placeholder="0.00"
            />
            <p className="mt-1 text-xs text-black/40">
              {t('transfers.form.amountHint')}
            </p>
            {form.formState.errors.raw_amount && (
              <p className="mt-1 text-xs text-red-500">
                {form.formState.errors.raw_amount.message}
              </p>
            )}
          </div>

          {/* Currency */}
          <div>
            <Label className="mb-1 text-sm font-medium">
              {t('transfers.form.currency')}
            </Label>
            <Select
              value={form.watch('currency')}
              onValueChange={(value) =>
                form.setValue('currency', value as 'TL' | 'USD')
              }
            >
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
            <Label className="mb-1 text-sm font-medium">
              {t('transfers.form.psp')}
            </Label>
            <Select
              value={form.watch('psp_id')}
              onValueChange={(value) => form.setValue('psp_id', value)}
            >
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
            {form.formState.errors.psp_id && (
              <p className="mt-1 text-xs text-red-500">
                {form.formState.errors.psp_id.message}
              </p>
            )}
          </div>

          {/* Type */}
          <div>
            <Label className="mb-1 text-sm font-medium">
              {t('transfers.form.type')}
            </Label>
            <Select
              value={form.watch('type_id')}
              onValueChange={(value) => form.setValue('type_id', value)}
            >
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
            {form.formState.errors.type_id && (
              <p className="mt-1 text-xs text-red-500">
                {form.formState.errors.type_id.message}
              </p>
            )}
          </div>

          {/* CRM ID */}
          <div>
            <Label className="mb-1 text-sm font-medium">
              {t('transfers.form.crmId')}
            </Label>
            <Input
              {...form.register('crm_id')}
              placeholder={t('transfers.form.crmIdPlaceholder')}
            />
          </div>

          {/* META ID */}
          <div>
            <Label className="mb-1 text-sm font-medium">
              {t('transfers.form.metaId')}
            </Label>
            <Input
              {...form.register('meta_id')}
              placeholder={t('transfers.form.metaIdPlaceholder')}
            />
          </div>

          <div className="sm:col-span-2">
            <DialogFooter>
              <Button type="button" variant="outline" onClick={onClose}>
                {t('transfers.form.cancel')}
              </Button>
              <Button type="submit" variant="filled" disabled={isSubmitting}>
                {isSubmitting
                  ? t('transfers.form.saving')
                  : t('transfers.form.save')}
              </Button>
            </DialogFooter>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
