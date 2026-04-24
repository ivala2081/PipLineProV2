import { useState, useMemo } from 'react'
import { Bank, CheckFat, Warning } from '@phosphor-icons/react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  Button,
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
  Input,
  Label,
  Tag,
} from '@ds'
import { useToast } from '@/hooks/useToast'
import { useBulkBankDepositMutation, type HrEmployee } from '@/hooks/queries/useHrQuery'
import { fmtNum, fmtAmount } from './utils/salaryCalculations'

interface BulkBankDepositDialogProps {
  open: boolean
  onClose: () => void
  employees: HrEmployee[]
  insuredBankAmountTl: number
  insuredBankCurrency: 'TL' | 'USD'
  periodLabel: string
  lang: 'tr' | 'en'
}

interface DepositRow {
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

export function BulkBankDepositDialog({
  open,
  onClose,
  employees,
  insuredBankAmountTl,
  insuredBankCurrency,
  periodLabel,
  lang,
}: BulkBankDepositDialogProps) {
  const { toast } = useToast()
  const bulkDeposit = useBulkBankDepositMutation()

  // Default to 5th of current month
  const now = new Date()
  const defaultDate = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-05`
  const [paidAt, setPaidAt] = useState(defaultDate)

  const [rows, setRows] = useState<DepositRow[]>(() =>
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

  const eligibleItems = useMemo(() => rows.filter((i) => i.amount > 0), [rows])

  const totalByCurrency = useMemo(() => {
    const map = new Map<string, number>()
    for (const item of eligibleItems) {
      map.set(item.currency, (map.get(item.currency) ?? 0) + item.amount)
    }
    return map
  }, [eligibleItems])

  const hasItems = eligibleItems.length > 0
  const hasManualItems = rows.some((i) => !i.is_auto)

  const updateAmount = (id: string, value: number) => {
    setRows((prev) => prev.map((i) => (i.employee_id === id ? { ...i, amount: value } : i)))
  }

  const updateCurrency = (id: string, currency: 'TL' | 'USD') => {
    setRows((prev) => prev.map((i) => (i.employee_id === id ? { ...i, currency } : i)))
  }

  const handleConfirm = async () => {
    if (!hasItems) return
    try {
      await bulkDeposit.mutateAsync({
        items: eligibleItems.map((i) => ({
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
        title:
          lang === 'tr'
            ? `${eligibleItems.length} sigortalı banka ödemesi kasa defterine işlendi`
            : `${eligibleItems.length} insured bank deposits recorded in ledger`,
        variant: 'success',
      })
      onClose()
    } catch {
      toast({
        title: lang === 'tr' ? 'Bir hata oluştu' : 'Something went wrong',
        variant: 'error',
      })
    }
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent size="xl" onInteractOutside={(e) => e.preventDefault()}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Bank size={20} weight="duotone" className="text-blue" />
            {lang === 'tr' ? 'Sigortalı Banka Ödemesi' : 'Insured Bank Deposit'}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-lg pt-1">
          {/* Period indicator */}
          <div className="flex items-center gap-2 rounded-lg border border-black/[0.07] bg-bg1 px-3 py-2 text-sm">
            <span className="text-black/40">{lang === 'tr' ? 'Dönem:' : 'Period:'}</span>
            <span className="font-semibold text-black">{periodLabel}</span>
          </div>

          {!hasItems && rows.every((r) => r.amount === 0) && rows.some((r) => !r.is_auto) ? (
            <div className="flex items-center gap-3 rounded-xl border border-orange/30 bg-orange/5 px-4 py-3">
              <Warning size={18} className="shrink-0 text-orange" />
              <p className="text-sm text-orange">
                {lang === 'tr'
                  ? 'Elle girilecek çalışanlar için tutar ve para birimi belirleyiniz.'
                  : 'Please set amount and currency for manual employees.'}
              </p>
            </div>
          ) : !hasItems ? (
            <div className="flex items-center gap-3 rounded-xl border border-orange/30 bg-orange/5 px-4 py-3">
              <Warning size={18} className="shrink-0 text-orange" />
              <p className="text-sm text-orange">
                {lang === 'tr'
                  ? 'Bu dönem için banka ödemesi yapılacak sigortalı çalışan bulunamadı.'
                  : 'No insured employees found for bank deposit this period.'}
              </p>
            </div>
          ) : null}

          {rows.length > 0 && (
            <>
              {/* Payment list */}
              <div className="overflow-hidden rounded-xl border border-black/[0.07] bg-bg1">
                <Table cardOnMobile>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{lang === 'tr' ? 'Çalışan' : 'Employee'}</TableHead>
                      <TableHead className="text-right">
                        {lang === 'tr' ? 'Brüt Maaş' : 'Gross Salary'}
                      </TableHead>
                      <TableHead className="text-right">
                        {lang === 'tr' ? 'Para Birimi' : 'Currency'}
                      </TableHead>
                      <TableHead className="text-right">
                        {lang === 'tr' ? 'Banka Tutarı' : 'Bank Amount'}
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {rows.map((item) => (
                      <TableRow key={item.employee_id}>
                        <TableCell data-label={lang === 'tr' ? 'Çalışan' : 'Employee'}>
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-medium text-black">
                              {item.employee_name}
                            </span>
                            {!item.is_auto && (
                              <Tag variant="orange">{lang === 'tr' ? 'Elle' : 'Manual'}</Tag>
                            )}
                          </div>
                        </TableCell>
                        <TableCell
                          data-label={lang === 'tr' ? 'Brüt Maaş' : 'Gross Salary'}
                          className="text-right"
                        >
                          <span className="tabular-nums text-sm text-black/50">
                            {fmtAmount(item.salary_tl, item.salary_currency)}
                          </span>
                        </TableCell>
                        <TableCell
                          data-label={lang === 'tr' ? 'Para Birimi' : 'Currency'}
                          className="text-right"
                        >
                          {item.is_auto ? (
                            <span className="text-sm text-black/50">{item.currency}</span>
                          ) : (
                            <div className="flex items-center justify-end gap-1">
                              <button
                                type="button"
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
                        <TableCell
                          data-label={lang === 'tr' ? 'Banka Tutarı' : 'Bank Amount'}
                          className="text-right"
                        >
                          {item.is_auto ? (
                            <span className="tabular-nums text-sm font-semibold text-blue">
                              {fmtAmount(item.amount, item.currency)}
                            </span>
                          ) : (
                            <Input
                              type="number"
                              className="ml-auto h-7 w-32 text-right text-sm tabular-nums font-semibold"
                              value={item.amount}
                              onChange={(e) =>
                                updateAmount(item.employee_id, Number(e.target.value) || 0)
                              }
                            />
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                    {/* Total row */}
                    <TableRow className="bg-black/[0.02]">
                      <TableCell
                        colSpan={3}
                        className="text-right text-xs font-semibold text-black/50"
                      >
                        {lang === 'tr' ? 'Toplam' : 'Total'}
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
                    </TableRow>
                  </TableBody>
                </Table>
              </div>

              {/* Payment date */}
              <div className="space-y-sm">
                <Label>{lang === 'tr' ? 'Ödeme Tarihi' : 'Payment Date'}</Label>
                <Input type="date" value={paidAt} onChange={(e) => setPaidAt(e.target.value)} />
              </div>

              {/* Info box */}
              <div className="flex items-start gap-3 rounded-xl border border-blue/20 bg-blue/5 px-4 py-3">
                <Bank size={16} weight="fill" className="mt-0.5 shrink-0 text-blue" />
                <div className="text-xs text-black/60">
                  <p>
                    {lang === 'tr'
                      ? `${eligibleItems.length} sigortalı çalışan için banka ödemesi oluşturulacak.`
                      : `${eligibleItems.length} insured bank deposits will be created.`}
                  </p>
                  {Array.from(totalByCurrency.entries()).map(([cur, total]) => (
                    <p key={cur}>
                      {lang === 'tr'
                        ? `${fmtNum(total)} ${cur} → Nakit ${cur} kasası`
                        : `${fmtNum(total)} ${cur} → Cash ${cur} register`}
                    </p>
                  ))}
                  {hasManualItems && (
                    <p className="mt-1 text-orange">
                      {lang === 'tr'
                        ? '"Elle" işaretli çalışanlar için tutar ve para birimini kontrol ediniz.'
                        : 'Please verify amount and currency for employees marked as "Manual".'}
                    </p>
                  )}
                </div>
              </div>
            </>
          )}
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={onClose}>
            {lang === 'tr' ? 'İptal' : 'Cancel'}
          </Button>
          {hasItems && (
            <Button
              type="button"
              variant="filled"
              disabled={bulkDeposit.isPending}
              onClick={() => void handleConfirm()}
            >
              <CheckFat size={15} weight="fill" />
              {bulkDeposit.isPending
                ? lang === 'tr'
                  ? 'İşleniyor...'
                  : 'Processing...'
                : lang === 'tr'
                  ? 'Onayla ve İşle'
                  : 'Confirm & Process'}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
