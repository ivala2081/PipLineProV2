import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { ArrowLeft } from '@phosphor-icons/react'
import { PageHeader } from '@ds'
import { AccountingEntryFormContent } from './AccountingEntryFormContent'

export function AddEntryPage() {
  const { t } = useTranslation('pages')
  const navigate = useNavigate()
  const handleDone = () => navigate('/accounting')

  return (
    <div className="space-y-lg">
      <div>
        <button
          onClick={handleDone}
          className="mb-3 flex items-center gap-1.5 text-xs text-black/40 transition-colors hover:text-black/70"
        >
          <ArrowLeft size={13} weight="bold" />
          <span>{t('accounting.title')}</span>
        </button>
        <PageHeader
          title={t('accounting.addEntry')}
          subtitle={t('accounting.addEntrySubtitle', 'Create a new accounting entry')}
        />
      </div>

      <AccountingEntryFormContent entry={null} onDone={handleDone} />
    </div>
  )
}
