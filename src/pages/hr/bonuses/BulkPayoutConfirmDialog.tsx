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
import { useBulkBonusPayoutMutation, type BulkPayoutItem } from '@/hooks/queries/useHrQuery'

/* ------------------------------------------------------------------ */

function fmt(n: number) {
  return n.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

interface BulkPayoutConfirmDialogProps {
  open: boolean
  onClose: () => void
  items: BulkPayoutItem[]
  dept: 'marketing' | 'reattention' | 'other'
  periodLabel: string // e.g. "Şubat 2026"
  lang: 'tr' | 'en'
}

export function BulkPayoutConfirmDialog({
  open,
  onClose,
  items,
  dept,
  periodLabel,
  lang,
}: BulkPayoutConfirmDialogProps) {
  const { toast } = useToast()
  const bulkPayout = useBulkBonusPayoutMutation()
  const [paidAt, setPaidAt] = useState(new Date().toISOString().split('T')[0])

  const total = items.reduce((s, i) => s + i.amount_usdt, 0)
  const hasItems = items.length > 0 && items.some((i) => i.amount_usdt > 0)
  const eligibleItems = items.filter((i) => i.amount_usdt > 0)

  const deptLabel =
    dept === 'marketing'
      ? 'Marketing'
      : dept === 'reattention'
        ? 'Retention'
        : lang === 'tr'
          ? 'Diğer Departmanlar'
          : 'Other Departments'

  const handleConfirm = async () => {
    if (!hasItems) return
    try {
      await bulkPayout.mutateAsync({ items: eligibleItems, paidAt })
      toast({
        title:
          lang === 'tr'
            ? `${eligibleItems.length} ödeme kasa defterine işlendi`
            : `${eligibleItems.length} payments recorded in ledger`,
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
            <Money size={20} weight="duotone" className="text-brand" />
            {lang === 'tr'
              ? `Toplu Prim Ödemesi — ${deptLabel}`
              : `Bulk Bonus Payout — ${deptLabel}`}
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
                  ? "Bu dönem için ödenecek prim bulunamadı (tutarı 0'dan büyük olmalı)."
                  : 'No bonuses to pay for this period (amount must be greater than 0).'}
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
                        {lang === 'tr' ? 'Tutar (USDT)' : 'Amount (USDT)'}
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {eligibleItems.map((item) => (
                      <TableRow key={item.employee_id}>
                        <TableCell>
                          <div className="flex items-center gap-sm">
                            <span className="text-sm font-medium text-black">{item.employee_name}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <span className="text-sm text-black/60">{item.description}</span>
                        </TableCell>
                        <TableCell className="text-right">
                          <span className="tabular-nums text-sm font-semibold text-purple">
                            {fmt(item.amount_usdt)} USDT
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
                          {fmt(total)} USDT
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
              <div className="flex items-start gap-3 rounded-xl border border-blue/20 bg-blue/5 px-4 py-3">
                <CheckFat size={16} weight="fill" className="mt-0.5 shrink-0 text-blue" />
                <p className="text-xs text-black/60">
                  {lang === 'tr'
                    ? `${eligibleItems.length} çalışan için toplam ${fmt(total)} USDT prim ödeme kaydı oluşturulacak ve muhasebe kasa defterine işlenecek.`
                    : `${eligibleItems.length} bonus payment records totaling ${fmt(total)} USDT will be created and recorded in the accounting ledger.`}
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
