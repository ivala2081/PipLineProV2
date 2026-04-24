import type { LeaderboardEntry } from '@/hooks/queries/useTvQuery'
import type { TvTheme } from './TvLeaderboardPage'

type Props = {
  entry: LeaderboardEntry
  theme: TvTheme
}

function formatUsd(val: number) {
  if (val >= 1_000_000) return `$${(val / 1_000_000).toFixed(2)}M`
  if (val >= 10_000) return `$${(val / 1_000).toFixed(0)}K`
  if (val >= 1_000) return `$${(val / 1_000).toFixed(1)}K`
  return `$${Math.round(val).toLocaleString('en-US')}`
}

export function Spotlight({ entry, theme }: Props) {
  const l = theme === 'light'

  return (
    <div className="shrink-0 px-12 py-6">
      <div className="flex items-end justify-between">
        <div className="flex items-end gap-6">
          <span
            className={`text-5xl font-bold leading-none ${l ? 'text-black/[0.08]' : 'text-white/[0.12]'}`}
          >
            01
          </span>
          <div>
            <p
              className={`text-[10px] font-semibold tracking-[0.3em] ${l ? 'text-black/35' : 'text-white/25'}`}
            >
              AYLIK LİDER
            </p>
            <p
              className={`mt-1 text-4xl font-bold leading-none tracking-tight ${l ? 'text-black' : 'text-white'}`}
            >
              {entry.employeeName}
            </p>
          </div>
        </div>

        <div className="flex items-end gap-12">
          <div className="text-right">
            <p
              className={`text-[10px] font-medium tracking-[0.25em] ${l ? 'text-black/35' : 'text-white/25'}`}
            >
              AYLIK TOPLAM
            </p>
            <p
              className={`mt-1 tabular-nums text-4xl font-bold leading-none tracking-tight ${l ? 'text-black' : 'text-white'}`}
            >
              {formatUsd(entry.totalUsd)}
            </p>
          </div>
          <div className="text-right">
            <p
              className={`text-[10px] font-medium tracking-[0.25em] ${l ? 'text-black/35' : 'text-white/25'}`}
            >
              İŞLEM
            </p>
            <p
              className={`mt-1 tabular-nums text-2xl font-semibold leading-none ${l ? 'text-black/50' : 'text-white/50'}`}
            >
              {entry.transferCount}
            </p>
          </div>
          <div className="text-right">
            <p
              className={`text-[10px] font-medium tracking-[0.25em] ${l ? 'text-black/35' : 'text-white/25'}`}
            >
              BUGÜN
            </p>
            <p
              className={`mt-1 tabular-nums text-2xl font-semibold leading-none ${l ? 'text-black/50' : 'text-white/50'}`}
            >
              {formatUsd(entry.todayUsd)}
            </p>
          </div>
          {entry.ftdCount > 0 && (
            <div className="text-right">
              <p
                className={`text-[10px] font-medium tracking-[0.25em] ${l ? 'text-black/35' : 'text-white/25'}`}
              >
                FTD
              </p>
              <p
                className={`mt-1 tabular-nums text-2xl font-semibold leading-none ${l ? 'text-black/50' : 'text-white/50'}`}
              >
                {entry.ftdCount}
              </p>
            </div>
          )}
        </div>
      </div>

      <div className={`mt-6 h-px ${l ? 'bg-black/[0.08]' : 'bg-white/[0.08]'}`} />
    </div>
  )
}
