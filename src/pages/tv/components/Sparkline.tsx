import type { TvTheme } from './TvLeaderboardPage'

type Props = {
  data: number[]
  width?: number
  height?: number
  theme: TvTheme
}

export function Sparkline({ data, width = 200, height = 40, theme }: Props) {
  const l = theme === 'light'
  const max = Math.max(...data, 1)
  const currentHour = new Date().getHours()

  const activeData = data.slice(0, currentHour + 1)
  if (activeData.length < 2) return null

  const stepX = width / 23
  const padY = 4

  const points = activeData.map((val, i) => {
    const x = i * stepX
    const y = height - padY - (val / max) * (height - padY * 2)
    return { x, y }
  })

  const pathD = points
    .map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`)
    .join(' ')

  const areaD = `${pathD} L ${points[points.length - 1].x.toFixed(1)} ${height} L ${points[0].x.toFixed(1)} ${height} Z`

  const strokeColor = l ? 'rgba(0,0,0,0.20)' : 'rgba(255,255,255,0.25)'
  const dotColor = l ? 'rgba(0,0,0,0.35)' : 'rgba(255,255,255,0.5)'
  const gradId = `tv-spark-${theme}`

  return (
    <svg width={width} height={height} className="overflow-visible">
      <path d={areaD} fill={`url(#${gradId})`} opacity={0.15} />
      <path
        d={pathD}
        fill="none"
        stroke={strokeColor}
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle
        cx={points[points.length - 1].x}
        cy={points[points.length - 1].y}
        r={2.5}
        fill={dotColor}
      />
      <defs>
        <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={l ? 'black' : 'white'} />
          <stop offset="100%" stopColor={l ? 'black' : 'white'} stopOpacity={0} />
        </linearGradient>
      </defs>
    </svg>
  )
}
