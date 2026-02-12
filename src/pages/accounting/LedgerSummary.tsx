import { useTranslation } from 'react-i18next'
import {
  ArrowDown,
  ArrowUp,
  CurrencyDollar,
  Money,
  Coins,
} from '@phosphor-icons/react'
import type { AccountingSummary } from '@/hooks/queries/useAccountingQuery'
import { Card, Skeleton } from '@ds'

function formatNumber(n: number) {
  return n.toLocaleString('tr-TR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })
}

const REGISTER_CONFIG: Record<
  string,
  {
    label: string
    icon: typeof CurrencyDollar
    accent: string
    iconBg: string
    iconColor: string
  }
> = {
  USDT: {
    label: 'USDT',
    icon: CurrencyDollar,
    accent: 'text-green',
    iconBg: 'bg-green/10',
    iconColor: 'text-green',
  },
  NAKIT_TL: {
    label: 'Cash TL',
    icon: Money,
    accent: 'text-blue',
    iconBg: 'bg-blue/10',
    iconColor: 'text-blue',
  },
  NAKIT_USD: {
    label: 'Cash USD',
    icon: Coins,
    accent: 'text-orange',
    iconBg: 'bg-orange/10',
    iconColor: 'text-orange',
  },
}

interface LedgerSummaryProps {
  summary: AccountingSummary[]
  isLoading: boolean
}

export function LedgerSummary({ summary, isLoading }: LedgerSummaryProps) {
  const { t } = useTranslation('pages')

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <Card key={i} padding="default" className="border border-black/10 bg-bg1">
            <div className="mb-4 flex items-center gap-3">
              <Skeleton className="size-10 rounded-xl" />
              <Skeleton className="h-4 w-20 rounded" />
            </div>
            <Skeleton className="mb-3 h-8 w-32 rounded" />
            <div className="flex gap-6">
              <Skeleton className="h-3 w-20 rounded" />
              <Skeleton className="h-3 w-20 rounded" />
            </div>
          </Card>
        ))}
      </div>
    )
  }

  const registers = ['USDT', 'NAKIT_TL', 'NAKIT_USD']
  const cards = registers.map((reg) => {
    const s = summary.find((item) => item.register === reg)
    return {
      register: reg,
      totalIn: s?.totalIn ?? 0,
      totalOut: s?.totalOut ?? 0,
      net: s?.net ?? 0,
    }
  })

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
      {cards.map((c) => {
        const config = REGISTER_CONFIG[c.register]
        const Icon = config.icon
        const totalFlow = c.totalIn + c.totalOut
        const inRatio = totalFlow > 0 ? (c.totalIn / totalFlow) * 100 : 50

        return (
          <Card
            key={c.register}
            padding="default"
            className="group border border-black/10 bg-bg1 transition-shadow hover:shadow-sm"
          >
            {/* Header: icon + label */}
            <div className="mb-4 flex items-center gap-3">
              <div
                className={`flex size-10 items-center justify-center rounded-xl ${config.iconBg}`}
              >
                <Icon size={20} weight="duotone" className={config.iconColor} />
              </div>
              <span className="text-xs font-semibold uppercase tracking-wider text-black/40">
                {config.label}
              </span>
            </div>

            {/* Net balance — large */}
            <p
              className={`font-mono text-2xl font-bold tabular-nums ${c.net >= 0 ? 'text-green' : 'text-red'}`}
            >
              {c.net >= 0 ? '+' : ''}
              {formatNumber(c.net)}
            </p>

            {/* In/Out flow bar */}
            <div className="mt-4 mb-3">
              <div className="flex h-1.5 overflow-hidden rounded-full bg-black/[0.04]">
                <div
                  className="rounded-full bg-green transition-all"
                  style={{ width: `${inRatio}%` }}
                />
                <div
                  className="rounded-full bg-red transition-all"
                  style={{ width: `${100 - inRatio}%` }}
                />
              </div>
            </div>

            {/* In/Out labels */}
            <div className="flex items-center justify-between text-xs text-black/50">
              <span className="flex items-center gap-1.5">
                <ArrowDown size={11} weight="bold" className="text-green" />
                {t('accounting.in')}{' '}
                <span className="font-mono font-medium tabular-nums text-black/70">
                  {formatNumber(c.totalIn)}
                </span>
              </span>
              <span className="flex items-center gap-1.5">
                <ArrowUp size={11} weight="bold" className="text-red" />
                {t('accounting.out')}{' '}
                <span className="font-mono font-medium tabular-nums text-black/70">
                  {formatNumber(c.totalOut)}
                </span>
              </span>
            </div>
          </Card>
        )
      })}
    </div>
  )
}
