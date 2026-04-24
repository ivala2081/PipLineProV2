import { useState, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { Info, Money } from '@phosphor-icons/react'
import {
  EmptyState,
  Skeleton,
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from '@ds'
import { useIBPaymentsQuery, type IBPaymentWithPartner } from '@/hooks/queries/useIBPaymentsQuery'
import { useIBPartnersQuery } from '@/hooks/queries/useIBPartnersQuery'

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

const fmt = new Intl.NumberFormat(undefined, {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
})

function formatAmount(n: number) {
  return fmt.format(n)
}

function formatDate(date: string) {
  return new Date(date).toLocaleDateString()
}

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export function PaymentsTab() {
  const { t } = useTranslation('pages')

  const { payments, isLoading } = useIBPaymentsQuery()
  const { partners } = useIBPartnersQuery()

  const [filterPartnerId, setFilterPartnerId] = useState('__all__')

  /* ---- Filtered list ---- */

  const filtered = useMemo<IBPaymentWithPartner[]>(() => {
    if (filterPartnerId === '__all__') return payments
    return payments.filter((p) => p.ib_partner_id === filterPartnerId)
  }, [payments, filterPartnerId])

  /* ---- Render ---- */

  return (
    <div className="space-y-md">
      {/* Partner filter */}
      <div className="flex items-center gap-sm">
        <div className="w-full max-w-xs">
          <Select value={filterPartnerId} onValueChange={setFilterPartnerId}>
            <SelectTrigger>
              <SelectValue placeholder={t('ib.payments.allPartners')} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__all__">{t('ib.payments.allPartners')}</SelectItem>
              {partners.map((p) => (
                <SelectItem key={p.id} value={p.id}>
                  {p.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Loading */}
      {isLoading ? (
        <div className="space-y-sm">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-12 w-full rounded-md" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        /* Empty state */
        <EmptyState
          icon={Money}
          title={
            filterPartnerId !== '__all__' ? t('ib.payments.noResults') : t('ib.payments.empty')
          }
          description={filterPartnerId !== '__all__' ? undefined : t('ib.payments.emptyDesc')}
        />
      ) : (
        /* Table */
        <Table cardOnMobile>
          <TableHeader>
            <TableRow>
              <TableHead>{t('ib.payments.partner')}</TableHead>
              <TableHead className="text-right">{t('ib.payments.amount')}</TableHead>
              <TableHead>{t('ib.payments.currency')}</TableHead>
              <TableHead>{t('ib.payments.register')}</TableHead>
              <TableHead>{t('ib.payments.paymentMethod')}</TableHead>
              <TableHead>{t('ib.payments.reference')}</TableHead>
              <TableHead>{t('ib.payments.paymentDate')}</TableHead>
              <TableHead>{t('ib.payments.description')}</TableHead>
              <TableHead>{t('ib.payments.notes')}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.map((payment) => (
              <TableRow key={payment.id}>
                <TableCell data-label={t('ib.payments.partner')}>
                  <span className="font-medium">{payment.ib_partner?.name ?? '—'}</span>
                </TableCell>
                <TableCell data-label={t('ib.payments.amount')} className="text-right tabular-nums">
                  {formatAmount(payment.amount)}
                </TableCell>
                <TableCell data-label={t('ib.payments.currency')}>{payment.currency}</TableCell>
                <TableCell data-label={t('ib.payments.register')}>{payment.register}</TableCell>
                <TableCell data-label={t('ib.payments.paymentMethod')}>
                  {payment.payment_method ?? '—'}
                </TableCell>
                <TableCell data-label={t('ib.payments.reference')}>
                  {payment.reference ?? '—'}
                </TableCell>
                <TableCell data-label={t('ib.payments.paymentDate')}>
                  {formatDate(payment.payment_date)}
                </TableCell>
                <TableCell data-label={t('ib.payments.description')}>
                  {payment.description ?? '—'}
                </TableCell>
                <TableCell data-label={t('ib.payments.notes')}>{payment.notes ?? '—'}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}

      {/* Info note */}
      <div className="flex items-start gap-2 rounded-lg border border-blue/15 bg-blue/[0.03] px-3 py-2.5">
        <Info size={14} className="mt-0.5 shrink-0 text-blue/60" />
        <p className="text-xs text-black/50">{t('ib.payments.accountingNote')}</p>
      </div>
    </div>
  )
}
