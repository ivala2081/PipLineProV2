import { useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { walletFormSchema, type WalletFormValues } from '@/schemas/accountingSchema'
import type { Wallet } from '@/lib/database.types'
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
  /** When provided, the dialog operates in edit mode */
  wallet?: Wallet
}

export function WalletDialog({ open, onClose, onSubmit, isSubmitting, wallet }: WalletDialogProps) {
  const { t } = useTranslation('pages')
  const isEditing = !!wallet

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
      if (wallet) {
        reset({ label: wallet.label, address: wallet.address, chain: wallet.chain })
      } else {
        reset({ label: '', address: '', chain: 'tron' })
      }
    }
  }, [open, wallet, reset])

  // eslint-disable-next-line react-hooks/incompatible-library -- react-hook-form watch
  const chainValue = watch('chain')

  const onFormSubmit = handleSubmit(async (data) => {
    await onSubmit(data)
  })

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent size="md">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? t('accounting.editWallet') : t('accounting.addWallet')}
          </DialogTitle>
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
              readOnly={isEditing}
              disabled={isEditing}
            />
            {isEditing && (
              <p className="text-xs text-black/40">
                {t(
                  'accounting.wallets.form.addressReadOnly',
                  'Address cannot be changed after creation.',
                )}
              </p>
            )}
            {errors.address && <p className="text-xs text-red">{errors.address.message}</p>}
          </div>

          <div className="space-y-sm">
            <Label>{t('accounting.wallets.form.chain')}</Label>
            <Select
              value={chainValue}
              onValueChange={(v) => setValue('chain', v as WalletFormValues['chain'])}
              disabled={isEditing}
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
            {isEditing && (
              <p className="text-xs text-black/40">
                {t(
                  'accounting.wallets.form.chainReadOnly',
                  'Chain cannot be changed after creation.',
                )}
              </p>
            )}
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
