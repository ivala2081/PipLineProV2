import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Invoice, Plus, CaretLeft, CaretRight, ArrowSquareOut } from '@phosphor-icons/react'
import {
  Button,
  Tag,
  EmptyState,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  Input,
  Label,
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
  Skeleton,
} from '@ds'
import {
  useUniPaymentInvoices,
  useCreateInvoiceMutation,
} from '@/hooks/queries/useUniPaymentQuery'
import type { UniPaymentInvoiceStatus } from '@/lib/uniPaymentTypes'
import {
  formatAmount as formatAmountInput,
  parseAmount as parseAmountInput,
  amountPlaceholder,
} from '@/lib/formatAmount'

function formatDisplayAmount(value: number): string {
  return value.toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 6,
  })
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('tr-TR', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function getInvoiceStatusTag(status: UniPaymentInvoiceStatus) {
  const map: Record<UniPaymentInvoiceStatus, 'green' | 'orange' | 'red' | 'blue' | 'purple'> = {
    New: 'blue',
    Pending: 'orange',
    Paid: 'green',
    Confirmed: 'green',
    Complete: 'green',
    Expired: 'red',
    Invalid: 'red',
  }
  return <Tag variant={map[status] ?? 'blue'} className="text-[10px]">{status}</Tag>
}

interface Props {
  pspId: string
  isAdmin: boolean
}

export function UniPaymentInvoicesTab({ pspId, isAdmin }: Props) {
  const { t, i18n } = useTranslation('pages')
  const lang = (i18n.language === 'tr' ? 'tr' : 'en') as 'tr' | 'en'
  const [page, setPage] = useState(1)
  const [createOpen, setCreateOpen] = useState(false)

  const { data: invoiceData, isLoading } = useUniPaymentInvoices(pspId, page)
  const createMutation = useCreateInvoiceMutation(pspId)

  const invoices = invoiceData?.models ?? []
  const totalPages = invoiceData?.page_count ?? 1

  // Create form state
  const [orderId, setOrderId] = useState('')
  const [amount, setAmount] = useState('')
  const [currency, setCurrency] = useState('USD')
  const [title, setTitle] = useState('')

  const resetForm = () => {
    setOrderId('')
    setAmount('')
    setCurrency('USD')
    setTitle('')
  }

  const handleCreate = async () => {
    if (!orderId.trim() || !amount) return
    try {
      await createMutation.mutateAsync({
        order_id: orderId.trim(),
        price_amount: parseAmountInput(amount, lang),
        price_currency: currency,
        title: title.trim() || undefined,
      })
      setCreateOpen(false)
      resetForm()
    } catch {
      // Error handled by mutation
    }
  }

  return (
    <div className="space-y-lg">
      {/* Header with Create button */}
      {isAdmin && (
        <div className="flex justify-end">
          <Button size="sm" onClick={() => setCreateOpen(true)}>
            <Plus size={14} weight="bold" className="mr-1" />
            {t('psps.invoices.create')}
          </Button>
        </div>
      )}

      {/* Invoices Table */}
      {isLoading ? (
        <div className="space-y-sm">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-12 w-full rounded-lg" />
          ))}
        </div>
      ) : invoices.length === 0 ? (
        <EmptyState
          icon={Invoice}
          title={t('psps.invoices.noInvoices')}
          description={t('psps.invoices.noInvoicesDesc')}
          action={
            isAdmin ? (
              <Button size="sm" variant="outline" onClick={() => setCreateOpen(true)}>
                <Plus size={14} weight="bold" className="mr-1" />
                {t('psps.invoices.create')}
              </Button>
            ) : undefined
          }
        />
      ) : (
        <>
          <div className="overflow-hidden rounded-xl border border-black/[0.07] bg-bg1">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t('psps.invoices.orderId')}</TableHead>
                  <TableHead className="text-right">{t('psps.invoices.amount')}</TableHead>
                  <TableHead>{t('psps.invoices.currency')}</TableHead>
                  <TableHead>{t('psps.invoices.status')}</TableHead>
                  <TableHead>{t('psps.upTransactions.date')}</TableHead>
                  <TableHead>{t('psps.invoices.invoiceUrl')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {invoices.map((inv) => (
                  <TableRow key={inv.invoice_id}>
                    <TableCell className="font-medium">{inv.order_id}</TableCell>
                    <TableCell className="text-right font-medium tabular-nums">
                      {formatDisplayAmount(inv.price_amount)}
                    </TableCell>
                    <TableCell>
                      <Tag variant="blue" className="text-[10px]">{inv.price_currency}</Tag>
                    </TableCell>
                    <TableCell>
                      {getInvoiceStatusTag(inv.status)}
                    </TableCell>
                    <TableCell className="text-xs tabular-nums text-black/60">
                      {formatDate(inv.created_at)}
                    </TableCell>
                    <TableCell>
                      {inv.invoice_url && (
                        <a
                          href={inv.invoice_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-xs text-blue-600 hover:underline"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <ArrowSquareOut size={12} />
                          Link
                        </a>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-sm">
              <Button
                variant="outline"
                size="sm"
                disabled={page <= 1}
                onClick={() => setPage((p) => p - 1)}
              >
                <CaretLeft size={14} />
              </Button>
              <span className="text-sm text-black/50">
                {page} / {totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                disabled={page >= totalPages}
                onClick={() => setPage((p) => p + 1)}
              >
                <CaretRight size={14} />
              </Button>
            </div>
          )}
        </>
      )}

      {/* Create Invoice Dialog */}
      <Dialog open={createOpen} onOpenChange={(open) => { setCreateOpen(open); if (!open) resetForm() }}>
        <DialogContent size="md" onInteractOutside={(e) => e.preventDefault()}>
          <DialogHeader>
            <DialogTitle>{t('psps.invoices.create')}</DialogTitle>
          </DialogHeader>
          <div className="space-y-md py-2">
            <div className="space-y-sm">
              <Label>{t('psps.invoices.orderId')}</Label>
              <Input
                value={orderId}
                onChange={(e) => setOrderId(e.target.value)}
                placeholder="ORD-001"
                autoFocus
              />
            </div>
            <div className="space-y-sm">
              <Label>{t('psps.invoices.amount')}</Label>
              <Input
                type="text"
                inputMode="decimal"
                value={amount}
                onChange={(e) => setAmount(formatAmountInput(e.target.value, lang))}
                placeholder={amountPlaceholder(lang)}
              />
            </div>
            <div className="space-y-sm">
              <Label>{t('psps.invoices.currency')}</Label>
              <Select value={currency} onValueChange={setCurrency}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="USD">USD</SelectItem>
                  <SelectItem value="EUR">EUR</SelectItem>
                  <SelectItem value="USDT">USDT</SelectItem>
                  <SelectItem value="BTC">BTC</SelectItem>
                  <SelectItem value="ETH">ETH</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-sm">
              <Label>Title</Label>
              <Input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Payment for..."
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)} disabled={createMutation.isPending}>
              {t('psps.settlement.cancel')}
            </Button>
            <Button
              onClick={handleCreate}
              disabled={!orderId.trim() || !amount || createMutation.isPending}
            >
              {createMutation.isPending ? t('psps.settlement.saving') : t('psps.invoices.create')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
