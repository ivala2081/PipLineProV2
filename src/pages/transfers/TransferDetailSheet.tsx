import { useTranslation } from 'react-i18next'
import type { TransferRow } from '@/hooks/useTransfers'
import { formatDate, formatNumber } from './transfersTableUtils'
import { Sheet, SheetContent, SheetHeader, SheetTitle, Tag } from '@ds'

interface TransferDetailSheetProps {
  row: TransferRow | null
  onClose: () => void
}

function DetailRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between py-2.5">
      <span className="text-sm text-black/45">{label}</span>
      <span className="text-sm font-medium text-black/90">{children}</span>
    </div>
  )
}

export function TransferDetailSheet({ row, onClose }: TransferDetailSheetProps) {
  const { t, i18n } = useTranslation('pages')
  const lang = i18n.language

  return (
    <Sheet
      open={row !== null}
      onOpenChange={(open) => {
        if (!open) onClose()
      }}
    >
      <SheetContent side="right" className="w-full sm:max-w-md">
        <SheetHeader>
          <SheetTitle>{t('transfers.detail.title')}</SheetTitle>
        </SheetHeader>

        {row && (
          <div className="mt-6 space-y-0 divide-y divide-black/[0.06]">
            <DetailRow label={t('transfers.columns.fullName')}>{row.full_name}</DetailRow>
            <DetailRow label={t('transfers.columns.paymentMethod')}>
              {row.payment_method?.name ?? '—'}
            </DetailRow>
            <DetailRow label={t('transfers.columns.date')}>
              {formatDate(row.transfer_date, lang).date}{' '}
              <span className="text-black/40">{formatDate(row.transfer_date, lang).time}</span>
            </DetailRow>
            <DetailRow label={t('transfers.columns.category')}>
              <Tag variant={(row.category?.is_deposit ?? true) ? 'default' : 'red'}>
                {row.category
                  ? row.category.is_deposit
                    ? t('transfers.categoryValues.deposit')
                    : t('transfers.categoryValues.withdrawal')
                  : '—'}
              </Tag>
            </DetailRow>
            <DetailRow label={t('transfers.columns.amount')}>
              <span
                className={`font-mono tabular-nums ${row.amount >= 0 ? 'text-green' : 'text-red'}`}
              >
                {formatNumber(Math.abs(row.amount), lang)}
              </span>
            </DetailRow>
            <DetailRow label={t('transfers.columns.currency')}>
              <Tag variant="default">{row.currency}</Tag>
            </DetailRow>
            <DetailRow label={t('transfers.columns.exchangeRate')}>
              <span className="font-mono tabular-nums">{row.exchange_rate?.toFixed(4) ?? '—'}</span>
            </DetailRow>
            <DetailRow label={t('transfers.columns.tlEquivalent')}>
              <span className="font-mono tabular-nums text-blue">
                {formatNumber(Math.abs(row.amount_try ?? 0), lang)} TL
              </span>
            </DetailRow>
            <DetailRow label={t('transfers.columns.usdEquivalent')}>
              <span className="font-mono tabular-nums text-green">
                {formatNumber(Math.abs(row.amount_usd ?? 0), lang)} USD
              </span>
            </DetailRow>
            <DetailRow label={t('transfers.columns.type')}>
              {row.type?.name
                ? t(`transfers.typeValues.${row.type.name}`, {
                    defaultValue: row.type.name,
                  })
                : '—'}
            </DetailRow>
            <DetailRow label={t('transfers.columns.crmId')}>
              <span className="font-mono text-[12px]">{row.crm_id || '—'}</span>
            </DetailRow>
            <DetailRow label={t('transfers.columns.metaId')}>
              <span className="font-mono text-[12px]">{row.meta_id || '—'}</span>
            </DetailRow>
          </div>
        )}
      </SheetContent>
    </Sheet>
  )
}
