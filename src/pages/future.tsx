import { useTranslation } from 'react-i18next'
import { Rocket } from '@phosphor-icons/react'

export function FuturePage() {
  const { t } = useTranslation('pages')

  return (
    <div className="flex h-full w-full items-center justify-center">
      <div className="text-center">
        <div className="mx-auto mb-4 flex size-16 items-center justify-center rounded-full bg-brand/10">
          <Rocket size={32} className="text-brand" />
        </div>
        <h1 className="text-2xl font-semibold text-black">
          {t('future.title', 'Future Features')}
        </h1>
        <p className="mt-2 text-sm text-black/60">{t('future.description', 'Coming soon...')}</p>
      </div>
    </div>
  )
}
