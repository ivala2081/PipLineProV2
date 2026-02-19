import { useTranslation } from 'react-i18next'
import type { TokenAllocation, ChainAllocation } from '@/hooks/queries/usePortfolioQuery'

const CHAIN_META: Record<string, { label: string; color: string }> = {
  tron: { label: 'TRON', color: 'bg-red' },
  ethereum: { label: 'ETH', color: 'bg-blue' },
  bsc: { label: 'BSC', color: 'bg-yellow' },
  bitcoin: { label: 'BTC', color: 'bg-orange' },
  solana: { label: 'SOL', color: 'bg-purple' },
}

const TOKEN_COLORS = [
  'bg-green',
  'bg-blue',
  'bg-orange',
  'bg-red',
  'bg-purple',
  'bg-cyan',
  'bg-indigo',
  'bg-black/40',
]

interface PortfolioSummaryProps {
  totalUsd: number
  tokenAllocation: TokenAllocation[]
  chainAllocation: ChainAllocation[]
  isLoading: boolean
}

export function PortfolioSummary({
  totalUsd,
  tokenAllocation,
  chainAllocation,
  isLoading,
}: PortfolioSummaryProps) {
  const { t } = useTranslation('pages')

  return (
    <div className="space-y-md">
      {!isLoading && totalUsd > 0 && (
        <div className="grid grid-cols-1 gap-md sm:grid-cols-2">
          {/* Token allocation */}
          <div className="rounded-xl border border-black/10 bg-bg1 px-5 py-4">
            <p className="mb-2.5 text-xs font-medium uppercase tracking-wider text-black/40">
              {t('accounting.portfolio.tokenAllocation', 'Token Allocation')}
            </p>
            {/* Stacked bar */}
            <div className="mb-3 flex h-2.5 overflow-hidden rounded-full bg-black/[0.04]">
              {tokenAllocation.slice(0, 8).map((tok, i) => (
                <div
                  key={tok.symbol}
                  className={`${TOKEN_COLORS[i % TOKEN_COLORS.length]} transition-all`}
                  style={{ width: `${tok.percent}%` }}
                  title={`${tok.symbol}: ${tok.percent.toFixed(1)}%`}
                />
              ))}
            </div>
            {/* Legend */}
            <div className="flex flex-wrap gap-x-4 gap-y-1">
              {tokenAllocation.slice(0, 6).map((tok, i) => (
                <div key={tok.symbol} className="flex items-center gap-1.5">
                  <span
                    className={`inline-block size-2 rounded-full ${TOKEN_COLORS[i % TOKEN_COLORS.length]}`}
                  />
                  <span className="text-xs font-medium text-black/60">{tok.symbol}</span>
                  <span className="font-mono text-xs tabular-nums text-black/35">
                    {tok.percent.toFixed(1)}%
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Chain allocation */}
          <div className="rounded-xl border border-black/10 bg-bg1 px-5 py-4">
            <p className="mb-2.5 text-xs font-medium uppercase tracking-wider text-black/40">
              {t('accounting.portfolio.chainAllocation', 'Chain Allocation')}
            </p>
            {/* Stacked bar */}
            <div className="mb-3 flex h-2.5 overflow-hidden rounded-full bg-black/[0.04]">
              {chainAllocation.map((ch) => {
                const meta = CHAIN_META[ch.chain]
                return (
                  <div
                    key={ch.chain}
                    className={`${meta?.color ?? 'bg-black/40'} transition-all`}
                    style={{ width: `${ch.percent}%` }}
                    title={`${meta?.label ?? ch.chain}: ${ch.percent.toFixed(1)}%`}
                  />
                )
              })}
            </div>
            {/* Legend */}
            <div className="flex flex-wrap gap-x-4 gap-y-1">
              {chainAllocation.map((ch) => {
                const meta = CHAIN_META[ch.chain]
                return (
                  <div key={ch.chain} className="flex items-center gap-1.5">
                    <span
                      className={`inline-block size-2 rounded-full ${meta?.color ?? 'bg-black/40'}`}
                    />
                    <span className="text-xs font-medium text-black/60">
                      {meta?.label ?? ch.chain}
                    </span>
                    <span className="font-mono text-xs tabular-nums text-black/35">
                      {ch.percent.toFixed(1)}%
                    </span>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
