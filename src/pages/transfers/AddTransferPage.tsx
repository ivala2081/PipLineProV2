import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { ArrowLeft } from '@phosphor-icons/react'
import { useLookupQueries } from '@/hooks/queries/useLookupQueries'
import { useTransfersQuery } from '@/hooks/queries/useTransfersQuery'
import { PageHeader } from '@ds'
import { TransferFormContent } from './TransferFormContent'

export function AddTransferPage() {
  const { t } = useTranslation('pages')
  const navigate = useNavigate()
  const lookupData = useLookupQueries()
  const transfers = useTransfersQuery()

  const handleDone = () => navigate('/transfers')

  return (
    <div className="space-y-lg">
      <div>
        <button
          onClick={handleDone}
          className="mb-3 flex items-center gap-1.5 text-xs text-black/40 transition-colors hover:text-black/70"
        >
          <ArrowLeft size={13} weight="bold" />
          <span>{t('transfers.title')}</span>
        </button>
        <PageHeader title={t('transfers.addTransfer')} subtitle={t('transfers.subtitle')} />
      </div>

      <TransferFormContent
        transfer={null}
        lookupData={lookupData}
        onSubmit={transfers}
        onDone={handleDone}
      />
    </div>
  )
}
