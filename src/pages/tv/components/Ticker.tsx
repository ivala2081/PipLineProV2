import { useEffect, useRef } from 'react'
import type { TvTheme } from './TvLeaderboardPage'

type RecentTransfer = {
  employeeName: string
  amount: number
  time: string
}

type Props = {
  transfers: RecentTransfer[]
  theme: TvTheme
}

function formatUsd(val: number) {
  if (val >= 1_000) return `$${(val / 1_000).toFixed(1)}K`
  return `$${Math.round(val).toLocaleString('en-US')}`
}

export function Ticker({ transfers, theme }: Props) {
  const l = theme === 'light'
  const scrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const el = scrollRef.current
    if (!el) return

    el.scrollLeft = el.scrollWidth

    let frame: number
    let lastTime = 0
    const speed = 50

    function tick(time: number) {
      if (lastTime) {
        const delta = (time - lastTime) / 1000
        el!.scrollLeft -= speed * delta
        if (el!.scrollLeft <= 0) {
          el!.scrollLeft = el!.scrollWidth / 2
        }
      }
      lastTime = time
      frame = requestAnimationFrame(tick)
    }

    frame = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(frame)
  }, [transfers])

  if (transfers.length === 0) return null

  const items = [...transfers, ...transfers]

  return (
    <div
      className={`shrink-0 border-t ${l ? 'border-black/[0.04] bg-[#fafafa]' : 'border-white/[0.03] bg-black'}`}
    >
      <div ref={scrollRef} className="flex gap-8 overflow-hidden whitespace-nowrap px-12 py-3">
        {items.map((t, i) => (
          <span key={i} className="inline-flex items-center gap-2 text-sm">
            <span className={`font-medium ${l ? 'text-black/40' : 'text-white/35'}`}>
              {t.employeeName}
            </span>
            <span className={l ? 'text-black/15' : 'text-white/15'}>&rarr;</span>
            <span className={`tabular-nums font-semibold ${l ? 'text-black/30' : 'text-white/28'}`}>
              {formatUsd(t.amount)}
            </span>
            <span className={`tabular-nums text-xs ${l ? 'text-black/20' : 'text-white/18'}`}>
              {t.time}
            </span>
          </span>
        ))}
      </div>
    </div>
  )
}
