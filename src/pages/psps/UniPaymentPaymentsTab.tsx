import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { PaperPlaneTilt, Plus, CaretLeft, CaretRight, XCircle } from '@phosphor-icons/react'
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
  useUniPaymentAccounts,
  useUniPaymentPayments,
  useCreatePaymentMutation,
  useCancelPaymentMutation,
} from '@/hooks/queries/useUniPaymentQuery'
import type { UniPaymentPaymentStatus } from '@/lib/uniPaymentTypes'

function formatAmount(value: number): string {
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

function getPaymentStatusTag(status: UniPaymentPaymentStatus) {
  const map: Record<UniPaymentPaymentStatus, 'green' | 'orange' | 'red' | 'blue'> = {
    Pending: 'orange',
    Confirmed: 'blue',
    Complete: 'green',
    Cancelled: 'red',
    Failed: 'red',
  }
  return <Tag variant={map[status] ?? 'blue'} className="text-[10px]">{status}</Tag>
}

interface Props {
  pspId: string
  isAdmin: boolean
}

export function UniPaymentPaymentsTab({ pspId, isAdmin }: Props) {
  const { t } = useTranslation('pages')
  const [page, setPage] = useState(1)
  const [createOpen, setCreateOpen] = useState(false)

  const { data: accounts } = useUniPaymentAccounts(pspId)
  const { data: paymentData, isLoading } = useUniPaymentPayments(pspId, page)
  const createMutation = useCreatePaymentMutation(pspId)
  const cancelMutation = useCancelPaymentMutation(pspId)

  const payments = paymentData?.models ?? []
  const totalPages = paymentData?.page_count ?? 1

  // Create form state
  const [fromAccount, setFromAccount] = useState('')
  const [toAddress, setToAddress] = useState('')
  const [assetType, setAssetType] = useState('USDT')
  const [amount, setAmount] = useState('')
  const [note, setNote] = useState('')

  const resetForm = () => {
    setFromAccount('')
    setToAddress('')
    setAssetType('USDT')
    setAmount('')
    setNote('')
  }

  const handleCreate = async () => {
    if (!fromAccount || !toAddress.trim() || !amount) return
    try {
      await createMutation.mutateAsync({
        from_account_id: fromAccount,
        to: toAddress.trim(),
        asset_type: assetType,
        amount: Number(amount),
        note: note.trim() || undefined,
      })
      setCreateOpen(false)
      resetForm()
    } catch {
      // Error handled by mutation
    }
  }

  const handleCancel = async (paymentId: string) => {
    if (!confirm(t('psps.upPayments.cancelConfirm'))) return
    try {
      await cancelMutation.mutateAsync(paymentId)
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
            {t('psps.upPayments.create')}
          </Button>
        </div>
      )}

      {/* Payments Table */}
      {isLoading ? (
        <div className="space-y-sm">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-12 w-full rounded-lg" />
          ))}
        </div>
      ) : payments.length === 0 ? (
        <EmptyState
          icon={PaperPlaneTilt}
          title={t('psps.upPayments.noPayments')}
          description={t('psps.upPayments.noPaymentsDesc')}
          action={
            isAdmin ? (
              <Button size="sm" variant="outline" onClick={() => setCreateOpen(true)}>
                <Plus size={14} weight="bold" className="mr-1" />
                {t('psps.upPayments.create')}
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
                  <TableHead>{t('psps.upTransactions.date')}</TableHead>
                  <TableHead>To</TableHead>
                  <TableHead>Asset</TableHead>
                  <TableHead className="text-right">{t('psps.upPayments.amount')}</TableHead>
                  <TableHead className="text-right">{t('psps.upTransactions.fee')}</TableHead>
                  <TableHead>{t('psps.upPayments.status')}</TableHead>
                  <TableHead />
                </TableRow>
              </TableHeader>
              <TableBody>
                {payments.map((pmt) => (
                  <TableRow key={pmt.id}>
                    <TableCell className="text-xs tabular-nums text-black/60">
                      {formatDate(pmt.created_at)}
                    </TableCell>
                    <TableCell className="max-w-[180px] truncate text-xs font-mono">
                      {pmt.to}
                    </TableCell>
                    <TableCell>
                      <Tag variant="blue" className="text-[10px]">{pmt.asset_type}</Tag>
                    </TableCell>
                    <TableCell className="text-right font-medium tabular-nums text-red-600">
                      -{formatAmount(pmt.amount)}
                    </TableCell>
                    <TableCell className="text-right tabular-nums text-black/40">
                      {pmt.fee ? formatAmount(pmt.fee) : '-'}
                    </TableCell>
                    <TableCell>{getPaymentStatusTag(pmt.status)}</TableCell>
                    <TableCell>
                      {isAdmin && pmt.status === 'Pending' && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 text-red-600 hover:text-red-700"
                          onClick={() => handleCancel(pmt.id)}
                          disabled={cancelMutation.isPending}
                        >
                          <XCircle size={14} className="mr-1" />
                          {t('psps.upPayments.cancel')}
                        </Button>
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

      {/* Create Payment Dialog */}
      <Dialog open={createOpen} onOpenChange={(open) => { setCreateOpen(open); if (!open) resetForm() }}>
        <DialogContent size="md" onInteractOutside={(e) => e.preventDefault()}>
          <DialogHeader>
            <DialogTitle>{t('psps.upPayments.create')}</DialogTitle>
          </DialogHeader>
          <div className="space-y-md py-2">
            <div className="space-y-sm">
              <Label>{t('psps.upPayments.fromAccount')}</Label>
              <Select value={fromAccount} onValueChange={setFromAccount}>
                <SelectTrigger>
                  <SelectValue placeholder="Select account" />
                </SelectTrigger>
                <SelectContent>
                  {(accounts ?? []).map((acc) => (
                    <SelectItem key={acc.id} value={acc.id}>
                      {acc.asset_type} ({formatAmount(acc.available)})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-sm">
              <Label>To Address</Label>
              <Input
                value={toAddress}
                onChange={(e) => setToAddress(e.target.value)}
                placeholder="Wallet address"
              />
            </div>
            <div className="grid grid-cols-2 gap-md">
              <div className="space-y-sm">
                <Label>Asset</Label>
                <Select value={assetType} onValueChange={setAssetType}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="USDT">USDT</SelectItem>
                    <SelectItem value="USDC">USDC</SelectItem>
                    <SelectItem value="BTC">BTC</SelectItem>
                    <SelectItem value="ETH">ETH</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-sm">
                <Label>{t('psps.upPayments.amount')}</Label>
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="100.00"
                />
              </div>
            </div>
            <div className="space-y-sm">
              <Label>Note</Label>
              <Input
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="Optional note"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)} disabled={createMutation.isPending}>
              {t('psps.settlement.cancel')}
            </Button>
            <Button
              onClick={handleCreate}
              disabled={!fromAccount || !toAddress.trim() || !amount || createMutation.isPending}
            >
              {createMutation.isPending ? t('psps.settlement.saving') : t('psps.upPayments.create')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
