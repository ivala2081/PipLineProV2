import { useEffect, useRef, useState } from 'react'
import { cn } from '@ds'
import type { TransferAlert as TransferAlertType } from '@/hooks/queries/useTvQuery'
import type { TvTheme } from './TvLeaderboardPage'

type Props = {
  alert: TransferAlertType
  onComplete: () => void
  theme: TvTheme
}

function useCountUp(target: number, duration = 1200) {
  const [value, setValue] = useState(0)
  const frameRef = useRef<number>(0)

  useEffect(() => {
    const start = performance.now()
    setValue(0)

    function tick(now: number) {
      const elapsed = now - start
      const progress = Math.min(elapsed / duration, 1)
      const eased = 1 - Math.pow(1 - progress, 4)
      setValue(Math.round(target * eased))
      if (progress < 1) frameRef.current = requestAnimationFrame(tick)
    }

    frameRef.current = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(frameRef.current)
  }, [target, duration])

  return value
}

function getSoundFile(amount: number) {
  if (amount >= 5000) return '/1.mp3'
  if (amount >= 1000) return '/2.mp3'
  return '/3.mp3'
}

export function TransferAlert({ alert, onComplete, theme }: Props) {
  const [phase, setPhase] = useState<'enter' | 'visible' | 'exit'>('enter')
  const countUp = useCountUp(alert.amountUsd, 1200)
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const l = theme === 'light'

  useEffect(() => {
    const audio = new Audio(getSoundFile(alert.amountUsd))
    audioRef.current = audio
    audio.volume = 1
    audio.play().catch(() => {})

    const t1 = setTimeout(() => setPhase('visible'), 30)
    const t2 = setTimeout(() => setPhase('exit'), 4500)
    const t3 = setTimeout(onComplete, 5200)

    return () => {
      clearTimeout(t1)
      clearTimeout(t2)
      clearTimeout(t3)
      if (audioRef.current) {
        audioRef.current.pause()
        audioRef.current = null
      }
    }
  }, [alert, onComplete])

  return (
    <div
      className={cn(
        'fixed inset-0 z-50 flex items-center justify-center transition-opacity',
        l ? 'bg-white' : 'bg-black',
        phase === 'enter' && 'opacity-0 duration-300',
        phase === 'visible' && 'opacity-100 duration-500',
        phase === 'exit' && 'opacity-0 duration-500',
      )}
    >
      <div
        className={cn(
          'flex flex-col items-center gap-4 transition-all',
          phase === 'enter' && 'translate-y-4 scale-95 opacity-0 duration-300',
          phase === 'visible' && 'translate-y-0 scale-100 opacity-100 duration-700',
          phase === 'exit' && '-translate-y-2 opacity-0 duration-500',
        )}
      >
        <p className={`text-sm font-medium tracking-[0.4em] ${l ? 'text-black/30' : 'text-white/30'}`}>YENİ YATIRIM</p>

        <h1 className={`mt-4 text-center text-7xl font-bold leading-none tracking-tight ${l ? 'text-black' : 'text-white'}`}>
          {alert.employeeName}
        </h1>

        <p className={`mt-8 tabular-nums text-8xl font-bold leading-none tracking-tighter ${l ? 'text-black' : 'text-white'}`}>
          ${countUp.toLocaleString('en-US')}
        </p>

        <div className="mt-6 flex items-center gap-4">
          <p className={`text-lg ${l ? 'text-black/35' : 'text-white/35'}`}>{alert.customerName}</p>
          {alert.isFirstDeposit && (
            <span className={`text-xs font-semibold tracking-[0.3em] ${l ? 'text-black/45' : 'text-white/45'}`}>FTD</span>
          )}
        </div>
      </div>
    </div>
  )
}
