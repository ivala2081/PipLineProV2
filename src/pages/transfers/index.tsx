import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Plus, X, CalendarBlank, UploadSimple } from '@phosphor-icons/react'
import { useLookupQueries } from '@/hooks/queries/useLookupQueries'
import { useTransfersQuery } from '@/hooks/queries/useTransfersQuery'
import type { TransferRow } from '@/hooks/useTransfers'
import { Button, Tabs, TabsList, TabsTrigger, TabsContent, Input } from '@ds'
import { TransfersTable } from './TransfersTable'
import { TransferDialog } from './TransferDialog'
import { DeleteConfirmDialog } from './DeleteConfirmDialog'
import { LookupSettings } from './LookupSettings'
import { MonthlyTab } from './MonthlyTab'
import { CsvImportDialog } from './CsvImportDialog'

export function TransfersPage() {
  const { t } = useTranslation('pages')
  const lookupData = useLookupQueries()
  const transfers = useTransfersQuery()

  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingTransfer, setEditingTransfer] = useState<TransferRow | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<TransferRow | null>(null)
  const [importOpen, setImportOpen] = useState(false)

  const handleAdd = () => {
    setEditingTransfer(null)
    setDialogOpen(true)
  }

  const handleEdit = (transfer: TransferRow) => {
    setEditingTransfer(transfer)
    setDialogOpen(true)
  }

  const handleDelete = (transfer: TransferRow) => {
    setDeleteTarget(transfer)
  }

  const handleDialogClose = () => {
    setDialogOpen(false)
    setEditingTransfer(null)
  }

  const handleDeleteClose = () => {
    setDeleteTarget(null)
  }

  const tableContent = (
    <TransfersTable
      transfers={transfers.transfers}
      isLoading={transfers.isLoading}
      page={transfers.page}
      pageSize={transfers.pageSize}
      total={transfers.total}
      dateCounts={transfers.dateCounts}
      fetchTransfersByDate={transfers.fetchTransfersByDate}
      onPageChange={transfers.setPage}
      onEdit={handleEdit}
      onDelete={handleDelete}
    />
  )

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">{t('transfers.title')}</h1>
          <p className="mt-1 text-sm text-black/60">{t('transfers.subtitle')}</p>
        </div>
        <div className="flex items-center gap-3">
          {/* Date Filter */}
          <div className="relative">
            <div className="relative flex items-center">
              <CalendarBlank
                size={16}
                className="absolute left-3 text-black/40"
              />
              <Input
                type="date"
                value={transfers.filterDate ?? ''}
                onChange={(e) => transfers.setFilterDate(e.target.value || null)}
                className="h-9 w-[180px] pl-9 pr-8 text-sm"
                placeholder="Filter by date"
              />
              {transfers.filterDate && (
                <button
                  onClick={() => transfers.setFilterDate(null)}
                  className="absolute right-2 flex size-5 items-center justify-center rounded-full text-black/30 hover:bg-black/5 hover:text-black/60"
                  title="Clear filter"
                >
                  <X size={12} weight="bold" />
                </button>
              )}
            </div>
          </div>
          <Button variant="outline" onClick={() => setImportOpen(true)}>
            <UploadSimple size={16} weight="bold" />
            {t('transfers.importCsv')}
          </Button>
          <Button variant="filled" onClick={handleAdd}>
            <Plus size={16} weight="bold" />
            {t('transfers.addTransfer')}
          </Button>
        </div>
      </div>

      <Tabs defaultValue="transfers">
        <TabsList>
          <TabsTrigger value="transfers">
            {t('transfers.tabs.transfers')}
          </TabsTrigger>
          <TabsTrigger value="monthly">
            {t('transfers.tabs.monthly')}
          </TabsTrigger>
          <TabsTrigger value="settings">
            {t('transfers.tabs.settings')}
          </TabsTrigger>
        </TabsList>
        <TabsContent value="transfers">{tableContent}</TabsContent>
        <TabsContent value="monthly">
          <MonthlyTab />
        </TabsContent>
        <TabsContent value="settings">
          <LookupSettings lookupData={lookupData} />
        </TabsContent>
      </Tabs>

      <TransferDialog
        open={dialogOpen}
        onClose={handleDialogClose}
        transfer={editingTransfer}
        lookupData={lookupData}
        onSubmit={transfers}
      />

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
