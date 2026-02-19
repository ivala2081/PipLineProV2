import { useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { walletFormSchema, type WalletFormValues } from '@/schemas/accountingSchema'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  Button,
  Input,
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
  Label,
} from '@ds'

interface WalletDialogProps {
  open: boolean
  onClose: () => void
  onSubmit: (data: WalletFormValues) => Promise<void>
  isSubmitting: boolean
}

export function WalletDialog({ open, onClose, onSubmit, isSubmitting }: WalletDialogProps) {
  const { t } = useTranslation('pages')

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors },
  } = useForm<WalletFormValues>({
    resolver: zodResolver(walletFormSchema),
    defaultValues: {
      label: '',
      address: '',
      chain: 'tron',
    },
  })

  useEffect(() => {
    if (open) {
      reset({ label: '', address: '', chain: 'tron' })
    }
  }, [open, reset])

  const onFormSubmit = handleSubmit(async (data) => {
    await onSubmit(data)
  })

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent size="md">
        <DialogHeader>
          <DialogTitle>{t('accounting.addWallet')}</DialogTitle>
        </DialogHeader>

        <form onSubmit={onFormSubmit} className="space-y-md">
          <div className="space-y-sm">
            <Label>{t('accounting.wallets.form.label')}</Label>
            <Input
              {...register('label')}
              placeholder={t('accounting.wallets.form.labelPlaceholder')}
            />
            {errors.label && <p className="text-xs text-red">{errors.label.message}</p>}
          </div>

          <div className="space-y-sm">
            <Label>{t('accounting.wallets.form.address')}</Label>
            <Input
              {...register('address')}
              placeholder={t('accounting.wallets.form.addressPlaceholder')}
              className="font-mono text-sm"
            />
            {errors.address && <p className="text-xs text-red">{errors.address.message}</p>}
          </div>

          <div className="space-y-sm">
            <Label>{t('accounting.wallets.form.chain')}</Label>
            <Select
              value={watch('chain')}
              onValueChange={(v) => setValue('chain', v as WalletFormValues['chain'])}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="tron">Tron (TRC-20)</SelectItem>
                <SelectItem value="ethereum">Ethereum (ERC-20)</SelectItem>
                <SelectItem value="bsc">BSC (BEP-20)</SelectItem>
                <SelectItem value="bitcoin">Bitcoin</SelectItem>
                <SelectItem value="solana">Solana</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              {t('accounting.form.cancel')}
            </Button>
            <Button type="submit" variant="filled" disabled={isSubmitting}>
              {isSubmitting ? t('accounting.form.saving') : t('accounting.form.save')}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
