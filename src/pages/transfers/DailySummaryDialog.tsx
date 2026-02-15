import { useRef, useEffect, useState, useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import {
  PencilSimple,
  Check,
  X,
  Bank,
  CreditCard,
  CurrencyDollar,
  Coins,
} from '@phosphor-icons/react'
import type { TransferRow } from '@/hooks/useTransfers'
import {
  formatNumber,
  computeDaySummary,
  countUsdTransfers,
  type DateGroup,
} from './transfersTableUtils'
import { PinDialog } from './PinDialog'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@ds'

interface DailySummaryDialogProps {
  group: DateGroup | null
  transfers: TransferRow[]
  isFetching: boolean
  isApplyingRate: boolean
  customRates: Record<string, number>
  onClose: () => void
  onSaveRate: (dateKey: string, rate: number) => void
  onResetRate: (dateKey: string) => void
  securityPin: string
}

export function DailySummaryDialog({
  group,
  transfers,
  isFetching,
  isApplyingRate,
  customRates,
  onClose,
  onSaveRate,
  onResetRate,
  securityPin,
}: DailySummaryDialogProps) {
  const { t, i18n } = useTranslation('pages')
  const lang = i18n.language
  const [isEditingRate, setIsEditingRate] = useState(false)
  const [showPinDialog, setShowPinDialog] = useState(false)
  const rateInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (isEditingRate && rateInputRef.current) {
      rateInputRef.current.focus()
      rateInputRef.current.select()
    }
  }, [isEditingRate])

  const handleSaveRate = useCallback(() => {
    if (!group) return
    const val = parseFloat(rateInputRef.current?.value ?? '')
    if (!isNaN(val) && val > 0) {
      onSaveRate(group.dateKey, val)
    }
    setIsEditingRate(false)
  }, [group, onSaveRate])

  const handleClose = useCallback(() => {
    setIsEditingRate(false)
    onClose()
  }, [onClose])

  if (!group) return null

  const s = computeDaySummary(transfers)
  const usdCount = countUsdTransfers(transfers)
  const customRate = customRates[group.dateKey]
  const effectiveRate = customRate ?? s.dayRate
  const overrideActive = customRate !== undefined
  const adjNetWithoutCommUsd = effectiveRate > 0 ? s.net / effectiveRate : 0
  const adjNetWithCommUsd = effectiveRate > 0 ? (s.net - s.commission) / effectiveRate : 0

  return (
    <>
      <Dialog
        open={group !== null}
        onOpenChange={(open) => {
          if (!open) handleClose()
        }}
      >
        <DialogContent size="md" className="max-h-[85vh] gap-0 overflow-y-auto p-0">
          {isFetching ? (
            <div className="px-6 py-12">
              <DialogHeader>
                <DialogTitle className="text-sm font-semibold">{group.label}</DialogTitle>
              </DialogHeader>
              <div className="mt-6 flex items-center justify-center">
                <div className="text-sm text-black/40">{t('transfers.pin.loading')}</div>
              </div>
            </div>
          ) : (
            <>
              {/* Hero zone */}
              <div className={`px-6 pt-6 pb-5 ${s.net >= 0 ? 'bg-green/[0.03]' : 'bg-red/[0.03]'}`}>
                <DialogHeader>
                  <DialogTitle className="text-sm font-semibold">{group.label}</DialogTitle>
                </DialogHeader>
                <p className="mt-0.5 text-[12px] text-black/40">
                  {t('transfers.summary.count', { count: s.count })}
                  {' · '}
                  {t('transfers.summary.countDetail', {
                    deposits: s.depositCount,
                    withdrawals: s.withdrawalCount,
                  })}
                </p>

                <p
                  className={`mt-4 font-mono text-[2rem] font-bold leading-none tabular-nums ${s.net >= 0 ? 'text-green' : 'text-red'}`}
                >
                  {s.net >= 0 ? '+' : '−'}
                  {formatNumber(Math.abs(s.net), lang)}
                  <span className="ml-1.5 text-sm opacity-40">₺</span>
                </p>
                <p className="mt-1 text-[12px] text-black/30">{t('transfers.summary.net')}</p>
              </div>

              {/* Deposit / Withdrawal */}
              <div className="grid grid-cols-2">
                <div className="border-r border-b border-black/10 px-6 py-4">
                  <div className="flex items-center gap-1.5">
                    <div className="size-1.5 rounded-full bg-green" />
                    <span className="text-[12px] text-black/45">
                      {t('transfers.summary.deposits')}
                    </span>
                  </div>
                  <p className="mt-1.5 font-mono text-lg font-bold tabular-nums text-black/80">
                    {formatNumber(s.deposits, lang)}
                    <span className="ml-1 text-[12px] font-medium text-black/25">₺</span>
                  </p>
                  <p className="mt-0.5 text-xs tabular-nums text-black/25">
                    {s.depositCount} {t('transfers.summary.deposits').toLowerCase()}
                  </p>
                </div>
                <div className="border-b border-black/10 px-6 py-4">
                  <div className="flex items-center gap-1.5">
                    <div className="size-1.5 rounded-full bg-red" />
                    <span className="text-[12px] text-black/45">
                      {t('transfers.summary.withdrawals')}
                    </span>
                  </div>
                  <p className="mt-1.5 font-mono text-lg font-bold tabular-nums text-black/80">
                    {formatNumber(s.withdrawals, lang)}
                    <span className="ml-1 text-[12px] font-medium text-black/25">₺</span>
                  </p>
                  <p className="mt-0.5 text-xs tabular-nums text-black/25">
                    {s.withdrawalCount} {t('transfers.summary.withdrawals').toLowerCase()}
                  </p>
                </div>
              </div>

              {/* Proportion bar */}
              {(() => {
                const vol = s.deposits + s.withdrawals
                const depositPct = vol > 0 ? (s.deposits / vol) * 100 : 50
                return (
                  <div className="flex h-1">
                    <div className="bg-green/60" style={{ width: `${depositPct}%` }} />
                    <div className="bg-red/60" style={{ width: `${100 - depositPct}%` }} />
                  </div>
                )
              })()}

              {/* Breakdown rows */}
              <div className="px-6 py-4">
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <Bank size={16} className="text-black/30" />
                      <span className="text-sm text-black/60">
                        {t('transfers.summary.totalBank')}
                      </span>
                    </div>
                    <span className="font-mono text-sm font-semibold tabular-nums text-black/70">
                      {formatNumber(s.totalBank, lang)} ₺
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <CreditCard size={16} className="text-black/30" />
                      <span className="text-sm text-black/60">
                        {t('transfers.summary.totalCreditCard')}
                      </span>
                    </div>
                    <span className="font-mono text-sm font-semibold tabular-nums text-black/70">
                      {formatNumber(s.totalCreditCard, lang)} ₺
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <CurrencyDollar size={16} className="text-black/30" />
                      <span className="text-sm text-black/60">
                        {t('transfers.summary.totalUsd')}
                      </span>
                    </div>
                    <span className="font-mono text-sm font-semibold tabular-nums text-black/70">
                      {formatNumber(s.totalUsd, lang)} $
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <Coins size={16} className="text-black/30" />
                      <span className="text-sm text-black/60">
                        {t('transfers.summary.commission')}
                      </span>
                    </div>
                    <span className="font-mono text-sm font-semibold tabular-nums text-black/70">
                      {formatNumber(s.commission, lang)} ₺
                    </span>
                  </div>
                </div>
              </div>

              {/* USD section */}
              <div className="border-t border-black/10 bg-black/[0.02] px-6 py-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-[12px] font-medium text-black/40">
                      {t('transfers.summary.dayRate')}
                    </span>
                    {usdCount > 0 && (
                      <span className="rounded-full bg-blue/10 px-2 py-0.5 text-[10px] font-medium text-blue">
                        {t('transfers.summary.usdTransferCount', { count: usdCount })}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-1.5">
                    {isApplyingRate ? (
                      <span className="text-xs text-black/40">
                        {t('transfers.summary.applyingRate')}
                      </span>
                    ) : isEditingRate ? (
                      <>
                        <input
                          ref={rateInputRef}
                          type="number"
                          step="0.0001"
                          defaultValue={effectiveRate.toFixed(4)}
                          className="h-7 w-24 rounded border border-black/10 bg-white px-2 text-right font-mono text-sm font-bold tabular-nums text-black/70 outline-none focus:border-black/25"
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') handleSaveRate()
                            else if (e.key === 'Escape') setIsEditingRate(false)
                          }}
                        />
                        <button
                          className="flex size-6 items-center justify-center rounded text-green hover:bg-green/10"
                          onClick={handleSaveRate}
                        >
                          <Check size={14} weight="bold" />
                        </button>
                        <button
                          className="flex size-6 items-center justify-center rounded text-red hover:bg-red/10"
                          onClick={() => setIsEditingRate(false)}
                        >
                          <X size={14} weight="bold" />
                        </button>
                      </>
                    ) : (
                      <>
                        <span
                          className={`font-mono text-sm font-bold tabular-nums ${overrideActive ? 'text-orange' : 'text-black/60'}`}
                        >
                          {effectiveRate.toFixed(4)}
                        </span>
                        <button
                          className="flex size-6 items-center justify-center rounded text-black/30 hover:bg-black/5 hover:text-black/60"
                          onClick={() => setShowPinDialog(true)}
                          title={t('transfers.summary.editRate')}
                        >
                          <PencilSimple size={13} />
                        </button>
                        {overrideActive && (
                          <button
                            className="flex size-6 items-center justify-center rounded text-black/25 hover:bg-black/5 hover:text-black/50"
                            onClick={() => onResetRate(group.dateKey)}
                            title={t('transfers.summary.resetRate')}
                          >
                            <X size={12} />
                          </button>
                        )}
                      </>
                    )}
                  </div>
                </div>

                <div className="mt-4 grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs text-black/35">{t('transfers.summary.netWithComm')}</p>
                    <p
                      className={`mt-1 font-mono text-lg font-bold tabular-nums ${adjNetWithCommUsd >= 0 ? 'text-green' : 'text-red'}`}
                    >
                      {adjNetWithCommUsd >= 0 ? '+' : '−'}
                      {formatNumber(Math.abs(adjNetWithCommUsd), lang)}
                      <span className="ml-0.5 text-xs opacity-40">$</span>
                    </p>
                    <p className="mt-0.5 text-xs text-black/20">
                      {t('transfers.summary.afterCommission')}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-black/35">{t('transfers.summary.netWithoutComm')}</p>
                    <p
                      className={`mt-1 font-mono text-lg font-bold tabular-nums ${adjNetWithoutCommUsd >= 0 ? 'text-green' : 'text-red'}`}
                    >
                      {adjNetWithoutCommUsd >= 0 ? '+' : '−'}
                      {formatNumber(Math.abs(adjNetWithoutCommUsd), lang)}
                      <span className="ml-0.5 text-xs opacity-40">$</span>
                    </p>
                    <p className="mt-0.5 text-xs text-black/20">
                      {t('transfers.summary.beforeCommission')}
                    </p>
                  </div>
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      <PinDialog
        open={showPinDialog}
        onClose={() => setShowPinDialog(false)}
        onVerified={() => {
          setShowPinDialog(false)
          setIsEditingRate(true)
        }}
        securityPin={securityPin}
      />
    </>
  )
}
