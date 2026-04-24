import { useState, useEffect, useCallback, useRef, useMemo } from 'react'
import { useSearchParams } from 'react-router-dom'
import {
  useTvEmployeesQuery,
  useTvLeaderboardQuery,
  useTvRealtimeTransfer,
  type TvDepartment,
  type TransferAlert as TransferAlertType,
  type TvLeaderboardData,
} from '@/hooks/queries/useTvQuery'
import { useTvSessionKeepAlive } from '@/hooks/useTvSessionKeepAlive'
import { TransferAlert } from './TransferAlert'
import { Spotlight } from './Spotlight'
import { LeaderboardTable } from './LeaderboardTable'
import { TvStats } from './TvStats'
import { Ticker } from './Ticker'

export type TvTheme = 'dark' | 'light'

type Props = {
  department: TvDepartment
}

const DEPT_LABEL: Record<TvDepartment, string> = {
  marketing: 'MARKETING',
  retention: 'RETENTION',
}

const MONTH_NAMES = [
  'OCAK',
  'ŞUBAT',
  'MART',
  'NİSAN',
  'MAYIS',
  'HAZİRAN',
  'TEMMUZ',
  'AĞUSTOS',
  'EYLÜL',
  'EKİM',
  'KASIM',
  'ARALIK',
]

const EMPTY_DATA: TvLeaderboardData = {
  entries: [],
  hourlyToday: Array(24).fill(0),
  biggestToday: null,
  recentTransfers: [],
}

function useClock() {
  const [time, setTime] = useState(new Date())
  useEffect(() => {
    const id = setInterval(() => setTime(new Date()), 1000)
    return () => clearInterval(id)
  }, [])
  return time
}

function useRankDeltas(entries: TvLeaderboardData['entries']) {
  const prevRankMap = useRef<Map<string, number>>(new Map())
  const [deltas, setDeltas] = useState<Map<string, number>>(new Map())

  useEffect(() => {
    const currentRankMap = new Map<string, number>()
    entries.forEach((e, i) => currentRankMap.set(e.employeeId, i + 1))

    const newDeltas = new Map<string, number>()
    currentRankMap.forEach((newRank, id) => {
      const oldRank = prevRankMap.current.get(id)
      if (oldRank != null && oldRank !== newRank) {
        newDeltas.set(id, oldRank - newRank)
      }
    })

    if (newDeltas.size > 0) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- flashing rank-change indicators on leaderboard update
      setDeltas(newDeltas)
      const timer = setTimeout(() => setDeltas(new Map()), 8000)
      prevRankMap.current = currentRankMap
      return () => clearTimeout(timer)
    }

    prevRankMap.current = currentRankMap
  }, [entries])

  return deltas
}

export function TvLeaderboardPage({ department }: Props) {
  useTvSessionKeepAlive()

  const [searchParams] = useSearchParams()
  const theme: TvTheme = searchParams.get('theme') === 'light' ? 'light' : 'dark'
  const light = theme === 'light'

  const clock = useClock()
  const [alertQueue, setAlertQueue] = useState<TransferAlertType[]>([])
  const [currentAlert, setCurrentAlert] = useState<TransferAlertType | null>(null)
  const [highlightedId, setHighlightedId] = useState<string | null>(null)
  const processingRef = useRef(false)

  const { data: employees } = useTvEmployeesQuery(department)
  const { data: lbData } = useTvLeaderboardQuery(department, employees)
  const data = lbData ?? EMPTY_DATA

  const rankDeltas = useRankDeltas(data.entries)

  const employeeMap = useMemo(
    () => new Map(employees?.map((e) => [e.id, e.full_name]) ?? []),
    [employees],
  )

  useEffect(() => {
    if (currentAlert || alertQueue.length === 0 || processingRef.current) return
    processingRef.current = true
    const next = alertQueue[0]
    // eslint-disable-next-line react-hooks/set-state-in-effect -- draining transfer-alert queue one at a time
    setAlertQueue((q) => q.slice(1))
    setCurrentAlert(next)
    processingRef.current = false
  }, [alertQueue, currentAlert])

  const handleNewTransfer = useCallback((alert: TransferAlertType) => {
    setAlertQueue((q) => [...q, alert])
  }, [])

  const handleAlertComplete = useCallback(() => {
    if (currentAlert) {
      const empId = employees?.find((e) => e.full_name === currentAlert.employeeName)?.id
      if (empId) {
        setHighlightedId(empId)
        setTimeout(() => setHighlightedId(null), 3000)
      }
    }
    setCurrentAlert(null)
  }, [currentAlert, employees])

  useTvRealtimeTransfer(department, employeeMap, handleNewTransfer)

  const now = clock
  const hours = String(now.getHours()).padStart(2, '0')
  const mins = String(now.getMinutes()).padStart(2, '0')
  const secs = String(now.getSeconds()).padStart(2, '0')

  const leader = data.entries[0]
  const rest = data.entries.slice(1)

  return (
    <div
      className={`flex h-screen flex-col ${light ? 'bg-[#fafafa] text-black' : 'bg-black text-white'}`}
    >
      {/* Header */}
      <header className="flex shrink-0 items-end justify-between px-12 pb-5 pt-7">
        <div>
          <p
            className={`text-[11px] font-medium tracking-[0.35em] ${light ? 'text-black/40' : 'text-white/30'}`}
          >
            {MONTH_NAMES[now.getMonth()]} {now.getFullYear()}
          </p>
          <h1
            className={`mt-1 text-[2.5rem] font-bold leading-none tracking-tight ${light ? 'text-black' : 'text-white'}`}
          >
            {DEPT_LABEL[department]}
          </h1>
          <div
            className={`mt-3 h-[2px] w-16 rounded-full ${light ? 'bg-black/20' : 'bg-white/25'}`}
          />
        </div>

        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2">
            <div className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
            <span
              className={`text-[10px] font-semibold tracking-[0.3em] ${light ? 'text-black/35' : 'text-white/35'}`}
            >
              CANLI
            </span>
          </div>
          <p
            className={`tabular-nums text-[2rem] font-light leading-none tracking-tight ${light ? 'text-black/30' : 'text-white/30'}`}
          >
            {hours}
            <span className="animate-pulse">:</span>
            {mins}
            <span className={light ? 'text-black/18' : 'text-white/18'}>:{secs}</span>
          </p>
        </div>
      </header>

      {leader && <Spotlight entry={leader} theme={theme} />}

      <LeaderboardTable
        entries={rest}
        highlightedId={highlightedId}
        rankDeltas={rankDeltas}
        theme={theme}
      />

      <TvStats data={data} theme={theme} />

      <Ticker transfers={data.recentTransfers} theme={theme} />

      {currentAlert && (
        <TransferAlert alert={currentAlert} onComplete={handleAlertComplete} theme={theme} />
      )}
    </div>
  )
}
