import { useState, useMemo } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import {
  ArrowLeft,
  Bank,
  CheckFat,
  Trash,
  Warning,
  CalendarBlank,
} from '@phosphor-icons/react'
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
import { useBulkBankDepositMutation, type HrEmployee } from '@/hooks/queries/useHrQuery'
import { fmtNum, fmtAmount } from '../utils/salaryCalculations'

/* ------------------------------------------------------------------ */

interface BankDepositItem {
  employee_id: string
  employee_name: string
  amount_tl: number
  salary_tl: number
  period: string
  description: string
}

interface LocationState {
  employees: HrEmployee[]
  insuredBankAmountTl: number
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
      periodLabel={state.periodLabel}
      lang={state.lang}
    />
  )
}

/* ------------------------------------------------------------------ */

function Content({
  employees,
  insuredBankAmountTl,
  periodLabel,
  lang,
}: {
  employees: HrEmployee[]
  insuredBankAmountTl: number
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
    employees.map((emp) => ({
      employee_id: emp.id,
      employee_name: emp.full_name,
      amount_tl: emp.bank_salary_tl ?? insuredBankAmountTl,
      salary_tl: emp.salary_tl,
      period: periodLabel,
      description: `${emp.full_name} — ${periodLabel} Sigortalı Maaş Avans Ödeme`,
    })),
  )
  const [excludedIds, setExcludedIds] = useState<Set<string>>(new Set())

  const activeItems = useMemo(
    () => editableItems.filter((i) => !excludedIds.has(i.employee_id) && i.amount_tl > 0),
    [editableItems, excludedIds],
  )

  const totalAmount = activeItems.reduce((s, i) => s + i.amount_tl, 0)

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
      await bulkDeposit.mutateAsync({ items: activeItems, paidAt })
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
          <span className="text-xs text-black/40">{t ? 'Ödeme Tarihi' : 'Date'}</span>
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
                  <TableHead className="text-right">
                    {t ? 'Banka Tutarı' : 'Bank Amount'}
                  </TableHead>
                  <TableHead>{t ? 'Açıklama' : 'Description'}</TableHead>
                  <TableHead className="w-10" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {editableItems.map((item) => {
                  const excluded = excludedIds.has(item.employee_id)
                  return (
                    <TableRow
                      key={item.employee_id}
                      className={excluded ? 'opacity-30' : ''}
                    >
                      <TableCell>
                        <input
                          type="checkbox"
                          className="size-3.5 cursor-pointer rounded border-black/20 accent-brand"
                          checked={!excluded}
                          onChange={() => toggleExclude(item.employee_id)}
                        />
                      </TableCell>
                      <TableCell>
                        <span className="text-sm font-medium text-black">
                          {item.employee_name}
                        </span>
                      </TableCell>
                      <TableCell className="text-right">
                        <span className="tabular-nums text-sm text-black/50">
                          {fmtAmount(item.salary_tl, 'TL')}
                        </span>
                      </TableCell>
                      <TableCell className="text-right">
                        <Input
                          type="number"
                          className="ml-auto h-7 w-32 text-right text-sm tabular-nums font-semibold"
                          value={item.amount_tl}
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
                  <TableCell colSpan={3}>
                    <span className="text-xs font-semibold text-black/50">
                      {t ? 'Toplam' : 'Total'}
                    </span>
                  </TableCell>
                  <TableCell className="text-right">
                    <span className="tabular-nums text-base font-bold text-blue">
                      {fmtAmount(totalAmount, 'TL')}
                    </span>
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
              <p className="text-xs text-black/60">
                {t
                  ? `${activeItems.length} sigortalı çalışan için ${fmtNum(totalAmount)} TL banka ödemesi oluşturulacak. Nakit TL kasasına "Sigortalı Maaş Avans Ödeme" olarak işlenecek.`
                  : `${activeItems.length} insured bank deposits totaling ${fmtNum(totalAmount)} TL will be created. Recorded in Cash TL register as "Insured Salary Bank Deposit".`}
              </p>
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
