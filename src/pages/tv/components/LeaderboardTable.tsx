import { useEffect, useRef } from 'react'
import { cn } from '@ds'
import type { LeaderboardEntry } from '@/hooks/queries/useTvQuery'
import type { TvTheme } from './TvLeaderboardPage'

type Props = {
  entries: LeaderboardEntry[]
  highlightedId: string | null
  rankDeltas: Map<string, number>
  theme: TvTheme
}

function formatUsd(val: number) {
  if (val >= 1_000_000) return `$${(val / 1_000_000).toFixed(1)}M`
  if (val >= 10_000) return `$${(val / 1_000).toFixed(0)}K`
  if (val >= 1_000) return `$${(val / 1_000).toFixed(1)}K`
  return `$${Math.round(val).toLocaleString('en-US')}`
}

function RankDelta({ delta }: { delta: number }) {
  if (delta === 0) return null
  const isUp = delta > 0
  return (
    <span
      className={cn(
        'ml-2 inline-flex items-center gap-0.5 text-xs font-semibold tabular-nums',
        isUp ? 'text-emerald-500/70' : 'text-red-400/60',
      )}
    >
      <svg
        width={8}
        height={8}
        viewBox="0 0 8 8"
        fill="currentColor"
        className={cn(!isUp && 'rotate-180')}
      >
        <path d="M4 1L7 5H1L4 1Z" />
      </svg>
      {Math.abs(delta)}
    </span>
  )
}

export function LeaderboardTable({ entries, highlightedId, rankDeltas, theme }: Props) {
  const maxAmount = entries[0]?.totalUsd || 1
  const l = theme === 'light'
  const rowRefs = useRef<Map<string, HTMLDivElement>>(new Map())
  const prevPositions = useRef<Map<string, number>>(new Map())

  useEffect(() => {
    const currentPositions = new Map<string, number>()
    rowRefs.current.forEach((el, id) => {
      currentPositions.set(id, el.getBoundingClientRect().top)
    })

    prevPositions.current.forEach((oldTop, id) => {
      const newTop = currentPositions.get(id)
      const el = rowRefs.current.get(id)
      if (oldTop == null || newTop == null || el == null) return
      const deltaY = oldTop - newTop
      if (Math.abs(deltaY) < 2) return
      el.style.transform = `translateY(${deltaY}px)`
      el.style.transition = 'none'
      requestAnimationFrame(() => {
        el.style.transition = 'transform 600ms cubic-bezier(0.25, 1, 0.5, 1)'
        el.style.transform = ''
      })
    })

    prevPositions.current = currentPositions
  }, [entries])

  return (
    <div className="flex flex-1 flex-col overflow-y-auto px-12 py-1">
      {entries.map((entry, idx) => {
        const rank = idx + 2
        const barWidth = Math.max((entry.totalUsd / maxAmount) * 100, 2)
        const isHighlighted = entry.employeeId === highlightedId
        const delta = rankDeltas.get(entry.employeeId) ?? 0

        return (
          <div
            key={entry.employeeId}
            ref={(el) => {
              if (el) rowRefs.current.set(entry.employeeId, el)
              else rowRefs.current.delete(entry.employeeId)
            }}
            className={cn(
              'flex items-center py-2.5 transition-colors duration-300',
              idx > 0 && (l ? 'border-t border-black/[0.05]' : 'border-t border-white/[0.04]'),
              isHighlighted && (l ? 'bg-black/[0.03]' : 'bg-white/[0.03]'),
            )}
            style={isHighlighted ? { animation: `tv-row-flash-${theme} 2s ease-out` } : undefined}
          >
            {/* Rank + delta */}
            <div className="flex w-20 shrink-0 items-center">
              <span
                className={`tabular-nums text-lg font-bold ${l ? 'text-black/25' : 'text-white/25'}`}
              >
                {String(rank).padStart(2, '0')}
              </span>
              <RankDelta delta={delta} />
            </div>

            {/* Name */}
            <span
              className={`w-64 shrink-0 truncate text-base font-semibold tracking-wide ${l ? 'text-black/65' : 'text-white/65'}`}
            >
              {entry.employeeName}
            </span>

            {/* Bar */}
            <div className="relative mx-6 flex-1">
              <div
                className={`h-1 overflow-hidden rounded-full ${l ? 'bg-black/[0.06]' : 'bg-white/[0.06]'}`}
              >
                <div
                  className={`h-full rounded-full transition-all duration-1000 ease-out ${l ? 'bg-emerald-500/60' : 'bg-emerald-500/50'}`}
                  style={{ width: `${barWidth}%` }}
                />
              </div>
            </div>

            {/* Count */}
            <span
              className={`w-24 shrink-0 text-right tabular-nums text-xs ${l ? 'text-black/30' : 'text-white/25'}`}
            >
              {entry.transferCount} i{'\u015F'}lem
              {entry.ftdCount > 0 && (
                <span className={`ml-1.5 ${l ? 'text-black/40' : 'text-white/35'}`}>
                  {entry.ftdCount} FTD
                </span>
              )}
            </span>

            {/* Amount */}
            <span
              className={`w-32 shrink-0 text-right tabular-nums text-lg font-bold ${l ? 'text-black/50' : 'text-white/50'}`}
            >
              {formatUsd(entry.totalUsd)}
            </span>
          </div>
        )
      })}

      {entries.length === 0 && (
        <div className="flex flex-1 items-center justify-center">
          <p className={`text-lg ${l ? 'text-black/20' : 'text-white/15'}`}>Veri bekleniyor</p>
        </div>
      )}

      <style>{`
        @keyframes tv-row-flash-dark {
          0% { background: rgba(255,255,255,0.06); }
          100% { background: transparent; }
        }
        @keyframes tv-row-flash-light {
          0% { background: rgba(0,0,0,0.05); }
          100% { background: transparent; }
        }
      `}</style>
    </div>
  )
}
