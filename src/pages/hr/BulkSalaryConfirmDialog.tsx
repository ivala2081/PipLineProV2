import { useState } from 'react'
import { CheckFat, Money, Warning } from '@phosphor-icons/react'
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
import { useBulkSalaryPayoutMutation, type BulkSalaryPayoutItem } from '@/hooks/queries/useHrQuery'

/* ------------------------------------------------------------------ */

function fmtTL(n: number) {
  return n.toLocaleString('tr-TR', { minimumFractionDigits: 0, maximumFractionDigits: 0 })
}

interface BulkSalaryConfirmDialogProps {
  open: boolean
  onClose: () => void
  items: BulkSalaryPayoutItem[]
  periodLabel: string
  lang: 'tr' | 'en'
}

export function BulkSalaryConfirmDialog({
  open,
  onClose,
  items,
  periodLabel,
  lang,
}: BulkSalaryConfirmDialogProps) {
  const { toast } = useToast()
  const bulkPayout = useBulkSalaryPayoutMutation()
  const [paidAt, setPaidAt] = useState(new Date().toISOString().split('T')[0])

  const eligibleItems = items.filter((i) => i.amount_tl > 0)
  const total = eligibleItems.reduce((s, i) => s + i.amount_tl, 0)
  const hasItems = eligibleItems.length > 0

  const handleConfirm = async () => {
    if (!hasItems) return
    try {
      await bulkPayout.mutateAsync({ items: eligibleItems, paidAt })
      toast({
        title:
          lang === 'tr'
            ? `${eligibleItems.length} maaş ödemesi kasa defterine işlendi`
            : `${eligibleItems.length} salary payments recorded in ledger`,
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
            <Money size={20} weight="duotone" className="text-green" />
            {lang === 'tr' ? 'Toplu Maaş Ödemesi' : 'Bulk Salary Payment'}
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
                  ? "Bu dönem için ödenecek maaş bulunamadı (maaş 0'dan büyük olmalı)."
                  : 'No salaries to pay for this period (amount must be greater than 0).'}
              </p>
            </div>
          ) : (
            <>
              {/* Payment list */}
              <div className="overflow-hidden rounded-xl border border-black/[0.07] bg-bg1">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{lang === 'tr' ? 'Çalışan' : 'Employee'}</TableHead>
                      <TableHead>{lang === 'tr' ? 'Açıklama' : 'Description'}</TableHead>
                      <TableHead className="text-right">
                        {lang === 'tr' ? 'Tutar (TL)' : 'Amount (TL)'}
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {eligibleItems.map((item) => (
                      <TableRow key={item.employee_id}>
                        <TableCell>
                          <div className="flex items-center gap-sm">
                            <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-green/10 text-xs font-semibold text-green">
                              {item.employee_name
                                .split(' ')
                                .map((n) => n[0])
                                .join('')
                                .toUpperCase()
                                .slice(0, 2)}
                            </div>
                            <span className="text-sm font-medium text-black">
                              {item.employee_name}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <span className="text-sm text-black/60">{item.description}</span>
                        </TableCell>
                        <TableCell className="text-right">
                          <span className="tabular-nums text-sm font-semibold text-green">
                            {fmtTL(item.amount_tl)} TL
                          </span>
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
                        <span className="tabular-nums text-base font-bold text-green">
                          {fmtTL(total)} TL
                        </span>
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
              <div className="flex items-start gap-3 rounded-xl border border-green/20 bg-green/5 px-4 py-3">
                <CheckFat size={16} weight="fill" className="mt-0.5 shrink-0 text-green" />
                <p className="text-xs text-black/60">
                  {lang === 'tr'
                    ? `${eligibleItems.length} çalışan için toplam ${fmtTL(total)} TL maaş ödemesi oluşturulacak ve muhasebe kasa defterine (Nakit TL) işlenecek.`
                    : `${eligibleItems.length} salary payment records totaling ${fmtTL(total)} TL will be created and recorded in the accounting ledger (Cash TL).`}
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
              disabled={bulkPayout.isPending}
              onClick={() => void handleConfirm()}
            >
              <CheckFat size={15} weight="fill" />
              {bulkPayout.isPending
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
