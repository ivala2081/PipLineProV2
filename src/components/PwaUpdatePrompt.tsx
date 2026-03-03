import { useEffect, useState, useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import { ArrowClockwise, X } from '@phosphor-icons/react'
import { Button } from '@ds'
import { pwaUpdateController } from '@/lib/pwaUpdateController'

export function PwaUpdatePrompt() {
  const { t } = useTranslation('common')
  const [updateFn, setUpdateFn] = useState<((reload?: boolean) => Promise<void>) | null>(null)
  const [dismissed, setDismissed] = useState(false)

  useEffect(() => {
    return pwaUpdateController.subscribe((fn) => {
      setUpdateFn(() => fn)
      setDismissed(false)
    })
  }, [])

  const handleUpdate = useCallback(() => {
    updateFn?.(true)
  }, [updateFn])

  if (!updateFn || dismissed) return null

  return (
    <div className="fixed inset-x-0 bottom-20 z-50 mx-auto w-[calc(100%-2rem)] max-w-sm md:bottom-6">
      <div className="flex items-center gap-3 rounded-xl border border-black/10 bg-bg1 px-4 py-3 shadow-lg">
        <ArrowClockwise size={20} className="shrink-0 text-brand" />
        <p className="flex-1 text-sm text-black/80">
          {t('pwa.updateAvailable', 'A new version is available')}
        </p>
        <Button variant="filled" size="sm" onClick={handleUpdate} className="shrink-0">
          {t('pwa.update', 'Update')}
        </Button>
        <button
          onClick={() => setDismissed(true)}
          className="shrink-0 rounded-md p-1 text-black/40 hover:bg-black/5 hover:text-black/60"
        >
          <X size={14} />
        </button>
      </div>
    </div>
  )
}
