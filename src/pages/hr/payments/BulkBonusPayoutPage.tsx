import { useState, useMemo } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import {
  ArrowLeft,
  CheckFat,
  CurrencyDollar,
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
import { useBulkBonusPayoutMutation, type BulkPayoutItem } from '@/hooks/queries/useHrQuery'

/* ------------------------------------------------------------------ */

function fmt(n: number) {
  return n.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

/* ------------------------------------------------------------------ */

interface LocationState {
  items: BulkPayoutItem[]
  dept: 'marketing' | 'reattention' | 'other'
  periodLabel: string
  lang: 'tr' | 'en'
}

/* ------------------------------------------------------------------ */

export function BulkBonusPayoutPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const state = location.state as LocationState | null

  if (!state) {
    navigate('/hr', { replace: true })
    return null
  }

  return (
    <Content
      items={state.items}
      dept={state.dept}
      periodLabel={state.periodLabel}
      lang={state.lang}
    />
  )
}

/* ------------------------------------------------------------------ */

function Content({
  items: initialItems,
  dept,
  periodLabel,
  lang,
}: {
  items: BulkPayoutItem[]
  dept: 'marketing' | 'reattention' | 'other'
  periodLabel: string
  lang: 'tr' | 'en'
}) {
  const navigate = useNavigate()
  const { toast } = useToast()
  const bulkPayout = useBulkBonusPayoutMutation()
  const t = lang === 'tr'

  const deptLabel =
    dept === 'marketing'
      ? 'Marketing'
      : dept === 'reattention'
        ? 'Retention'
        : t
          ? 'Diğer Departmanlar'
          : 'Other Departments'

  const [paidAt, setPaidAt] = useState(new Date().toISOString().split('T')[0])
  const [editableItems, setEditableItems] = useState<BulkPayoutItem[]>(
    initialItems.filter((i) => i.amount_usdt > 0),
  )
  const [excludedIds, setExcludedIds] = useState<Set<string>>(new Set())

  const itemKey = (item: BulkPayoutItem) =>
    item.pending_payment_id ?? item.agreement_id ?? item.employee_id

  const activeItems = useMemo(
    () => editableItems.filter((i) => !excludedIds.has(itemKey(i))),
    [editableItems, excludedIds],
  )

  const total = activeItems.reduce((s, i) => s + i.amount_usdt, 0)

  const toggleExclude = (key: string) => {
    setExcludedIds((prev) => {
      const next = new Set(prev)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })
  }

  const removeItem = (key: string) => {
    setEditableItems((prev) => prev.filter((i) => itemKey(i) !== key))
  }

  const updateAmount = (key: string, value: number) => {
    setEditableItems((prev) =>
      prev.map((i) => (itemKey(i) === key ? { ...i, amount_usdt: value } : i)),
    )
  }

  const handleConfirm = async () => {
    if (activeItems.length === 0) return
    try {
      await bulkPayout.mutateAsync({ items: activeItems, paidAt })
      toast({
        title: t
          ? `${activeItems.length} ödeme kasa defterine işlendi`
          : `${activeItems.length} payments recorded in ledger`,
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
        title={t ? `Toplu Prim Ödemesi — ${deptLabel}` : `Bulk Bonus Payout — ${deptLabel}`}
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
          <CurrencyDollar size={16} weight="duotone" className="text-purple" />
          <span className="text-black/40">{t ? 'Dönem:' : 'Period:'}</span>
          <span className="font-semibold text-black">{periodLabel}</span>
          <span className="text-black/20">|</span>
          <span className="font-semibold text-black tabular-nums">{activeItems.length}</span>
          <span className="text-black/40">{t ? 'çalışan' : 'employees'}</span>
        </div>
        <div className="flex items-center gap-2">
          <CalendarBlank size={14} className="text-black/40" />
          <span className="whitespace-nowrap text-xs text-black/40">{t ? 'Ödeme Tarihi' : 'Date'}</span>
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
              ? "Bu dönem için ödenecek prim bulunamadı (tutarı 0'dan büyük olmalı)."
              : 'No bonuses to pay for this period (amount must be greater than 0).'}
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
                          setExcludedIds(new Set(editableItems.map((i) => itemKey(i))))
                        else setExcludedIds(new Set())
                      }}
                    />
                  </TableHead>
                  <TableHead>{t ? 'Çalışan' : 'Employee'}</TableHead>
                  <TableHead>{t ? 'Açıklama' : 'Description'}</TableHead>
                  <TableHead className="text-right">
                    {t ? 'Tutar (USDT)' : 'Amount (USDT)'}
                  </TableHead>
                  <TableHead className="w-10" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {editableItems.map((item) => {
                  const key = itemKey(item)
                  const excluded = excludedIds.has(key)
                  return (
                    <TableRow key={key} className={excluded ? 'opacity-30' : ''}>
                      <TableCell>
                        <input
                          type="checkbox"
                          className="size-3.5 cursor-pointer rounded border-black/20 accent-brand"
                          checked={!excluded}
                          onChange={() => toggleExclude(key)}
                        />
                      </TableCell>
                      <TableCell>
                        <span className="text-sm font-medium text-black">
                          {item.employee_name}
                        </span>
                      </TableCell>
                      <TableCell>
                        <span className="text-sm text-black/60">{item.description}</span>
                      </TableCell>
                      <TableCell className="text-right">
                        <Input
                          type="number"
                          step="0.01"
                          className="ml-auto h-7 w-32 text-right text-sm tabular-nums font-semibold"
                          value={item.amount_usdt}
                          onChange={(e) =>
                            updateAmount(key, Number(e.target.value) || 0)
                          }
                          disabled={excluded}
                        />
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          className="h-6 w-6 text-black/30 hover:text-red"
                          onClick={() => removeItem(key)}
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
                    <span className="tabular-nums text-base font-bold text-green">
                      {fmt(total)} USDT
                    </span>
                  </TableCell>
                  <TableCell />
                </TableRow>
              </TableBody>
            </Table>
          </div>

          {/* Info + Actions */}
          <div className="flex flex-col gap-sm sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-start gap-2 rounded-lg border border-blue/20 bg-blue/5 px-3 py-2">
              <CheckFat size={14} weight="fill" className="mt-0.5 shrink-0 text-blue" />
              <p className="text-xs text-black/60">
                {t
                  ? `${activeItems.length} çalışan için toplam ${fmt(total)} USDT prim ödeme kaydı oluşturulacak ve muhasebe kasa defterine işlenecek.`
                  : `${activeItems.length} bonus payment records totaling ${fmt(total)} USDT will be created and recorded in the accounting ledger.`}
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
