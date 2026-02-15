import { useTranslation } from 'react-i18next'
import { CheckCircle, Warning, XCircle } from '@phosphor-icons/react'
import { Button } from '@ds'
import type { ImportProgress } from '@/lib/csvImport/types'

interface StepResultsProps {
  progress: ImportProgress
  onClose: () => void
}

export function StepResults({ progress, onClose }: StepResultsProps) {
  const { t } = useTranslation('pages')
  const allFailed = progress.insertedRows === 0 && progress.failedRows > 0
  const hasFailures = progress.failedRows > 0

  return (
    <div className="flex flex-col items-center gap-6 py-12">
      {/* Icon */}
      {allFailed ? (
        <XCircle size={56} weight="fill" className="text-red-400" />
      ) : hasFailures ? (
        <Warning size={56} weight="fill" className="text-amber-400" />
      ) : (
        <CheckCircle size={56} weight="fill" className="text-emerald-400" />
      )}

      {/* Message */}
      <div className="text-center">
        {allFailed ? (
          <p className="text-lg font-medium text-red-700">
            {t('transfers.import.results.failure', 'Import failed')}
          </p>
        ) : hasFailures ? (
          <p className="text-lg font-medium text-amber-700">
            Imported {progress.insertedRows} of {progress.totalRows} transfers.{' '}
            {progress.failedRows} rows failed.
          </p>
        ) : (
          <p className="text-lg font-medium text-emerald-700">
            Successfully imported {progress.insertedRows} transfers
          </p>
        )}
      </div>

      {/* Error list */}
      {progress.errors.length > 0 && (
        <div className="max-h-[200px] w-full overflow-auto rounded-lg border border-red-200 bg-red-50 p-3">
          <p className="mb-2 text-xs font-medium text-red-700">
            Failed rows:
          </p>
          <div className="flex flex-col gap-1">
            {progress.errors.slice(0, 20).map((err, idx) => (
              <p key={idx} className="text-xs text-red-600">
                Row {err.rowIndex}: {err.message}
              </p>
            ))}
            {progress.errors.length > 20 && (
              <p className="text-xs text-red-500">
                ...and {progress.errors.length - 20} more
              </p>
            )}
          </div>
        </div>
      )}

      {/* Close button */}
      <Button variant="filled" onClick={onClose}>
        {t('transfers.import.results.close', 'Close')}
      </Button>
    </div>
  )
}
