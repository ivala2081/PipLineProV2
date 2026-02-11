import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Plus, Trash, SpinnerGap } from '@phosphor-icons/react'
import { usePspRates, usePspRateMutations } from '@/hooks/queries/usePspRatesQuery'
import { useToast } from '@/hooks/useToast'
import type { Psp } from '@/lib/database.types'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  Button,
  Input,
  Label,
  Tag,
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from '@ds'

interface PspRateHistoryDialogProps {
  psp: Psp | null
  open: boolean
  onClose: () => void
}

const today = () => new Date().toISOString().slice(0, 10)

export function PspRateHistoryDialog({
  psp,
  open,
  onClose,
}: PspRateHistoryDialogProps) {
  const { t } = useTranslation('pages')
  const { toast } = useToast()

  const { rates, isLoading } = usePspRates(open ? psp?.id ?? null : null)
  const { createRate, deleteRate, isCreating, isDeleting } =
    usePspRateMutations()

  const [effectiveFrom, setEffectiveFrom] = useState('')
  const [ratePercent, setRatePercent] = useState('')

  const handleOpenChange = (v: boolean) => {
    if (!v) {
      setEffectiveFrom('')
      setRatePercent('')
      onClose()
    }
  }

  const handleAdd = async () => {
    if (!psp || !effectiveFrom || !ratePercent) return

    const rate = parseFloat(ratePercent) / 100
    if (isNaN(rate) || rate < 0 || rate >= 1) return

    try {
      await createRate({
        pspId: psp.id,
        commissionRate: rate,
        effectiveFrom: effectiveFrom,
      })
      toast({ title: t('transfers.toast.rateCreated'), variant: 'success' })
      setEffectiveFrom('')
      setRatePercent('')
    } catch (error) {
      toast({
        title: (error as Error).message || t('transfers.toast.error'),
        variant: 'error',
      })
    }
  }

  const handleDelete = async (rateId: string) => {
    if (!psp) return

    // Guard: don't delete the only non-future rate
    const todayStr = today()
    const nonFutureRates = rates.filter((r) => r.effective_from <= todayStr)
    const targetFrom =
      rates.find((r) => r.id === rateId)?.effective_from ?? ''
    const isNonFuture = targetFrom <= todayStr
    if (isNonFuture && nonFutureRates.length <= 1) {
      toast({
        title: t('transfers.settings.lastRateWarning'),
        variant: 'error',
      })
      return
    }

    try {
      await deleteRate({ id: rateId, pspId: psp.id })
      toast({ title: t('transfers.toast.rateDeleted'), variant: 'success' })
    } catch (error) {
      toast({
        title: (error as Error).message || t('transfers.toast.error'),
        variant: 'error',
      })
    }
  }

  const todayStr = today()

  // Determine which rate is "current" (latest with effective_from <= today)
  const currentRateId = rates.find(
    (r) => r.effective_from <= todayStr,
  )?.id

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>
            {psp
              ? t('transfers.settings.rateHistoryTitle', { name: psp.name })
              : t('transfers.settings.rateHistory')}
          </DialogTitle>
          <DialogDescription>
            {t('transfers.settings.rateHistoryDescription')}
          </DialogDescription>
        </DialogHeader>

        {/* Add rate form */}
        <div className="flex items-end gap-2 border-b border-black/5 pb-4">
          <div className="flex-1">
            <Label className="mb-1 text-xs font-medium">
              {t('transfers.settings.effectiveFrom')}
            </Label>
            <Input
              type="date"
              value={effectiveFrom}
              onChange={(e) => setEffectiveFrom(e.target.value)}
            />
          </div>
          <div className="w-28">
            <Label className="mb-1 text-xs font-medium">
              {t('transfers.settings.commissionRate')}
            </Label>
            <Input
              type="number"
              min="0"
              max="99.99"
              step="0.1"
              placeholder="%"
              value={ratePercent}
              onChange={(e) => setRatePercent(e.target.value)}
            />
          </div>
          <Button
            size="sm"
            onClick={handleAdd}
            disabled={
              isCreating || !effectiveFrom || !ratePercent
            }
          >
            {isCreating ? (
              <SpinnerGap size={14} className="animate-spin" />
            ) : (
              <Plus size={14} weight="bold" />
            )}
            {t('transfers.settings.addRate')}
          </Button>
        </div>

        {/* Rate history list */}
        <div className="max-h-[300px] overflow-y-auto">
          {isLoading ? (
            <p className="py-6 text-center text-sm text-black/40">...</p>
          ) : rates.length === 0 ? (
            <p className="py-6 text-center text-sm text-black/40">
              {t('transfers.settings.noRateHistory')}
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t('transfers.settings.effectiveFrom')}</TableHead>
                  <TableHead>{t('transfers.settings.commissionRate')}</TableHead>
                  <TableHead className="w-24" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {rates.map((rate) => {
                  const isCurrent = rate.id === currentRateId
                  const isFuture = rate.effective_from > todayStr

                  return (
                    <TableRow key={rate.id}>
                      <TableCell>
                        <span className="font-mono text-sm tabular-nums">
                          {rate.effective_from}
                        </span>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-sm tabular-nums">
                            {(rate.commission_rate * 100).toFixed(1)}%
                          </span>
                          {isCurrent && (
                            <Tag variant="green">
                              {t('transfers.settings.currentRate')}
                            </Tag>
                          )}
                          {isFuture && (
                            <Tag variant="blue">
                              {t('transfers.settings.futureRate')}
                            </Tag>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="borderless"
                          size="sm"
                          className="text-red"
                          onClick={() => handleDelete(rate.id)}
                          disabled={isDeleting}
                        >
                          <Trash size={14} />
                        </Button>
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
