import { useState, useMemo } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { ArrowLeft, CheckFat, Money, Trash, Warning, CalendarBlank } from '@phosphor-icons/react'
import {
  Button,
  Input,
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
  PageHeader,
} from '@ds'
import { useToast } from '@/hooks/useToast'
import { useBulkSalaryPayoutMutation, type BulkSalaryPayoutItem } from '@/hooks/queries/useHrQuery'
import { fmtNum, fmtAmount } from '../utils/salaryCalculations'

/* ------------------------------------------------------------------ */

interface LocationState {
  items: BulkSalaryPayoutItem[]
  periodLabel: string
  lang: 'tr' | 'en'
}

/* ------------------------------------------------------------------ */

export function BulkSalaryPayoutPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const state = location.state as LocationState | null

  if (!state) {
    navigate('/hr', { replace: true })
    return null
  }

  return <Content items={state.items} periodLabel={state.periodLabel} lang={state.lang} />
}

/* ------------------------------------------------------------------ */

function Content({
  items: initialItems,
  periodLabel,
  lang,
}: {
  items: BulkSalaryPayoutItem[]
  periodLabel: string
  lang: 'tr' | 'en'
}) {
  const navigate = useNavigate()
  const { toast } = useToast()
  const bulkPayout = useBulkSalaryPayoutMutation()
  const t = lang === 'tr'

  const [paidAt, setPaidAt] = useState(new Date().toISOString().split('T')[0])
  const [editableItems, setEditableItems] = useState<BulkSalaryPayoutItem[]>(
    initialItems.filter((i) => i.amount_tl > 0),
  )
  const [excludedIds, setExcludedIds] = useState<Set<string>>(new Set())

  const activeItems = useMemo(
    () => editableItems.filter((i) => !excludedIds.has(i.employee_id)),
    [editableItems, excludedIds],
  )

  const tlItems = activeItems.filter((i) => (i.salary_currency ?? 'TL') === 'TL')
  const usdItems = activeItems.filter((i) => (i.salary_currency ?? 'TL') === 'USD')

  const totalSalaryTl = tlItems.reduce((s, i) => s + i.amount_tl, 0)
  const totalSalaryUsd = usdItems.reduce((s, i) => s + i.amount_tl, 0)
  const totalSupplement = activeItems.reduce((s, i) => s + (i.supplement_tl ?? 0), 0)
  const totalBankDeposit = activeItems.reduce((s, i) => s + (i.bank_deposit_tl ?? 0), 0)
  const totalAdvance = activeItems.reduce((s, i) => s + (i.advance_tl ?? 0), 0)
  const totalAttDed = activeItems.reduce((s, i) => s + (i.attendance_deduction_tl ?? 0), 0)
  const totalLeaveDed = activeItems.reduce((s, i) => s + (i.unpaid_leave_deduction_tl ?? 0), 0)
  const hasMixed = totalSalaryTl > 0 && totalSalaryUsd > 0

  const netTotalTl =
    totalSalaryTl +
    totalSupplement -
    totalBankDeposit -
    tlItems.reduce(
      (s, i) =>
        s +
        (i.advance_tl ?? 0) +
        (i.attendance_deduction_tl ?? 0) +
        (i.unpaid_leave_deduction_tl ?? 0),
      0,
    )
  const netTotalUsd =
    totalSalaryUsd -
    usdItems.reduce(
      (s, i) =>
        s +
        (i.advance_tl ?? 0) +
        (i.attendance_deduction_tl ?? 0) +
        (i.unpaid_leave_deduction_tl ?? 0),
      0,
    )

  const toggleExclude = (id: string) => {
    setExcludedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const removeItem = (id: string) => {
    setEditableItems((prev) => prev.filter((i) => i.employee_id !== id))
  }

  const updateAmount = (id: string, value: number) => {
    setEditableItems((prev) =>
      prev.map((i) => (i.employee_id === id ? { ...i, amount_tl: value } : i)),
    )
  }

  const handleConfirm = async () => {
    if (activeItems.length === 0) return
    try {
      await bulkPayout.mutateAsync({ items: activeItems, paidAt })
      toast({
        title: t
          ? `${activeItems.length} maaş ödemesi kasa defterine işlendi`
          : `${activeItems.length} salary payments recorded in ledger`,
        variant: 'success',
      })
      navigate('/hr', { replace: true })
    } catch {
      toast({
        title: t ? 'Bir hata oluştu' : 'Something went wrong',
        variant: 'error',
      })
    }
  }

  return (
    <div className="space-y-lg">
      <PageHeader
        title={t ? 'Toplu Maaş Ödemesi' : 'Bulk Salary Payment'}
        subtitle={periodLabel}
        actions={
          <Button variant="ghost" onClick={() => navigate('/hr')}>
            <ArrowLeft size={16} />
            {t ? 'Geri' : 'Back'}
          </Button>
        }
      />

      {/* Top bar */}
      <div className="flex flex-wrap items-center justify-between gap-sm rounded-xl border border-black/[0.07] bg-bg1 px-4 py-3">
        <div className="flex items-center gap-2 text-sm">
          <Money size={16} weight="duotone" className="text-green" />
          <span className="text-black/40">{t ? 'Dönem:' : 'Period:'}</span>
          <span className="font-semibold text-black">{periodLabel}</span>
          <span className="text-black/20">|</span>
          <span className="font-semibold text-black tabular-nums">{activeItems.length}</span>
          <span className="text-black/40">{t ? 'çalışan' : 'employees'}</span>
        </div>
        <div className="flex items-center gap-2">
          <CalendarBlank size={14} className="text-black/40" />
          <span className="whitespace-nowrap text-xs text-black/40">
            {t ? 'Ödeme Tarihi' : 'Date'}
          </span>
          <Input
            type="date"
            className="h-8 w-40 text-sm"
            value={paidAt}
            onChange={(e) => setPaidAt(e.target.value)}
          />
        </div>
      </div>

      {editableItems.length === 0 ? (
        <div className="flex items-center gap-3 rounded-xl border border-orange/30 bg-orange/5 px-4 py-3">
          <Warning size={18} className="shrink-0 text-orange" />
          <p className="text-sm text-orange">
            {t ? 'Ödenecek çalışan bulunmuyor.' : 'No employees to pay.'}
          </p>
        </div>
      ) : (
        <>
          {/* Editable table */}
          <div className="overflow-hidden rounded-xl border border-black/[0.07] bg-bg1">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-10">
                    <input
                      type="checkbox"
                      className="size-3.5 cursor-pointer rounded border-black/20 accent-brand"
                      checked={excludedIds.size === 0}
                      onChange={() => {
                        if (excludedIds.size === 0)
                          setExcludedIds(new Set(editableItems.map((i) => i.employee_id)))
                        else setExcludedIds(new Set())
                      }}
                    />
                  </TableHead>
                  <TableHead>{t ? 'Çalışan' : 'Employee'}</TableHead>
                  <TableHead className="text-right">{t ? 'Maaş' : 'Salary'}</TableHead>
                  <TableHead className="text-right">{t ? 'Sigorta Elden' : 'Supplement'}</TableHead>
                  <TableHead className="text-right">{t ? 'Banka' : 'Bank'}</TableHead>
                  <TableHead className="text-right">{t ? 'Avans' : 'Advance'}</TableHead>
                  <TableHead className="text-right">{t ? 'Devam Kes.' : 'Abs. Ded.'}</TableHead>
                  <TableHead className="text-right">{t ? 'İzin Kes.' : 'Leave Ded.'}</TableHead>
                  <TableHead className="text-right">Net</TableHead>
                  <TableHead className="w-10" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {editableItems.map((item) => {
                  const excluded = excludedIds.has(item.employee_id)
                  const cur = item.salary_currency ?? 'TL'
                  const net =
                    item.amount_tl +
                    (item.supplement_tl ?? 0) -
                    (item.bank_deposit_tl ?? 0) -
                    (item.advance_tl ?? 0) -
                    (item.attendance_deduction_tl ?? 0) -
                    (item.unpaid_leave_deduction_tl ?? 0)
                  return (
                    <TableRow key={item.employee_id} className={excluded ? 'opacity-30' : ''}>
                      <TableCell>
                        <input
                          type="checkbox"
                          className="size-3.5 cursor-pointer rounded border-black/20 accent-brand"
                          checked={!excluded}
                          onChange={() => toggleExclude(item.employee_id)}
                        />
                      </TableCell>
                      <TableCell>
                        <span className="text-sm font-medium text-black">{item.employee_name}</span>
                      </TableCell>
                      <TableCell className="text-right">
                        <Input
                          type="number"
                          className="ml-auto h-7 w-28 text-right text-sm tabular-nums font-semibold"
                          value={item.amount_tl}
                          onChange={(e) =>
                            updateAmount(item.employee_id, Number(e.target.value) || 0)
                          }
                          disabled={excluded}
                        />
                      </TableCell>
                      <TableCell className="text-right">
                        {(item.supplement_tl ?? 0) > 0 ? (
                          <span className="tabular-nums text-sm font-medium text-orange">
                            +{fmtAmount(item.supplement_tl, item.supplement_currency ?? 'TL')}
                          </span>
                        ) : (
                          <span className="text-xs text-black/25">&mdash;</span>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        {(item.bank_deposit_tl ?? 0) > 0 ? (
                          <span className="tabular-nums text-sm font-medium text-blue">
                            -{fmtAmount(item.bank_deposit_tl, 'TL')}
                          </span>
                        ) : (
                          <span className="text-xs text-black/25">&mdash;</span>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        {(item.advance_tl ?? 0) > 0 ? (
                          <span className="tabular-nums text-sm font-medium text-orange">
                            -{fmtAmount(item.advance_tl, cur)}
                          </span>
                        ) : (
                          <span className="text-xs text-black/25">&mdash;</span>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        {(item.attendance_deduction_tl ?? 0) > 0 ? (
                          <span className="tabular-nums text-sm font-medium text-red">
                            -{fmtAmount(item.attendance_deduction_tl, cur)}
                          </span>
                        ) : (
                          <span className="text-xs text-black/25">&mdash;</span>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        {(item.unpaid_leave_deduction_tl ?? 0) > 0 ? (
                          <span className="tabular-nums text-sm font-medium text-red">
                            -{fmtAmount(item.unpaid_leave_deduction_tl, cur)}
                          </span>
                        ) : (
                          <span className="text-xs text-black/25">&mdash;</span>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <span className="tabular-nums text-sm font-bold text-green">
                          {fmtAmount(Math.max(0, net), cur)}
                        </span>
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          className="h-6 w-6 text-black/30 hover:text-red"
                          onClick={() => removeItem(item.employee_id)}
                        >
                          <Trash size={13} />
                        </Button>
                      </TableCell>
                    </TableRow>
                  )
                })}

                {/* Totals row */}
                <TableRow className="border-t-2 border-black/[0.07] bg-black/[0.02]">
                  <TableCell colSpan={2}>
                    <span className="text-xs font-semibold text-black/50">
                      {t ? 'Toplam' : 'Total'}
                    </span>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex flex-col items-end gap-0.5">
                      {totalSalaryTl > 0 && (
                        <span className="tabular-nums text-sm font-bold text-black/70">
                          {fmtAmount(totalSalaryTl, 'TL')}
                        </span>
                      )}
                      {totalSalaryUsd > 0 && (
                        <span className="tabular-nums text-sm font-bold text-black/70">
                          {fmtAmount(totalSalaryUsd, 'USD')}
                        </span>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="text-right">
                    {totalSupplement > 0 && (
                      <span className="tabular-nums text-sm font-bold text-orange">
                        +{fmtAmount(totalSupplement, 'TL')}
                      </span>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    {totalBankDeposit > 0 && (
                      <span className="tabular-nums text-sm font-bold text-blue">
                        -{fmtAmount(totalBankDeposit, 'TL')}
                      </span>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    {totalAdvance > 0 && (
                      <span className="tabular-nums text-sm font-bold text-orange">
                        -{fmtAmount(totalAdvance, 'TL')}
                      </span>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    {totalAttDed > 0 && (
                      <span className="tabular-nums text-sm font-bold text-red">
                        -{fmtAmount(totalAttDed, 'TL')}
                      </span>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    {totalLeaveDed > 0 && (
                      <span className="tabular-nums text-sm font-bold text-red">
                        -{fmtAmount(totalLeaveDed, 'TL')}
                      </span>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex flex-col items-end gap-0.5">
                      {netTotalTl > 0 && (
                        <span className="tabular-nums text-base font-bold text-green">
                          {fmtAmount(netTotalTl, 'TL')}
                        </span>
                      )}
                      {netTotalUsd > 0 && (
                        <span className="tabular-nums text-base font-bold text-green">
                          {fmtAmount(netTotalUsd, 'USD')}
                        </span>
                      )}
                    </div>
                  </TableCell>
                  <TableCell />
                </TableRow>
              </TableBody>
            </Table>
          </div>

          {/* Info + Actions */}
          <div className="flex flex-col gap-sm sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-start gap-2 rounded-lg border border-green/20 bg-green/5 px-3 py-2">
              <CheckFat size={14} weight="fill" className="mt-0.5 shrink-0 text-green" />
              <p className="text-xs text-black/60">
                {t
                  ? `${activeItems.length} çalışan için${totalSalaryTl > 0 ? ` ${fmtNum(totalSalaryTl)} TL` : ''}${totalSalaryUsd > 0 ? `${totalSalaryTl > 0 ? ' +' : ''} ${fmtNum(totalSalaryUsd)} $` : ''} maaş ödemesi oluşturulacak.${hasMixed ? ' TL ödemeler Nakit TL, USD ödemeler Nakit USD kasasına işlenecek.' : totalSalaryUsd > 0 ? ' Nakit USD kasasına işlenecek.' : ' Nakit TL kasasına işlenecek.'}`
                  : `${activeItems.length} salary payments will be created.${hasMixed ? ' TL payments → Cash TL, USD payments → Cash USD register.' : totalSalaryUsd > 0 ? ' Recorded in Cash USD register.' : ' Recorded in Cash TL register.'}`}
              </p>
            </div>

            <div className="flex items-center gap-2">
              <Button variant="outline" onClick={() => navigate('/hr')}>
                {t ? 'İptal' : 'Cancel'}
              </Button>
              <Button
                variant="filled"
                disabled={bulkPayout.isPending || activeItems.length === 0}
                onClick={() => void handleConfirm()}
              >
                <CheckFat size={15} weight="fill" />
                {bulkPayout.isPending
                  ? t
                    ? 'İşleniyor...'
                    : 'Processing...'
                  : t
                    ? 'Onayla ve İşle'
                    : 'Confirm & Process'}
              </Button>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
