import { useState, useCallback } from 'react'
import { SpinnerGap, CheckCircle, Warning } from '@phosphor-icons/react'
import { Button } from '@ds'
import { useTransferFix } from '@/hooks/queries/useTransferFix'
import type { SystemDiscrepancy, FixProgress } from './types'

interface StepFixProps {
  discrepancies: SystemDiscrepancy[]
  kasaExchangeRates: Map<string, number>
  onBack: () => void
  onReset: () => void
  onNext: () => void
}

export function StepFix({
  discrepancies,
  kasaExchangeRates,
  onBack,
  onReset,
  onNext,
}: StepFixProps) {
  const { applyFixes } = useTransferFix()
  const [progress, setProgress] = useState<FixProgress>({
    phase: 'idle',
    total: 0,
    inserted: 0,
    updated: 0,
    deleted: 0,
    failed: 0,
    errors: [],
  })

  const toFix = discrepancies.filter((d) => d.action !== 'skip')
  const started = progress.phase !== 'idle'
  const done = progress.phase === 'done' || progress.phase === 'error'

  const handleStart = useCallback(async () => {
    try {
      await applyFixes(toFix, kasaExchangeRates, setProgress)
    } catch (err) {
      setProgress((prev) => ({
        ...prev,
        phase: 'error',
        errors: [
          ...prev.errors,
          { index: -1, message: err instanceof Error ? err.message : 'Bilinmeyen hata' },
        ],
      }))
    }
  }, [applyFixes, toFix, kasaExchangeRates])

  const completed = progress.inserted + progress.updated + progress.deleted
  const progressPct = progress.total > 0 ? Math.round((completed / progress.total) * 100) : 0

  return (
    <div className="space-y-lg">
      {/* Summary of what will be done */}
      {!started && (
        <div className="rounded-xl border p-lg space-y-md">
          <h3 className="text-sm font-semibold text-primary">Uygulanacak İşlemler</h3>
          <div className="grid grid-cols-3 gap-md text-center">
            <div>
              <p className="text-2xl font-bold text-green-600">
                {toFix.filter((d) => d.action === 'insert').length}
              </p>
              <p className="text-xs text-muted">Eklenecek</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-blue-600">
                {toFix.filter((d) => d.action === 'update').length}
              </p>
              <p className="text-xs text-muted">Güncellenecek</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-red-600">
                {toFix.filter((d) => d.action === 'delete').length}
              </p>
              <p className="text-xs text-muted">Silinecek</p>
            </div>
          </div>
        </div>
      )}

      {/* Progress */}
      {started && (
        <div className="rounded-xl border p-lg space-y-md">
          <div className="flex items-center gap-3">
            {progress.phase === 'running' && (
              <SpinnerGap className="h-6 w-6 animate-spin text-brand" />
            )}
            {progress.phase === 'done' && (
              <CheckCircle className="h-6 w-6 text-green-500" weight="duotone" />
            )}
            {progress.phase === 'error' && (
              <Warning className="h-6 w-6 text-red-500" weight="duotone" />
            )}
            <div>
              <p className="text-sm font-semibold text-primary">
                {progress.phase === 'running' && 'Düzeltme uygulanıyor...'}
                {progress.phase === 'done' && 'Düzeltme tamamlandı!'}
                {progress.phase === 'error' && 'Düzeltme tamamlandı (hatalar var)'}
              </p>
              <p className="text-xs text-muted">
                {completed} / {progress.total} işlem
              </p>
            </div>
          </div>

          {/* Progress bar */}
          <div className="h-2 w-full rounded-full bg-border overflow-hidden">
            <div
              className="h-full rounded-full bg-brand transition-all duration-300"
              style={{ width: `${progressPct}%` }}
            />
          </div>

          {/* Results */}
          <div className="grid grid-cols-4 gap-md text-center">
            <div>
              <p className="text-xl font-bold text-green-600">{progress.inserted}</p>
              <p className="text-xs text-muted">Eklendi</p>
            </div>
            <div>
              <p className="text-xl font-bold text-blue-600">{progress.updated}</p>
              <p className="text-xs text-muted">Güncellendi</p>
            </div>
            <div>
              <p className="text-xl font-bold text-red-600">{progress.deleted}</p>
              <p className="text-xs text-muted">Silindi</p>
            </div>
            <div>
              <p className="text-xl font-bold text-orange-600">{progress.failed}</p>
              <p className="text-xs text-muted">Hata</p>
            </div>
          </div>

          {/* Errors */}
          {progress.errors.length > 0 && (
            <div className="rounded-lg bg-red-50 dark:bg-red-900/10 p-md space-y-1">
              <p className="text-xs font-medium text-red-600">Hatalar:</p>
              {progress.errors.slice(0, 10).map((err, i) => (
                <p key={i} className="text-xs text-red-500">
                  {err.message}
                </p>
              ))}
              {progress.errors.length > 10 && (
                <p className="text-xs text-red-400">
                  ... ve {progress.errors.length - 10} hata daha
                </p>
              )}
            </div>
          )}
        </div>
      )}

      {/* Actions */}
      <div className="flex justify-between">
        <Button variant="gray" onClick={onBack} disabled={progress.phase === 'running'}>
          Geri
        </Button>
        <div className="flex gap-2">
          {!started && (
            <Button variant="filled" onClick={handleStart}>
              Düzeltmeyi Başlat
            </Button>
          )}
          {done && (
            <>
              <Button variant="gray" onClick={onReset}>
                Başa Dön
              </Button>
              <Button variant="filled" onClick={onNext}>
                Çalışan Ataması
              </Button>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
