import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { localYMD } from '@/lib/date'
import { useAccountingRegisters } from '@/hooks/queries/useAccountingRegisters'
import { useCreateConversion } from '@/hooks/queries/useAccountingQuery'
import { formatAmount, parseAmount, numberToDisplay, amountPlaceholder } from '@/lib/formatAmount'
import { ArrowRight } from '@phosphor-icons/react'
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

interface ConversionDialogProps {
  open: boolean
  onClose: () => void
}

export function ConversionDialog({ open, onClose }: ConversionDialogProps) {
  const { t, i18n } = useTranslation('pages')
  const lang = (i18n.language === 'tr' ? 'tr' : 'en') as 'tr' | 'en'

  const { data: registers = [] } = useAccountingRegisters()
  const conversionMutation = useCreateConversion()

  const [sourceRegisterId, setSourceRegisterId] = useState('')
  const [targetRegisterId, setTargetRegisterId] = useState('')
  const [sourceAmountDisplay, setSourceAmountDisplay] = useState('')
  const [exchangeRate, setExchangeRate] = useState('1')
  const [entryDate, setEntryDate] = useState(() => localYMD(new Date()))
  const [costPeriod, setCostPeriod] = useState('')
  const [notes, setNotes] = useState('')

  const sourceAmount = parseAmount(sourceAmountDisplay, lang)
  const rate = parseFloat(exchangeRate) || 0
  const targetAmount = sourceAmount * rate

  const sourceRegister = registers.find((r) => r.id === sourceRegisterId)
  const targetRegister = registers.find((r) => r.id === targetRegisterId)

  const canSubmit =
    sourceRegisterId &&
    targetRegisterId &&
    sourceRegisterId !== targetRegisterId &&
    sourceAmount > 0 &&
    rate > 0

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!canSubmit || !sourceRegister || !targetRegister) return

    await conversionMutation.mutateAsync({
      sourceRegisterId: sourceRegister.id,
      sourceRegisterName: sourceRegister.name,
      targetRegisterId: targetRegister.id,
      targetRegisterName: targetRegister.name,
      sourceAmount,
      targetAmount,
      sourceCurrency: sourceRegister.currency,
      targetCurrency: targetRegister.currency,
      exchangeRate: rate,
      exchangeRateOverride: true,
      entryDate,
      costPeriod,
      notes,
    })

    // Reset form and close
    resetForm()
    onClose()
  }

  const resetForm = () => {
    setSourceRegisterId('')
    setTargetRegisterId('')
    setSourceAmountDisplay('')
    setExchangeRate('1')
    setEntryDate(localYMD(new Date()))
    setCostPeriod('')
    setNotes('')
  }

  const handleOpenChange = (v: boolean) => {
    if (!v) {
      resetForm()
      onClose()
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent size="lg">
        <DialogHeader>
          <DialogTitle>{t('accounting.conversion.title', 'Currency Conversion')}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-md">
          {/* Source Register → Target Register */}
          <div className="flex items-end gap-md">
            <div className="flex-1 space-y-sm">
              <Label>{t('accounting.conversion.sourceRegister', 'Source Register')}</Label>
              <Select value={sourceRegisterId} onValueChange={setSourceRegisterId}>
                <SelectTrigger>
                  <SelectValue
                    placeholder={t('accounting.conversion.selectRegister', 'Select register')}
                  />
                </SelectTrigger>
                <SelectContent>
                  {registers.map((r) => (
                    <SelectItem key={r.id} value={r.id}>
                      {r.label} ({r.currency})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex h-9 items-center text-muted-foreground">
              <ArrowRight size={20} weight="bold" />
            </div>

            <div className="flex-1 space-y-sm">
              <Label>{t('accounting.conversion.targetRegister', 'Target Register')}</Label>
              <Select value={targetRegisterId} onValueChange={setTargetRegisterId}>
                <SelectTrigger>
                  <SelectValue
                    placeholder={t('accounting.conversion.selectRegister', 'Select register')}
                  />
                </SelectTrigger>
                <SelectContent>
                  {registers.map((r) => (
                    <SelectItem key={r.id} value={r.id}>
                      {r.label} ({r.currency})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Source Amount & Exchange Rate */}
          <div className="grid grid-cols-2 gap-md">
            <div className="space-y-sm">
              <Label>{t('accounting.conversion.sourceAmount', 'Source Amount')}</Label>
              <Input
                type="text"
                inputMode="decimal"
                value={sourceAmountDisplay}
                onChange={(e) => {
                  const formatted = formatAmount(e.target.value, lang)
                  setSourceAmountDisplay(formatted)
                }}
                placeholder={amountPlaceholder(lang)}
              />
            </div>
            <div className="space-y-sm">
              <Label>{t('accounting.conversion.exchangeRate', 'Exchange Rate')}</Label>
              <Input
                type="number"
                step="any"
                min="0"
                value={exchangeRate}
                onChange={(e) => setExchangeRate(e.target.value)}
                placeholder="1.00"
              />
            </div>
          </div>

          {/* Computed Target Amount (read-only) */}
          <div className="space-y-sm">
            <Label>{t('accounting.conversion.targetAmount', 'Target Amount')}</Label>
            <div className="flex h-9 items-center rounded-md border border-input bg-muted/50 px-3 text-sm">
              {targetAmount > 0
                ? `${numberToDisplay(targetAmount, lang)} ${targetRegister?.currency ?? ''}`
                : '\u2014'}
            </div>
          </div>

          {/* Date & Cost Period */}
          <div className="grid grid-cols-2 gap-md">
            <div className="space-y-sm">
              <Label>{t('accounting.conversion.date', 'Date')}</Label>
              <Input type="date" value={entryDate} onChange={(e) => setEntryDate(e.target.value)} />
            </div>
            <div className="space-y-sm">
              <Label>{t('accounting.conversion.costPeriod', 'Cost Period')}</Label>
              <Input
                type="text"
                value={costPeriod}
                onChange={(e) => setCostPeriod(e.target.value)}
                placeholder="YYYY-MM"
              />
            </div>
          </div>

          {/* Notes */}
          <div className="space-y-sm">
            <Label>{t('accounting.conversion.notes', 'Notes')}</Label>
            <Input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder={t('accounting.conversion.notesPlaceholder', 'Optional notes...')}
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              {t('accounting.form.cancel', 'Cancel')}
            </Button>
            <Button
              type="submit"
              variant="filled"
              disabled={!canSubmit || conversionMutation.isPending}
            >
              {conversionMutation.isPending
                ? t('accounting.form.saving', 'Saving...')
                : t('accounting.conversion.submit', 'Convert')}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
