import { useTranslation } from 'react-i18next'
import { SpinnerGap } from '@phosphor-icons/react'
import type { ImportProgress } from '@/lib/csvImport/types'

interface StepImportProps {
  progress: ImportProgress
}

export function StepImport({ progress }: StepImportProps) {
  const { t } = useTranslation('pages')
  const pct =
    progress.totalRows > 0 ? Math.round((progress.insertedRows / progress.totalRows) * 100) : 0

  return (
    <div className="flex flex-col items-center gap-6 py-12">
      <SpinnerGap size={40} className="animate-spin text-black/30" />

      <div className="text-center">
        <p className="text-lg font-medium text-black/80">
          {t('transfers.import.progress.importing', 'Importing transfers...')}
        </p>
        <p className="mt-1 text-sm text-black/50">
          {t('transfers.import.progress.batch', 'Batch {{current}} of {{total}}', {
            current: progress.currentBatch,
            total: progress.totalBatches,
          })}
        </p>
      </div>

      {/* Progress bar */}
      <div className="w-full max-w-md">
        <div className="h-2 w-full overflow-hidden rounded-full bg-black/5">
          <div
            className="h-full rounded-full bg-black/80 transition-all duration-300"
            style={{ width: `${pct}%` }}
          />
        </div>
        <div className="mt-2 flex items-center justify-between text-xs text-black/50">
          <span>
            {progress.insertedRows} / {progress.totalRows} rows
          </span>
          <span>{pct}%</span>
        </div>
      </div>

      {progress.failedRows > 0 && (
        <p className="text-sm text-red-600">{progress.failedRows} rows failed</p>
      )}
    </div>
  )
}
