import type { TvLeaderboardData } from '@/hooks/queries/useTvQuery'
import type { TvTheme } from './TvLeaderboardPage'
import { Sparkline } from './Sparkline'

type Props = {
  data: TvLeaderboardData
  theme: TvTheme
}

function formatUsd(val: number) {
  if (val >= 1_000_000) return `$${(val / 1_000_000).toFixed(2)}M`
  if (val >= 1_000) return `$${(val / 1_000).toFixed(1)}K`
  return `$${Math.round(val).toLocaleString('en-US')}`
}

function Stat({ label, value, l }: { label: string; value: string; l: boolean }) {
  return (
    <div>
      <p className={`text-[10px] font-medium uppercase tracking-[0.25em] ${l ? 'text-black/30' : 'text-white/25'}`}>{label}</p>
      <p className={`mt-0.5 tabular-nums text-lg font-semibold ${l ? 'text-black/55' : 'text-white/55'}`}>{value}</p>
    </div>
  )
}

export function TvStats({ data, theme }: Props) {
  const l = theme === 'light'
  const { entries, hourlyToday, biggestToday } = data

  const todayUsd = entries.reduce((s, e) => s + e.todayUsd, 0)
  const todayCount = entries.reduce((s, e) => s + e.todayCount, 0)
  const todayFtd = entries.reduce((s, e) => s + e.todayFtdCount, 0)
  const monthlyUsd = entries.reduce((s, e) => s + e.totalUsd, 0)
  const monthlyCount = entries.reduce((s, e) => s + e.transferCount, 0)

  return (
    <div className={`shrink-0 border-t px-12 py-5 ${l ? 'border-black/[0.06]' : 'border-white/[0.06]'}`}>
      <div className="flex items-center gap-12">
        <div className="flex items-center gap-8">
          <span className={`text-[10px] font-semibold tracking-[0.3em] ${l ? 'text-black/20' : 'text-white/18'}`}>BUGÜN</span>
          <Stat label="Hacim" value={formatUsd(todayUsd)} l={l} />
          <Stat label="İşlem" value={String(todayCount)} l={l} />
          <Stat label="FTD" value={String(todayFtd)} l={l} />
        </div>

        <div className={`h-6 w-px ${l ? 'bg-black/[0.08]' : 'bg-white/[0.08]'}`} />

        <div className="flex items-center gap-8">
          <span className={`text-[10px] font-semibold tracking-[0.3em] ${l ? 'text-black/20' : 'text-white/18'}`}>AYLIK</span>
          <Stat label="Hacim" value={formatUsd(monthlyUsd)} l={l} />
          <Stat label="İşlem" value={String(monthlyCount)} l={l} />
        </div>

        <div className={`h-6 w-px ${l ? 'bg-black/[0.08]' : 'bg-white/[0.08]'}`} />

        {biggestToday && (
          <div className="flex items-center gap-8">
            <span className={`text-[10px] font-semibold tracking-[0.3em] ${l ? 'text-black/20' : 'text-white/18'}`}>EN BÜYÜK</span>
            <div>
              <p className={`text-[10px] font-medium uppercase tracking-[0.25em] ${l ? 'text-black/30' : 'text-white/25'}`}>{biggestToday.employeeName}</p>
              <p className={`mt-0.5 tabular-nums text-lg font-semibold ${l ? 'text-black/55' : 'text-white/55'}`}>{formatUsd(biggestToday.amount)}</p>
            </div>
          </div>
        )}

        <div className="ml-auto flex items-center gap-4">
          <span className={`text-[10px] font-semibold tracking-[0.3em] ${l ? 'text-black/20' : 'text-white/18'}`}>SAATLİK</span>
          <Sparkline data={hourlyToday} width={180} height={36} theme={theme} />
        </div>
      </div>
    </div>
  )
}
