import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Plus } from '@phosphor-icons/react'
import { useAuth } from '@/app/providers/AuthProvider'
import { useOrganization } from '@/app/providers/OrganizationProvider'
import { useLookupQueries } from '@/hooks/queries/useLookupQueries'
import { useTransfersQuery } from '@/hooks/queries/useTransfersQuery'
import type { TransferRow } from '@/hooks/useTransfers'
import { Button, Tabs, TabsList, TabsTrigger, TabsContent } from '@ds'
import { TransfersTable } from './TransfersTable'
import { TransferDialog } from './TransferDialog'
import { DeleteConfirmDialog } from './DeleteConfirmDialog'
import { LookupSettings } from './LookupSettings'

export function TransfersPage() {
  const { t } = useTranslation('pages')
  const { isGod } = useAuth()
  const { membership } = useOrganization()
  const isAdmin = isGod || membership?.role === 'admin'

  const lookupData = useLookupQueries()
  const transfers = useTransfersQuery()

  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingTransfer, setEditingTransfer] = useState<TransferRow | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<TransferRow | null>(null)

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
        <Button variant="filled" onClick={handleAdd}>
          <Plus size={16} weight="bold" />
          {t('transfers.addTransfer')}
        </Button>
      </div>

      {isAdmin ? (
        <Tabs defaultValue="transfers">
          <TabsList>
            <TabsTrigger value="transfers">
              {t('transfers.tabs.transfers')}
            </TabsTrigger>
            <TabsTrigger value="settings">
              {t('transfers.tabs.settings')}
            </TabsTrigger>
          </TabsList>
          <TabsContent value="transfers">{tableContent}</TabsContent>
          <TabsContent value="settings">
            <LookupSettings />
          </TabsContent>
        </Tabs>
      ) : (
        tableContent
      )}

      <TransferDialog
        open={dialogOpen}
        onClose={handleDialogClose}
        transfer={editingTransfer}
        lookupData={lookupData}
        onSubmit={transfers}
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
