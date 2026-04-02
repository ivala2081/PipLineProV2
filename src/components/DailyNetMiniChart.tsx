import { useState, useRef } from 'react'
import { cn } from '@ds/utils'

interface DailyNetDataPoint {
  day: string
  net: number
}

interface DailyNetMiniChartProps {
  data: DailyNetDataPoint[]
  formatMoney: (value: number) => string
  isLoading?: boolean
}

function fmtDay(dateStr: string): string {
  const d = new Date(dateStr + 'T00:00:00')
  return d.getDate().toString()
}

export function DailyNetMiniChart({ data, formatMoney, isLoading }: DailyNetMiniChartProps) {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null)
  const [isHovering, setIsHovering] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  if (isLoading) {
    const skeletonHeights = [45, 70, 35, 80, 55, 60, 40, 75, 50, 65, 38, 72, 48, 68, 42]
    return (
      <div className="flex h-32 items-end gap-[3px]">
        {skeletonHeights.map((h, i) => (
          <div
            key={i}
            className="flex-1 animate-pulse rounded-full bg-black/[0.06]"
            style={{ height: `${h}%` }}
          />
        ))}
      </div>
    )
  }

  if (!data.length) return null

  const maxAbs = Math.max(...data.map((d) => Math.abs(d.net)), 1)

  return (
    <div
      ref={containerRef}
      onMouseEnter={() => setIsHovering(true)}
      onMouseLeave={() => {
        setIsHovering(false)
        setHoveredIndex(null)
      }}
      className="group space-y-3"
    >
      {/* Hovered value display */}
      <div className="flex items-center justify-end">
        <div
          className={cn(
            'relative h-6 flex items-center transition-opacity duration-200',
            isHovering && hoveredIndex !== null ? 'opacity-100' : 'opacity-0',
          )}
        >
          {hoveredIndex !== null && (
            <>
              <span className="mr-2 text-xs font-medium text-black/40">
                {fmtDay(data[hoveredIndex].day)}
              </span>
              <span
                className={cn(
                  'font-mono text-sm font-bold tabular-nums',
                  data[hoveredIndex].net >= 0 ? 'text-green' : 'text-red',
                )}
              >
                {data[hoveredIndex].net >= 0 ? '+' : ''}
                {formatMoney(data[hoveredIndex].net)}
              </span>
            </>
          )}
        </div>
      </div>

      {/* Bars */}
      <div className="flex items-end gap-[3px]" style={{ height: 140 }}>
        {data.map((item, index) => {
          const heightPct = (Math.abs(item.net) / maxAbs) * 100
          const isPositive = item.net >= 0
          const isHovered = hoveredIndex === index
          const isAnyHovered = hoveredIndex !== null
          const isNeighbor =
            hoveredIndex !== null && (index === hoveredIndex - 1 || index === hoveredIndex + 1)

          return (
            <div
              key={item.day}
              className="relative flex flex-1 flex-col items-center justify-end"
              style={{ height: '100%' }}
              onMouseEnter={() => setHoveredIndex(index)}
            >
              {/* Bar */}
              <div
                className={cn(
                  'w-full rounded-full cursor-pointer transition-all duration-300 ease-out origin-bottom',
                  isHovered
                    ? isPositive
                      ? 'bg-green'
                      : 'bg-red'
                    : isNeighbor
                      ? isPositive
                        ? 'bg-green/30'
                        : 'bg-red/30'
                      : isAnyHovered
                        ? isPositive
                          ? 'bg-green/10'
                          : 'bg-red/10'
                        : isPositive
                          ? 'bg-green/20 group-hover:bg-green/25'
                          : 'bg-red/20 group-hover:bg-red/25',
                )}
                style={{
                  height: `${Math.max(heightPct, 4)}%`,
                  transform: isHovered
                    ? 'scaleX(1.15) scaleY(1.02)'
                    : isNeighbor
                      ? 'scaleX(1.05)'
                      : 'scaleX(1)',
                }}
              />

              {/* Day labels — show selectively to avoid crowding */}
              {(data.length <= 15 || index % Math.ceil(data.length / 10) === 0) && (
                <span
                  className={cn(
                    'mt-1.5 text-[9px] font-medium tabular-nums transition-all duration-300',
                    isHovered ? 'text-black/70' : 'text-black/25',
                  )}
                >
                  {fmtDay(item.day)}
                </span>
              )}

              {/* Tooltip */}
              <div
                className={cn(
                  'absolute -top-9 left-1/2 z-10 -translate-x-1/2 whitespace-nowrap rounded-lg px-2 py-1 text-[10px] font-bold tabular-nums',
                  'pointer-events-none transition-all duration-200',
                  isPositive ? 'bg-green text-white' : 'bg-red text-white',
                  isHovered ? 'translate-y-0 opacity-100' : 'translate-y-1 opacity-0',
                )}
              >
                {item.net >= 0 ? '+' : ''}
                {formatMoney(item.net)}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
