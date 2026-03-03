import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Plus, UploadSimple } from '@phosphor-icons/react'
import { useQuery } from '@tanstack/react-query'
import { useLookupQueries } from '@/hooks/queries/useLookupQueries'
import { useTransfersQuery } from '@/hooks/queries/useTransfersQuery'
import { useRealtimeSubscription } from '@/hooks/useRealtimeSubscription'
import { queryKeys } from '@/lib/queryKeys'
import { supabase } from '@/lib/supabase'
import { useOrganization } from '@/app/providers/OrganizationProvider'
import type { TransferRow } from '@/hooks/useTransfers'
import { Button, Tabs, TabsList, TabsTrigger, TabsContent, PageHeader } from '@ds'
import { TransfersTable } from './TransfersTable'
import { DeleteConfirmDialog } from './DeleteConfirmDialog'
import { LookupSettings } from './LookupSettings'
import { MonthlyTab } from './MonthlyTab'
import { CsvImportDialog } from './CsvImportDialog'

export function TransfersPage() {
  const { t } = useTranslation('pages')
  const navigate = useNavigate()
  const { currentOrg } = useOrganization()
  const lookupData = useLookupQueries()
  const transfers = useTransfersQuery()

  const { data: employeesData } = useQuery({
    queryKey: queryKeys.hr.employees(currentOrg?.id ?? ''),
    queryFn: async () => {
      const { data } = await supabase
        .from('hr_employees')
        .select('id, full_name')
        .eq('organization_id', currentOrg!.id)
        .eq('is_active', true)
        .order('full_name')
      return data ?? []
    },
    enabled: !!currentOrg,
    staleTime: 5 * 60_000,
  })

  useRealtimeSubscription('transfers', [queryKeys.transfers.all, ['dashboard']])

  const [deleteTarget, setDeleteTarget] = useState<TransferRow | null>(null)
  const [importOpen, setImportOpen] = useState(false)

  const handleAdd = () => navigate('/transfers/new')

  const handleEdit = (transfer: TransferRow) => {
    navigate(`/transfers/${transfer.id}/edit`)
  }

  const handleDelete = (transfer: TransferRow) => {
    setDeleteTarget(transfer)
  }

  const handleDeleteClose = () => {
    setDeleteTarget(null)
  }

  const tableContent = (
    <TransfersTable
      transfers={transfers.displayTransfers}
      isLoading={transfers.isLoading}
      page={transfers.page}
      pageSize={transfers.pageSize}
      total={transfers.total}
      dateCounts={transfers.dateCounts}
      filters={transfers.filters}
      onFilterChange={transfers.setFilter}
      onClearFilters={transfers.clearFilters}
      hasActiveFilters={transfers.hasActiveFilters}
      fetchTransfersByDate={transfers.fetchTransfersByDate}
      onPageChange={transfers.setPage}
      onPageSizeChange={transfers.setPageSize}
      onEdit={handleEdit}
      onDelete={handleDelete}
      lookupData={lookupData}
      employees={employeesData ?? []}
      loadMore={transfers.loadMore}
      hasMore={transfers.hasMore}
      isLoadMoreMode={transfers.isLoadMoreMode}
      setIsLoadMoreMode={transfers.setIsLoadMoreMode}
    />
  )

  return (
    <div className="space-y-lg">
      <PageHeader
        title={t('transfers.title')}
        subtitle={t('transfers.subtitle')}
        actions={
          <>
            <Button variant="outline" onClick={() => setImportOpen(true)}>
              <UploadSimple size={16} weight="bold" />
              {t('transfers.importCsv')}
            </Button>
            <Button variant="filled" onClick={handleAdd}>
              <Plus size={16} weight="bold" />
              {t('transfers.addTransfer')}
            </Button>
          </>
        }
      />

      <Tabs defaultValue="transfers">
        <TabsList>
          <TabsTrigger value="transfers">{t('transfers.tabs.transfers')}</TabsTrigger>
          <TabsTrigger value="monthly">{t('transfers.tabs.monthly')}</TabsTrigger>
          <TabsTrigger value="settings">{t('transfers.tabs.settings')}</TabsTrigger>
        </TabsList>
        <TabsContent value="transfers">{tableContent}</TabsContent>
        <TabsContent value="monthly">
          <MonthlyTab />
        </TabsContent>
        <TabsContent value="settings">
          <LookupSettings lookupData={lookupData} />
        </TabsContent>
      </Tabs>

      <CsvImportDialog
        open={importOpen}
        onClose={() => setImportOpen(false)}
        lookupData={lookupData}
      />

      <DeleteConfirmDialog
        transfer={deleteTarget}
        onClose={handleDeleteClose}
        onConfirm={async () => {
          if (deleteTarget) {
            await transfers.deleteTransfer(deleteTarget.id)
            handleDeleteClose()
          }
        }}
      />
    </div>
  )
}
