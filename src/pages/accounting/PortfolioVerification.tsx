import { useTranslation } from 'react-i18next'
import { ShieldCheck, Warning } from '@phosphor-icons/react'
import {
  useAccountingOverviewSummary,
  type RegisterSummary,
} from '@/hooks/queries/useAccountingQuery'
import { Skeleton, Tag, EmptyState } from '@ds'

interface PortfolioVerificationProps {
  period: string
}

function formatNumber(n: number) {
  return n.toLocaleString('tr-TR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })
}

export function PortfolioVerification({ period }: PortfolioVerificationProps) {
  const { t } = useTranslation('pages')
  const { data: summary, isLoading } = useAccountingOverviewSummary(period)

  if (isLoading) {
    return (
      <div className="space-y-sm">
        <Skeleton className="h-6 w-48 rounded-md" />
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-16 w-full rounded-lg" />
        ))}
      </div>
    )
  }

  const registers = summary?.registers ?? []

  if (registers.length === 0) {
    return (
      <EmptyState
        icon={ShieldCheck}
        title={t('accounting.portfolio.empty', 'No register data')}
        description={t(
          'accounting.portfolio.emptyDesc',
          'Configure registers and add entries to see portfolio verification.',
        )}
      />
    )
  }

  return (
    <div className="space-y-md">
      <h3 className="flex items-center gap-2 text-sm font-semibold text-black/70">
        <ShieldCheck size={16} weight="bold" />
        {t('accounting.portfolio.verification', 'Portfolio Verification')}
      </h3>

      <div className="overflow-hidden rounded-xl border border-black/10">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-black/[0.02] text-left">
              <th className="px-4 py-2.5 text-xs font-semibold text-black/50">
                {t('accounting.portfolio.register', 'Register')}
              </th>
              <th className="px-4 py-2.5 text-right text-xs font-semibold text-black/50">
                {t('accounting.portfolio.registerBalance', 'Ledger Balance')}
              </th>
              <th className="px-4 py-2.5 text-right text-xs font-semibold text-black/50">
                {t('accounting.portfolio.currency', 'Currency')}
              </th>
              <th className="px-4 py-2.5 text-right text-xs font-semibold text-black/50">
                {t('accounting.portfolio.status', 'Status')}
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-black/[0.04]">
            {registers.map((reg: RegisterSummary) => (
              <tr key={reg.id} className="hover:bg-black/[0.01]">
                <td className="px-4 py-3">
                  <span className="font-medium text-black/80">{reg.label}</span>
                  <span className="ml-2 font-mono text-xs text-black/40">{reg.name}</span>
                </td>
                <td className="px-4 py-3 text-right">
                  <span
                    className={`font-mono font-medium tabular-nums ${reg.closing >= 0 ? 'text-green' : 'text-red'}`}
                  >
                    {formatNumber(reg.closing)}
                  </span>
                </td>
                <td className="px-4 py-3 text-right">
                  <Tag variant="default">{reg.currency}</Tag>
                </td>
                <td className="px-4 py-3 text-right">
                  {reg.closing < 0 ? (
                    <Tag variant="red" className="gap-1">
                      <Warning size={10} />
                      {t('accounting.portfolio.negative', 'Negative')}
                    </Tag>
                  ) : (
                    <Tag variant="default">{t('accounting.portfolio.ok', 'OK')}</Tag>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Total portfolio */}
      {summary?.totals && (
        <div className="rounded-xl border border-black/10 bg-black/[0.02] px-4 py-3">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-black/60">
              {t('accounting.portfolio.totalUsd', 'Total Portfolio (USD)')}
            </span>
            <span className="font-mono text-lg font-bold tabular-nums text-black/80">
              ${formatNumber(summary.totals.portfolio_usd)}
            </span>
          </div>
        </div>
      )}
    </div>
  )
}
