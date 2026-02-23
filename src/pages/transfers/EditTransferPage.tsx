import { useNavigate, useParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { ArrowLeft } from '@phosphor-icons/react'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useOrganization } from '@/app/providers/OrganizationProvider'
import type { TransferRow } from '@/hooks/useTransfers'
import { useLookupQueries } from '@/hooks/queries/useLookupQueries'
import { useTransfersQuery } from '@/hooks/queries/useTransfersQuery'
import { PageHeader } from '@ds'
import { TransferFormContent } from './TransferFormContent'

const SELECT_QUERY =
  '*, category:transfer_categories!category_id(name, is_deposit), payment_method:payment_methods!payment_method_id(name), psp:psps!psp_id(name, commission_rate), type:transfer_types!type_id(name)'

export function EditTransferPage() {
  const { t } = useTranslation('pages')
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { currentOrg } = useOrganization()
  const lookupData = useLookupQueries()
  const transfers = useTransfersQuery()

  const {
    data: transfer,
    isLoading,
    isError,
  } = useQuery({
    queryKey: ['transfer', id, currentOrg?.id],
    queryFn: async () => {
      if (!id) throw new Error('No transfer ID')
      const { data, error } = await supabase
        .from('transfers')
        .select(SELECT_QUERY)
        .eq('id', id)
        .single()
      if (error) throw error
      return data as unknown as TransferRow
    },
    enabled: !!id && !!currentOrg,
  })

  const handleDone = () => navigate('/transfers')

  const backCrumb = (
    <button
      onClick={handleDone}
      className="mb-3 flex items-center gap-1.5 text-xs text-black/40 transition-colors hover:text-black/70"
    >
      <ArrowLeft size={13} weight="bold" />
      <span>{t('transfers.title')}</span>
    </button>
  )

  if (isLoading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-black/10 border-t-brand" />
      </div>
    )
  }

  if (isError || !transfer) {
    return (
      <div className="space-y-lg">
        <div>
          {backCrumb}
          <PageHeader title={t('transfers.editTransfer')} subtitle={t('transfers.subtitle')} />
        </div>
        <p className="text-sm text-black/50">{t('transfers.toast.error')}</p>
      </div>
    )
  }

  return (
    <div className="space-y-lg">
      <div>
        {backCrumb}
        <PageHeader title={t('transfers.editTransfer')} subtitle={t('transfers.subtitle')} />
      </div>

      <TransferFormContent
        transfer={transfer}
        lookupData={lookupData}
        onSubmit={transfers}
        onDone={handleDone}
      />
    </div>
  )
}
