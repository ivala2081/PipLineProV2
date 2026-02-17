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
  ArrowUp,
  ArrowDown,
  TrendUp,
  TrendDown,
  CalendarBlank,
  ChartBar,
} from '@phosphor-icons/react'
import type { TransferRow } from '@/hooks/useTransfers'
import {
  formatNumber,
  computeDaySummary,
  countUsdTransfers,
  type DateGroup,
} from './transfersTableUtils'
import { PinDialog } from './PinDialog'
import { Dialog, DialogContent } from '@ds'

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
  const pinOpenRef = useRef(false)
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
  const vol = s.deposits + s.withdrawals
  const depositPct = vol > 0 ? (s.deposits / vol) * 100 : 50

  return (
    <>
      <Dialog
        open={group !== null}
        onOpenChange={(open) => {
          if (!open && !pinOpenRef.current) handleClose()
        }}
      >
        <DialogContent
          size="md"
          className="max-h-[85vh] gap-0 overflow-y-auto p-0"
          aria-describedby={undefined}
        >
          {isFetching ? (
            <div className="flex flex-col items-center justify-center px-6 py-16">
              <div className="size-8 animate-spin rounded-full border-2 border-black/10 border-t-black/40" />
              <p className="mt-3 text-sm text-black/40">{t('transfers.pin.loading')}</p>
            </div>
          ) : (
            <>
              {/* ── Hero ── */}
              <div className="relative overflow-hidden px-6 pt-6 pb-6">
                {/* Subtle gradient bg */}
                <div
                  className={`absolute inset-0 ${s.net >= 0 ? 'bg-gradient-to-br from-green/[0.04] to-transparent' : 'bg-gradient-to-br from-red/[0.04] to-transparent'}`}
                />

                <div className="relative">
                  {/* Date header */}
                  <div className="flex items-center gap-2">
                    <div className="flex size-7 items-center justify-center rounded-lg bg-black/5">
                      <CalendarBlank size={14} weight="duotone" className="text-black/40" />
                    </div>
                    <div>
                      <h2 className="text-sm font-semibold text-black/80">{group.label}</h2>
                      <p className="text-[11px] text-black/35">
                        {t('transfers.summary.count', { count: s.count })}
                        {' · '}
                        {s.depositCount} {t('transfers.summary.deposits').toLowerCase()}
                        {', '}
                        {s.withdrawalCount} {t('transfers.summary.withdrawals').toLowerCase()}
                      </p>
                    </div>
                  </div>

                  {/* Net amount */}
                  <div className="mt-5 flex items-end gap-3">
                    <div
                      className={`flex size-10 items-center justify-center rounded-xl ${s.net >= 0 ? 'bg-green/10' : 'bg-red/10'}`}
                    >
                      {s.net >= 0 ? (
                        <TrendUp size={20} weight="bold" className="text-green" />
                      ) : (
                        <TrendDown size={20} weight="bold" className="text-red" />
                      )}
                    </div>
                    <div>
                      <p className="text-[11px] font-medium uppercase tracking-wider text-black/30">
                        {t('transfers.summary.net')}
                      </p>
                      <p
                        className={`font-mono text-[1.75rem] font-bold leading-none tabular-nums ${s.net >= 0 ? 'text-green' : 'text-red'}`}
                      >
                        {s.net >= 0 ? '+' : '−'}
                        {formatNumber(Math.abs(s.net), lang)}
                        <span className="ml-1 text-sm font-semibold opacity-30">₺</span>
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* ── Deposit / Withdrawal cards ── */}
              <div className="grid grid-cols-2 gap-3 px-6 pb-4">
                <div className="rounded-xl border border-green/15 bg-green/[0.03] px-4 py-3">
                  <div className="flex items-center gap-1.5">
                    <ArrowDown size={12} weight="bold" className="text-green" />
                    <span className="text-[11px] font-medium uppercase tracking-wider text-green/60">
                      {t('transfers.summary.deposits')}
                    </span>
                  </div>
                  <p className="mt-2 font-mono text-lg font-bold tabular-nums text-black/80">
                    {formatNumber(s.deposits, lang)}
                    <span className="ml-1 text-[11px] font-medium text-black/20">₺</span>
                  </p>
                  <p className="mt-0.5 text-[11px] tabular-nums text-black/25">
                    {s.depositCount} {t('transfers.summary.deposits').toLowerCase()}
                  </p>
                </div>
                <div className="rounded-xl border border-red/15 bg-red/[0.03] px-4 py-3">
                  <div className="flex items-center gap-1.5">
                    <ArrowUp size={12} weight="bold" className="text-red" />
                    <span className="text-[11px] font-medium uppercase tracking-wider text-red/60">
                      {t('transfers.summary.withdrawals')}
                    </span>
                  </div>
                  <p className="mt-2 font-mono text-lg font-bold tabular-nums text-black/80">
                    {formatNumber(s.withdrawals, lang)}
                    <span className="ml-1 text-[11px] font-medium text-black/20">₺</span>
                  </p>
                  <p className="mt-0.5 text-[11px] tabular-nums text-black/25">
                    {s.withdrawalCount} {t('transfers.summary.withdrawals').toLowerCase()}
                  </p>
                </div>
              </div>

              {/* ── Proportion bar ── */}
              <div className="px-6 pb-5">
                <div className="flex h-2 overflow-hidden rounded-full">
                  <div
                    className="rounded-l-full bg-green/50 transition-all duration-500"
                    style={{ width: `${depositPct}%` }}
                  />
                  <div
                    className="rounded-r-full bg-red/50 transition-all duration-500"
                    style={{ width: `${100 - depositPct}%` }}
                  />
                </div>
                <div className="mt-1.5 flex justify-between text-[10px] tabular-nums text-black/25">
                  <span>{depositPct.toFixed(0)}%</span>
                  <span>{(100 - depositPct).toFixed(0)}%</span>
                </div>
              </div>

              {/* ── Breakdown ── */}
              <div className="border-t border-black/[0.06] px-6 py-4">
                <div className="mb-3 flex items-center gap-1.5">
                  <ChartBar size={12} weight="bold" className="text-black/25" />
                  <span className="text-[11px] font-semibold uppercase tracking-wider text-black/25">
                    {t('transfers.summary.breakdown')}
                  </span>
                </div>

                <div className="space-y-2.5">
                  {/* Bank */}
                  <div className="flex items-center justify-between rounded-lg bg-black/[0.02] px-3 py-2.5">
                    <div className="flex items-center gap-2.5">
                      <div className="flex size-7 items-center justify-center rounded-lg bg-blue/[0.08]">
                        <Bank size={14} weight="duotone" className="text-blue" />
                      </div>
                      <span className="text-[13px] font-medium text-black/55">
                        {t('transfers.summary.totalBank')}
                      </span>
                    </div>
                    <span
                      className={`font-mono text-[13px] font-bold tabular-nums ${s.totalBank >= 0 ? 'text-green' : 'text-red'}`}
                    >
                      {s.totalBank >= 0 ? '+' : '−'}
                      {formatNumber(Math.abs(s.totalBank), lang)}
                      <span className="ml-0.5 text-[11px] font-medium opacity-30">₺</span>
                    </span>
                  </div>

                  {/* Credit Card */}
                  <div className="flex items-center justify-between rounded-lg bg-black/[0.02] px-3 py-2.5">
                    <div className="flex items-center gap-2.5">
                      <div className="flex size-7 items-center justify-center rounded-lg bg-purple/[0.08]">
                        <CreditCard size={14} weight="duotone" className="text-purple" />
                      </div>
                      <span className="text-[13px] font-medium text-black/55">
                        {t('transfers.summary.totalCreditCard')}
                      </span>
                    </div>
                    <span
                      className={`font-mono text-[13px] font-bold tabular-nums ${s.totalCreditCard >= 0 ? 'text-green' : 'text-red'}`}
                    >
                      {s.totalCreditCard >= 0 ? '+' : '−'}
                      {formatNumber(Math.abs(s.totalCreditCard), lang)}
                      <span className="ml-0.5 text-[11px] font-medium opacity-30">₺</span>
                    </span>
                  </div>

                  {/* USD */}
                  <div className="flex items-center justify-between rounded-lg bg-black/[0.02] px-3 py-2.5">
                    <div className="flex items-center gap-2.5">
                      <div className="flex size-7 items-center justify-center rounded-lg bg-mint/[0.15]">
                        <CurrencyDollar size={14} weight="duotone" className="text-green" />
                      </div>
                      <span className="text-[13px] font-medium text-black/55">
                        {t('transfers.summary.totalUsd')}
                      </span>
                    </div>
                    <span
                      className={`font-mono text-[13px] font-bold tabular-nums ${s.totalUsd >= 0 ? 'text-green' : 'text-red'}`}
                    >
                      {s.totalUsd >= 0 ? '+' : '−'}
                      {formatNumber(Math.abs(s.totalUsd), lang)}
                      <span className="ml-0.5 text-[11px] font-medium opacity-30">$</span>
                    </span>
                  </div>

                  {/* Commission */}
                  <div className="flex items-center justify-between rounded-lg bg-black/[0.02] px-3 py-2.5">
                    <div className="flex items-center gap-2.5">
                      <div className="flex size-7 items-center justify-center rounded-lg bg-orange/[0.08]">
                        <Coins size={14} weight="duotone" className="text-orange" />
                      </div>
                      <span className="text-[13px] font-medium text-black/55">
                        {t('transfers.summary.commission')}
                      </span>
                    </div>
                    <span className="font-mono text-[13px] font-bold tabular-nums text-orange">
                      −{formatNumber(s.commission, lang)}
                      <span className="ml-0.5 text-[11px] font-medium opacity-30">₺</span>
                    </span>
                  </div>
                </div>
              </div>

              {/* ── USD Conversion section ── */}
              <div className="border-t border-black/[0.06] bg-black/[0.015] px-6 py-4">
                {/* Rate row */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] font-semibold uppercase tracking-wider text-black/30">
                      {t('transfers.summary.dayRate')}
                    </span>
                    {usdCount > 0 && (
                      <span className="rounded-full bg-blue/10 px-2 py-0.5 text-[10px] font-semibold text-blue">
                        {t('transfers.summary.usdTransferCount', { count: usdCount })}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-1.5">
                    {isApplyingRate ? (
                      <div className="flex items-center gap-2">
                        <div className="size-3 animate-spin rounded-full border border-black/10 border-t-black/40" />
                        <span className="text-xs text-black/40">
                          {t('transfers.summary.applyingRate')}
                        </span>
                      </div>
                    ) : isEditingRate ? (
                      <>
                        <input
                          ref={rateInputRef}
                          type="number"
                          step="0.0001"
                          defaultValue={effectiveRate.toFixed(4)}
                          className="h-7 w-24 rounded-lg border border-black/10 bg-white px-2 text-right font-mono text-sm font-bold tabular-nums text-black/70 outline-none focus:border-black/25"
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') handleSaveRate()
                            else if (e.key === 'Escape') setIsEditingRate(false)
                          }}
                        />
                        <button
                          className="flex size-6 items-center justify-center rounded-md text-green hover:bg-green/10"
                          onClick={handleSaveRate}
                        >
                          <Check size={14} weight="bold" />
                        </button>
                        <button
                          className="flex size-6 items-center justify-center rounded-md text-red hover:bg-red/10"
                          onClick={() => setIsEditingRate(false)}
                        >
                          <X size={14} weight="bold" />
                        </button>
                      </>
                    ) : (
                      <>
                        <span
                          className={`font-mono text-sm font-bold tabular-nums ${overrideActive ? 'text-orange' : 'text-black/55'}`}
                        >
                          {effectiveRate.toFixed(4)}
                        </span>
                        <button
                          className="flex size-6 items-center justify-center rounded-md text-black/25 hover:bg-black/5 hover:text-black/50"
                          onClick={() => {
                            pinOpenRef.current = true
                            setShowPinDialog(true)
                          }}
                          title={t('transfers.summary.editRate')}
                        >
                          <PencilSimple size={13} />
                        </button>
                        {overrideActive && (
                          <button
                            className="flex size-6 items-center justify-center rounded-md text-black/20 hover:bg-black/5 hover:text-black/40"
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

                {/* USD Net cards */}
                <div className="mt-4 grid grid-cols-2 gap-3">
                  <div className="rounded-xl border border-black/[0.06] bg-white px-4 py-3">
                    <p className="text-[11px] font-medium text-black/35">
                      {t('transfers.summary.netWithComm')}
                    </p>
                    <p
                      className={`mt-1.5 font-mono text-lg font-bold tabular-nums ${adjNetWithCommUsd >= 0 ? 'text-green' : 'text-red'}`}
                    >
                      {adjNetWithCommUsd >= 0 ? '+' : '−'}
                      {formatNumber(Math.abs(adjNetWithCommUsd), lang)}
                      <span className="ml-0.5 text-[11px] font-medium opacity-30">$</span>
                    </p>
                    <p className="mt-0.5 text-[10px] text-black/20">
                      {t('transfers.summary.afterCommission')}
                    </p>
                  </div>
                  <div className="rounded-xl border border-black/[0.06] bg-white px-4 py-3">
                    <p className="text-[11px] font-medium text-black/35">
                      {t('transfers.summary.netWithoutComm')}
                    </p>
                    <p
                      className={`mt-1.5 font-mono text-lg font-bold tabular-nums ${adjNetWithoutCommUsd >= 0 ? 'text-green' : 'text-red'}`}
                    >
                      {adjNetWithoutCommUsd >= 0 ? '+' : '−'}
                      {formatNumber(Math.abs(adjNetWithoutCommUsd), lang)}
                      <span className="ml-0.5 text-[11px] font-medium opacity-30">$</span>
                    </p>
                    <p className="mt-0.5 text-[10px] text-black/20">
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
        onClose={() => {
          pinOpenRef.current = false
          setShowPinDialog(false)
        }}
        onVerified={() => {
          pinOpenRef.current = false
          setShowPinDialog(false)
          setIsEditingRate(true)
        }}
        securityPin={securityPin}
      />
    </>
  )
}
