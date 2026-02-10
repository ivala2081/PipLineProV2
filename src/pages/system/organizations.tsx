import { useTranslation } from 'react-i18next'
import { Buildings } from '@phosphor-icons/react'
import { Card } from '@ds'

export function OrganizationsPage() {
  const { t } = useTranslation('pages')

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">{t('organizations.title')}</h1>
        <p className="mt-1 text-sm text-black/60">{t('organizations.subtitle')}</p>
      </div>
      <Card className="flex flex-col items-center justify-center gap-4 border border-black/5 bg-bg1 py-20">
        <div className="flex size-14 items-center justify-center rounded-2xl bg-black/5 text-black/30">
          <Buildings size={28} />
        </div>
        <div className="text-center">
          <p className="text-sm font-medium text-black/60">{t('placeholder.emptyTitle')}</p>
          <p className="mt-1 text-xs text-black/40">{t('placeholder.emptyDescription')}</p>
        </div>
      </Card>
    </div>
  )
}
