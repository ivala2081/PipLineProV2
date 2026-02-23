import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { ArrowsLeftRight, CaretLeft, CaretRight } from '@phosphor-icons/react'
import {
  Button,
  Tag,
  EmptyState,
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
  useUniPaymentTransactions,
} from '@/hooks/queries/useUniPaymentQuery'

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

function getTxnTypeTag(txnType: string) {
  const type = txnType.toLowerCase()
  if (type.includes('deposit') || type.includes('invoice_payment')) {
    return <Tag variant="green" className="text-[10px]">{txnType}</Tag>
  }
  if (type.includes('withdrawal') || type.includes('payout')) {
    return <Tag variant="red" className="text-[10px]">{txnType}</Tag>
  }
  if (type.includes('exchange')) {
    return <Tag variant="purple" className="text-[10px]">{txnType}</Tag>
  }
  return <Tag variant="blue" className="text-[10px]">{txnType}</Tag>
}

function getStatusTag(status: string) {
  const s = status.toLowerCase()
  if (s === 'completed' || s === 'complete' || s === 'confirmed') {
    return <Tag variant="green" className="text-[10px]">{status}</Tag>
  }
  if (s === 'pending') {
    return <Tag variant="orange" className="text-[10px]">{status}</Tag>
  }
  if (s === 'failed' || s === 'cancelled') {
    return <Tag variant="red" className="text-[10px]">{status}</Tag>
  }
  return <Tag className="text-[10px]">{status}</Tag>
}

interface Props {
  pspId: string
}

export function UniPaymentTransactionsTab({ pspId }: Props) {
  const { t } = useTranslation('pages')
  const { data: accounts, isLoading: accountsLoading } = useUniPaymentAccounts(pspId)

  const [selectedAccount, setSelectedAccount] = useState<string>('')
  const [page, setPage] = useState(1)

  // Auto-select first account
  const accountId = selectedAccount || accounts?.[0]?.id || ''

  const { data: txnData, isLoading: txnLoading } = useUniPaymentTransactions(
    pspId,
    accountId || undefined,
    page,
  )

  const isLoading = accountsLoading || txnLoading
  const transactions = txnData?.models ?? []
  const totalPages = txnData?.page_count ?? 1

  return (
    <div className="space-y-lg">
      {/* Account Selector */}
      {accounts && accounts.length > 1 && (
        <div className="flex items-center gap-sm">
          <Select value={accountId} onValueChange={(v) => { setSelectedAccount(v); setPage(1) }}>
            <SelectTrigger className="w-48">
              <SelectValue placeholder="Select account" />
            </SelectTrigger>
            <SelectContent>
              {accounts.map((acc) => (
                <SelectItem key={acc.id} value={acc.id}>
                  {acc.asset_type} ({formatAmount(acc.available)})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      {/* Transactions Table */}
      {isLoading ? (
        <div className="space-y-sm">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-12 w-full rounded-lg" />
          ))}
        </div>
      ) : transactions.length === 0 ? (
        <EmptyState
          icon={ArrowsLeftRight}
          title={t('psps.upTransactions.noTransactions')}
          description={t('psps.upTransactions.noTransactionsDesc')}
        />
      ) : (
        <>
          <div className="overflow-hidden rounded-xl border border-black/[0.07] bg-bg1">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t('psps.upTransactions.date')}</TableHead>
                  <TableHead>{t('psps.upTransactions.type')}</TableHead>
                  <TableHead>Asset</TableHead>
                  <TableHead className="text-right">{t('psps.upTransactions.amount')}</TableHead>
                  <TableHead className="text-right">{t('psps.upTransactions.fee')}</TableHead>
                  <TableHead>{t('psps.upTransactions.status')}</TableHead>
                  <TableHead>Note</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {transactions.map((txn) => (
                  <TableRow key={txn.id}>
                    <TableCell className="text-xs tabular-nums text-black/60">
                      {formatDate(txn.created_at)}
                    </TableCell>
                    <TableCell>{getTxnTypeTag(txn.txn_type)}</TableCell>
                    <TableCell>
                      <Tag variant="blue" className="text-[10px]">{txn.asset_type}</Tag>
                    </TableCell>
                    <TableCell
                      className={`text-right font-medium tabular-nums ${
                        txn.amount > 0 ? 'text-green-600' : 'text-red-600'
                      }`}
                    >
                      {txn.amount > 0 ? '+' : ''}{formatAmount(txn.amount)}
                    </TableCell>
                    <TableCell className="text-right tabular-nums text-black/40">
                      {txn.fee ? formatAmount(txn.fee) : '-'}
                    </TableCell>
                    <TableCell>{getStatusTag(txn.status)}</TableCell>
                    <TableCell className="max-w-[200px] truncate text-xs text-black/50">
                      {txn.note || txn.order_id || '-'}
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
    </div>
  )
}
