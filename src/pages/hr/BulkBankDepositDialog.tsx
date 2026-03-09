import { useState } from 'react'
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
} from '@ds'
import { useToast } from '@/hooks/useToast'
import { useBulkBankDepositMutation, type HrEmployee } from '@/hooks/queries/useHrQuery'
import { fmtNum, fmtAmount } from './utils/salaryCalculations'

interface BulkBankDepositDialogProps {
  open: boolean
  onClose: () => void
  employees: HrEmployee[]
  insuredBankAmountTl: number
  periodLabel: string
  lang: 'tr' | 'en'
}

export function BulkBankDepositDialog({
  open,
  onClose,
  employees,
  insuredBankAmountTl,
  periodLabel,
  lang,
}: BulkBankDepositDialogProps) {
  const { toast } = useToast()
  const bulkDeposit = useBulkBankDepositMutation()

  // Default to 5th of current month
  const now = new Date()
  const defaultDate = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-05`
  const [paidAt, setPaidAt] = useState(defaultDate)

  const items = employees.map((emp) => {
    const bankAmount = emp.bank_salary_tl ?? insuredBankAmountTl
    return {
      employee_id: emp.id,
      employee_name: emp.full_name,
      amount_tl: bankAmount,
      salary_tl: emp.salary_tl,
      period: periodLabel,
      description: `${emp.full_name} — ${periodLabel} Sigortalı Maaş Avans Ödeme`,
    }
  })

  const eligibleItems = items.filter((i) => i.amount_tl > 0)
  const totalAmount = eligibleItems.reduce((s, i) => s + i.amount_tl, 0)
  const hasItems = eligibleItems.length > 0

  const handleConfirm = async () => {
    if (!hasItems) return
    try {
      await bulkDeposit.mutateAsync({ items: eligibleItems, paidAt })
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
            {lang === 'tr'
              ? 'Sigortalı Banka Ödemesi'
              : 'Insured Bank Deposit'}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-lg pt-1">
          {/* Period indicator */}
          <div className="flex items-center gap-2 rounded-lg border border-black/[0.07] bg-bg1 px-3 py-2 text-sm">
            <span className="text-black/40">{lang === 'tr' ? 'Dönem:' : 'Period:'}</span>
            <span className="font-semibold text-black">{periodLabel}</span>
          </div>

          {!hasItems ? (
            <div className="flex items-center gap-3 rounded-xl border border-orange/30 bg-orange/5 px-4 py-3">
              <Warning size={18} className="shrink-0 text-orange" />
              <p className="text-sm text-orange">
                {lang === 'tr'
                  ? 'Bu dönem için banka ödemesi yapılacak sigortalı çalışan bulunamadı.'
                  : 'No insured employees found for bank deposit this period.'}
              </p>
            </div>
          ) : (
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
                        {lang === 'tr' ? 'Banka Tutarı' : 'Bank Amount'}
                      </TableHead>
                      <TableHead>{lang === 'tr' ? 'Açıklama' : 'Description'}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {eligibleItems.map((item) => (
                      <TableRow key={item.employee_id}>
                        <TableCell data-label={lang === 'tr' ? 'Çalışan' : 'Employee'}>
                          <span className="text-sm font-medium text-black">
                            {item.employee_name}
                          </span>
                        </TableCell>
                        <TableCell
                          data-label={lang === 'tr' ? 'Brüt Maaş' : 'Gross Salary'}
                          className="text-right"
                        >
                          <span className="tabular-nums text-sm text-black/50">
                            {fmtAmount(item.salary_tl, 'TL')}
                          </span>
                        </TableCell>
                        <TableCell
                          data-label={lang === 'tr' ? 'Banka Tutarı' : 'Bank Amount'}
                          className="text-right"
                        >
                          <span className="tabular-nums text-sm font-semibold text-blue">
                            {fmtAmount(item.amount_tl, 'TL')}
                          </span>
                        </TableCell>
                        <TableCell data-label={lang === 'tr' ? 'Açıklama' : 'Description'}>
                          <span className="text-sm text-black/60">{item.description}</span>
                        </TableCell>
                      </TableRow>
                    ))}
                    {/* Total row */}
                    <TableRow className="bg-black/[0.02]">
                      <TableCell
                        colSpan={2}
                        className="text-right text-xs font-semibold text-black/50"
                      >
                        {lang === 'tr' ? 'Toplam' : 'Total'}
                      </TableCell>
                      <TableCell className="text-right">
                        <span className="tabular-nums text-base font-bold text-blue">
                          {fmtAmount(totalAmount, 'TL')}
                        </span>
                      </TableCell>
                      <TableCell />
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
                <p className="text-xs text-black/60">
                  {lang === 'tr'
                    ? `${eligibleItems.length} sigortalı çalışan için ${fmtNum(totalAmount)} TL banka ödemesi oluşturulacak. Nakit TL kasasına "Sigortalı Maaş Avans Ödeme" olarak işlenecek.`
                    : `${eligibleItems.length} insured bank deposits totaling ${fmtNum(totalAmount)} TL will be created. Recorded in Cash TL register as "Insured Salary Bank Deposit".`}
                </p>
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
