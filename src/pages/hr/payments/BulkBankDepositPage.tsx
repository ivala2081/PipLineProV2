import { useState, useMemo } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { ArrowLeft, Bank, CheckFat, Trash, Warning, CalendarBlank } from '@phosphor-icons/react'
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
  Tag,
} from '@ds'
import { useToast } from '@/hooks/useToast'
import { useBulkBankDepositMutation, type HrEmployee } from '@/hooks/queries/useHrQuery'
import { fmtNum, fmtAmount } from '../utils/salaryCalculations'

/* ------------------------------------------------------------------ */

interface BankDepositItem {
  employee_id: string
  employee_name: string
  amount: number
  currency: 'TL' | 'USD'
  salary_tl: number
  salary_currency: 'TL' | 'USD'
  is_auto: boolean
  period: string
  description: string
}

interface LocationState {
  employees: HrEmployee[]
  insuredBankAmountTl: number
  insuredBankCurrency: 'TL' | 'USD'
  periodLabel: string
  lang: 'tr' | 'en'
}

/* ------------------------------------------------------------------ */

export function BulkBankDepositPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const state = location.state as LocationState | null

  if (!state) {
    navigate('/hr', { replace: true })
    return null
  }

  return (
    <Content
      employees={state.employees}
      insuredBankAmountTl={state.insuredBankAmountTl}
      insuredBankCurrency={state.insuredBankCurrency ?? 'TL'}
      periodLabel={state.periodLabel}
      lang={state.lang}
    />
  )
}

/* ------------------------------------------------------------------ */

function Content({
  employees,
  insuredBankAmountTl,
  insuredBankCurrency,
  periodLabel,
  lang,
}: {
  employees: HrEmployee[]
  insuredBankAmountTl: number
  insuredBankCurrency: 'TL' | 'USD'
  periodLabel: string
  lang: 'tr' | 'en'
}) {
  const navigate = useNavigate()
  const { toast } = useToast()
  const bulkDeposit = useBulkBankDepositMutation()
  const t = lang === 'tr'

  // Default to 5th of current month
  const now = new Date()
  const defaultDate = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-05`
  const [paidAt, setPaidAt] = useState(defaultDate)

  const [editableItems, setEditableItems] = useState<BankDepositItem[]>(() =>
    employees.map((emp) => {
      const empCurrency = (emp.salary_currency ?? 'TL') as 'TL' | 'USD'
      const isAuto = empCurrency === insuredBankCurrency
      return {
        employee_id: emp.id,
        employee_name: emp.full_name,
        amount: isAuto ? (emp.bank_salary_tl ?? insuredBankAmountTl) : 0,
        currency: empCurrency,
        salary_tl: emp.salary_tl,
        salary_currency: empCurrency,
        is_auto: isAuto,
        period: periodLabel,
        description: `${emp.full_name} — ${periodLabel} Sigortalı Maaş Avans Ödeme`,
      }
    }),
  )
  const [excludedIds, setExcludedIds] = useState<Set<string>>(new Set())

  const activeItems = useMemo(
    () => editableItems.filter((i) => !excludedIds.has(i.employee_id) && i.amount > 0),
    [editableItems, excludedIds],
  )

  // Group totals by currency
  const totalByCurrency = useMemo(() => {
    const map = new Map<string, number>()
    for (const item of activeItems) {
      map.set(item.currency, (map.get(item.currency) ?? 0) + item.amount)
    }
    return map
  }, [activeItems])

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
      prev.map((i) => (i.employee_id === id ? { ...i, amount: value } : i)),
    )
  }

  const updateCurrency = (id: string, currency: 'TL' | 'USD') => {
    setEditableItems((prev) => prev.map((i) => (i.employee_id === id ? { ...i, currency } : i)))
  }

  const handleConfirm = async () => {
    if (activeItems.length === 0) return
    try {
      await bulkDeposit.mutateAsync({
        items: activeItems.map((i) => ({
          employee_id: i.employee_id,
          employee_name: i.employee_name,
          amount: i.amount,
          currency: i.currency,
          period: i.period,
          description: i.description,
        })),
        paidAt,
      })
      toast({
        title: t
          ? `${activeItems.length} sigortalı banka ödemesi kasa defterine işlendi`
          : `${activeItems.length} insured bank deposits recorded in ledger`,
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

  const hasManualItems = editableItems.some((i) => !i.is_auto)

  return (
    <div className="space-y-lg">
      <PageHeader
        title={t ? 'Sigortalı Banka Ödemesi' : 'Insured Bank Deposit'}
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
          <Bank size={16} weight="duotone" className="text-blue" />
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
            {t
              ? 'Bu dönem için banka ödemesi yapılacak sigortalı çalışan bulunamadı.'
              : 'No insured employees found for bank deposit this period.'}
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
                  <TableHead className="text-right">{t ? 'Brüt Maaş' : 'Gross Salary'}</TableHead>
                  <TableHead className="text-right">{t ? 'Para Birimi' : 'Currency'}</TableHead>
                  <TableHead className="text-right">{t ? 'Banka Tutarı' : 'Bank Amount'}</TableHead>
                  <TableHead>{t ? 'Açıklama' : 'Description'}</TableHead>
                  <TableHead className="w-10" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {editableItems.map((item) => {
                  const excluded = excludedIds.has(item.employee_id)
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
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium text-black">
                            {item.employee_name}
                          </span>
                          {!item.is_auto && <Tag variant="orange">{t ? 'Elle' : 'Manual'}</Tag>}
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <span className="tabular-nums text-sm text-black/50">
                          {fmtAmount(item.salary_tl, item.salary_currency)}
                        </span>
                      </TableCell>
                      <TableCell className="text-right">
                        {item.is_auto ? (
                          <span className="text-sm text-black/50">{item.currency}</span>
                        ) : (
                          <div className="ml-auto flex items-center justify-end gap-1">
                            <button
                              type="button"
                              disabled={excluded}
                              onClick={() => updateCurrency(item.employee_id, 'TL')}
                              className={`rounded px-2 py-0.5 text-xs font-medium transition-colors ${
                                item.currency === 'TL'
                                  ? 'bg-brand/10 text-brand'
                                  : 'text-black/30 hover:text-black/50'
                              }`}
                            >
                              TL
                            </button>
                            <button
                              type="button"
                              disabled={excluded}
                              onClick={() => updateCurrency(item.employee_id, 'USD')}
                              className={`rounded px-2 py-0.5 text-xs font-medium transition-colors ${
                                item.currency === 'USD'
                                  ? 'bg-brand/10 text-brand'
                                  : 'text-black/30 hover:text-black/50'
                              }`}
                            >
                              USD
                            </button>
                          </div>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <Input
                          type="number"
                          className="ml-auto h-7 w-32 text-right text-sm tabular-nums font-semibold"
                          value={item.amount}
                          onChange={(e) =>
                            updateAmount(item.employee_id, Number(e.target.value) || 0)
                          }
                          disabled={excluded}
                        />
                      </TableCell>
                      <TableCell>
                        <span className="text-sm text-black/60">{item.description}</span>
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
                  <TableCell colSpan={4}>
                    <span className="text-xs font-semibold text-black/50">
                      {t ? 'Toplam' : 'Total'}
                    </span>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex flex-col items-end gap-0.5">
                      {Array.from(totalByCurrency.entries()).map(([cur, total]) => (
                        <span key={cur} className="tabular-nums text-base font-bold text-blue">
                          {fmtAmount(total, cur)}
                        </span>
                      ))}
                    </div>
                  </TableCell>
                  <TableCell colSpan={2} />
                </TableRow>
              </TableBody>
            </Table>
          </div>

          {/* Info + Actions */}
          <div className="flex flex-col gap-sm sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-start gap-2 rounded-lg border border-blue/20 bg-blue/5 px-3 py-2">
              <Bank size={14} weight="fill" className="mt-0.5 shrink-0 text-blue" />
              <div className="text-xs text-black/60">
                <p>
                  {t
                    ? `${activeItems.length} sigortalı çalışan için banka ödemesi oluşturulacak.`
                    : `${activeItems.length} insured bank deposits will be created.`}
                </p>
                {Array.from(totalByCurrency.entries()).map(([cur, total]) => (
                  <p key={cur}>
                    {t
                      ? `${fmtNum(total)} ${cur} → Nakit ${cur} kasası`
                      : `${fmtNum(total)} ${cur} → Cash ${cur} register`}
                  </p>
                ))}
                {hasManualItems && (
                  <p className="mt-1 text-orange">
                    {t
                      ? '"Elle" işaretli çalışanlar için tutar ve para birimini kontrol ediniz.'
                      : 'Please verify amount and currency for employees marked as "Manual".'}
                  </p>
                )}
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Button variant="outline" onClick={() => navigate('/hr')}>
                {t ? 'İptal' : 'Cancel'}
              </Button>
              <Button
                variant="filled"
                disabled={bulkDeposit.isPending || activeItems.length === 0}
                onClick={() => void handleConfirm()}
              >
                <CheckFat size={15} weight="fill" />
                {bulkDeposit.isPending
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
