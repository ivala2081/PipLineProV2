import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Wallet, Copy, Check, CurrencyCircleDollar } from '@phosphor-icons/react'
import {
  Card,
  Button,
  Tag,
  EmptyState,
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
  Skeleton,
} from '@ds'
import {
  useUniPaymentBalances,
  useUniPaymentAccounts,
  useUniPaymentDepositAddress,
} from '@/hooks/queries/useUniPaymentQuery'

function formatAmount(value: number | undefined | null): string {
  if (value == null) return '0.00'
  return Number(value).toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 6,
  })
}

function DepositAddressCell({ pspId, accountId }: { pspId: string; accountId: string }) {
  const { data: address, isLoading } = useUniPaymentDepositAddress(pspId, accountId)
  const [copied, setCopied] = useState(false)

  const handleCopy = (e: React.MouseEvent) => {
    e.stopPropagation()
    if (address?.address) {
      navigator.clipboard.writeText(address.address)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  if (isLoading) return <Skeleton className="h-4 w-32" />
  if (!address?.address) return <span className="text-black/30">-</span>

  return (
    <div className="flex items-center gap-xs">
      <code className="text-xs text-black/60">
        {address.address.substring(0, 8)}...{address.address.substring(address.address.length - 6)}
      </code>
      <Button variant="ghost" size="sm" className="h-6 w-6 p-0" onClick={handleCopy}>
        {copied ? (
          <Check size={12} className="text-green-600" />
        ) : (
          <Copy size={12} className="text-black/40" />
        )}
      </Button>
    </div>
  )
}

interface Props {
  pspId: string
}

export function UniPaymentWalletTab({ pspId }: Props) {
  const { t } = useTranslation('pages')
  const { data: balances, isLoading: balancesLoading } = useUniPaymentBalances(pspId)
  const { data: accounts, isLoading: accountsLoading } = useUniPaymentAccounts(pspId)

  const isLoading = balancesLoading || accountsLoading

  return (
    <div className="space-y-lg">
      {/* Balance Cards */}
      <div>
        <h3 className="mb-sm text-sm font-semibold text-black/60">
          {t('psps.wallet.balances')}
        </h3>
        {isLoading ? (
          <div className="grid gap-md sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <Card key={i} className="animate-pulse border border-black/10 bg-bg1">
                <div className="h-16" />
              </Card>
            ))}
          </div>
        ) : balances && balances.length > 0 ? (
          <div className="grid gap-md sm:grid-cols-2 lg:grid-cols-3">
            {balances.map((bal) => (
              <Card key={bal.asset_type} className="border border-black/10 bg-bg1">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-medium text-black/40">{bal.asset_type}</p>
                    <p className="text-lg font-bold tabular-nums">{formatAmount(bal.total)}</p>
                  </div>
                  <Tag variant="blue" className="text-[10px]">
                    {bal.asset_type}
                  </Tag>
                </div>
                <div className="mt-sm flex gap-lg text-[11px] text-black/40">
                  <span>
                    {t('psps.wallet.available')}: <strong className="text-black/60">{formatAmount(bal.available)}</strong>
                  </span>
                  <span>
                    {t('psps.wallet.frozen')}: <strong className="text-black/60">{formatAmount(bal.frozen)}</strong>
                  </span>
                </div>
              </Card>
            ))}
          </div>
        ) : (
          <EmptyState
            icon={Wallet}
            title={t('psps.wallet.noAccounts')}
            description=""
          />
        )}
      </div>

      {/* Accounts Table */}
      {accounts && accounts.length > 0 && (
        <div>
          <h3 className="mb-sm text-sm font-semibold text-black/60">
            {t('psps.wallet.accounts')}
          </h3>
          <div className="overflow-hidden rounded-xl border border-black/[0.07] bg-bg1">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Asset</TableHead>
                  <TableHead className="text-right">{t('psps.wallet.available')}</TableHead>
                  <TableHead className="text-right">{t('psps.wallet.frozen')}</TableHead>
                  <TableHead>{t('psps.wallet.depositAddress')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {accounts.map((acc) => (
                  <TableRow key={acc.id}>
                    <TableCell>
                      <div className="flex items-center gap-xs">
                        <CurrencyCircleDollar size={16} className="text-black/40" />
                        <span className="font-medium">{acc.asset_type}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {formatAmount(acc.available)}
                    </TableCell>
                    <TableCell className="text-right tabular-nums text-black/40">
                      {formatAmount(acc.frozen)}
                    </TableCell>
                    <TableCell>
                      <DepositAddressCell pspId={pspId} accountId={acc.id} />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>
      )}
    </div>
  )
}
